(function(React, Reflux, ChatActions, chatStore, global) {
  'use strict';

  var MessagesList = React.createClass({
    render () {
      function createMessage(message) {
        var className = message.mine ? 'mine' : 'their';
        return <li className={className}>{message.body}</li>;
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


  React.render(
    <Chat />,
    document.getElementById('messages-wrapper')
  );

})(window.React, window.Reflux, window.ChatActions, window.chatStore, window);
