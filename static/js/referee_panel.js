// Copyright 2023 Team 254. All Rights Reserved.
// Author: pat@patfairbank.com (Patrick Fairbank)
//
// Client-side logic for the referee interface.

var websocket;
let redFoulsHashCode = 0;
let blueFoulsHashCode = 0;
let scoreIsReady = false;

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

// Cycles through no card, yellow card, and red card.
var cycleCard = function (cardButton) {
  var newCard = "";
  if ($(cardButton).attr("data-card") === "") {
    newCard = "yellow";
  } else if ($(cardButton).attr("data-card") === "yellow") {
    newCard = "red";
  }
  websocket.send(
    "card",
    {Alliance: $(cardButton).attr("data-alliance"), TeamId: parseInt($(cardButton).attr("data-team")), Card: newCard}
  );
  $(cardButton).attr("data-card", newCard);
};

// Cycles through disabled and enabled.
var cycleDisableCard = function (cardButton) {
  const isDisabled = $(cardButton).hasClass('disabled-status');
  $("#confirmDisableTitle").text(`${isDisabled ? 'Enable' : 'Disable'} ${$(cardButton).text()}?`);
  $("#confirmDisableAction").text(isDisabled ? 'Enable' : 'Disable')
  $("#confirmDisable").attr('data-station', $(cardButton).attr('data-station'));

  if($(cardButton).text() === '-') {
    confirmDisable();
  } else {
    $("#confirmDisable").modal('show');
  }
};

var confirmDisable = function() {
  const station = $("#confirmDisable").attr('data-station');
  websocket.send(
    "disable",
    station
  );
}

var makeFullscreen = function() {
  toggleFullscreen();
  $("#fullscreenButton").hide();
}

// Sends a websocket message to signal to the volunteers that they may enter the field.
var signalVolunteers = function () {
  websocket.send("signalVolunteers");
};

// Sends a websocket message to signal to the teams that they may enter the field.
var signalReset = function () {
  websocket.send("signalReset");
};

var commitMatch = function () {
  if(scoreIsReady) {
    confirmCommit();
    return;
  }
  $("#confirmCommit").modal('show');
}

// Signals the scorekeeper that foul entry is complete for this match.
var confirmCommit = function () {
  websocket.send("commitMatch");
};

// Sends a websocket message to unlock match start.
var fieldSafe = function () {
  websocket.send("fieldSafe");
};

// Sends a websocket message to lock match start.
var fieldUnsafe = function () {
  websocket.send("fieldUnsafe");
};

// Sends a websocket message to auto-intro the match.
var intro = function (details) {
  websocket.send("intro", {Details: details});
  $("#introControlButtons").hide();
};

// Handles a websocket message to update the teams for the current match.
var handleMatchLoad = function (data) {
  $("#matchName").text(data.Match.LongName);

  setTeamCard("red", 1, data.Teams["R1"]);
  setTeamCard("red", 2, data.Teams["R2"]);
  setTeamCard("red", 3, data.Teams["R3"]);
  setTeamCard("blue", 1, data.Teams["B1"]);
  setTeamCard("blue", 2, data.Teams["B2"]);
  setTeamCard("blue", 3, data.Teams["B3"]);

  setTeamDisableCard("R1", data.Teams["R1"]);
  setTeamDisableCard("R2", data.Teams["R2"]);
  setTeamDisableCard("R3", data.Teams["R3"]);
  setTeamDisableCard("B1", data.Teams["B1"]);
  setTeamDisableCard("B2", data.Teams["B2"]);
  setTeamDisableCard("B3", data.Teams["B3"]);

  $("#redScoreSummary .team-1").text(data.Teams["R1"]?.Id);
  $("#redScoreSummary .team-2").text(data.Teams["R2"]?.Id);
  $("#redScoreSummary .team-3").text(data.Teams["R3"]?.Id);
  $("#blueScoreSummary .team-1").text(data.Teams["B1"]?.Id);
  $("#blueScoreSummary .team-2").text(data.Teams["B2"]?.Id);
  $("#blueScoreSummary .team-3").text(data.Teams["B3"]?.Id);

  $("#introControlButtons").show();
};

var handleArenaStatus = function (data) {
  setTeamDisableStatusCard("R1", data.AllianceStations["R1"]);
  setTeamDisableStatusCard("R2", data.AllianceStations["R2"]);
  setTeamDisableStatusCard("R3", data.AllianceStations["R3"]);
  setTeamDisableStatusCard("B1", data.AllianceStations["B1"]);
  setTeamDisableStatusCard("B2", data.AllianceStations["B2"]);
  setTeamDisableStatusCard("B3", data.AllianceStations["B3"]);

  if(data.CanStartMatch) {
    $('.safe-button').addClass('btn-success');
    $('.safe-button').removeClass('btn-danger');
  } else {
    $('.safe-button').removeClass('btn-success');
    $('.safe-button').addClass('btn-danger');
  }
};

// Handles a websocket message to update the match status.
const handleMatchTime = function (data) {
  $(".control-button").attr("data-enabled", matchStates[data.MatchState] === "POST_MATCH");
  
  if(matchStates[data.MatchState] === "PRE_MATCH") {
    $(".during-match").hide();
    $(".during-and-post-match").hide();
    $(".pre-and-during-match").show();
    $(".pre-match").show();
    $(".post-match").hide();
  } else if (matchStates[data.MatchState] === "POST_MATCH") {
    $(".during-match").hide();
    $(".during-and-post-match").show();
    $(".pre-and-during-match").hide();
    $(".pre-match").hide();
    $(".post-match").show();
  } else {
    $(".during-match").show();
    $(".during-and-post-match").show();
    $(".pre-and-during-match").show();
    $(".pre-match").hide();
    $(".post-match").hide();
  }
};

const endgameStatusNames = [
  "None",
  "Park",
  "Shallow",
  "Deep",
];

// Handles a websocket message to update the realtime scoring fields.
const handleRealtimeScore = function (data) {
  for (const [teamId, card] of Object.entries(Object.assign(data.RedCards, data.BlueCards))) {
    $(`[data-team="${teamId}"]`).attr("data-card", card);
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

    let l1_total = score.Reef.TroughNear + score.Reef.TroughFar;
    let l2_total = score.Reef.Branches[0].filter(Boolean).length;
    let l3_total = score.Reef.Branches[1].filter(Boolean).length;
    let l4_total = score.Reef.Branches[2].filter(Boolean).length;
    let l1_auto_total = score.Reef.AutoTroughNear + score.Reef.AutoTroughFar;
    let l2_auto_total = score.Reef.AutoBranches[0].filter(Boolean).length;
    let l3_auto_total = score.Reef.AutoBranches[1].filter(Boolean).length;
    let l4_auto_total = score.Reef.AutoBranches[2].filter(Boolean).length;

    let scoreRoot = `${alliance}ScoreSummary`;
    $(`#${scoreRoot} .team-1-leave`).text(score.LeaveStatuses[0] ? "✓" : "❌");
    $(`#${scoreRoot} .team-2-leave`).text(score.LeaveStatuses[1] ? "✓" : "❌");
    $(`#${scoreRoot} .team-3-leave`).text(score.LeaveStatuses[2] ? "✓" : "❌");
    $(`#${scoreRoot} .team-1-endgame`).text(endgameStatusNames[score.EndgameStatuses[0]]);
    $(`#${scoreRoot} .team-2-endgame`).text(endgameStatusNames[score.EndgameStatuses[1]]);
    $(`#${scoreRoot} .team-3-endgame`).text(endgameStatusNames[score.EndgameStatuses[2]]);
    $(`#${scoreRoot} .coral-l1`).text(l1_total);
    $(`#${scoreRoot} .coral-l2`).text(l2_total);
    $(`#${scoreRoot} .coral-l3`).text(l3_total);
    $(`#${scoreRoot} .coral-l4`).text(l4_total);
    $(`#${scoreRoot} .coral-l1-auto`).text(l1_auto_total);
    $(`#${scoreRoot} .coral-l2-auto`).text(l2_auto_total);
    $(`#${scoreRoot} .coral-l3-auto`).text(l3_auto_total);
    $(`#${scoreRoot} .coral-l4-auto`).text(l4_auto_total);
    $(`#${scoreRoot} .processor`).text(score.ProcessorAlgae);
    $(`#${scoreRoot} .barge`).text(score.BargeAlgae);
  }
}

// Handles a websocket message to update the scoring commit status.
const handleScoringStatus = function (data) {
  if (data.RefereeScoreReady) {
    $("#commitButton").attr("data-enabled", false);
  }
  updateScoreStatus(data, "red_near", "#redNearScoreStatus", "Red Near");
  updateScoreStatus(data, "red_far", "#redFarScoreStatus", "Red Far");
  updateScoreStatus(data, "blue_near", "#blueNearScoreStatus", "Blue Near");
  updateScoreStatus(data, "blue_far", "#blueFarScoreStatus", "Blue Far");

  scoreIsReady = true;
  for (const status of Object.values(data.PositionStatuses)) {
    if (!status.Ready) {
      scoreIsReady = false;
      break;
    }
  }

  if(scoreIsReady) {
    $("#commitButton").removeClass('disabled');
  } else {
    $("#commitButton").addClass('disabled');
  }
}

// Helper function to update a badge that shows scoring panel commit status.
const updateScoreStatus = function (data, position, element, displayName) {
  const status = data.PositionStatuses[position];
  $(element).text(`${displayName} ${status.NumPanelsReady}/${status.NumPanels}`);
  $(element).attr("data-present", status.NumPanels > 0);
  $(element).attr("data-ready", status.Ready);
};

// Populates the red/yellow card button for a given team.
const setTeamCard = function (alliance, position, team) {
  const cardButton = $(`#${alliance}Team${position}Card`);
  if (team === null) {
    cardButton.text(0);
    cardButton.attr("data-team", 0)
    cardButton.attr("data-old-yellow-card", "");
  } else {
    cardButton.text(team.Id);
    cardButton.attr("data-team", team.Id)
    cardButton.attr("data-old-yellow-card", team.YellowCard);
  }
  cardButton.attr("data-card", "");
}

// Populates the disable button for a given team.
const setTeamDisableCard = function (station, team) {
  const cardButton = $(`#${station}DisableCard`);
  if (team === null) {
    cardButton.text('-');
  } else {
    cardButton.text(team.Id);
  }
}

// Populates the disable status color for a given team.
const setTeamDisableStatusCard = function (station, status) {
  const cardButton = $(`#${station}DisableCard`);
  if(status.Bypass) {
    cardButton.removeClass('enabled-status');
    cardButton.addClass('disabled-status');
  } else {
    cardButton.addClass('enabled-status');
    cardButton.removeClass('disabled-status');
  }
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
  $(".headRef-dependent").attr("data-hr", urlParams.get("hr"));

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
    }
  });

  $(document).on('pointerup pointercancel', ()=> {
    fieldUnsafe();
  });
});

window.oncontextmenu = function() { return false; }
