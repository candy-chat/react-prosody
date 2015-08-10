Candy.init('/http-bind/', { // uncomment & comment next line if you'd like to use BOSH
// Candy.init('ws://localhost:5280/xmpp-websocket/', {
  core: {
    // only set this to true if developing / debugging errors
    debug: true,
    // autojoin is a *required* parameter if you don't have a plugin (e.g. roomPanel) for it
    //   true
    //     -> fetch info from server (NOTE: does only work with openfire server)
    //   ['test@conference.example.com']
    //     -> array of rooms to join after connecting
    autojoin: ['test@conference.localhost']
  },
  view: { assets: 'res/' }
});

Candy.Core.connect('localhost');

(function(Reflux, ChatActions, global) {
  'use strict';

  global.chatStore = Reflux.createStore({
    listenables: [ChatActions],

    onNewMessage: function(message) {
      var roomJid = Candy.View.getCurrent().roomJid,
        // room = Candy.View.Pane.Chat.rooms[roomJid],
        roomType = 'groupchat',
        targetJid = 'test@conference.localhost',
        message = message,
        xhtmlMessage;

      Candy.Core.Action.Jabber.Room.Message(targetJid, message, roomType, xhtmlMessage);
    },

    onMessageReceived: function(message) {
      // console.warn(message);
      var mine = message.attributes[3].value.indexOf(Candy.Core.getUser().data.nick) !== -1;
      var msg = {
        body: message.getElementsByTagName('body')[0].innerHTML,
        author: message.attributes[3].value.split('/')[1],
        mine: mine,
      };

      var messages = this.messages.concat([msg]);

      this.updateList(messages);
    },

    updateList: function(messages) {
      this.messages = messages;
      this.trigger(messages);

      $('.list-wrapper').scrollTop($('ul').height());
    },

    getInitialState: function() {
      this.messages = [];

      return this.messages;
    }
  });

})(window.Reflux, window.ChatActions, window);


