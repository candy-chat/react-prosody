'use strict';

import React from 'react/addons'

import ChatActions from './_actions'

export default React.createClass({
  handleSubmit (e) {
    e.preventDefault();

    var message = this.refs.message.getDOMNode().value;
    this.refs.message.getDOMNode().value = '';

    ChatActions.newMessage(message);
  },

  render () {
    return (
      <form onSubmit={this.handleSubmit} style={ formStyle() }>
        <input type="text" ref="message" placeholder="Type a message" className="form-control" style={inputStyle()} />
      </form>
    );
  }
});


function formStyle() {
  return {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
  };
}

function inputStyle() {
  return {
    borderRadius: 0,
  };
}
