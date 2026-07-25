// Copyright 2024 Team 254. All Rights Reserved.
// Client-side logic for the FMS field monitor display.

let websocket;
let currentMatchId;
let redSide;
let blueSide;
const lowBatteryThreshold = 8;
const highBtuThreshold = 7.0;

const handleArenaStatus = function (data) {
  if (currentMatchId == null) {
    currentMatchId = data.MatchId;
  } else if (currentMatchId !== data.MatchId) {
    location.reload();
  }

  $.each(data.AllianceStations, function (station, stationStatus) {
    let teamElementPrefix;
    if (station[0] === "R") {
      teamElementPrefix = "#" + redSide + "Team" + station[1];
    } else {
      teamElementPrefix = "#" + blueSide + "Team" + station[1];
    }

    const teamIdElement = $(teamElementPrefix + "Id");
    const teamNotesElement = $(teamElementPrefix + "Notes");
    const teamNotesTextElement = $(teamElementPrefix + "Notes div");
    
    const teamDsElement = $(teamElementPrefix + "Ds");
    const teamDsText = teamDsElement.find(".fms-status-text");
    const teamRadioElement = $(teamElementPrefix + "Radio");
    const teamRadioIconElement = teamRadioElement.find("i");
    const teamRadioText = teamRadioElement.find(".fms-status-text");
    const teamRioElement = $(teamElementPrefix + "Rio");
    const teamRioText = teamRioElement.find(".fms-status-text");
    const teamRobotElement = $(teamElementPrefix + "Robot");

    const teamStatsElement = $(teamElementPrefix + "Stats");
    const teamBatteryElement = $(teamElementPrefix + "Battery");
    const teamBandwidthElement = $(teamElementPrefix + "Bandwidth");
    const teamTripTimeElement = $(teamElementPrefix + "TripTime");
    const teamMissedPacketsElement = $(teamElementPrefix + "MissedPackets");

    teamNotesTextElement.attr("data-station", station);

    const teamNewKeyElement = $(teamElementPrefix).find(".fms-new-key-badge");

    if (stationStatus.Team) {
      teamIdElement.text(stationStatus.Team.Id);
      teamNotesTextElement.text(stationStatus.Team.FtaNotes);
      if (stationStatus.Team.HasConnected) {
        teamNewKeyElement.hide();
      } else {
        teamNewKeyElement.show();
      }
    } else {
      teamIdElement.text("");
      teamNotesTextElement.text("");
      teamNewKeyElement.hide();
    }

    $("#accessPointStatus").attr("data-status", data.AccessPointStatus);
    $("#switchStatus").attr("data-status", data.SwitchStatus);

    const wifiStatus = stationStatus.WifiStatus;
    teamRadioIconElement.attr("class", `bi bi-reception-${wifiStatus.ConnectionQuality}`);

    if (stationStatus.DsConn) {
      const dsConn = stationStatus.DsConn;
      
      // DS Box
      teamDsElement.attr("data-status-ok", dsConn.DsLinked);
      if (dsConn.DsLinked) {
        teamDsText.text("DS");
      } else if (dsConn.WrongStation) {
        teamDsElement.attr("data-status-warning", true);
        teamDsText.text("x WRONG DS");
      } else {
        teamDsText.text("x DS");
      }

      // Radio Box
      const expectedTeamId = stationStatus.Team ? stationStatus.Team.Id : 0;
      const radioOkay = wifiStatus.TeamId === expectedTeamId && (wifiStatus.RadioLinked || dsConn.RobotLinked);
      teamRadioElement.attr("data-status-ok", radioOkay);
      if (radioOkay) {
        teamRadioText.text("RADIO");
      } else {
        teamRadioText.text("x RADIO");
      }

      // RIO Box
      const rioOkay = dsConn.RobotLinked;
      teamRioElement.attr("data-status-ok", rioOkay);
      if (rioOkay) {
        teamRioText.text("RIO");
      } else {
        teamRioText.text("x RIO");
      }

      // Stats
      const batteryOkay = dsConn.BatteryVoltage > lowBatteryThreshold && dsConn.RobotLinked;
      teamBatteryElement.html(dsConn.BatteryVoltage.toFixed(1) + 'V <span class="fms-stat-sub">Min 0.0</span>');

      const btuOkay = wifiStatus.MBits < highBtuThreshold && dsConn.RobotLinked;
      teamStatsElement.attr("data-status-ok", btuOkay);
      
      if (wifiStatus.MBits >= 0.01) {
        teamBandwidthElement.text(wifiStatus.MBits.toFixed(3) + " Mbps");
        teamTripTimeElement.text(dsConn.DsRobotTripTimeMs + " ms");
        teamMissedPacketsElement.text(dsConn.MissedPacketCount);
      } else {
        teamBandwidthElement.text("0.000 Mbps");
        teamTripTimeElement.text("0 ms");
        teamMissedPacketsElement.text("0");
      }
    } else {
      teamDsElement.attr("data-status-ok", "");
      teamDsElement.removeAttr("data-status-warning");
      teamDsText.text("x DS");

      teamRioElement.attr("data-status-ok", "");
      teamRioText.text("x RIO");
      
      teamBatteryElement.html('0.0V <span class="fms-stat-sub">Min 0.0</span>');
      teamBandwidthElement.text("0.000 Mbps");
      teamTripTimeElement.text("0 ms");
      teamMissedPacketsElement.text("0");

      const expectedTeamId = stationStatus.Team ? stationStatus.Team.Id : 0;
      if (wifiStatus.TeamId === expectedTeamId) {
        if (wifiStatus.RadioLinked) {
          teamRadioElement.attr("data-status-ok", true);
          teamRadioText.text("RADIO");
        } else {
          teamRadioElement.attr("data-status-ok", "");
          teamRadioText.text("x RADIO");
        }
      } else {
        teamRadioElement.attr("data-status-ok", false);
        teamRadioText.text("x RADIO");
      }
    }

    // Robot state (E-Stop, Bypass, etc.)
    const teamElement = $(teamElementPrefix);
    
    if (stationStatus.EStop) {
      teamElement.attr("data-bypassed", "false");
      teamRobotElement.attr("data-status-ok", false);
      teamRobotElement.text("E-STOP");
    } else if (stationStatus.AStop) {
      teamElement.attr("data-bypassed", "false");
      teamRobotElement.attr("data-status-ok", true);
      teamRobotElement.text("A-STOP");
    } else if (stationStatus.Bypass) {
      teamElement.attr("data-bypassed", "true");
      teamRobotElement.attr("data-status-ok", "");
      teamRobotElement.text("BYPASSED");
    } else if (!stationStatus.Team) {
      teamElement.attr("data-bypassed", "false");
      teamRobotElement.attr("data-status-ok", "");
      teamRobotElement.text("NO TEAM");
    } else if (stationStatus.DsConn && !stationStatus.DsConn.DsLinked) {
      teamElement.attr("data-bypassed", "false");
      teamRobotElement.attr("data-status-ok", "");
      teamRobotElement.text("NOT READY");
    } else {
      teamElement.attr("data-bypassed", "false");
      teamRobotElement.attr("data-status-ok", true);
      teamRobotElement.text("READY");
    }
  });
};

const handleMatchTime = function (data) {
  translateMatchTime(data, function (matchState, matchStateText, countdownSec) {
    $("#matchState").text(matchStateText);
    $("#matchTime").text(countdownSec);
    if (matchStateText === "PRE-MATCH" || matchStateText === "POST-MATCH") {
      $(".ds-dependent").attr("data-preMatch", "true");
    } else {
      $(".ds-dependent").attr("data-preMatch", "false");
    }
  });
};

const handleRealtimeScore = function (data, reversed) {
  if (reversed === "true") {
    $("#rightScore").text(data.Red.ScoreSummary.Score);
    $("#leftScore").text(data.Blue.ScoreSummary.Score);
  } else {
    $("#rightScore").text(data.Blue.ScoreSummary.Score);
    $("#leftScore").text(data.Red.ScoreSummary.Score);
  }
};

const handleMatchLoad = function (data) {
  $("#matchName").text(data.Match.LongName);
};

const handleEventStatus = function (data) {
  if (data.CycleTime === "") {
    $("#cycleTimeMessage").text("Last cycle time: Unknown");
  } else {
    $("#cycleTimeMessage").text("Last cycle time: " + data.CycleTime);
  }
  $("#earlyLateMessage").text(data.EarlyLateMessage);
};

const editFtaNotes = function (element) {
  const teamNotesTextElement = $(element);
  const textArea = $("<textarea />");
  textArea.val(teamNotesTextElement.text());
  teamNotesTextElement.replaceWith(textArea);
  textArea.focus();
  textArea.blur(function () {
    textArea.replaceWith(teamNotesTextElement);
    if (textArea.val() !== teamNotesTextElement.text()) {
      websocket.send("updateTeamNotes", {station: teamNotesTextElement.attr("data-station"), notes: textArea.val()});
    }
  });
};

$(function () {
  const urlParams = new URLSearchParams(window.location.search);
  const reversed = urlParams.get("reversed") === "true";
  if (reversed) {
    redSide = "right";
    blueSide = "left";
  } else {
    redSide = "left";
    blueSide = "right";
  }

  const driverStation = urlParams.get("ds");
  if (driverStation === "true") {
    $(".fta-dependent").attr("data-fta", "false");
    $(".ds-dependent").attr("data-ds", driverStation);
  } else {
    $(".fta-dependent").attr("data-fta", urlParams.get("fta"));
    $(".ds-dependent").attr("data-ds", driverStation);
  }

  $(".reversible-left").attr("data-reversed", reversed ? "true" : "false");
  $(".reversible-right").attr("data-reversed", reversed ? "true" : "false");

  websocket = new CheesyWebsocket("/displays/fms_field_monitor/websocket", {
    arenaStatus: function (event) {
      handleArenaStatus(event.data);
    },
    eventStatus: function (event) {
      handleEventStatus(event.data);
    },
    matchLoad: function (event) {
      handleMatchLoad(event.data);
    },
    matchTiming: function (event) {
      handleMatchTiming(event.data);
    },
    matchTime: function (event) {
      handleMatchTime(event.data);
    },
    realtimeScore: function (event) {
      handleRealtimeScore(event.data, reversed);
    },
  });
});
