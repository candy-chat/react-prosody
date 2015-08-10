(function(Reflux, global) {
  'use strict';

  global.ChatActions = Reflux.createActions([
    "newMessage",
    "messageReceived",
  ]);

})(window.Reflux, window);
