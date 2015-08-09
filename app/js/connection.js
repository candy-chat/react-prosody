var conn = new Strophe.Connection("/http-bind/");

conn.connect('localhost', "", function (status) {
  if (status === Strophe.Status.CONNECTED) {
    console.log('> Connected')

    conn.addHandler(onMessage, null, 'message', null, null,  null);
    conn.addHandler(onOwnMessage, null, 'iq', 'set', null,  null);
    conn.send($pres().tree());
  }
});

function onOwnMessage() {
  console.log("OWN MESSAGE");
  console.log(arguments);
}

function send (message) {
  var to = conn.jid;

  var reply = $msg({
    to: to,
    type: 'chat'
  })
    .cnode(Strophe.xmlElement('body', message)).up()
    .c('active', {xmlns: "http://jabber.org/protocol/chatstates"});

  conn.send(reply);
}

function onMessage(msg) {
  console.log("> Received");
  console.log(msg);

  var to = msg.getAttribute('to');
  var from = msg.getAttribute('from');
  var type = msg.getAttribute('type');
  var elems = msg.getElementsByTagName('body');

  if (type == "chat" && elems.length > 0) {
    var body = elems[0];
    var text = Strophe.getText(body) + " (this is echo)";

    log('ECHOBOT: I got a message from ' + from + ': ' + Strophe.getText(body));


    //var reply = $msg({to: from, from: to, type: 'chat', id: 'purple4dac25e4'}).c('active', {xmlns: "http://jabber.org/protocol/chatstates"}).up().cnode(body);
    //.cnode(Strophe.copyElement(body));
    conn.send(reply.tree());
    log('ECHOBOT: I sent ' + from + ': ' + Strophe.getText(body));
  }

  return true;
}