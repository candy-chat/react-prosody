'use strict';

var ServerConnection = {
  connectUsing: function connectUsing(nickname) {
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

    Candy.Core.connect('localhost', null, nickname);
  }
};
'use strict';

var NicknameStorage = {
  getNickname: function getNickname() {
    return localStorage.getItem('nickname');
  },

  setNickname: function setNickname(nickname) {
    localStorage.setItem('nickname', nickname);
  }
};
"use strict";

(function (Reflux, global) {
  'use strict';

  global.ChatActions = Reflux.createActions(["connectToServer", "newMessage", "messageReceived"]);
})(window.Reflux, window);
'use strict';

var chatStore = Reflux.createStore({
  listenables: [ChatActions],
  mixins: [ServerConnection],

  onConnectToServer: function onConnectToServer(nickname) {
    this.connectUsing(nickname);
  },

  onNewMessage: function onNewMessage(message) {
    var roomJid = Candy.View.getCurrent().roomJid,

    // room = Candy.View.Pane.Chat.rooms[roomJid],
    roomType = 'groupchat',
        targetJid = 'test@conference.localhost',
        message = message,
        xhtmlMessage;

    Candy.Core.Action.Jabber.Room.Message(targetJid, message, roomType, xhtmlMessage);
  },

  onMessageReceived: function onMessageReceived(message) {
    // console.warn(message);
    var mine = message.attributes[3].value.indexOf(Candy.Core.getUser().data.nick) !== -1;
    var msg = {
      body: message.getElementsByTagName('body')[0].innerHTML,
      author: message.attributes[3].value.split('/')[1],
      mine: mine
    };

    var messages = this.messages.concat([msg]);

    this.updateList(messages);
  },

  updateList: function updateList(messages) {
    this.messages = messages;
    this.trigger(messages);

    $('.list-wrapper').scrollTop($('ul').height());
  },

  getInitialState: function getInitialState() {
    this.messages = [];

    return this.messages;
  }
});
'use strict';

var Chat = React.createClass({
  displayName: "Chat",

  mixins: [Reflux.connect(chatStore, "messages")],

  render: function render() {
    return React.createElement(
      "div",
      null,
      React.createElement(MessagesList, { messages: this.state.messages }),
      React.createElement(FormMessage, null)
    );
  }
});
'use strict';

// var styles = {
//   ul li:not(:last-child) {
//   margin-bottom: 20px; }
// ul li.their {
//   text-align: left;
//   padding-right: 50px; }
// ul li.mine {
//   text-align: right;
//   padding-left: 50px; }

// }

var MessagesList = React.createClass({
  displayName: 'MessagesList',

  render: function render() {
    function createMessage(message) {
      var className = message.mine ? 'mine' : 'their';

      return React.createElement(
        'li',
        { className: className },
        React.createElement(
          'strong',
          null,
          message.author
        ),
        React.createElement('br', null),
        message.body
      );
    }

    // listWrapperStyle = {
    //   position: 'absolute',
    //   width: '100%',
    //   height: '90%',
    //   overflow: 'auto'
    // };

    return React.createElement(
      'div',
      { className: 'list-wrapper' },
      React.createElement(
        'ul',
        { className: 'list-unstyled' },
        this.props.messages.map(createMessage)
      )
    );
  }
});
'use strict';

var FormMessage = React.createClass({
  displayName: 'FormMessage',

  handleSubmit: function handleSubmit(e) {
    e.preventDefault();

    var message = this.refs.message.getDOMNode().value;
    this.refs.message.getDOMNode().value = '';

    ChatActions.newMessage(message);
  },

  render: function render() {
    return React.createElement(
      'form',
      { onSubmit: this.handleSubmit },
      React.createElement('input', { type: 'text', ref: 'message', placeholder: 'Type a message', className: 'form-control' })
    );
  }
});
"use strict";

var Navigation = ReactRouter.Navigation;

var Nickname = React.createClass({
  displayName: "Nickname",

  mixins: [NicknameStorage, Navigation],

  handleSubmit: function handleSubmit(e) {
    e.preventDefault();

    var nickname = this.refs.nickname.getDOMNode().value;
    this.setNickname(nickname);

    ChatActions.connectToServer(nickname);

    this.transitionTo('/');
  },

  render: function render() {
    return React.createElement(
      "section",
      null,
      React.createElement(
        "h5",
        null,
        "Type a nickname to Join the room"
      ),
      React.createElement(
        "form",
        { onSubmit: this.handleSubmit },
        React.createElement("input", { type: "text", ref: "nickname" }),
        React.createElement(
          "button",
          { type: "submit" },
          "Join"
        )
      )
    );
  }
});
'use strict';

var _reactRouter = require('react-router');

// var Router = ReactRouter;
// var Route = Router.Route;
var Navigation = _reactRouter.Router.Navigation;
var RouteHandler = _reactRouter.Router.RouteHandler;
var DefaultRoute = _reactRouter.Router.DefaultRoute;
// var Link = Router.Link;

var App = React.createClass({
  displayName: 'App',

  mixins: [Navigation, NicknameStorage],

  componentWillMount: function componentWillMount() {
    if (this.getNickname()) {
      ChatActions.connectToServer(this.getNickname());
    } else {
      this.transitionTo('nickname');
    }
  },

  render: function render() {
    return React.createElement(
      'div',
      null,
      React.createElement(
        'header',
        null,
        React.createElement(
          'h3',
          null,
          'Candy React'
        )
      ),
      React.createElement(RouteHandler, null)
    );
  }
});

var routes = React.createElement(
  _reactRouter.Route,
  { handler: App, path: '/' },
  React.createElement(_reactRouter.Route, { name: 'nickname', handler: Nickname }),
  React.createElement(DefaultRoute, { handler: Chat })
);

_reactRouter.Router.run(routes, function (Handler) {
  React.render(React.createElement(Handler, null), document.getElementById('app'));
});