'use strict';

import React from 'react/addons'
import { Navigation } from 'react-router'

import NicknameStorage from '../../shared/nickname_storage'
import ChatActions from './_actions'

export default React.createClass({
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
