'use strict';

import React from 'react/addons'
import Reflux from 'reflux'

import ChatStore from './_store'

import MessagesList from './messages_list'
import NewMessageForm from './new_message_form'

export default React.createClass({
  mixins: [
    Reflux.connect(ChatStore, "messages")
  ],

  render () {
    return (
      <div>
        <MessagesList messages={this.state.messages} />

        <NewMessageForm />
      </div>
    );
  }
});
