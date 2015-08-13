(function(Reflux, global) {
  'use strict';

  global.ChatActions = Reflux.createActions([
    "connectToServer",

    "newMessage",
    "messageReceived",
  ]);

})(window.Reflux, window);
