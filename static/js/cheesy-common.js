// Copyright 2024 Team 254. All Rights Reserved.
// Author: pat@patfairbank.com (Patrick Fairbank)
//
// Common JavaScript constants and functions used across multiple pages.

const newDateTimePicker = function (id, defaultTime) {
  new tempusDominus.TempusDominus(
    document.getElementById(id),
    {
      defaultDate: defaultTime,
      display: {
        components: {
          seconds: true,
        },
        icons: {
          type: "icons",
          time: "bi bi-clock",
          date: "bi bi-calendar-week",
          up: "bi bi-arrow-up",
          down: "bi bi-arrow-down",
          previous: "bi bi-chevron-left",
          next: "bi bi-chevron-right",
          today: "bi bi-calendar-check",
          clear: "bi bi-trash",
          close: "bi bi-x",
        },
      },
      localization: {
        format: "yyyy-MM-dd hh:mm:ss T",
        locale: "en",
      },
    }
  );
};

const isFullscreen = function () {
  var doc = window.document;

  return doc.fullscreenElement || doc.mozFullScreenElement 
      || doc.webkitFullscreenElement || doc.msFullscreenElement;
}

const toggleFullscreen = function () {
  var doc = window.document;
  var docElement = doc.documentElement;

  var requestFullScreen = docElement.requestFullscreen || 
      docElement.mozRequestFullScreen || docElement.webkitRequestFullScreen ||
      docElement.msRequestFullscreen;
  var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen ||
      doc.webkitExitFullscreen || doc.msExitFullscreen;
  
  if (!isFullscreen()) {
    requestFullScreen.call(docElement);
  }
  else {
    cancelFullScreen.call(doc);
  }
};