(function(Reflux, ChatActions, global) {
  'use strict';

  global.chatStore = Reflux.createStore({
    listenables: [ChatActions],

    onNewMessage: function(message) {
      var messages = this.messages.concat([{body: message, mine: true}]);

      send(message);

      this.updateList(messages);
    },

    updateList: function(messages) {
      this.messages = messages;
      this.trigger(messages);

      $('.list-wrapper').scrollTop($('ul').height());
    },

    getInitialState: function() {
      var messagesFromServer = [
        { body: "Hello there!", mine: false },
        { body: "Hey!", mine: true },
        { body: "How's it going?", mine: false },
        { body: "Not bad", mine: true },
      ];

      this.messages = messagesFromServer;

      return this.messages;
    }
  });

})(window.Reflux, window.ChatActions, window);


