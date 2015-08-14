'use strict';

import React from 'react/addons';
import { Router, Route, Link, Navigation, DefaultRoute, RouteHandler } from 'react-router';
import HashHistory from 'react-router/lib/HashHistory';

import NicknameStorage from '../shared/nickname_storage'
import Nickname from './chat/nickname_form'
import Chat from './chat/main'
import ChatActions from './chat/_actions'


let App = React.createClass({
  propTypes: {
    children: React.PropTypes.object
  },

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
        <header style={headerStyle()}>
          <h3>Candy React</h3>
        </header>

        <hr/>

        <main style={headerStyle()}>
          { this.props.children }
        </main>
      </div>
    )
  }
});

function headerStyle () {
  return {
    padding: '0 20px'
  }
}


React.render((
  <Router history={ new HashHistory() }>
    <Route component={App}>
      <Route path="/" component={Chat} />
      <Route path="/nickname" component={Nickname} />
    </Route>
  </Router>
), document.getElementById('app'));
