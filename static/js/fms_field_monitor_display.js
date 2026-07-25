// Copyright 2024 Team 254. All Rights Reserved.
// Client-side logic for the FMS field monitor display.

let websocket;
let currentMatchId;
let redSide;
let blueSide;
const lowBatteryThreshold = 8;
const highBtuThreshold = 7.0;
const minBatteryTracker = {};
let previousMatchStateText = null;

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
      teamDsElement.removeAttr("data-status-ok");
      teamDsElement.removeAttr("data-status-warning");
      if (dsConn.DsLinked) {
        teamDsElement.attr("data-status-ok", true);
        teamDsText.text("DS");
      } else if (dsConn.WrongStation) {
        teamDsElement.attr("data-status-warning", true);
        teamDsText.text("x WRONG DS");
      } else if (stationStatus.Ethernet) {
        teamDsElement.attr("data-status-warning", true);
        teamDsText.text("⚠ DS");
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
      teamStatsElement.removeAttr("data-status-ok");
      
      const matchStateText = $("#matchState").text();
      let minBat = minBatteryTracker[stationId] || 99.9;
      
      if (dsConn.RobotLinked && dsConn.BatteryVoltage > 0) {
        if (dsConn.BatteryVoltage < minBat) {
          minBat = dsConn.BatteryVoltage;
          minBatteryTracker[stationId] = minBat;
        }
      } else if (!dsConn.RobotLinked && matchStateText === "PRE-MATCH") {
        minBatteryTracker[stationId] = null;
        minBat = 0.0;
      }
      
      let minBatText = (minBat === 99.9 || minBat === 0.0) ? "0.0" : minBat.toFixed(1);

      teamBatteryElement.html(dsConn.BatteryVoltage.toFixed(1) + 'V <span class="fms-stat-sub">Min ' + minBatText + '</span>');
      if (dsConn.RobotLinked && dsConn.BatteryVoltage < lowBatteryThreshold) {
        teamBatteryElement.parent().attr("data-status-ok", false);
      } else {
        teamBatteryElement.parent().removeAttr("data-status-ok");
      }

      if (wifiStatus.MBits >= 0.01) {
        teamBandwidthElement.text(wifiStatus.MBits.toFixed(3) + " Mbps");
        if (dsConn.RobotLinked && wifiStatus.MBits >= highBtuThreshold) {
          teamBandwidthElement.parent().attr("data-status-ok", false);
        } else {
          teamBandwidthElement.parent().removeAttr("data-status-ok");
        }
        teamTripTimeElement.text(dsConn.DsRobotTripTimeMs + " ms");
        teamMissedPacketsElement.text(dsConn.MissedPacketCount);
      } else {
        teamBandwidthElement.text("0.000 Mbps");
        teamBandwidthElement.parent().removeAttr("data-status-ok");
        teamTripTimeElement.text("0 ms");
        teamMissedPacketsElement.text("0");
      }
      
      teamTripTimeElement.parent().removeAttr("data-status-ok");
      teamMissedPacketsElement.parent().removeAttr("data-status-ok");
    } else {
      teamDsElement.removeAttr("data-status-ok");
      teamDsElement.removeAttr("data-status-warning");
      if (stationStatus.Ethernet) {
        teamDsElement.attr("data-status-warning", true);
        teamDsText.text("⚠ DS");
      } else {
        teamDsText.text("x DS");
      }

      teamRioElement.attr("data-status-ok", "");
      teamRioText.text("x RIO");
      
      teamStatsElement.removeAttr("data-status-ok");
      
      const matchStateText = $("#matchState").text();
      if (matchStateText === "PRE-MATCH") {
        minBatteryTracker[stationId] = null;
      }
      let minBat = minBatteryTracker[stationId];
      let minBatText = minBat ? minBat.toFixed(1) : "0.0";
      
      teamBatteryElement.html('0.0V <span class="fms-stat-sub">Min ' + minBatText + '</span>');
      teamBatteryElement.parent().removeAttr("data-status-ok");
      
      teamBandwidthElement.text("0.000 Mbps");
      teamBandwidthElement.parent().removeAttr("data-status-ok");
      
      teamTripTimeElement.text("0 ms");
      teamTripTimeElement.parent().removeAttr("data-status-ok");
      
      teamMissedPacketsElement.text("0");
      teamMissedPacketsElement.parent().removeAttr("data-status-ok");

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
    const matchStateText = $("#matchState").text();
    const inMatch = (matchStateText === "AUTONOMOUS" || matchStateText === "TELEOPERATED" || matchStateText === "PAUSE");
    
    teamRobotElement.removeAttr("data-status-ok");
    
    if (stationStatus.EStop) {
      teamElement.attr("data-bypassed", "false");
      teamRobotElement.attr("data-robot-state", "estop");
      teamRobotElement.text("E-STOP");
    } else if (stationStatus.AStop) {
      teamElement.attr("data-bypassed", "false");
      teamRobotElement.attr("data-robot-state", "astop");
      teamRobotElement.text("A-STOP");
    } else if (stationStatus.Bypass) {
      teamElement.attr("data-bypassed", "true");
      teamRobotElement.attr("data-robot-state", "bypassed");
      teamRobotElement.text("BYPASSED");
    } else if (!stationStatus.Team) {
      teamElement.attr("data-bypassed", "false");
      teamRobotElement.attr("data-robot-state", "no-team");
      teamRobotElement.text("NO TEAM");
    } else if (inMatch) {
      teamElement.attr("data-bypassed", "false");
      const ds = stationStatus.DsConn;
      
      let isAuto = false;
      let isEnabled = false;

      if (ds) {
        isAuto = ds.Auto;
        isEnabled = ds.Enabled;
      } else {
        isAuto = (matchStateText === "AUTONOMOUS");
        isEnabled = false;
      }

      if (isAuto && isEnabled) {
        teamRobotElement.attr("data-robot-state", "auto");
        teamRobotElement.text("AUTO");
      } else if (isAuto && !isEnabled) {
        teamRobotElement.attr("data-robot-state", "auto-disabled");
        teamRobotElement.text("AUTO DISABLED");
      } else if (!isAuto && isEnabled) {
        teamRobotElement.attr("data-robot-state", "teleop");
        teamRobotElement.text("TELEOP");
      } else {
        teamRobotElement.attr("data-robot-state", "teleop-disabled");
        teamRobotElement.text("TELEOP DISABLED");
      }
    } else if (!stationStatus.DsConn || !stationStatus.DsConn.RobotLinked) {
      teamElement.attr("data-bypassed", "false");
      teamRobotElement.attr("data-robot-state", "not-ready");
      teamRobotElement.text("NOT READY");
    } else {
      teamElement.attr("data-bypassed", "false");
      teamRobotElement.attr("data-robot-state", "ready");
      teamRobotElement.text("READY");
    }
  });
};

const handleMatchTime = function (data) {
  translateMatchTime(data, function (matchState, matchStateText, countdownSec) {
    if (previousMatchStateText === "PRE-MATCH" && matchStateText === "AUTONOMOUS") {
      for (const stationId in minBatteryTracker) {
        minBatteryTracker[stationId] = null;
      }
    }
    previousMatchStateText = matchStateText;
    
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
  const leftScore = reversed ? data.Blue.ScoreSummary.Score : data.Red.ScoreSummary.Score;
  const rightScore = reversed ? data.Red.ScoreSummary.Score : data.Blue.ScoreSummary.Score;
  
  $("#leftScore").text(leftScore);
  $("#rightScore").text(rightScore);
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
