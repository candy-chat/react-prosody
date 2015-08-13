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
