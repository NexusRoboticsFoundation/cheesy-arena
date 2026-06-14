// Copyright 2014 Team 254. All Rights Reserved.
// Author: pat@patfairbank.com (Patrick Fairbank)
//
// Client-side logic for the match play page.

var websocket;
let scoreIsReady;
let isReplay;
const lowBatteryThreshold = 8;

// Sends a websocket message to load the specified match.
const loadMatch = function (matchId) {
  websocket.send("loadMatch", {matchId: matchId});
}

// Sends a websocket message to load the results for the specified match into the display buffer.
const showResult = function (matchId) {
  websocket.send("showResult", {matchId: matchId});
}

// Sends a websocket message to load all teams into their respective alliance stations.
const substituteTeams = function (team, position) {
  const teams = {
    Red1: getTeamNumber("R1"),
    Red2: getTeamNumber("R2"),
    Red3: getTeamNumber("R3"),
    Blue1: getTeamNumber("B1"),
    Blue2: getTeamNumber("B2"),
    Blue3: getTeamNumber("B3"),
  };

  websocket.send("substituteTeams", teams);
};

// Sends a websocket message to toggle the bypass status for an alliance station.
const toggleBypass = function (station) {
  websocket.send("toggleBypass", station);
};

// Sends a websocket message to start the match.
const startMatch = function () {
  websocket.send("startMatch",
    {muteMatchSounds: $("#muteMatchSounds").prop("checked")});
};

// Sends a websocket message to abort the match.
const abortMatch = function () {
  websocket.send("abortMatch");
};

// Sends a websocket message to commit and post the match score, and load the next match.
const commitAndPost = function () {
  websocket.send("commitAndPost");
};

// Sends a websocket message to discard the match score and load the next match.
const discardResults = function () {
  websocket.send("discardResults");
};

// Sends a websocket message to change what the audience display is showing.
const setAudienceDisplay = function (mode) {
  websocket.send("setAudienceDisplay", mode);
};

// Sends a websocket message to change what the alliance station display is showing.
const setAllianceStationDisplay = function (mode) {
  if(mode === 'fieldReset') {
    websocket.send("signalReset");
    return;
  } 
  if(mode === 'signalCount') {
    websocket.send("signalVolunteers");
    return;
  }

  websocket.send("setAllianceStationDisplay", mode);
};

// Sends a websocket message to start the timeout.
const startTimeout = function (duration) {
  const splitDuration = duration.split(":");
  let durationSec = parseFloat(splitDuration[0]);
  if (splitDuration.length > 1) {
    durationSec = durationSec * 60 + parseFloat(splitDuration[1]);
  }
  websocket.send("startTimeout", {
    Description: $("#timeoutDescription").val(),
    NextMatchName: $("#timeoutNextMatchText").val(),
    DurationSec: durationSec,
  });
};

// Sends a websocket message to update timeout display text.
const setTimeoutDisplay = function () {
  websocket.send("setTimeoutDisplay", {
    Description: $("#timeoutDescription").val(),
    NextMatchName: $("#timeoutNextMatchText").val(),
  });
};

const confirmCommit = function () {
  if (isReplay || !scoreIsReady) {
    // Show the appropriate message(s) in the confirmation dialog.
    $("#confirmCommitReplay").css("display", isReplay ? "block" : "none");
    $("#confirmCommitNotReady").css("display", scoreIsReady ? "none" : "block");
    $("#confirmCommitResults").modal("show");
  } else {
    commitAndPost();
  }
};

// Sends a websocket message to specify a custom name for the current test match.
const setTestMatchName = function () {
  websocket.send("setTestMatchName", $("#testMatchName").val());
};

// Returns the integer team number entered into the team number input box for the given station, or 0 if it is empty.
const getTeamNumber = function (station) {
  const teamId = $(`#status${station} .team-number`).val().trim();
  return teamId ? parseInt(teamId) : 0;
}

// Handles a websocket message to update the team connection status.
const handleArenaStatus = function (data) {
  // Update the team status view.
  $.each(data.AllianceStations, function (station, stationStatus) {
    const wifiStatus = stationStatus.WifiStatus;
    $("#status" + station + " .radio-status .status-text").text(wifiStatus.TeamId);

    if (stationStatus.DsConn) {
      // Format the driver station status box.
      const dsConn = stationStatus.DsConn;
      $("#status" + station + " .ds-status .status-icon").toggleClass("text-success", dsConn.DsLinked);
      if (dsConn.DsLinked) {
        $("#status" + station + " .ds-status .status-text").text(wifiStatus.MBits.toFixed(2) + "Mb");
      } else {
        $("#status" + station + " .ds-status .status-text").text("");
      }

      // Format the robot status box.
      const robotOkay = dsConn.BatteryVoltage > lowBatteryThreshold && dsConn.RobotLinked;
      $("#status" + station + " .robot-status .status-icon").toggleClass("text-success", robotOkay);
      if (stationStatus.DsConn.SecondsSinceLastRobotLink > 1 && stationStatus.DsConn.SecondsSinceLastRobotLink < 1000) {
        $("#status" + station + " .robot-status .status-text").text(stationStatus.DsConn.SecondsSinceLastRobotLink.toFixed());
      } else {
        $("#status" + station + " .robot-status .status-text").text(dsConn.BatteryVoltage.toFixed(1) + "V");
      }
    } else {
      $("#status" + station + " .ds-status .status-icon").toggleClass("text-success", false);
      $("#status" + station + " .robot-status .status-icon").toggleClass("text-success", false);
      $("#status" + station + " .robot-status .status-text").text("");
      $("#status" + station + " .ds-status .status-text").text("");
    }

    // Format the radio status box according to whether the AP is configured with the correct SSID and the connection
    // status of the robot radio.
    const expectedTeamId = stationStatus.Team ? stationStatus.Team.Id : 0;
    let radioStatus = 0;
    if (expectedTeamId === wifiStatus.TeamId) {
      if (wifiStatus.RadioLinked || stationStatus.DsConn?.RobotLinked) {
        radioStatus = 2;
      } else {
        radioStatus = 1;
      }
    }
    $(`#status${station} .radio-status .status-icon`).toggleClass("text-success", radioStatus == 2);
    $(`#status${station} .radio-status .status-icon`).toggleClass("bi-wifi-off", radioStatus === 0);
    $(`#status${station} .radio-status .status-icon`).toggleClass("bi-wifi", radioStatus !== 0);

    if (stationStatus.EStop) {
      $("#status" + station + " .bypass-status .status-input").prop("checked", true);
      $("#status" + station + " .bypass-status .status-text").text("E-stopped");
    } else if (stationStatus.AStop) {
      $("#status" + station + " .bypass-status .status-input").prop("checked", false);
      $("#status" + station + " .bypass-status .status-text").text("A-stopped");
    } else if (stationStatus.Bypass) {
      $("#status" + station + " .bypass-status .status-input").prop("checked", true);
      $("#status" + station + " .bypass-status .status-text").text(matchStates[data.MatchState] === "PRE_MATCH" ? "Bypassed" : "Disabled");
    } else {
      $("#status" + station + " .bypass-status .status-input").prop("checked", false);
      $("#status" + station + " .bypass-status .status-text").text(matchStates[data.MatchState] === "PRE_MATCH" ? "Bypass" : "Disable");
    }

    $(`#status${station} .status-container`).toggleClass("border-warning", radioStatus != 2 || !stationStatus.DsConn?.DsLinked || !stationStatus.DsConn?.RobotLinked);
  });

  // Enable/disable the buttons based on the current match state.
  switch (matchStates[data.MatchState]) {
    case "PRE_MATCH":
      $("#startMatch").show().prop("disabled", !data.CanStartMatch);
      $("#abortMatch").hide();
      $(".btn-post-match").hide();
      $(".btn-pre-match").show();
      $(".audience-display-button").prop("disabled", false);
      $(".alliance-station-display-button").prop("disabled", false);
      break;
    case "START_MATCH":
    case "AUTO_PERIOD":
    case "PAUSE_PERIOD":
    case "TELEOP_PERIOD":
      $("#startMatch").hide();
      $("#abortMatch").show().prop("disabled", false);
      $(".btn-post-match").hide();
      $(".btn-pre-match").hide();
      $(".audience-display-button").prop("disabled", true);
      $(".alliance-station-display-button").prop("disabled", true);
      $("#substituteTeams").hide();
      break;
    case "POST_MATCH":
      $("#startMatch").show().prop("disabled", true);
      $("#abortMatch").hide();
      $(".btn-post-match").show();
      $(".btn-pre-match").hide();
      $(".audience-display-button").prop("disabled", false);
      $(".alliance-station-display-button").prop("disabled", false);
      break;
    case "TIMEOUT_ACTIVE":
      $("#startMatch").hide();
      $("#abortMatch").show().prop("disabled", false);
      $(".btn-post-match").hide();
      $(".btn-pre-match").hide();
      $(".audience-display-button").prop("disabled", false);
      $(".alliance-station-display-button").prop("disabled", false);
      break;
    case "POST_TIMEOUT":
      $("#startMatch").show().prop("disabled", true);
      $("#abortMatch").hide();
      $(".btn-post-match").hide();
      $(".btn-pre-match").hide();
      $(".audience-display-button").prop("disabled", false);
      $(".alliance-station-display-button").prop("disabled", false);
      break;
  }

  $("#accessPointStatus").attr("data-status", data.AccessPointStatus);
  $("#switchStatus").attr("data-status", data.SwitchStatus);
  $("#redSCCStatus").attr("data-status", data.RedSCCStatus);
  $("#blueSCCStatus").attr("data-status", data.BlueSCCStatus);

  if (data.PlcIsHealthy) {
    $("#plcStatus").text("Connected");
    $("#plcStatus").attr("data-ready", true);
  } else {
    $("#plcStatus").text("Not Connected");
    $("#plcStatus").attr("data-ready", false);
  }
  $("#fieldEStop").attr("data-ready", !data.FieldEStop);
  $.each(data.PlcArmorBlockStatuses, function (name, status) {
    $("#plc" + name + "Status").attr("data-ready", status);
  });
};

// Handles a websocket message to update the teams for the current match.
const handleMatchLoad = function (data) {
  isReplay = data.IsReplay;

  fetch("/match_play/match_load")
    .then(response => response.text())
    .then(html => $("#matchListColumn").html(html));
    
  fetch("/match_play/match_load?repost=true")
    .then(response => response.text())
    .then(html => $("#repostListColumn").html(html));

  $("#matchName").text(data.Match.LongName);
  $("#testMatchName").val(data.Match.LongName);
  $("#timeoutDescription").val(data.BreakDescription || "Field Break");
  $("#timeoutNextMatchText").val(data.BreakNextMatchName || "");
  $("#testMatchSettings").toggle(data.Match.Type === matchTypeTest);
  $.each(data.Teams, function (station, team) {
    const teamId = $(`#status${station} .team-number`);
    teamId.val(team ? team.Id : "");
    teamId.prop("disabled", !data.AllowSubstitution);
  });
  $("#playoffRedAllianceInfo").html(formatPlayoffAllianceInfo(data.Match.PlayoffRedAlliance, data.RedOffFieldTeams, 'Red'));
  $("#playoffBlueAllianceInfo").html(formatPlayoffAllianceInfo(data.Match.PlayoffBlueAlliance, data.BlueOffFieldTeams, 'Blue'));

  $("#substituteTeams").hide();
  $("#muteMatchSounds").prop("checked", false);
}

// Handles a websocket message to update the match time countdown.
const handleMatchTime = function (data) {
  translateMatchTime(data, function (matchState, matchStateText, countdownSec) {
    $("#matchState").text(matchStateText);
    $("#matchTime").text(countdownSec);
  });
};

// Handles a websocket message to update the match score.
const handleRealtimeScore = function (data) {
  $("#redScore").text(data.Red.ScoreSummary.Score);
  $("#blueScore").text(data.Blue.ScoreSummary.Score);
};

// Handles a websocket message to populate the final score data.
const handleScorePosted = function (data) {
  $("#postedMatchName").text(data.Match.LongName || 'none');
}

// Handles a websocket message to update the audience display screen selector.
const handleAudienceDisplayMode = function (data) {
  $(".audience-display-button.active").removeClass("active");
  $("#audience-" + data).addClass("active");
};

// Handles a websocket message to signal whether the referee and scorers have committed after the match.
const handleScoringStatus = function (data) {
  scoreIsReady = data.RefereeScoreReady;
  for (const status of Object.values(data.PositionStatuses)) {
    if (!status.Ready) {
      scoreIsReady = false;
      break;
    }
  }

  updateScoreStatus(data, "red", "#redScoreStatus", "Red");
  updateScoreStatus(data, "blue", "#blueScoreStatus", "Blue");
};

// Helper function to update a badge that shows scoring panel commit status.
const updateScoreStatus = function (data, position, element, displayName) {
  const status = data.PositionStatuses[position];
  $(element).text(`${displayName} ${status.NumPanelsReady}/${status.NumPanels}`);
  $(element).attr("data-present", status.NumPanels > 0);
  $(element).attr("data-ready", status.Ready);
};

// Handles a websocket message to update the alliance station display screen selector.
const handleAllianceStationDisplayMode = function (data) {
  $(".alliance-station-display-button.active").removeClass("active");
  $("#alliance-station-" + data).addClass("active");
};

// Handles a websocket message to update the event status message.
const handleEventStatus = function (data) {
  if (data.CycleTime === "") {
    $("#cycleTimeMessage").text("Last cycle time: Unknown");
  } else {
    $("#cycleTimeMessage").text("Last cycle time: " + data.CycleTime);
  }
  $("#earlyLateMessage").text(data.EarlyLateMessage);
};

const formatPlayoffAllianceInfo = function (allianceNumber, offFieldTeams, color) {
  if (allianceNumber === 0) {
    return `${color} alliance`;
  }
  let allianceInfo = `Alliance ${allianceNumber}`;
  if (offFieldTeams.length > 0) {
    allianceInfo += ` (not on field: ${offFieldTeams.map(team => team.Id).join(", ")})`;
  }
  return allianceInfo;
}

$(function () {
  // Activate tooltips above the status headers.
  const tooltipTriggerList = document.querySelectorAll("[data-bs-toggle=tooltip]");
  const tooltipList = [...tooltipTriggerList].map(element => new bootstrap.Tooltip(element));

  // Set up the websocket back to the server.
  websocket = new CheesyWebsocket("/match_play/websocket", {
    allianceStationDisplayMode: function (event) {
      handleAllianceStationDisplayMode(event.data);
    },
    arenaStatus: function (event) {
      handleArenaStatus(event.data);
    },
    audienceDisplayMode: function (event) {
      handleAudienceDisplayMode(event.data);
    },
    eventStatus: function (event) {
      handleEventStatus(event.data);
    },
    matchLoad: function (event) {
      handleMatchLoad(event.data);
    },
    matchTime: function (event) {
      handleMatchTime(event.data);
    },
    matchTiming: function (event) {
      handleMatchTiming(event.data);
    },
    realtimeScore: function (event) {
      handleRealtimeScore(event.data);
    },
    scorePosted: function (event) {
      handleScorePosted(event.data);
    },
    scoringStatus: function (event) {
      handleScoringStatus(event.data);
    },
  });
});
