'use strict';

import React from 'react/addons'

export default React.createClass({
  render () {
    function createMessage(message) {
      var className = message.mine ? 'mine' : 'their';

      return  <li className={className} style={liStyle(message.mine)}>
                <strong>{message.author}</strong>
                <br/>
                {message.body}
              </li>;
    }


    var listWrapperStyle = {
      overflow: 'auto',
      maxHeight: '80%',
    };

    return (
      <div className="list-wrapper" style={listWrapperStyle}>
        <ul className="list-unstyled">{this.props.messages.map(createMessage)}</ul>
      </div>
    )
  }
});



function liStyle(mine) {
  var style = {
    marginBottom: 20,
  };

  if (mine) {
    style.textAlign = 'right';
    style.paddingLeft = 50;
  } else {
    style.textAlign = 'left';
    style.paddingRight = 50;
  }

  return style
}
