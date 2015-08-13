'use strict';
var Router = ReactRouter;
var Route = Router.Route;
var Navigation = Router.Navigation;
var RouteHandler = Router.RouteHandler;
var DefaultRoute = Router.DefaultRoute;
var Link = Router.Link;


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

    return (
      <div className="list-wrapper">
        <ul className="list-unstyled">{this.props.messages.map(createMessage)}</ul>
      </div>
    )
  }
});


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
