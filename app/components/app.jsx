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
