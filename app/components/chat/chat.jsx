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
