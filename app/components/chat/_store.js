'use strict';

import Reflux from 'reflux'
import $ from 'jquery'

import ServerConnection from '../../mixins/server_connection'
import ChatActions from './_actions'

import Candy from '../../vendor/candy'

export default Reflux.createStore({
  listenables: [ChatActions],
  mixins: [
    ServerConnection
  ],

  onConnectToServer: function (nickname) {
    this.connectUsing(nickname);
  },


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

