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



