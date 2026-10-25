// Copyright 2023 Team 254. All Rights Reserved.
// Author: pat@patfairbank.com (Patrick Fairbank)
//
// Client-side logic for the referee interface.

var websocket;
let redFoulsHashCode = 0;
let blueFoulsHashCode = 0;
let scoreIsReady = false;
let isPreMatch = true;
let isPostMatch = false;
let isPlayoff = false;
let expectedStartTime;
let twoMinuteWarningTime;

// Sends the foul to the server to add it to the list.
const addFoul = function (alliance, isMajor) {
  websocket.send("addFoul", {Alliance: alliance, IsMajor: isMajor});
}

// Toggles the foul type between minor and major.
const toggleFoulType = function (alliance, index) {
  websocket.send("toggleFoulType", {Alliance: alliance, Index: index});
}

// Updates the team that the foul is attributed to.
const updateFoulTeam = function (alliance, index, teamId) {
  websocket.send("updateFoulTeam", {Alliance: alliance, Index: index, TeamId: teamId});
}

// Updates the rule that the foul is for.
const updateFoulRule = function (alliance, index, ruleId) {
  websocket.send("updateFoulRule", {Alliance: alliance, Index: index, RuleId: ruleId});
}

// Removes the foul with the given parameters from the list.
var deleteFoul = function (alliance, index) {
  websocket.send("deleteFoul", {Alliance: alliance, Index: index});
};

// Cycles through the card options for the selected team.
var cycleCard = function (cardButton) {
  if (isPostMatch) {
    // Cycle card.
    const currentCard = $(cardButton).attr("data-card");
    const hasOldYellowCard = $(cardButton).attr("data-old-yellow-card") === "true";
    let newCard = "";
    if (currentCard === "" && hasOldYellowCard) {
      newCard = "red";
    } else if (currentCard === "") {
      newCard = "yellow";
    } else if (currentCard === "yellow") {
      newCard = "red";
    }
    websocket.send(
      "card",
      {Alliance: $(cardButton).attr("data-alliance"), TeamId: isPlayoff ? 0 : parseInt($(cardButton).attr("data-team")), Card: newCard}
    );
    $(cardButton).attr("data-card", newCard);
    return;
  }

  const team = $(cardButton).attr("data-team");
  $("#confirmBypass").attr("data-station", $(cardButton).attr("data-station")?.toUpperCase());

  if (isPreMatch) {
    // Toggle bypass.
    const isDisabled = $(cardButton).hasClass("bypassed-status");
    $("#confirmBypassTitle").text(`${isDisabled ? "Enable" : "Disable"} ${team}?`);
    $("#confirmBypassAction").text(isDisabled ? "Enable" : "Disable");
  } else {
    // E-stop robot.
    if ($(cardButton).hasClass("estopped-status")) {
      return;
    }
    $("#confirmBypassTitle").text(`E-Stop ${team}?`);
    $("#confirmBypassAction").text("E-Stop");
  }

  if (team === "0") {
    toggleBypass();
  } else {
    $("#confirmBypass").modal("show");
  }
};

const toggleBypass = function () {
  if (isPostMatch) {
    return;
  }
  const station = $("#confirmBypass").attr("data-station");
  websocket.send(isPreMatch ? "toggleBypass" : "eStop", station);
}

// Sends a websocket message to signal to the volunteers that they may enter the field.
var signalVolunteers = function () {
  websocket.send("signalVolunteers");
};

// Sends a websocket message to signal to the teams that they may enter the field.
var signalReset = function () {
  websocket.send("signalReset");
};

// Sends a websocket message to unlock match start.
var fieldSafeToStart = function () {
  websocket.send("fieldSafeToStart");
};

// Sends a websocket message to lock match start.
var fieldNotSafeToStart = function () {
  websocket.send("fieldNotSafeToStart");
};

// Shows confirmation modal if not all scores are ready, otherwise directly commits and posts.
var confirmCommit = function () {
  // if (scoreIsReady) {
    commitAndPost();
  //   return;
  // }

  // $("#confirmCommit").modal("show");
};

// Commits the score and posts results to the audience.
var commitAndPost = function () {
  websocket.send("commitAndPost");
};

// Handles a websocket message to update the teams for the current match.
var handleMatchLoad = function (data) {
  expectedStartTime = new Date(data.ExpectedStartTime);

  $("#matchName").text(data.Match.LongName);
  isPlayoff = data.Match.Type === matchTypePlayoff;
  for (const alliance of ["red", "blue"]) {
    const color = alliance === "red" ? "Red" : "Blue";
    $(`#${alliance}AllianceCard`).text(`Alliance ${data.Match[`Playoff${color}Alliance`]}`)
      .attr("data-old-yellow-card", data[`Playoff${color}AllianceYellowCard`])
      .attr("data-card", "");
  }
  updateCardControls();

  setTeamCard("red", 1, data.Teams["R1"], data.PlayoffRedAllianceYellowCard);
  setTeamCard("red", 2, data.Teams["R2"], data.PlayoffRedAllianceYellowCard);
  setTeamCard("red", 3, data.Teams["R3"], data.PlayoffRedAllianceYellowCard);
  setTeamCard("blue", 1, data.Teams["B1"], data.PlayoffBlueAllianceYellowCard);
  setTeamCard("blue", 2, data.Teams["B2"], data.PlayoffBlueAllianceYellowCard);
  setTeamCard("blue", 3, data.Teams["B3"], data.PlayoffBlueAllianceYellowCard);

  $("#redScoreSummary .team-1").text(data.Teams["R1"]?.Id || "");
  $("#redScoreSummary .team-2").text(data.Teams["R2"]?.Id || "");
  $("#redScoreSummary .team-3").text(data.Teams["R3"]?.Id || "");
  $("#blueScoreSummary .team-1").text(data.Teams["B1"]?.Id || "");
  $("#blueScoreSummary .team-2").text(data.Teams["B2"]?.Id || "");
  $("#blueScoreSummary .team-3").text(data.Teams["B3"]?.Id || "");
};

// Handles a websocket message to update the match status.
const handleMatchTime = function (data) {
  const newIsPreMatch = ["PRE_MATCH", "TIMEOUT_ACTIVE", "POST_TIMEOUT"].includes(matchStates[data.MatchState]);
  const newIsPostMatch = matchStates[data.MatchState] === "POST_MATCH";
  if (newIsPreMatch !== isPreMatch || newIsPostMatch !== isPostMatch) {
    $("#confirmBypass").modal("hide");
  }
  isPreMatch = newIsPreMatch;
  isPostMatch = newIsPostMatch;
  if (isPostMatch) {
    $(".team-card").removeClass("bypassed-status estopped-status");
  }
  updateCardControls();
  $(".control-button").attr("data-enabled", isPostMatch);

  let title = "Red/Yellow Cards";
  if (!isPostMatch) {
    title = isPreMatch ? "Bypass" : "E-Stop";
  }

  $("#teamTitle").text(title);

  if(isPostMatch) {
    twoMinuteWarningTime = undefined;
  }
};

const updateCardControls = function () {
  $(".playoff-alliance-card").toggle(isPlayoff && isPostMatch);
  $(".station-card").toggle(!isPlayoff || !isPostMatch);
};

const towerStatusNames = [
  "None",
  "Level 1",
  "Level 2",
  "Level 3",
];

const setTowerStatus = function (selector, status) {
  $(selector).text(towerStatusNames[status]);
  $(selector).attr("data-status", status);
};

// Handles a websocket message to update the realtime scoring fields.
const handleRealtimeScore = function (data) {
  if (isPlayoff) {
    $("#redAllianceCard").attr("data-card", data.PlayoffRedAllianceCard || "");
    $("#blueAllianceCard").attr("data-card", data.PlayoffBlueAllianceCard || "");
  } else {
    $(".station-card").attr("data-card", "");
    for (const [teamId, card] of Object.entries({...data.RedCards, ...data.BlueCards})) {
      $(`[data-team="${teamId}"]`).attr("data-card", card);
    }
  }

  const newRedFoulsHashCode = hashObject(data.Red.Score.Fouls);
  const newBlueFoulsHashCode = hashObject(data.Blue.Score.Fouls);
  if (newRedFoulsHashCode !== redFoulsHashCode || newBlueFoulsHashCode !== blueFoulsHashCode) {
    redFoulsHashCode = newRedFoulsHashCode;
    blueFoulsHashCode = newBlueFoulsHashCode;
    fetch("/panels/referee/foul_list")
      .then(response => response.text())
      .then(svg => $("#foulList").html(svg));
  }

  for (alliance of ["red", "blue"]) {
    let score;
    if (alliance === "red") {
      score = data.Red.Score;
    } else {
      score = data.Blue.Score;
    }

    let scoreRoot = `${alliance}ScoreSummary`;
    setTowerStatus(`#${scoreRoot} .team-1-auto-tower`, score.AutoTowerStatuses[0]);
    setTowerStatus(`#${scoreRoot} .team-2-auto-tower`, score.AutoTowerStatuses[1]);
    setTowerStatus(`#${scoreRoot} .team-3-auto-tower`, score.AutoTowerStatuses[2]);
    setTowerStatus(`#${scoreRoot} .team-1-endgame-tower`, score.EndgameTowerStatuses[0]);
    setTowerStatus(`#${scoreRoot} .team-2-endgame-tower`, score.EndgameTowerStatuses[1]);
    setTowerStatus(`#${scoreRoot} .team-3-endgame-tower`, score.EndgameTowerStatuses[2]);
  }
}

// Handles a websocket message to update the scoring commit status.
const handleScoringStatus = function (data) {
  if (data.RefereeScoreReady) {
    $("#commitButton").attr("data-enabled", false);
  }
  updateScoreStatus(data, "red", "#redScoreStatus", "Red");
  updateScoreStatus(data, "blue", "#blueScoreStatus", "Blue");

  scoreIsReady = Object.values(data.PositionStatuses).every(status => status.Ready);

  // Make the button visually distinct if not all refs have committed.
  // HR can still press the button with confirm modal.
  if (scoreIsReady) {
    $("#commitButton").removeClass("disabled");
  } else {
    $("#commitButton").addClass("disabled");
  }
}

const handleArenaStatus = function (data) {
  setTeamStatus("red1", data.AllianceStations["R1"]);
  setTeamStatus("red2", data.AllianceStations["R2"]);
  setTeamStatus("red3", data.AllianceStations["R3"]);
  setTeamStatus("blue1", data.AllianceStations["B1"]);
  setTeamStatus("blue2", data.AllianceStations["B2"]);
  setTeamStatus("blue3", data.AllianceStations["B3"]);

  if(expectedStartTime && matchStates[data.MatchState] === "PRE_MATCH") {
    const diff = Math.floor((expectedStartTime - new Date()) / 1000);
    const prefix = diff < 0 ? "-" : "";
    const seconds = Math.abs(diff % 60);
    const minutes = Math.floor(Math.abs(diff) / 60);
    let display = minutes > 1000 ? '' : `${prefix}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    if(twoMinuteWarningTime) {
      const warningDiff = Math.floor((twoMinuteWarningTime - new Date()) / 1000);
      const warningPrefix = warningDiff < 0 ? "-" : "";
      const warningSeconds = Math.abs(warningDiff % 60);
      const warningMinutes = Math.floor(Math.abs(warningDiff) / 60);
      display += ` (warning active: ${warningPrefix}${warningMinutes}:${warningSeconds < 10 ? '0' : ''}${warningSeconds})`;
    }

    $("#matchTimer").text(display);

    if(diff < 0 && !twoMinuteWarningTime) {
      $("#twoMinuteWarningButton").show();
    } else {
      $("#twoMinuteWarningButton").hide();
    }
  } else {
    $("#twoMinuteWarningButton").hide();
    $("#matchTimer").text('');
  }
};

const startTwoMinuteWarning = function() {
  twoMinuteWarningTime = new Date(Date.now() + (2 * 60 * 1000));
}

const setTeamStatus = function (station, stationStatus) {
  const cardButton = $(`#${station}Card`);
  cardButton.toggleClass("bypassed-status", Boolean(stationStatus?.Bypass) && !isPostMatch);
  cardButton.toggleClass("estopped-status", Boolean(stationStatus?.EStop) && !isPostMatch);
}

// Helper function to update a badge that shows scoring panel commit status.
const updateScoreStatus = function (data, position, element, displayName) {
  const status = data.PositionStatuses[position];
  $(element).text(`${displayName} ${status.NumPanelsReady}/${status.NumPanels}`);
  $(element).attr("data-present", status.NumPanels > 0);
  $(element).attr("data-ready", status.Ready);
};

// Populates the red/yellow card button for a given team.
const setTeamCard = function (alliance, position, team, allianceYellowCard) {
  const cardButton = $(`#${alliance}${position}Card`);
  if (team === null) {
    cardButton.text("-");
    cardButton.attr("data-team", 0)
    cardButton.attr("data-old-yellow-card", "");
  } else {
    cardButton.text(team.Id);
    cardButton.attr("data-team", team.Id)
    cardButton.attr("data-old-yellow-card", isPlayoff ? allianceYellowCard : team.YellowCard);
  }
  cardButton.attr("data-card", "");
}

// Produces a hash code of the given object for use in equality comparisons.
const hashObject = function (object) {
  const s = JSON.stringify(object);
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(31, h) + s.charCodeAt(i) | 0;
  }
  return h;
}

$(function () {
  // Read the configuration for this display from the URL query string.
  var urlParams = new URLSearchParams(window.location.search);
  const hrParam = urlParams.get("hr");
  const isHeadRef = !hrParam || hrParam === 'true';
  $(".headRef-dependent").attr("data-hr", hrParam);

  // Set up the websocket back to the server.
  websocket = new CheesyWebsocket("/panels/referee/websocket", {
    matchLoad: function (event) {
      handleMatchLoad(event.data);
    },
    matchTime: function (event) {
      handleMatchTime(event.data);
    },
    realtimeScore: function (event) {
      handleRealtimeScore(event.data);
    },
    scoringStatus: function (event) {
      handleScoringStatus(event.data);
    },
    arenaStatus: function (event) {
      handleArenaStatus(event.data);
    },
  });

  if(isHeadRef) {
    // The keycode assigned to the physical USB button attached to the head ref device.
    const FIELD_SAFE_KEY = 'F16';
    $(document).on('keydown', function(event) {
      if (event.key === FIELD_SAFE_KEY) {
        fieldSafeToStart();
      }
    });

    $(document).on('keyup', function(event) {
      if (event.key === FIELD_SAFE_KEY) {
        fieldNotSafeToStart();
      }
    });
  }
});
