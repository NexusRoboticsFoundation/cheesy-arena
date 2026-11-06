// Copyright 2023 Team 254. All Rights Reserved.
// Author: pat@patfairbank.com (Patrick Fairbank)
//
// Client-side logic for the field supervisor interface.

let websocket;

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

$(function () {
  // Set up the websocket back to the server.
  websocket = new CheesyWebsocket("/panels/field_supervisor/websocket", {});

  // The keycode assigned to the physical USB button attached to the device.
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
});
