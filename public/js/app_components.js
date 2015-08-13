var ServerConnection = {
  connectUsing (nickname) {
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

var NicknameStorage = {
  getNickname () {
    return localStorage.getItem('nickname');
  },

  setNickname (nickname) {
    localStorage.setItem('nickname', nickname);
  },
};

(function(Reflux, global) {
  'use strict';

  global.ChatActions = Reflux.createActions([
    "connectToServer",

    "newMessage",
    "messageReceived",
  ]);

})(window.Reflux, window);

'use strict';

var chatStore = Reflux.createStore({
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


'use strict';

var Chat = React.createClass({
  mixins: [
    Reflux.connect(chatStore, "messages")
  ],

  render () {
    return (
      <div>
        <MessagesList messages={this.state.messages} />

        <FormMessage />
      </div>
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
  render () {
    function createMessage(message) {
      var className = message.mine ? 'mine' : 'their';

      return  <li className={className}>
                <strong>{message.author}</strong>
                <br/>
                {message.body}
              </li>;
    }

    // listWrapperStyle = {
    //   position: 'absolute',
    //   width: '100%',
    //   height: '90%',
    //   overflow: 'auto'
    // };

    return (
      <div className="list-wrapper">
        <ul className="list-unstyled">{this.props.messages.map(createMessage)}</ul>
      </div>
    )
  }
});




'use strict';

var FormMessage = React.createClass({
  handleSubmit (e) {
    e.preventDefault();

    var message = this.refs.message.getDOMNode().value;
    this.refs.message.getDOMNode().value = '';

    ChatActions.newMessage(message);
  },

  render () {
    return (
      <form onSubmit={this.handleSubmit}>
        <input type="text" ref="message" placeholder="Type a message" className="form-control" />
      </form>
    );
  }
});

var Navigation = ReactRouter.Navigation;

var Nickname = React.createClass({
  mixins: [
    NicknameStorage,
    Navigation
  ],

  handleSubmit (e) {
    e.preventDefault();

    var nickname = this.refs.nickname.getDOMNode().value;
    this.setNickname(nickname);

    ChatActions.connectToServer(nickname);

    this.transitionTo('/');
  },

  render () {
    return (
      <section>
        <h5>Type a nickname to Join the room</h5>

        <form onSubmit={this.handleSubmit}>
          <input type="text" ref="nickname" />
          <button type="submit">Join</button>
        </form>
      </section>
    )
  }
});

'use strict';

var Router = ReactRouter;
var Route = Router.Route;
var Navigation = Router.Navigation;
var RouteHandler = Router.RouteHandler;
var DefaultRoute = Router.DefaultRoute;
var Link = Router.Link;


var App = React.createClass({
  mixins: [
    Navigation,
    NicknameStorage
  ],

  componentWillMount () {
    if (this.getNickname()) {
      ChatActions.connectToServer(this.getNickname());
    } else {
      this.transitionTo('nickname');
    }
  },

  render () {
    return (
      <div>
        <header>
          <h3>Candy React</h3>
        </header>

        <RouteHandler/>
      </div>
    )
  }
});

var routes = (
  <Route handler={App} path="/">
    <Route name="nickname" handler={ Nickname } />

    <DefaultRoute handler={ Chat } />
  </Route>
);

Router.run(routes, function (Handler) {
  React.render(<Handler/>, document.getElementById('app'));
});
