Candy.init('/http-bind/', { // uncomment & comment next line if you'd like to use BOSH
// Candy.init('ws://localhost:5280/xmpp-websocket/', {
  core: {
    // only set this to true if developing / debugging errors
    debug: true,
    // autojoin is a *required* parameter if you don't have a plugin (e.g. roomPanel) for it
    //   true
    //     -> fetch info from server (NOTE: does only work with openfire server)
    //   ['test@conference.example.com']
    //     -> array of rooms to join after connecting
    autojoin: ['test@conference.localhost']
  },
  view: { assets: 'res/' }
});

Candy.Core.connect('localhost');
