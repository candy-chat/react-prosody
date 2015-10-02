'use strict';

let jQuery = require('jquery');
require('strophe');
require('./strophejs-plugins/muc/strophe.muc.js');
require('./strophejs-plugins/roster/strophe.roster.js');
require('./strophejs-plugins/disco/strophe.disco.js');
require('./strophejs-plugins/caps/strophe.caps.jsonly.js');

import ChatActions from '../components/chat/_actions'

/** File: candy.js
 * Candy - Chats are not dead yet.
 *
 * Authors:
 *   - Patrick Stadler <patrick.stadler@gmail.com>
 *   - Michael Weibel <michael.weibel@gmail.com>
 *
 * Copyright:
 *   (c) 2011 Amiado Group AG. All rights reserved.
 *   (c) 2012-2014 Patrick Stadler & Michael Weibel. All rights reserved.
 *   (c) 2015 Adhearsion Foundation Inc <info@adhearsion.com>. All rights reserved.
 */

/* global jQuery */

/** Class: Candy
 * Candy base class for initalizing the view and the core
 *
 * Parameters:
 *   (Candy) self - itself
 *   (jQuery) $ - jQuery
 */
var Candy = (function(self, $) {
  /** Object: about
   * About candy
   *
   * Contains:
   *   (String) name - Candy
   *   (Float) version - Candy version
   */
  self.about = {
    name: 'Candy',
    version: '2.0.0'
  };

  /** Function: init
   * Init view & core
   *
   * Parameters:
   *   (String) service - URL to the BOSH interface
   *   (Object) options - Options for candy
   *
   * Options:
   *   (Boolean) debug - Debug (Default: false)
   *   (Array|Boolean) autojoin - Autojoin these channels. When boolean true, do not autojoin, wait if the server sends something.
   */
  self.init = function(service, options) {
    if (!options.viewClass) {
      options.viewClass = self.View;
    }
    // options.viewClass.init($('#candy'), options.view);
    self.Core.init(service, options.core);
  };

  return self;
}(Candy || {}, jQuery));

/** File: core.js
 * Candy - Chats are not dead yet.
 *
 * Authors:
 *   - Patrick Stadler <patrick.stadler@gmail.com>
 *   - Michael Weibel <michael.weibel@gmail.com>
 *
 * Copyright:
 *   (c) 2011 Amiado Group AG. All rights reserved.
 *   (c) 2012-2014 Patrick Stadler & Michael Weibel. All rights reserved.
 *   (c) 2015 Adhearsion Foundation Inc <info@adhearsion.com>. All rights reserved.
 */
'use strict';

/* global Candy, window, Strophe, jQuery */

/** Class: Candy.Core
 * Candy Chat Core
 *
 * Parameters:
 *   (Candy.Core) self - itself
 *   (Strophe) Strophe - Strophe JS
 *   (jQuery) $ - jQuery
 */
Candy.Core = (function(self, Strophe, $) {
    /** PrivateVariable: _connection
     * Strophe connection
     */
  var _connection = null,
    /** PrivateVariable: _service
     * URL of BOSH service
     */
    _service = null,
    /** PrivateVariable: _user
     * Current user (me)
     */
    _user = null,
    /** PrivateVariable: _roster
     * Main roster of contacts
     */
    _roster = null,
    /** PrivateVariable: _rooms
     * Opened rooms, containing instances of Candy.Core.ChatRooms
     */
    _rooms = {},
    /** PrivateVariable: _anonymousConnection
     * Set in <Candy.Core.connect> when jidOrHost doesn't contain a @-char.
     */
    _anonymousConnection = false,
    /** PrivateVariable: _status
     * Current Strophe connection state
     */
    _status,
    /** PrivateVariable: _options
     * Config options
     */
    _options = {
      /** Boolean: autojoin
       * If set to `true` try to get the bookmarks and autojoin the rooms (supported by ejabberd, Openfire).
       * You may want to define an array of rooms to autojoin: `['room1@conference.host.tld', 'room2...]` (ejabberd, Openfire, ...)
       */
      autojoin: undefined,
      /** Boolean: disconnectWithoutTabs
       * If you set to `false`, when you close all of the tabs, the service does not disconnect.
       * Set to `true`, when you close all of the tabs, the service will disconnect.
       */
      disconnectWithoutTabs: true,
      /** String: conferenceDomain
       * Holds the prefix for an XMPP chat server's conference subdomain.
       * If not set, assumes no specific subdomain.
       */
      conferenceDomain: undefined,
      /** Boolean: debug
       * Enable debug
       */
      debug: false,
      /** List: domains
       * If non-null, causes login form to offer this
       * pre-set list of domains to choose between when
       * logging in.  Any user-provided domain is discarded
       * and the selected domain is appended.
       * For each list item, only characters up to the first
       * whitespace are used, so you can append extra
       * information to each item if desired.
       */
      domains: null,
      /** Boolean: hideDomainList
       * If true, the domain list defined above is suppressed.
       * Without a selector displayed, the default domain
       * (usually the first one listed) will be used as
       * described above.  Probably only makes sense with a
       * single domain defined.
       */
      hideDomainList: false,
      /** Boolean: disableCoreNotifications
       * If set to `true`, the built-in notifications (sounds and badges) are disabled.
       * This is useful if you are using a plugin to handle notifications.
       */
      disableCoreNotifications: false,
      /** Boolean: disableWindowUnload
       * Disable window unload handler which usually disconnects from XMPP
       */
      disableWindowUnload: false,
      /** Integer: presencePriority
       * Default priority for presence messages in order to receive messages across different resources
       */
      presencePriority: 1,
      /** String: resource
       * JID resource to use when connecting to the server.
       * Specify `''` (an empty string) to request a random resource.
       */
      resource: Candy.about.name,
      /** Boolean: useParticipantRealJid
       * If set true, will direct one-on-one chats to participant's real JID rather than their MUC jid
       */
      useParticipantRealJid: false,
      /**
       * Roster version we claim to already have. Used when loading a cached roster.
       * Defaults to null, indicating we don't have the roster.
       */
      initialRosterVersion: null,
      /**
       * Initial roster items. Loaded from a cache, used to bootstrap displaying a roster prior to fetching updates.
       */
      initialRosterItems: []
    },

    /** PrivateFunction: _addNamespace
     * Adds a namespace.
     *
     * Parameters:
     *   (String) name - namespace name (will become a constant living in Strophe.NS.*)
     *   (String) value - XML Namespace
     */
    _addNamespace = function(name, value) {
      Strophe.addNamespace(name, value);
    },

    /** PrivateFunction: _addNamespaces
     * Adds namespaces needed by Candy.
     */
    _addNamespaces = function() {
      _addNamespace('PRIVATE', 'jabber:iq:private');
      _addNamespace('BOOKMARKS', 'storage:bookmarks');
      _addNamespace('PRIVACY', 'jabber:iq:privacy');
      _addNamespace('DELAY', 'urn:xmpp:delay');
      _addNamespace('JABBER_DELAY', 'jabber:x:delay');
      _addNamespace('PUBSUB', 'http://jabber.org/protocol/pubsub');
      _addNamespace('CARBONS', 'urn:xmpp:carbons:2');
    },

    _getEscapedJidFromJid = function(jid) {
      var node = Strophe.getNodeFromJid(jid),
        domain = Strophe.getDomainFromJid(jid);
      return node ? Strophe.escapeNode(node) + '@' + domain : domain;
    };

  /** Function: init
   * Initialize Core.
   *
   * Parameters:
   *   (String) service - URL of BOSH/Websocket service
   *   (Object) options - Options for candy
   */
  self.init = function(service, options) {
    _service = service;
    // Apply options
    $.extend(true, _options, options);

    // Enable debug logging
    if(_options.debug) {
      if(typeof window.console !== undefined && typeof window.console.log !== undefined) {
        // Strophe has a polyfill for bind which doesn't work in IE8.
        if(Function.prototype.bind && Candy.Util.getIeVersion() > 8) {
          self.log = Function.prototype.bind.call(console.log, console);
        } else {
          self.log = function() {
            Function.prototype.apply.call(console.log, console, arguments);
          };
        }
      }
      Strophe.log = function (level, message) {
        var level_name, console_level;
        switch (level) {
          case Strophe.LogLevel.DEBUG:
            level_name = 'DEBUG';
            console_level = 'log';
            break;
          case Strophe.LogLevel.INFO:
            level_name = 'INFO';
            console_level = 'info';
            break;
          case Strophe.LogLevel.WARN:
            level_name = 'WARN';
            console_level = 'info';
            break;
          case Strophe.LogLevel.ERROR:
            level_name = 'ERROR';
            console_level = 'error';
            break;
          case Strophe.LogLevel.FATAL:
            level_name = 'FATAL';
            console_level = 'error';
            break;
        }
        console[console_level]('[Strophe][' + level_name + ']: ' + message);
      };
      self.log('[Init] Debugging enabled');
    }

    _addNamespaces();

    _roster = new Candy.Core.ChatRoster();

    // Connect to BOSH/Websocket service
    _connection = new Strophe.Connection(_service);
    _connection.rawInput = self.rawInput.bind(self);
    _connection.rawOutput = self.rawOutput.bind(self);

    // set caps node
    _connection.caps.node = 'https://candy-chat.github.io/candy/';

    // Window unload handler... works on all browsers but Opera. There is NO workaround.
    // Opera clients getting disconnected 1-2 minutes delayed.
    if (!_options.disableWindowUnload) {
      window.onbeforeunload = self.onWindowUnload;
    }
  };

  /** Function: registerEventHandlers
   * Adds listening handlers to the connection.
   *
   * Use with caution from outside of Candy.
   */
  self.registerEventHandlers = function() {
    self.addHandler(self.Event.Jabber.Version, Strophe.NS.VERSION, 'iq');
    self.addHandler(self.Event.Jabber.Presence, null, 'presence');

    // self.addHandler(self.Event.Jabber.Message, null, 'message');
    self.addHandler(ChatActions.messageReceived, null, 'message');

    self.addHandler(self.Event.Jabber.Bookmarks, Strophe.NS.PRIVATE, 'iq');
    self.addHandler(self.Event.Jabber.Room.Disco, Strophe.NS.DISCO_INFO, 'iq', 'result');

    self.addHandler(_connection.disco._onDiscoInfo.bind(_connection.disco), Strophe.NS.DISCO_INFO, 'iq', 'get');
    self.addHandler(_connection.disco._onDiscoItems.bind(_connection.disco), Strophe.NS.DISCO_ITEMS, 'iq', 'get');
    self.addHandler(_connection.caps._delegateCapabilities.bind(_connection.caps), Strophe.NS.CAPS);
  };

  /** Function: connect
   * Connect to the jabber host.
   *
   * There are four different procedures to login:
   *   connect('JID', 'password') - Connect a registered user
   *   connect('domain') - Connect anonymously to the domain. The user should receive a random JID.
   *   connect('domain', null, 'nick') - Connect anonymously to the domain. The user should receive a random JID but with a nick set.
   *   connect('JID') - Show login form and prompt for password. JID input is hidden.
   *   connect() - Show login form and prompt for JID and password.
   *
   * See:
   *   <Candy.Core.attach()> for attaching an already established session.
   *
   * Parameters:
   *   (String) jidOrHost - JID or Host
   *   (String) password  - Password of the user
   *   (String) nick      - Nick of the user. Set one if you want to anonymously connect but preset a nick. If jidOrHost is a domain
   *                        and this param is not set, Candy will prompt for a nick.
   */
  self.connect = function(jidOrHost, password, nick) {
    // Reset before every connection attempt to make sure reconnections work after authfail, alltabsclosed, ...
    _connection.reset();
    self.registerEventHandlers();
    /** Event: candy:core.before-connect
     * Triggered before a connection attempt is made.
     *
     * Plugins should register their stanza handlers using this event
     * to ensure that they are set.
     *
     * See also <#84 at https://github.com/candy-chat/candy/issues/84>.
     *
     * Parameters:
     *   (Strophe.Connection) conncetion - Strophe connection
     */
    $(Candy).triggerHandler('candy:core.before-connect', {
      connection: _connection
    });

    _anonymousConnection = !_anonymousConnection ? jidOrHost && jidOrHost.indexOf("@") < 0 : true;

    if(jidOrHost && password) {
      // Respect the resource, if provided
      var resource = Strophe.getResourceFromJid(jidOrHost);
      if (resource) {
        _options.resource = resource;
      }

      // authentication
      _connection.connect(_getEscapedJidFromJid(jidOrHost) + '/' + _options.resource, password, Candy.Core.Event.Strophe.Connect);
      if (nick) {
        _user = new self.ChatUser(jidOrHost, nick);
      } else {
        _user = new self.ChatUser(jidOrHost, Strophe.getNodeFromJid(jidOrHost));
      }
    } else if(jidOrHost && nick) {
      // anonymous connect
      _connection.connect(_getEscapedJidFromJid(jidOrHost) + '/' + _options.resource, null, Candy.Core.Event.Strophe.Connect);
      _user = new self.ChatUser(null, nick); // set jid to null because we'll later receive it
    } else if(jidOrHost) {
      Candy.Core.Event.Login(jidOrHost);
    } else {
      // display login modal
      Candy.Core.Event.Login();
    }
  };

  /** Function: attach
   * Attach an already binded & connected session to the server
   *
   * _See_ Strophe.Connection.attach
   *
   * Parameters:
   *   (String) jid - Jabber ID
   *   (Integer) sid - Session ID
   *   (Integer) rid - rid
   */
  self.attach = function(jid, sid, rid, nick) {
    if (nick) {
      _user = new self.ChatUser(jid, nick);
    } else {
      _user = new self.ChatUser(jid, Strophe.getNodeFromJid(jid));
    }
    // Reset before every connection attempt to make sure reconnections work after authfail, alltabsclosed, ...
    _connection.reset();
    self.registerEventHandlers();
    _connection.attach(jid, sid, rid, Candy.Core.Event.Strophe.Connect);
  };

  /** Function: disconnect
   * Leave all rooms and disconnect
   */
  self.disconnect = function() {
    if(_connection.connected) {
      _connection.disconnect();
    }
  };

  /** Function: addHandler
   * Wrapper for Strophe.Connection.addHandler() to add a stanza handler for the connection.
   *
   * Parameters:
   *   (Function) handler - The user callback.
   *   (String) ns - The namespace to match.
   *   (String) name - The stanza name to match.
   *   (String) type - The stanza type attribute to match.
   *   (String) id - The stanza id attribute to match.
   *   (String) from - The stanza from attribute to match.
   *   (String) options - The handler options
   *
   * Returns:
   *   A reference to the handler that can be used to remove it.
   */
  self.addHandler = function(handler, ns, name, type, id, from, options) {
    return _connection.addHandler(handler, ns, name, type, id, from, options);
  };

  /** Function: getRoster
   * Gets main roster
   *
   * Returns:
   *   Instance of Candy.Core.ChatRoster
   */
  self.getRoster = function() {
    return _roster;
  };

  /** Function: getUser
   * Gets current user
   *
   * Returns:
   *   Instance of Candy.Core.ChatUser
   */
  self.getUser = function() {
    return _user;
  };

  /** Function: setUser
   * Set current user. Needed when anonymous login is used, as jid gets retrieved later.
   *
   * Parameters:
   *   (Candy.Core.ChatUser) user - User instance
   */
  self.setUser = function(user) {
    _user = user;
  };

  /** Function: getConnection
   * Gets Strophe connection
   *
   * Returns:
   *   Instance of Strophe.Connection
   */
  self.getConnection = function() {
    return _connection;
  };

  /** Function: removeRoom
   * Removes a room from the rooms list
   *
   * Parameters:
   *   (String) roomJid - roomJid
   */
  self.removeRoom = function(roomJid) {
    delete _rooms[roomJid];
  };

  /** Function: getRooms
   * Gets all joined rooms
   *
   * Returns:
   *   Object containing instances of Candy.Core.ChatRoom
   */
  self.getRooms = function() {
    return _rooms;
  };

  /** Function: getStropheStatus
   * Get the status set by Strophe.
   *
   * Returns:
   *   (Strophe.Status.*) - one of Strophe's statuses
   */
  self.getStropheStatus = function() {
    return _status;
  };

  /** Function: setStropheStatus
   * Set the strophe status
   *
   * Called by:
   *   Candy.Core.Event.Strophe.Connect
   *
   * Parameters:
   *   (Strophe.Status.*) status - Strophe's status
   */
  self.setStropheStatus = function(status) {
    _status = status;
  };

  /** Function: isAnonymousConnection
   * Returns true if <Candy.Core.connect> was first called with a domain instead of a jid as the first param.
   *
   * Returns:
   *   (Boolean)
   */
  self.isAnonymousConnection = function() {
    return _anonymousConnection;
  };

  /** Function: getOptions
   * Gets options
   *
   * Returns:
   *   Object
   */
  self.getOptions = function() {
    return _options;
  };

    /** Function: getRoom
   * Gets a specific room
   *
   * Parameters:
   *   (String) roomJid - JID of the room
   *
   * Returns:
   *   If the room is joined, instance of Candy.Core.ChatRoom, otherwise null.
   */
  self.getRoom = function(roomJid) {
    if (_rooms[roomJid]) {
      return _rooms[roomJid];
    }
    return null;
  };

  /** Function: onWindowUnload
   * window.onbeforeunload event which disconnects the client from the Jabber server.
   */
  self.onWindowUnload = function() {
    // Enable synchronous requests because Safari doesn't send asynchronous requests within unbeforeunload events.
    // Only works properly when following patch is applied to strophejs: https://github.com/metajack/strophejs/issues/16/#issuecomment-600266
    _connection.options.sync = true;
    self.disconnect();
    _connection.flush();
  };

  /** Function: rawInput
   * (Overridden from Strophe.Connection.rawInput)
   *
   * Logs all raw input if debug is set to true.
   */
  self.rawInput = function(data) {
    this.log('RECV: ' + data);
  };

  /** Function rawOutput
   * (Overridden from Strophe.Connection.rawOutput)
   *
   * Logs all raw output if debug is set to true.
   */
  self.rawOutput = function(data) {
    this.log('SENT: ' + data);
  };

  /** Function: log
   * Overridden to do something useful if debug is set to true.
   *
   * See: Candy.Core#init
   */
  self.log = function() {};

  /** Function: warn
   * Print a message to the browser's "info" log
   * Enabled regardless of debug mode
   */
  self.warn = function() {
    Function.prototype.apply.call(console.warn, console, arguments);
  };

  /** Function: error
   * Print a message to the browser's "error" log
   * Enabled regardless of debug mode
   */
  self.error = function() {
    Function.prototype.apply.call(console.error, console, arguments);
  };

  return self;
}(Candy.Core || {}, Strophe, jQuery));

/** File: view.js
 * Candy - Chats are not dead yet.
 *
 * Authors:
 *   - Patrick Stadler <patrick.stadler@gmail.com>
 *   - Michael Weibel <michael.weibel@gmail.com>
 *
 * Copyright:
 *   (c) 2011 Amiado Group AG. All rights reserved.
 *   (c) 2012-2014 Patrick Stadler & Michael Weibel. All rights reserved.
 *   (c) 2015 Adhearsion Foundation Inc <info@adhearsion.com>. All rights reserved.
 */
'use strict';

/* global jQuery, Candy, window, Mustache, document */

/** Class: Candy.View
 * The Candy View Class
 *
 * Parameters:
 *   (Candy.View) self - itself
 *   (jQuery) $ - jQuery
 */
Candy.View = (function(self, $) {
    /** PrivateObject: _current
     * Object containing current container & roomJid which the client sees.
     */
  var _current = { container: null, roomJid: null },
    /** PrivateObject: _options
     *
     * Options:
     *   (String) language - language to use
     *   (String) assets - path to assets (res) directory (with trailing slash)
     *   (Object) messages - limit: clean up message pane when n is reached / remove: remove n messages after limit has been reached
     *   (Object) crop - crop if longer than defined: message.nickname=15, message.body=1000, message.url=undefined (not cropped), roster.nickname=15
     *   (Bool) enableXHTML - [default: false] enables XHTML messages sending & displaying
     */
    _options = {
      language: 'en',
      assets: 'res/',
      messages: { limit: 2000, remove: 500 },
      crop: {
        message: { nickname: 15, body: 1000, url: undefined },
        roster: { nickname: 15 }
      },
      enableXHTML: false
    },

    /** PrivateFunction: _setupTranslation
     * Set dictionary using jQuery.i18n plugin.
     *
     * See: view/translation.js
     * See: libs/jquery-i18n/jquery.i18n.js
     *
     * Parameters:
     *   (String) language - Language identifier
     */
    _setupTranslation = function(language) {
      $.i18n.load(self.Translation[language]);
    },

    /** PrivateFunction: _registerObservers
     * Register observers. Candy core will now notify the View on changes.
     */
    _registerObservers = function() {
      $(Candy).on('candy:core.chat.connection', self.Observer.Chat.Connection);
      $(Candy).on('candy:core.chat.message', self.Observer.Chat.Message);
      $(Candy).on('candy:core.login', self.Observer.Login);
      $(Candy).on('candy:core.autojoin-missing', self.Observer.AutojoinMissing);
      $(Candy).on('candy:core.presence', self.Observer.Presence.update);
      $(Candy).on('candy:core.presence.leave', self.Observer.Presence.update);
      $(Candy).on('candy:core.presence.room', self.Observer.Presence.update);
      $(Candy).on('candy:core.presence.error', self.Observer.PresenceError);
      $(Candy).on('candy:core.message', self.Observer.Message);
    },

    /** PrivateFunction: _registerWindowHandlers
     * Register window focus / blur / resize handlers.
     *
     * jQuery.focus()/.blur() <= 1.5.1 do not work for IE < 9. Fortunately onfocusin/onfocusout will work for them.
     */
    _registerWindowHandlers = function() {
      if(Candy.Util.getIeVersion() < 9) {
        $(document).focusin(Candy.View.Pane.Window.onFocus).focusout(Candy.View.Pane.Window.onBlur);
      } else {
        $(window).focus(Candy.View.Pane.Window.onFocus).blur(Candy.View.Pane.Window.onBlur);
      }
      $(window).resize(Candy.View.Pane.Chat.fitTabs);
    },

    /** PrivateFunction: _initToolbar
     * Initialize toolbar.
     */
    _initToolbar = function() {
      self.Pane.Chat.Toolbar.init();
    },

    /** PrivateFunction: _delegateTooltips
     * Delegate mouseenter on tooltipified element to <Candy.View.Pane.Chat.Tooltip.show>.
     */
    _delegateTooltips = function() {
      $('body').delegate('li[data-tooltip]', 'mouseenter', Candy.View.Pane.Chat.Tooltip.show);
    };

  /** Function: init
   * Initialize chat view (setup DOM, register handlers & observers)
   *
   * Parameters:
   *   (jQuery.element) container - Container element of the whole chat view
   *   (Object) options - Options: see _options field (value passed here gets extended by the default value in _options field)
   */
  self.init = function(container, options) {
    // #216
    // Rename `resources` to `assets` but prevent installations from failing
    // after upgrade
    if(options.resources) {
      options.assets = options.resources;
    }
    delete options.resources;

    $.extend(true, _options, options);
    _setupTranslation(_options.language);

    // Set path to emoticons
    Candy.Util.Parser.setEmoticonPath(this.getOptions().assets + 'img/emoticons/');

    // Start DOMination...
    _current.container = container;
    _current.container.html(Mustache.to_html(Candy.View.Template.Chat.pane, {
      tooltipEmoticons : $.i18n._('tooltipEmoticons'),
      tooltipSound : $.i18n._('tooltipSound'),
      tooltipAutoscroll : $.i18n._('tooltipAutoscroll'),
      tooltipStatusmessage : $.i18n._('tooltipStatusmessage'),
      tooltipAdministration : $.i18n._('tooltipAdministration'),
      tooltipUsercount : $.i18n._('tooltipUsercount'),
      assetsPath : this.getOptions().assets
    }, {
      tabs: Candy.View.Template.Chat.tabs,
      rooms: Candy.View.Template.Chat.rooms,
      modal: Candy.View.Template.Chat.modal,
      toolbar: Candy.View.Template.Chat.toolbar
    }));

    // ... and let the elements dance.
    _registerWindowHandlers();
    _initToolbar();
    _registerObservers();
    _delegateTooltips();
  };

  /** Function: getCurrent
   * Get current container & roomJid in an object.
   *
   * Returns:
   *   Object containing container & roomJid
   */
  self.getCurrent = function() {
    return _current;
  };

  /** Function: getOptions
   * Gets options
   *
   * Returns:
   *   Object
   */
  self.getOptions = function() {
    return _options;
  };

  return self;
}(Candy.View || {}, jQuery));

/** File: util.js
 * Candy - Chats are not dead yet.
 *
 * Authors:
 *   - Patrick Stadler <patrick.stadler@gmail.com>
 *   - Michael Weibel <michael.weibel@gmail.com>
 *
 * Copyright:
 *   (c) 2011 Amiado Group AG. All rights reserved.
 *   (c) 2012-2014 Patrick Stadler & Michael Weibel. All rights reserved.
 *   (c) 2015 Adhearsion Foundation Inc <info@adhearsion.com>. All rights reserved.
 */
'use strict';

/* global Candy, MD5, Strophe, document, escape, jQuery */

/** Class: Candy.Util
 * Candy utils
 *
 * Parameters:
 *   (Candy.Util) self - itself
 *   (jQuery) $ - jQuery
 */
Candy.Util = (function(self, $){
  /** Function: jidToId
   * Translates a jid to a MD5-Id
   *
   * Parameters:
   *   (String) jid - Jid
   *
   * Returns:
   *   MD5-ified jid
   */
  self.jidToId = function(jid) {
    return MD5.hexdigest(jid);
  };

  /** Function: escapeJid
   * Escapes a jid
   *
   * See:
   *   XEP-0106
   *
   * Parameters:
   *   (String) jid - Jid
   *
   * Returns:
   *   (String) - escaped jid
   */
  self.escapeJid = function(jid) {
    var node = Strophe.escapeNode(Strophe.getNodeFromJid(jid)),
      domain = Strophe.getDomainFromJid(jid),
      resource = Strophe.getResourceFromJid(jid);

    jid = node + '@' + domain;
    if (resource) {
      jid += '/' + resource;
    }

    return jid;
  };

  /** Function: unescapeJid
   * Unescapes a jid (node & resource get unescaped)
   *
   * See:
   *   XEP-0106
   *
   * Parameters:
   *   (String) jid - Jid
   *
   * Returns:
   *   (String) - unescaped Jid
   */
  self.unescapeJid = function(jid) {
    var node = Strophe.unescapeNode(Strophe.getNodeFromJid(jid)),
      domain = Strophe.getDomainFromJid(jid),
      resource = Strophe.getResourceFromJid(jid);

    jid = node + '@' + domain;
    if(resource) {
      jid += '/' + resource;
    }

    return jid;
  };

  /** Function: crop
   * Crop a string with the specified length
   *
   * Parameters:
   *   (String) str - String to crop
   *   (Integer) len - Max length
   */
  self.crop = function(str, len) {
    if (str.length > len) {
      str = str.substr(0, len - 3) + '...';
    }
    return str;
  };

  /** Function: parseAndCropXhtml
   * Parses the XHTML and applies various Candy related filters to it.
   *
   *  - Ensures it contains only valid XHTML
   *  - Crops text to a max length
   *  - Parses the text in order to display html
   *
   * Parameters:
   *   (String) str - String containing XHTML
   *   (Integer) len - Max text length
   */
  self.parseAndCropXhtml = function(str, len) {
    return $('<div/>').append(self.createHtml($(str).get(0), len)).html();
  };

  /** Function: setCookie
   * Sets a new cookie
   *
   * Parameters:
   *   (String) name - cookie name
   *   (String) value - Value
   *   (Integer) lifetime_days - Lifetime in days
   */
  self.setCookie = function(name, value, lifetime_days) {
    var exp = new Date();
    exp.setDate(new Date().getDate() + lifetime_days);
    document.cookie = name + '=' + value + ';expires=' + exp.toUTCString() + ';path=/';
  };

  /** Function: cookieExists
   * Tests if a cookie with the given name exists
   *
   * Parameters:
   *   (String) name - Cookie name
   *
   * Returns:
   *   (Boolean) - true/false
   */
  self.cookieExists = function(name) {
    return document.cookie.indexOf(name) > -1;
  };

  /** Function: getCookie
   * Returns the cookie value if there's one with this name, otherwise returns undefined
   *
   * Parameters:
   *   (String) name - Cookie name
   *
   * Returns:
   *   Cookie value or undefined
   */
  self.getCookie = function(name) {
    if(document.cookie) {
      var regex = new RegExp(escape(name) + '=([^;]*)', 'gm'),
        matches = regex.exec(document.cookie);
      if(matches) {
        return matches[1];
      }
    }
  };

  /** Function: deleteCookie
   * Deletes a cookie with the given name
   *
   * Parameters:
   *   (String) name - cookie name
   */
  self.deleteCookie = function(name) {
    document.cookie = name + '=;expires=Thu, 01-Jan-70 00:00:01 GMT;path=/';
  };

  /** Function: getPosLeftAccordingToWindowBounds
   * Fetches the window width and element width
   * and checks if specified position + element width is bigger
   * than the window width.
   *
   * If this evaluates to true, the position gets substracted by the element width.
   *
   * Parameters:
   *   (jQuery.Element) elem - Element to position
   *   (Integer) pos - Position left
   *
   * Returns:
   *   Object containing `px` (calculated position in pixel) and `alignment` (alignment of the element in relation to pos, either 'left' or 'right')
   */
  self.getPosLeftAccordingToWindowBounds = function(elem, pos) {
    var windowWidth = $(document).width(),
      elemWidth   = elem.outerWidth(),
      marginDiff = elemWidth - elem.outerWidth(true),
      backgroundPositionAlignment = 'left';

    if (pos + elemWidth >= windowWidth) {
      pos -= elemWidth - marginDiff;
      backgroundPositionAlignment = 'right';
    }

    return { px: pos, backgroundPositionAlignment: backgroundPositionAlignment };
  };

  /** Function: getPosTopAccordingToWindowBounds
   * Fetches the window height and element height
   * and checks if specified position + element height is bigger
   * than the window height.
   *
   * If this evaluates to true, the position gets substracted by the element height.
   *
   * Parameters:
   *   (jQuery.Element) elem - Element to position
   *   (Integer) pos - Position top
   *
   * Returns:
   *   Object containing `px` (calculated position in pixel) and `alignment` (alignment of the element in relation to pos, either 'top' or 'bottom')
   */
  self.getPosTopAccordingToWindowBounds = function(elem, pos) {
    var windowHeight = $(document).height(),
      elemHeight   = elem.outerHeight(),
      marginDiff = elemHeight - elem.outerHeight(true),
      backgroundPositionAlignment = 'top';

    if (pos + elemHeight >= windowHeight) {
      pos -= elemHeight - marginDiff;
      backgroundPositionAlignment = 'bottom';
    }

    return { px: pos, backgroundPositionAlignment: backgroundPositionAlignment };
  };

  /** Function: localizedTime
   * Localizes ISO-8610 Date with the time/dateformat specified in the translation.
   *
   * See: libs/dateformat/dateFormat.js
   * See: src/view/translation.js
   * See: jquery-i18n/jquery.i18n.js
   *
   * Parameters:
   *   (String) dateTime - ISO-8610 Datetime
   *
   * Returns:
   *   If current date is equal to the date supplied, format with timeFormat, otherwise with dateFormat
   */
  self.localizedTime = function(dateTime) {
    if (dateTime === undefined) {
      return undefined;
    }

    // See if we were passed a Date object
    var date;
    if (dateTime.toDateString) {
      date = dateTime;
    } else {
      date = self.iso8601toDate(dateTime);
    }

    if(date.toDateString() === new Date().toDateString()) {
      return date.format($.i18n._('timeFormat'));
    } else {
      return date.format($.i18n._('dateFormat'));
    }
  };

  /** Function: iso8610toDate
   * Parses a ISO-8610 Date to a Date-Object.
   *
   * Uses a fallback if the client's browser doesn't support it.
   *
   * Quote:
   *   ECMAScript revision 5 adds native support for ISO-8601 dates in the Date.parse method,
   *   but many browsers currently on the market (Safari 4, Chrome 4, IE 6-8) do not support it.
   *
   * Credits:
   *  <Colin Snover at http://zetafleet.com/blog/javascript-dateparse-for-iso-8601>
   *
   * Parameters:
   *   (String) date - ISO-8610 Date
   *
   * Returns:
   *   Date-Object
   */
  self.iso8601toDate = function(date) {
    var timestamp = Date.parse(date);
    if(isNaN(timestamp)) {
      var struct = /^(\d{4}|[+\-]\d{6})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3,}))?)?(?:(Z)|([+\-])(\d{2})(?::?(\d{2}))?))?/.exec(date);
      if(struct) {
        var minutesOffset = 0;
        if(struct[8] !== 'Z') {
          minutesOffset = +struct[10] * 60 + (+struct[11]);
          if(struct[9] === '+') {
            minutesOffset = -minutesOffset;
          }
        }
        minutesOffset -= new Date().getTimezoneOffset();
        return new Date(+struct[1], +struct[2] - 1, +struct[3], +struct[4], +struct[5] + minutesOffset, +struct[6], struct[7] ? +struct[7].substr(0, 3) : 0);
      } else {
        // XEP-0091 date
        timestamp = Date.parse(date.replace(/^(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') + 'Z');
      }
    }
    return new Date(timestamp);
  };

  /** Function: isEmptyObject
   * IE7 doesn't work with jQuery.isEmptyObject (<=1.5.1), workaround.
   *
   * Parameters:
   *   (Object) obj - the object to test for
   *
   * Returns:
   *   Boolean true or false.
   */
  self.isEmptyObject = function(obj) {
    var prop;
    for(prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        return false;
      }
    }
    return true;
  };

  /** Function: forceRedraw
   * Fix IE7 not redrawing under some circumstances.
   *
   * Parameters:
   *   (jQuery.element) elem - jQuery element to redraw
   */
  self.forceRedraw = function(elem) {
    elem.css({display:'none'});
    setTimeout(function() {
      this.css({display:'block'});
    }.bind(elem), 1);
  };

  /** PrivateVariable: ie
   * Checks for IE version
   *
   * From: http://stackoverflow.com/a/5574871/315242
   */
  var ie = (function(){
    var undef,
      v = 3,
      div = document.createElement('div'),
      all = div.getElementsByTagName('i');
    while (
      // adds innerhtml and continues as long as all[0] is truthy
      div.innerHTML = '<!--[if gt IE ' + (++v) + ']><i></i><![endif]-->',
      all[0]
    ) {}
    return v > 4 ? v : undef;
  }());

  /** Function: getIeVersion
   * Returns local variable `ie` which you can use to detect which IE version
   * is available.
   *
   * Use e.g. like this: if(Candy.Util.getIeVersion() < 9) alert('kaboom');
   */
  self.getIeVersion = function() {
    return ie;
  };

  /** Function: isMobile
    * Checks to see if we're on a mobile device.
    */
  self.isMobile = function() {
    var check = false;
    (function(a){ if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od|ad)|android|ipad|playbook|silk|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) { check = true; } })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
  };

  /** Class: Candy.Util.Parser
   * Parser for emoticons, links and also supports escaping.
   */
  self.Parser = {
    /** Function: jid
     * Parse a JID into an object with each element
     *
     * Parameters:
     *  (String) jid - The string representation of a JID
     */
    jid: function (jid) {
      var r = /^(([^@]+)@)?([^\/]+)(\/(.*))?$/i,
        a = jid.match(r);

      if (!a) { throw "not a valid jid (" + jid + ")"; }

      return {node: a[2], domain: a[3], resource: a[4]};
    },

    /** PrivateVariable: _emoticonPath
     * Path to emoticons.
     *
     * Use setEmoticonPath() to change it
     */
    _emoticonPath: '',

    /** Function: setEmoticonPath
     * Set emoticons location.
     *
     * Parameters:
     *   (String) path - location of emoticons with trailing slash
     */
    setEmoticonPath: function(path) {
      this._emoticonPath = path;
    },

    /** Array: emoticons
     * Array containing emoticons to be replaced by their images.
     *
     * Can be overridden/extended.
     */
    emoticons: [
      {
        plain: ':)',
        regex: /((\s):-?\)|:-?\)(\s|$))/gm,
        image: 'Smiling.png'
      },
      {
        plain: ';)',
        regex: /((\s);-?\)|;-?\)(\s|$))/gm,
        image: 'Winking.png'
      },
      {
        plain: ':D',
        regex: /((\s):-?D|:-?D(\s|$))/gm,
        image: 'Grinning.png'
      },
      {
        plain: ';D',
        regex: /((\s);-?D|;-?D(\s|$))/gm,
        image: 'Grinning_Winking.png'
      },
      {
        plain: ':(',
        regex: /((\s):-?\(|:-?\((\s|$))/gm,
        image: 'Unhappy.png'
      },
      {
        plain: '^^',
        regex: /((\s)\^\^|\^\^(\s|$))/gm,
        image: 'Happy_3.png'
      },
      {
        plain: ':P',
        regex: /((\s):-?P|:-?P(\s|$))/igm,
        image: 'Tongue_Out.png'
      },
      {
        plain: ';P',
        regex: /((\s);-?P|;-?P(\s|$))/igm,
        image: 'Tongue_Out_Winking.png'
      },
      {
        plain: ':S',
        regex: /((\s):-?S|:-?S(\s|$))/igm,
        image: 'Confused.png'
      },
      {
        plain: ':/',
        regex: /((\s):-?\/|:-?\/(\s|$))/gm,
        image: 'Uncertain.png'
      },
      {
        plain: '8)',
        regex: /((\s)8-?\)|8-?\)(\s|$))/gm,
        image: 'Sunglasses.png'
      },
      {
        plain: '$)',
        regex: /((\s)\$-?\)|\$-?\)(\s|$))/gm,
        image: 'Greedy.png'
      },
      {
        plain: 'oO',
        regex: /((\s)oO|oO(\s|$))/gm,
        image: 'Huh.png'
      },
      {
        plain: ':x',
        regex: /((\s):x|:x(\s|$))/gm,
        image: 'Lips_Sealed.png'
      },
      {
        plain: ':666:',
        regex: /((\s):666:|:666:(\s|$))/gm,
        image: 'Devil.png'
      },
      {
        plain: '<3',
        regex: /((\s)&lt;3|&lt;3(\s|$))/gm,
        image: 'Heart.png'
      }
    ],

    /** Function: emotify
     * Replaces text-emoticons with their image equivalent.
     *
     * Parameters:
     *   (String) text - Text to emotify
     *
     * Returns:
     *   Emotified text
     */
    emotify: function(text) {
      var i;
      for(i = this.emoticons.length-1; i >= 0; i--) {
        text = text.replace(this.emoticons[i].regex, '$2<img class="emoticon" alt="$1" title="$1" src="' + this._emoticonPath + this.emoticons[i].image + '" />$3');
      }
      return text;
    },

    /** Function: linkify
     * Replaces URLs with a HTML-link.
     * big regex adapted from https://gist.github.com/dperini/729294 - Diego Perini, MIT license.
     *
     * Parameters:
     *   (String) text - Text to linkify
     *
     * Returns:
     *   Linkified text
     */
    linkify: function(text) {
      text = text.replace(/(^|[^\/])(www\.[^\.]+\.[\S]+(\b|$))/gi, '$1http://$2');
      return text.replace(/(\b(?:(?:https?|ftp|file):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:1\d\d|2[01]\d|22[0-3]|[1-9]\d?)(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?)/gi, function(matched, url) {
        return '<a href="' + url + '" target="_blank">' + self.crop(url, Candy.View.getOptions().crop.message.url) + '</a>';
      });
    },

    /** Function: escape
     * Escapes a text using a jQuery function (like htmlspecialchars in PHP)
     *
     * Parameters:
     *   (String) text - Text to escape
     *
     * Returns:
     *   Escaped text
     */
    escape: function(text) {
      return $('<div/>').text(text).html();
    },

    /** Function: nl2br
     * replaces newline characters with a <br/> to make multi line messages look nice
     *
     * Parameters:
     *   (String) text - Text to process
     *
     * Returns:
     *   Processed text
     */
    nl2br: function(text) {
      return text.replace(/\r\n|\r|\n/g, '<br />');
    },

    /** Function: all
     * Does everything of the parser: escaping, linkifying and emotifying.
     *
     * Parameters:
     *   (String) text - Text to parse
     *
     * Returns:
     *   (String) Parsed text
     */
    all: function(text) {
      if(text) {
        text = this.escape(text);
        text = this.linkify(text);
        text = this.emotify(text);
        text = this.nl2br(text);
      }
      return text;
    }
  };

  /** Function: createHtml
   * Copy an HTML DOM element into an XML DOM.
   *
   * This function copies a DOM element and all its descendants and returns
   * the new copy.
   *
   * It's a function copied & adapted from [Strophe.js core.js](https://github.com/strophe/strophejs/blob/master/src/core.js).
   *
   * Parameters:
   *   (HTMLElement) elem - A DOM element.
   *   (Integer) maxLength - Max length of text
   *   (Integer) currentLength - Current accumulated text length
   *
   * Returns:
   *   A new, copied DOM element tree.
   */
  self.createHtml = function(elem, maxLength, currentLength) {
    /* jshint -W073 */
    currentLength = currentLength || 0;
    var i, el, j, tag, attribute, value, css, cssAttrs, attr, cssName, cssValue;
    if (elem.nodeType === Strophe.ElementType.NORMAL) {
      tag = elem.nodeName.toLowerCase();
      if(Strophe.XHTML.validTag(tag)) {
        try {
          el = $('<' + tag + '/>');
          for(i = 0; i < Strophe.XHTML.attributes[tag].length; i++) {
            attribute = Strophe.XHTML.attributes[tag][i];
            value = elem.getAttribute(attribute);
            if(typeof value === 'undefined' || value === null || value === '' || value === false || value === 0) {
              continue;
            }
            if(attribute === 'style' && typeof value === 'object') {
              if(typeof value.cssText !== 'undefined') {
                value = value.cssText; // we're dealing with IE, need to get CSS out
              }
            }
            // filter out invalid css styles
            if(attribute === 'style') {
              css = [];
              cssAttrs = value.split(';');
              for(j = 0; j < cssAttrs.length; j++) {
                attr = cssAttrs[j].split(':');
                cssName = attr[0].replace(/^\s*/, "").replace(/\s*$/, "").toLowerCase();
                if(Strophe.XHTML.validCSS(cssName)) {
                  cssValue = attr[1].replace(/^\s*/, "").replace(/\s*$/, "");
                  css.push(cssName + ': ' + cssValue);
                }
              }
              if(css.length > 0) {
                value = css.join('; ');
                el.attr(attribute, value);
              }
            } else {
              el.attr(attribute, value);
            }
          }

          for (i = 0; i < elem.childNodes.length; i++) {
            el.append(self.createHtml(elem.childNodes[i], maxLength, currentLength));
          }
        } catch(e) { // invalid elements
          Candy.Core.warn("[Util:createHtml] Error while parsing XHTML:", e);
          el = Strophe.xmlTextNode('');
        }
      } else {
        el = Strophe.xmlGenerator().createDocumentFragment();
        for (i = 0; i < elem.childNodes.length; i++) {
          el.appendChild(self.createHtml(elem.childNodes[i], maxLength, currentLength));
        }
      }
    } else if (elem.nodeType === Strophe.ElementType.FRAGMENT) {
      el = Strophe.xmlGenerator().createDocumentFragment();
      for (i = 0; i < elem.childNodes.length; i++) {
        el.appendChild(self.createHtml(elem.childNodes[i], maxLength, currentLength));
      }
    } else if (elem.nodeType === Strophe.ElementType.TEXT) {
      var text = elem.nodeValue;
      currentLength += text.length;
      if(maxLength && currentLength > maxLength) {
        text = text.substring(0, maxLength);
      }
      text = Candy.Util.Parser.all(text);
      el = $.parseHTML(text);
    }

    return el;
    /* jshint +W073 */
  };

  return self;
}(Candy.Util || {}, jQuery));

/** File: action.js
 * Candy - Chats are not dead yet.
 *
 * Authors:
 *   - Patrick Stadler <patrick.stadler@gmail.com>
 *   - Michael Weibel <michael.weibel@gmail.com>
 *
 * Copyright:
 *   (c) 2011 Amiado Group AG. All rights reserved.
 *   (c) 2012-2014 Patrick Stadler & Michael Weibel. All rights reserved.
 *   (c) 2015 Adhearsion Foundation Inc <info@adhearsion.com>. All rights reserved.
 */
'use strict';

/* global Candy, $iq, navigator, Candy, $pres, Strophe, jQuery, $msg */

/** Class: Candy.Core.Action
 * Chat Actions (basicly a abstraction of Jabber commands)
 *
 * Parameters:
 *   (Candy.Core.Action) self - itself
 *   (Strophe) Strophe - Strophe
 *   (jQuery) $ - jQuery
 */
Candy.Core.Action = (function(self, Strophe, $) {
  /** Class: Candy.Core.Action.Jabber
   * Jabber actions
   */
  self.Jabber = {
    /** Function: Version
     * Replies to a version request
     *
     * Parameters:
     *   (jQuery.element) msg - jQuery element
     */
    Version: function(msg) {
      Candy.Core.getConnection().sendIQ($iq({
        type: 'result',
        to: Candy.Util.escapeJid(msg.attr('from')),
        from: Candy.Util.escapeJid(msg.attr('to')),
        id: msg.attr('id')
      }).c('query', {
        xmlns: Strophe.NS.VERSION
      })
      .c('name', Candy.about.name).up()
      .c('version', Candy.about.version).up()
      .c('os', navigator.userAgent));
    },

    /** Function: SetNickname
     * Sets the supplied nickname for all rooms (if parameter "room" is not specified) or
     * sets it only for the specified rooms
     *
     * Parameters:
     *   (String) nickname - New nickname
     *   (Array) rooms - Rooms
     */
    SetNickname: function(nickname, rooms) {
      rooms = rooms instanceof Array ? rooms : Candy.Core.getRooms();
      var roomNick, presence,
        conn = Candy.Core.getConnection();
      $.each(rooms, function(roomJid) {
        roomNick = Candy.Util.escapeJid(roomJid + '/' + nickname);
        presence = $pres({
          to: roomNick,
          from: conn.jid,
          id: 'pres:' + conn.getUniqueId()
        });
        Candy.Core.getConnection().send(presence);
      });
    },

    /** Function: Roster
     * Sends a request for a roster
     */
    Roster: function() {
      var roster = Candy.Core.getConnection().roster,
        options = Candy.Core.getOptions();
      roster.registerCallback(Candy.Core.Event.Jabber.RosterPush);
      $.each(options.initialRosterItems, function (i, item) {
        // Blank out resources because their cached value is not relevant
        item.resources = {};
      });
      roster.get(
        Candy.Core.Event.Jabber.RosterFetch,
        options.initialRosterVersion,
        options.initialRosterItems
      );
      // Bootstrap our roster with cached items
      Candy.Core.Event.Jabber.RosterLoad(roster.items);
    },

    /** Function: Presence
     * Sends a request for presence
     *
     * Parameters:
     *   (Object) attr - Optional attributes
     *   (Strophe.Builder) el - Optional element to include in presence stanza
     */
    Presence: function(attr, el) {
      var conn = Candy.Core.getConnection();
      attr = attr || {};
      if(!attr.id) {
        attr.id = 'pres:' + conn.getUniqueId();
      }
      var pres = $pres(attr).c('priority').t(Candy.Core.getOptions().presencePriority.toString())
        .up().c('c', conn.caps.generateCapsAttrs())
        .up();
      if(el) {
        pres.node.appendChild(el.node);
      }
      conn.send(pres.tree());
    },

    /** Function: Services
     * Sends a request for disco items
     */
    Services: function() {
      Candy.Core.getConnection().sendIQ($iq({
        type: 'get',
        xmlns: Strophe.NS.CLIENT
      }).c('query', {xmlns: Strophe.NS.DISCO_ITEMS}).tree());
    },

    /** Function: Autojoin
     * When Candy.Core.getOptions().autojoin is true, request autojoin bookmarks (OpenFire)
     *
     * Otherwise, if Candy.Core.getOptions().autojoin is an array, join each channel specified.
     * Channel can be in jid:password format to pass room password if needed.

     * Triggers:
     *   candy:core.autojoin-missing in case no autojoin info has been found
     */
    Autojoin: function() {
      // Request bookmarks
      if(Candy.Core.getOptions().autojoin === true) {
        Candy.Core.getConnection().sendIQ($iq({
          type: 'get',
          xmlns: Strophe.NS.CLIENT
        })
        .c('query', {xmlns: Strophe.NS.PRIVATE})
        .c('storage', {xmlns: Strophe.NS.BOOKMARKS})
        .tree());

        var pubsubBookmarkRequest = Candy.Core.getConnection().getUniqueId('pubsub');
        Candy.Core.addHandler(Candy.Core.Event.Jabber.Bookmarks, Strophe.NS.PUBSUB, 'iq', 'result', pubsubBookmarkRequest);

        Candy.Core.getConnection().sendIQ($iq({
          type: 'get',
          id: pubsubBookmarkRequest
        })
        .c('pubsub', { xmlns: Strophe.NS.PUBSUB })
        .c('items', { node: Strophe.NS.BOOKMARKS })
        .tree());
      // Join defined rooms
      } else if($.isArray(Candy.Core.getOptions().autojoin)) {
        $.each(Candy.Core.getOptions().autojoin, function() {
          self.Jabber.Room.Join.apply(null, this.valueOf().split(':',2));
        });
      } else {
        /** Event: candy:core.autojoin-missing
         * Triggered when no autojoin information has been found
         */
        $(Candy).triggerHandler('candy:core.autojoin-missing');
      }
    },

    /** Function: EnableCarbons
     * Enable message carbons (XEP-0280)
     */
    EnableCarbons: function() {
      Candy.Core.getConnection().sendIQ($iq({
        type: 'set'
      })
      .c('enable', {xmlns: Strophe.NS.CARBONS })
      .tree());
    },

    /** Function: ResetIgnoreList
     * Create new ignore privacy list (and reset the previous one, if it exists).
     */
    ResetIgnoreList: function() {
      Candy.Core.getConnection().sendIQ($iq({
          type: 'set',
          from: Candy.Core.getUser().getEscapedJid()
        })
        .c('query', {xmlns: Strophe.NS.PRIVACY })
        .c('list', {name: 'ignore'})
        .c('item', {'action': 'allow', 'order': '0'})
        .tree());
    },

    /** Function: RemoveIgnoreList
     * Remove an existing ignore list.
     */
    RemoveIgnoreList: function() {
      Candy.Core.getConnection().sendIQ($iq({
          type: 'set',
          from: Candy.Core.getUser().getEscapedJid()
        })
        .c('query', {xmlns: Strophe.NS.PRIVACY })
        .c('list', {name: 'ignore'}).tree());
    },

    /** Function: GetIgnoreList
     * Get existing ignore privacy list when connecting.
     */
    GetIgnoreList: function() {
      var iq = $iq({
          type: 'get',
          from: Candy.Core.getUser().getEscapedJid()
        })
        .c('query', {xmlns: Strophe.NS.PRIVACY})
        .c('list', {name: 'ignore'}).tree();
      var iqId = Candy.Core.getConnection().sendIQ(iq);
      // add handler (<#200 at https://github.com/candy-chat/candy/issues/200>)
      Candy.Core.addHandler(Candy.Core.Event.Jabber.PrivacyList, null, 'iq', null, iqId);
    },

    /** Function: SetIgnoreListActive
     * Set ignore privacy list active
     */
    SetIgnoreListActive: function() {
      Candy.Core.getConnection().sendIQ($iq({
          type: 'set',
          from: Candy.Core.getUser().getEscapedJid()})
        .c('query', {xmlns: Strophe.NS.PRIVACY })
        .c('active', {name:'ignore'}).tree());
    },

    /** Function: GetJidIfAnonymous
     * On anonymous login, initially we don't know the jid and as a result, Candy.Core._user doesn't have a jid.
     * Check if user doesn't have a jid and get it if necessary from the connection.
     */
    GetJidIfAnonymous: function() {
      if (!Candy.Core.getUser().getJid()) {
        Candy.Core.log("[Jabber] Anonymous login");
        Candy.Core.getUser().data.jid = Candy.Core.getConnection().jid;
      }
    },

    /** Class: Candy.Core.Action.Jabber.Room
     * Room-specific commands
     */
    Room: {
      /** Function: Join
       * Requests disco of specified room and joins afterwards.
       *
       * TODO:
       *   maybe we should wait for disco and later join the room?
       *   but what if we send disco but don't want/can join the room
       *
       * Parameters:
       *   (String) roomJid - Room to join
       *   (String) password - [optional] Password for the room
       */
      Join: function(roomJid, password) {
        self.Jabber.Room.Disco(roomJid);
        roomJid = Candy.Util.escapeJid(roomJid);
        var conn = Candy.Core.getConnection(),
          roomNick = roomJid + '/' + Candy.Core.getUser().getNick(),
          pres = $pres({ to: roomNick, id: 'pres:' + conn.getUniqueId() })
            .c('x', {xmlns: Strophe.NS.MUC});
        if (password) {
          pres.c('password').t(password);
        }
        pres.up().c('c', conn.caps.generateCapsAttrs());
        conn.send(pres.tree());
      },

      /** Function: Leave
       * Leaves a room.
       *
       * Parameters:
       *   (String) roomJid - Room to leave
       */
      Leave: function(roomJid) {
        var user = Candy.Core.getRoom(roomJid).getUser();
        if (user) {
          Candy.Core.getConnection().muc.leave(roomJid, user.getNick(), function() {});
        }
      },

      /** Function: Disco
       * Requests <disco info of a room at http://xmpp.org/extensions/xep-0045.html#disco-roominfo>.
       *
       * Parameters:
       *   (String) roomJid - Room to get info for
       */
      Disco: function(roomJid) {
        Candy.Core.getConnection().sendIQ($iq({
          type: 'get',
          from: Candy.Core.getUser().getEscapedJid(),
          to: Candy.Util.escapeJid(roomJid)
        }).c('query', {xmlns: Strophe.NS.DISCO_INFO}).tree());
      },

      /** Function: Message
       * Send message
       *
       * Parameters:
       *   (String) roomJid - Room to which send the message into
       *   (String) msg - Message
       *   (String) type - "groupchat" or "chat" ("chat" is for private messages)
       *   (String) xhtmlMsg - XHTML formatted message [optional]
       *
       * Returns:
       *   (Boolean) - true if message is not empty after trimming, false otherwise.
       */
      Message: function(roomJid, msg, type, xhtmlMsg) {
        // Trim message
        msg = $.trim(msg);
        if(msg === '') {
          return false;
        }
        var nick = null;
        if(type === 'chat') {
          nick = Strophe.getResourceFromJid(roomJid);
          roomJid = Strophe.getBareJidFromJid(roomJid);
        }
        // muc takes care of the escaping now.
        Candy.Core.getConnection().muc.message(roomJid, nick, msg, xhtmlMsg, type);
        return true;
      },

      /** Function: Invite
       * Sends an invite stanza to multiple JIDs
       *
       * Parameters:
       *   (String) roomJid - Room to which send the message into
       *   (Array)  invitees - Array of JIDs to be invited to the room
       *   (String) reason - Message to include with the invitation [optional]
       *   (String) password - Password for the MUC, if required [optional]
       */
      Invite: function(roomJid, invitees, reason, password) {
        reason = $.trim(reason);
        var message = $msg({to: roomJid});
        var x = message.c('x', {xmlns: Strophe.NS.MUC_USER});
        $.each(invitees, function(i, invitee) {
          invitee = Strophe.getBareJidFromJid(invitee);
          x.c('invite', {to: invitee});
          if (typeof reason !== 'undefined' && reason !== '') {
            x.c('reason', reason);
          }
        });

        if (typeof password !== 'undefined' && password !== '') {
          x.c('password', password);
        }

        Candy.Core.getConnection().send(message);
      },

      /** Function: IgnoreUnignore
       * Checks if the user is already ignoring the target user, if yes: unignore him, if no: ignore him.
       *
       * Uses the ignore privacy list set on connecting.
       *
       * Parameters:
       *   (String) userJid - Target user jid
       */
      IgnoreUnignore: function(userJid) {
        Candy.Core.getUser().addToOrRemoveFromPrivacyList('ignore', userJid);
        Candy.Core.Action.Jabber.Room.UpdatePrivacyList();
      },

      /** Function: UpdatePrivacyList
       * Updates privacy list according to the privacylist in the currentUser
       */
      UpdatePrivacyList: function() {
        var currentUser = Candy.Core.getUser(),
          iq = $iq({type: 'set', from: currentUser.getEscapedJid()})
            .c('query', {xmlns: 'jabber:iq:privacy' })
              .c('list', {name: 'ignore'}),
          privacyList = currentUser.getPrivacyList('ignore');
        if (privacyList.length > 0) {
          $.each(privacyList, function(index, jid) {
            iq.c('item', {type:'jid', value: Candy.Util.escapeJid(jid), action: 'deny', order : index})
              .c('message').up().up();
          });
        } else {
          iq.c('item', {action: 'allow', order : '0'});
        }
        Candy.Core.getConnection().sendIQ(iq.tree());
      },

      /** Class: Candy.Core.Action.Jabber.Room.Admin
       * Room administration commands
       */
      Admin: {
        /** Function: UserAction
         * Kick or ban a user
         *
         * Parameters:
         *   (String) roomJid - Room in which the kick/ban should be done
         *   (String) userJid - Victim
         *   (String) type - "kick" or "ban"
         *   (String) msg - Reason
         *
         * Returns:
         *   (Boolean) - true if sent successfully, false if type is not one of "kick" or "ban".
         */
        UserAction: function(roomJid, userJid, type, reason) {
          roomJid = Candy.Util.escapeJid(roomJid);
          userJid = Candy.Util.escapeJid(userJid);
          var itemObj = {nick: Strophe.getResourceFromJid(userJid)};
          switch(type) {
            case 'kick':
              itemObj.role = 'none';
              break;
            case 'ban':
              itemObj.affiliation = 'outcast';
              break;
            default:
              return false;
          }
          Candy.Core.getConnection().sendIQ($iq({
            type: 'set',
            from: Candy.Core.getUser().getEscapedJid(),
            to: roomJid
          }).c('query', {xmlns: Strophe.NS.MUC_ADMIN })
            .c('item', itemObj).c('reason').t(reason).tree());
          return true;
        },

        /** Function: SetSubject
         * Sets subject (topic) of a room.
         *
         * Parameters:
         *   (String) roomJid - Room
         *   (String) subject - Subject to set
         */
        SetSubject: function(roomJid, subject) {
          Candy.Core.getConnection().muc.setTopic(Candy.Util.escapeJid(roomJid), subject);
        }
      }
    }
  };

  return self;
}(Candy.Core.Action || {}, Strophe, jQuery));

/** File: chatRoom.js
 * Candy - Chats are not dead yet.
 *
 * Authors:
 *   - Patrick Stadler <patrick.stadler@gmail.com>
 *   - Michael Weibel <michael.weibel@gmail.com>
 *
 * Copyright:
 *   (c) 2011 Amiado Group AG. All rights reserved.
 *   (c) 2012-2014 Patrick Stadler & Michael Weibel. All rights reserved.
 *   (c) 2015 Adhearsion Foundation Inc <info@adhearsion.com>. All rights reserved.
 */
'use strict';

/* global Candy, Strophe */

/** Class: Candy.Core.ChatRoom
 * Candy Chat Room
 *
 * Parameters:
 *   (String) roomJid - Room jid
 */
Candy.Core.ChatRoom = function(roomJid) {
  /** Object: room
   * Object containing roomJid and name.
   */
  this.room = {
    jid: roomJid,
    name: Strophe.getNodeFromJid(roomJid)
  };

  /** Variable: user
   * Current local user of this room.
   */
  this.user = null;

  /** Variable: Roster
   * Candy.Core.ChatRoster instance
   */
  this.roster = new Candy.Core.ChatRoster();
};

/** Function: setUser
 * Set user of this room.
 *
 * Parameters:
 *   (Candy.Core.ChatUser) user - Chat user
 */
Candy.Core.ChatRoom.prototype.setUser = function(user) {
  this.user = user;
};

/** Function: getUser
 * Get current local user
 *
 * Returns:
 *   (Object) - Candy.Core.ChatUser instance or null
 */
Candy.Core.ChatRoom.prototype.getUser = function() {
  return this.user;
};

/** Function: getJid
 * Get room jid
 *
 * Returns:
 *   (String) - Room jid
 */
Candy.Core.ChatRoom.prototype.getJid = function() {
  return this.room.jid;
};

/** Function: setName
 * Set room name
 *
 * Parameters:
 *   (String) name - Room name
 */
Candy.Core.ChatRoom.prototype.setName = function(name) {
  this.room.name = name;
};

/** Function: getName
 * Get room name
 *
 * Returns:
 *   (String) - Room name
 */
Candy.Core.ChatRoom.prototype.getName = function() {
  return this.room.name;
};

/** Function: setRoster
 * Set roster of room
 *
 * Parameters:
 *   (Candy.Core.ChatRoster) roster - Chat roster
 */
Candy.Core.ChatRoom.prototype.setRoster = function(roster) {
  this.roster = roster;
};

/** Function: getRoster
 * Get roster
 *
 * Returns
 *   (Candy.Core.ChatRoster) - instance
 */
Candy.Core.ChatRoom.prototype.getRoster = function() {
  return this.roster;
};

/** File: chatRoster.js
 * Candy - Chats are not dead yet.
 *
 * Authors:
 *   - Patrick Stadler <patrick.stadler@gmail.com>
 *   - Michael Weibel <michael.weibel@gmail.com>
 *
 * Copyright:
 *   (c) 2011 Amiado Group AG. All rights reserved.
 *   (c) 2012-2014 Patrick Stadler & Michael Weibel. All rights reserved.
 *   (c) 2015 Adhearsion Foundation Inc <info@adhearsion.com>. All rights reserved.
 */
'use strict';

/* global Candy */

/** Class: Candy.Core.ChatRoster
 * Chat Roster
 */
Candy.Core.ChatRoster = function () {
  /** Object: items
   * Roster items
   */
  this.items = {};
};

/** Function: add
 * Add user to roster
 *
 * Parameters:
 *   (Candy.Core.ChatUser) user - User to add
 */
Candy.Core.ChatRoster.prototype.add = function(user) {
  this.items[user.getJid()] = user;
};

/** Function: remove
 * Remove user from roster
 *
 * Parameters:
 *   (String) jid - User jid
 */
Candy.Core.ChatRoster.prototype.remove = function(jid) {
  delete this.items[jid];
};

/** Function: get
 * Get user from roster
 *
 * Parameters:
 *   (String) jid - User jid
 *
 * Returns:
 *   (Candy.Core.ChatUser) - User
 */
Candy.Core.ChatRoster.prototype.get = function(jid) {
  return this.items[jid];
};

/** Function: getAll
 * Get all items
 *
 * Returns:
 *   (Object) - all roster items
 */
Candy.Core.ChatRoster.prototype.getAll = function() {
  return this.items;
};

/** File: chatUser.js
 * Candy - Chats are not dead yet.
 *
 * Authors:
 *   - Patrick Stadler <patrick.stadler@gmail.com>
 *   - Michael Weibel <michael.weibel@gmail.com>
 *
 * Copyright:
 *   (c) 2011 Amiado Group AG. All rights reserved.
 *   (c) 2012-2014 Patrick Stadler & Michael Weibel. All rights reserved.
 *   (c) 2015 Adhearsion Foundation Inc <info@adhearsion.com>. All rights reserved.
 */
'use strict';

/* global Candy, Strophe */

/** Class: Candy.Core.ChatUser
 * Chat User
 */
Candy.Core.ChatUser = function(jid, nick, affiliation, role, realJid) {
  /** Constant: ROLE_MODERATOR
   * Moderator role
   */
  this.ROLE_MODERATOR    = 'moderator';

  /** Constant: AFFILIATION_OWNER
   * Affiliation owner
   */
  this.AFFILIATION_OWNER = 'owner';

  /** Object: data
   * User data containing:
   * - jid
   * - realJid
   * - nick
   * - affiliation
   * - role
   * - privacyLists
   * - customData to be used by e.g. plugins
   */
  this.data = {
    jid: jid,
    realJid: realJid,
    nick: Strophe.unescapeNode(nick),
    affiliation: affiliation,
    role: role,
    privacyLists: {},
    customData: {},
    previousNick: undefined,
    status: 'unavailable'
  };
};

/** Function: getJid
 * Gets an unescaped user jid
 *
 * See:
 *   <Candy.Util.unescapeJid>
 *
 * Returns:
 *   (String) - jid
 */
Candy.Core.ChatUser.prototype.getJid = function() {
  if(this.data.jid) {
    return Candy.Util.unescapeJid(this.data.jid);
  }
  return;
};

/** Function: getEscapedJid
 * Escapes the user's jid (node & resource get escaped)
 *
 * See:
 *   <Candy.Util.escapeJid>
 *
 * Returns:
 *   (String) - escaped jid
 */
Candy.Core.ChatUser.prototype.getEscapedJid = function() {
  return Candy.Util.escapeJid(this.data.jid);
};

/** Function: setJid
 * Sets a user's jid
 *
 * Parameters:
 *   (String) jid - New Jid
 */
Candy.Core.ChatUser.prototype.setJid = function(jid) {
  this.data.jid = jid;
};

/** Function: getRealJid
 * Gets an unescaped real jid if known
 *
 * See:
 *   <Candy.Util.unescapeJid>
 *
 * Returns:
 *   (String) - realJid
 */
Candy.Core.ChatUser.prototype.getRealJid = function() {
  if(this.data.realJid) {
    return Candy.Util.unescapeJid(this.data.realJid);
  }
  return;
};

/** Function: getNick
 * Gets user nick
 *
 * Returns:
 *   (String) - nick
 */
Candy.Core.ChatUser.prototype.getNick = function() {
  return Strophe.unescapeNode(this.data.nick);
};

/** Function: setNick
 * Sets a user's nick
 *
 * Parameters:
 *   (String) nick - New nick
 */
Candy.Core.ChatUser.prototype.setNick = function(nick) {
  this.data.nick = nick;
};

/** Function: getName
 * Gets user's name (from contact or nick)
 *
 * Returns:
 *   (String) - name
 */
Candy.Core.ChatUser.prototype.getName = function() {
  var contact = this.getContact();
  if (contact) {
    return contact.getName();
  } else {
    return this.getNick();
  }
};

/** Function: getRole
 * Gets user role
 *
 * Returns:
 *   (String) - role
 */
Candy.Core.ChatUser.prototype.getRole = function() {
  return this.data.role;
};

/** Function: setRole
 * Sets user role
 *
 * Parameters:
 *   (String) role - Role
 */
Candy.Core.ChatUser.prototype.setRole = function(role) {
  this.data.role = role;
};

/** Function: setAffiliation
 * Sets user affiliation
 *
 * Parameters:
 *   (String) affiliation - new affiliation
 */
Candy.Core.ChatUser.prototype.setAffiliation = function(affiliation) {
  this.data.affiliation = affiliation;
};

/** Function: getAffiliation
 * Gets user affiliation
 *
 * Returns:
 *   (String) - affiliation
 */
Candy.Core.ChatUser.prototype.getAffiliation = function() {
  return this.data.affiliation;
};

/** Function: isModerator
 * Check if user is moderator. Depends on the room.
 *
 * Returns:
 *   (Boolean) - true if user has role moderator or affiliation owner
 */
Candy.Core.ChatUser.prototype.isModerator = function() {
  return this.getRole() === this.ROLE_MODERATOR || this.getAffiliation() === this.AFFILIATION_OWNER;
};

/** Function: addToOrRemoveFromPrivacyList
 * Convenience function for adding/removing users from ignore list.
 *
 * Check if user is already in privacy list. If yes, remove it. If no, add it.
 *
 * Parameters:
 *   (String) list - To which privacy list the user should be added / removed from. Candy supports curently only the "ignore" list.
 *   (String) jid  - User jid to add/remove
 *
 * Returns:
 *   (Array) - Current privacy list.
 */
Candy.Core.ChatUser.prototype.addToOrRemoveFromPrivacyList = function(list, jid) {
  if (!this.data.privacyLists[list]) {
    this.data.privacyLists[list] = [];
  }
  var index = -1;
  if ((index = this.data.privacyLists[list].indexOf(jid)) !== -1) {
    this.data.privacyLists[list].splice(index, 1);
  } else {
    this.data.privacyLists[list].push(jid);
  }
  return this.data.privacyLists[list];
};

/** Function: getPrivacyList
 * Returns the privacy list of the listname of the param.
 *
 * Parameters:
 *   (String) list - To which privacy list the user should be added / removed from. Candy supports curently only the "ignore" list.
 *
 * Returns:
 *   (Array) - Privacy List
 */
Candy.Core.ChatUser.prototype.getPrivacyList = function(list) {
  if (!this.data.privacyLists[list]) {
    this.data.privacyLists[list] = [];
  }
  return this.data.privacyLists[list];
};

/** Function: setPrivacyLists
 * Sets privacy lists.
 *
 * Parameters:
 *   (Object) lists - List object
 */
Candy.Core.ChatUser.prototype.setPrivacyLists = function(lists) {
  this.data.privacyLists = lists;
};

/** Function: isInPrivacyList
 * Tests if this user ignores the user provided by jid.
 *
 * Parameters:
 *   (String) list - Privacy list
 *   (String) jid  - Jid to test for
 *
 * Returns:
 *   (Boolean)
 */
Candy.Core.ChatUser.prototype.isInPrivacyList = function(list, jid) {
  if (!this.data.privacyLists[list]) {
    return false;
  }
  return this.data.privacyLists[list].indexOf(jid) !== -1;
};

/** Function: setCustomData
 * Stores custom data
 *
 * Parameter:
 *   (Object) data - Object containing custom data
 */
Candy.Core.ChatUser.prototype.setCustomData = function(data) {
  this.data.customData = data;
};

/** Function: getCustomData
 * Retrieve custom data
 *
 * Returns:
 *   (Object) - Object containing custom data
 */
Candy.Core.ChatUser.prototype.getCustomData = function() {
  return this.data.customData;
};

/** Function: setPreviousNick
 * If user has nickname changed, set previous nickname.
 *
 * Parameters:
 *   (String) previousNick - the previous nickname
 */
Candy.Core.ChatUser.prototype.setPreviousNick = function(previousNick) {
  this.data.previousNick = previousNick;
};

/** Function: hasNicknameChanged
 * Gets the previous nickname if available.
 *
 * Returns:
 *   (String) - previous nickname
 */
Candy.Core.ChatUser.prototype.getPreviousNick = function() {
  return this.data.previousNick;
};

/** Function: getContact
 * Gets the contact matching this user from our roster
 *
 * Returns:
 *   (Candy.Core.Contact) - contact from roster
 */
Candy.Core.ChatUser.prototype.getContact = function() {
  return Candy.Core.getRoster().get(Strophe.getBareJidFromJid(this.data.realJid));
};

/** Function: setStatus
 * Set the user's status
 *
 * Parameters:
 *   (String) status - the new status
 */
Candy.Core.ChatUser.prototype.setStatus = function(status) {
  this.data.status = status;
};

/** Function: getStatus
 * Gets the user's status.
 *
 * Returns:
 *   (String) - status
 */
Candy.Core.ChatUser.prototype.getStatus = function() {
  return this.data.status;
};

/** File: contact.js
 * Candy - Chats are not dead yet.
 *
 * Authors:
 *   - Patrick Stadler <patrick.stadler@gmail.com>
 *   - Michael Weibel <michael.weibel@gmail.com>
 *
 * Copyright:
 *   (c) 2011 Amiado Group AG. All rights reserved.
 *   (c) 2012-2014 Patrick Stadler & Michael Weibel. All rights reserved.
 *   (c) 2015 Adhearsion Foundation Inc <info@adhearsion.com>. All rights reserved.
 */
'use strict';

/* global Candy, Strophe, $ */

/** Class: Candy.Core.Contact
 * Roster contact
 */
Candy.Core.Contact = function(stropheRosterItem) {
  /** Object: data
   * Strophe Roster plugin item model containing:
   * - jid
   * - name
   * - subscription
   * - groups
   */
  this.data = stropheRosterItem;
};

/** Function: getJid
 * Gets an unescaped user jid
 *
 * See:
 *   <Candy.Util.unescapeJid>
 *
 * Returns:
 *   (String) - jid
 */
Candy.Core.Contact.prototype.getJid = function() {
  if(this.data.jid) {
    return Candy.Util.unescapeJid(this.data.jid);
  }
  return;
};

/** Function: getEscapedJid
 * Escapes the user's jid (node & resource get escaped)
 *
 * See:
 *   <Candy.Util.escapeJid>
 *
 * Returns:
 *   (String) - escaped jid
 */
Candy.Core.Contact.prototype.getEscapedJid = function() {
  return Candy.Util.escapeJid(this.data.jid);
};

/** Function: getName
 * Gets user name
 *
 * Returns:
 *   (String) - name
 */
Candy.Core.Contact.prototype.getName = function() {
  if (!this.data.name) {
    return this.getJid();
  }
  return Strophe.unescapeNode(this.data.name);
};

/** Function: getNick
 * Gets user name
 *
 * Returns:
 *   (String) - name
 */
Candy.Core.Contact.prototype.getNick = Candy.Core.Contact.prototype.getName;

/** Function: getSubscription
 * Gets user subscription
 *
 * Returns:
 *   (String) - subscription
 */
Candy.Core.Contact.prototype.getSubscription = function() {
  if (!this.data.subscription) {
    return 'none';
  }
  return this.data.subscription;
};

/** Function: getGroups
 * Gets user groups
 *
 * Returns:
 *   (Array) - groups
 */
Candy.Core.Contact.prototype.getGroups = function() {
  return this.data.groups;
};

/** Function: getStatus
 * Gets user status as an aggregate of all resources
 *
 * Returns:
 *   (String) - aggregate status, one of chat|dnd|available|away|xa|unavailable
 */
Candy.Core.Contact.prototype.getStatus = function() {
  var status = 'unavailable',
    self = this,
    highestResourcePriority;

  $.each(this.data.resources, function(resource, obj) {
    var resourcePriority;
    if (obj.priority === undefined || obj.priority === '') {
      resourcePriority = 0;
    } else {
      resourcePriority = parseInt(obj.priority, 10);
    }

    if (obj.show === '' || obj.show === null || obj.show === undefined) {
      // TODO: Submit this as a bugfix to strophejs-plugins' roster plugin
      obj.show = 'available';
    }

    if (highestResourcePriority === undefined || highestResourcePriority < resourcePriority) {
      // This resource is higher priority than the ones we've checked so far, override with this one
      status = obj.show;
      highestResourcePriority = resourcePriority;
    } else if (highestResourcePriority === resourcePriority) {
      // Two resources with the same priority means we have to weight their status
      if (self._weightForStatus(status) > self._weightForStatus(obj.show)) {
        status = obj.show;
      }
    }
  });

  return status;
};

Candy.Core.Contact.prototype._weightForStatus = function(status) {
  switch (status) {
    case 'chat':
    case 'dnd':
      return 1;
    case 'available':
    case '':
      return 2;
    case 'away':
      return 3;
    case 'xa':
      return 4;
    case 'unavailable':
      return 5;
  }
};

/** File: event.js
 * Candy - Chats are not dead yet.
 *
 * Authors:
 *   - Patrick Stadler <patrick.stadler@gmail.com>
 *   - Michael Weibel <michael.weibel@gmail.com>
 *
 * Copyright:
 *   (c) 2011 Amiado Group AG. All rights reserved.
 *   (c) 2012-2014 Patrick Stadler & Michael Weibel. All rights reserved.
 *   (c) 2015 Adhearsion Foundation Inc <info@adhearsion.com>. All rights reserved.
 */
'use strict';

/* global Candy, Strophe, jQuery */

/** Class: Candy.Core.Event
 * Chat Events
 *
 * Parameters:
 *   (Candy.Core.Event) self - itself
 *   (Strophe) Strophe - Strophe
 *   (jQuery) $ - jQuery
 */
Candy.Core.Event = (function(self, Strophe, $) {
  /** Function: Login
   * Notify view that the login window should be displayed
   *
   * Parameters:
   *   (String) presetJid - Preset user JID
   *
   * Triggers:
   *   candy:core.login using {presetJid}
   */
  self.Login = function(presetJid) {
    /** Event: candy:core.login
     * Triggered when the login window should be displayed
     *
     * Parameters:
     *   (String) presetJid - Preset user JID
     */
    $(Candy).triggerHandler('candy:core.login', { presetJid: presetJid } );
  };

  /** Class: Candy.Core.Event.Strophe
   * Strophe-related events
   */
  self.Strophe = {
    /** Function: Connect
     * Acts on strophe status events and notifies view.
     *
     * Parameters:
     *   (Strophe.Status) status - Strophe statuses
     *
     * Triggers:
     *   candy:core.chat.connection using {status}
     */
    Connect: function(status) {
      Candy.Core.setStropheStatus(status);
      switch(status) {
        case Strophe.Status.CONNECTED:
          Candy.Core.log('[Connection] Connected');
          Candy.Core.Action.Jabber.GetJidIfAnonymous();
          /* falls through */
        case Strophe.Status.ATTACHED:
          Candy.Core.log('[Connection] Attached');
          $(Candy).on('candy:core:roster:fetched', function () {
            Candy.Core.Action.Jabber.Presence();
          });
          Candy.Core.Action.Jabber.Roster();
          Candy.Core.Action.Jabber.EnableCarbons();
          Candy.Core.Action.Jabber.Autojoin();
          Candy.Core.Action.Jabber.GetIgnoreList();
          break;

        case Strophe.Status.DISCONNECTED:
          Candy.Core.log('[Connection] Disconnected');
          break;

        case Strophe.Status.AUTHFAIL:
          Candy.Core.log('[Connection] Authentication failed');
          break;

        case Strophe.Status.CONNECTING:
          Candy.Core.log('[Connection] Connecting');
          break;

        case Strophe.Status.DISCONNECTING:
          Candy.Core.log('[Connection] Disconnecting');
          break;

        case Strophe.Status.AUTHENTICATING:
          Candy.Core.log('[Connection] Authenticating');
          break;

        case Strophe.Status.ERROR:
        case Strophe.Status.CONNFAIL:
          Candy.Core.log('[Connection] Failed (' + status + ')');
          break;

        default:
          Candy.Core.warn('[Connection] Unknown status received:', status);
          break;
      }
      /** Event: candy:core.chat.connection
       * Connection status updates
       *
       * Parameters:
       *   (Strophe.Status) status - Strophe status
       */
      $(Candy).triggerHandler('candy:core.chat.connection', { status: status } );
    }
  };

  /** Class: Candy.Core.Event.Jabber
   * Jabber related events
   */
  self.Jabber = {
    /** Function: Version
     * Responds to a version request
     *
     * Parameters:
     *   (String) msg - Raw XML Message
     *
     * Returns:
     *   (Boolean) - true
     */
    Version: function(msg) {
      Candy.Core.log('[Jabber] Version');
      Candy.Core.Action.Jabber.Version($(msg));
      return true;
    },

    /** Function: Presence
     * Acts on a presence event
     *
     * Parameters:
     *   (String) msg - Raw XML Message
     *
     * Triggers:
     *   candy:core.presence using {from, stanza}
     *
     * Returns:
     *   (Boolean) - true
     */
    Presence: function(msg) {
      Candy.Core.log('[Jabber] Presence');
      msg = $(msg);
      if(msg.children('x[xmlns^="' + Strophe.NS.MUC + '"]').length > 0) {
        if (msg.attr('type') === 'error') {
          self.Jabber.Room.PresenceError(msg);
        } else {
          self.Jabber.Room.Presence(msg);
        }
      } else {
        /** Event: candy:core.presence
         * Presence updates. Emitted only when not a muc presence.
         *
         * Parameters:
         *   (JID) from - From Jid
         *   (String) stanza - Stanza
         */
        $(Candy).triggerHandler('candy:core.presence', {'from': msg.attr('from'), 'stanza': msg});
      }
      return true;
    },

    /** Function: RosterLoad
     * Acts on the result of loading roster items from a cache
     *
     * Parameters:
     *   (String) items - List of roster items
     *
     * Triggers:
     *   candy:core.roster.loaded
     *
     * Returns:
     *   (Boolean) - true
     */
    RosterLoad: function(items) {
      self.Jabber._addRosterItems(items);

      /** Event: candy:core.roster.loaded
       * Notification of the roster having been loaded from cache
       */
      $(Candy).triggerHandler('candy:core:roster:loaded', {roster: Candy.Core.getRoster()});

      return true;
    },

    /** Function: RosterFetch
     * Acts on the result of a roster fetch
     *
     * Parameters:
     *   (String) items - List of roster items
     *
     * Triggers:
     *   candy:core.roster.fetched
     *
     * Returns:
     *   (Boolean) - true
     */
    RosterFetch: function(items) {
      self.Jabber._addRosterItems(items);

      /** Event: candy:core.roster.fetched
       * Notification of the roster having been fetched
       */
      $(Candy).triggerHandler('candy:core:roster:fetched', {roster: Candy.Core.getRoster()});

      return true;
    },

    /** Function: RosterPush
     * Acts on a roster push
     *
     * Parameters:
     *   (String) stanza - Raw XML Message
     *
     * Triggers:
     *   candy:core.roster.added
     *   candy:core.roster.updated
     *   candy:core.roster.removed
     *
     * Returns:
     *   (Boolean) - true
     */
    RosterPush: function(items, updatedItem) {
      if (!updatedItem) {
        return true;
      }

      if (updatedItem.subscription === "remove") {
        var contact = Candy.Core.getRoster().get(updatedItem.jid);
        Candy.Core.getRoster().remove(updatedItem.jid);
        /** Event: candy:core.roster.removed
         * Notification of a roster entry having been removed
         *
         * Parameters:
         *   (Candy.Core.Contact) contact - The contact that was removed from the roster
         */
        $(Candy).triggerHandler('candy:core:roster:removed', {contact: contact});
      } else {
        var user = Candy.Core.getRoster().get(updatedItem.jid);
        if (!user) {
          user = self.Jabber._addRosterItem(updatedItem);
          /** Event: candy:core.roster.added
           * Notification of a roster entry having been added
           *
           * Parameters:
           *   (Candy.Core.Contact) contact - The contact that was added
           */
          $(Candy).triggerHandler('candy:core:roster:added', {contact: user});
        } else {
          /** Event: candy:core.roster.updated
           * Notification of a roster entry having been updated
           *
           * Parameters:
           *   (Candy.Core.Contact) contact - The contact that was updated
           */
          $(Candy).triggerHandler('candy:core:roster:updated', {contact: user});
        }
      }

      return true;
    },

    _addRosterItem: function(item) {
      var user = new Candy.Core.Contact(item);
      Candy.Core.getRoster().add(user);
      return user;
    },

    _addRosterItems: function(items) {
      $.each(items, function(i, item) {
        self.Jabber._addRosterItem(item);
      });
    },

    /** Function: Bookmarks
     * Acts on a bookmarks event. When a bookmark has the attribute autojoin set, joins this room.
     *
     * Parameters:
     *   (String) msg - Raw XML Message
     *
     * Returns:
     *   (Boolean) - true
     */
    Bookmarks: function(msg) {
      Candy.Core.log('[Jabber] Bookmarks');
      // Autojoin bookmarks
      $('conference', msg).each(function() {
        var item = $(this);
        if(item.attr('autojoin')) {
          Candy.Core.Action.Jabber.Room.Join(item.attr('jid'));
        }
      });
      return true;
    },

    /** Function: PrivacyList
     * Acts on a privacy list event and sets up the current privacy list of this user.
     *
     * If no privacy list has been added yet, create the privacy list and listen again to this event.
     *
     * Parameters:
     *   (String) msg - Raw XML Message
     *
     * Returns:
     *   (Boolean) - false to disable the handler after first call.
     */
    PrivacyList: function(msg) {
      Candy.Core.log('[Jabber] PrivacyList');
      var currentUser = Candy.Core.getUser();
      msg = $(msg);
      if(msg.attr('type') === 'result') {
        $('list[name="ignore"] item', msg).each(function() {
          var item = $(this);
          if (item.attr('action') === 'deny') {
            currentUser.addToOrRemoveFromPrivacyList('ignore', item.attr('value'));
          }
        });
        Candy.Core.Action.Jabber.SetIgnoreListActive();
        return false;
      }
      return self.Jabber.PrivacyListError(msg);
    },

    /** Function: PrivacyListError
     * Acts when a privacy list error has been received.
     *
     * Currently only handles the case, when a privacy list doesn't exist yet and creates one.
     *
     * Parameters:
     *   (String) msg - Raw XML Message
     *
     * Returns:
     *   (Boolean) - false to disable the handler after first call.
     */
    PrivacyListError: function(msg) {
      Candy.Core.log('[Jabber] PrivacyListError');
      // check if msg says that privacyList doesn't exist
      if ($('error[code="404"][type="cancel"] item-not-found', msg)) {
        Candy.Core.Action.Jabber.ResetIgnoreList();
        Candy.Core.Action.Jabber.SetIgnoreListActive();
      }
      return false;
    },

    /** Function: Message
     * Acts on room, admin and server messages and notifies the view if required.
     *
     * Parameters:
     *   (String) msg - Raw XML Message
     *
     * Triggers:
     *   candy:core.chat.message.admin using {type, message}
     *   candy:core.chat.message.server {type, subject, message}
     *
     * Returns:
     *   (Boolean) - true
     */
    Message: function(msg) {
      console.log(msg);
      Candy.Core.log('[Jabber] Message');
      msg = $(msg);

      var type = msg.attr('type') || 'normal';

      switch (type) {
        case 'normal':
          var invite = self.Jabber._findInvite(msg);

          if (invite) {
            /** Event: candy:core:chat:invite
             * Incoming chat invite for a MUC.
             *
             * Parameters:
             *   (String) roomJid - The room the invite is to
             *   (String) from - User JID that invite is from text
             *   (String) reason - Reason for invite
             *   (String) password - Password for the room
             *   (String) continuedThread - The thread ID if this is a continuation of a 1-on-1 chat
             */
            $(Candy).triggerHandler('candy:core:chat:invite', invite);
          }

          /** Event: candy:core:chat:message:normal
           * Messages with the type attribute of normal or those
           * that do not have the optional type attribute.
           *
           * Parameters:
           *   (String) type - Type of the message
           *   (Object) message - Message object.
           */
          $(Candy).triggerHandler('candy:core:chat:message:normal', {
            type: type,
            message: msg
          });
          break;
        case 'headline':
          // Admin message
          if(!msg.attr('to')) {
            /** Event: candy:core.chat.message.admin
             * Admin message
             *
             * Parameters:
             *   (String) type - Type of the message
             *   (String) message - Message text
             */
            $(Candy).triggerHandler('candy:core.chat.message.admin', {
              type: type,
              message: msg.children('body').text()
            });
          // Server Message
          } else {
            /** Event: candy:core.chat.message.server
             * Server message (e.g. subject)
             *
             * Parameters:
             *   (String) type - Message type
             *   (String) subject - Subject text
             *   (String) message - Message text
             */
            $(Candy).triggerHandler('candy:core.chat.message.server', {
              type: type,
              subject: msg.children('subject').text(),
              message: msg.children('body').text()
            });
          }
          break;
        case 'groupchat':
        case 'chat':
        case 'error':
          // Room message
          self.Jabber.Room.Message(msg);
          break;
        default:
          /** Event: candy:core:chat:message:other
           * Messages with a type other than the ones listed in RFC3921
           * section 2.1.1. This allows plugins to catch custom message
           * types.
           *
           * Parameters:
           *   (String) type - Type of the message [default: message]
           *   (Object) message - Message object.
           */
          // Detect message with type normal or with no type.
          $(Candy).triggerHandler('candy:core:chat:message:other', {
            type: type,
            message: msg
          });
      }

      return true;
    },

    _findInvite: function (msg) {
      var mediatedInvite = msg.find('invite'),
        directInvite = msg.find('x[xmlns="jabber:x:conference"]'),
        invite;

      if(mediatedInvite.length > 0) {
        var passwordNode = msg.find('password'),
          password,
          reasonNode = mediatedInvite.find('reason'),
          reason,
          continueNode = mediatedInvite.find('continue');

        if(passwordNode.text() !== '') {
          password = passwordNode.text();
        }

        if(reasonNode.text() !== '') {
          reason = reasonNode.text();
        }

        invite = {
          roomJid: msg.attr('from'),
          from: mediatedInvite.attr('from'),
          reason: reason,
          password: password,
          continuedThread: continueNode.attr('thread')
        };
      }

      if(directInvite.length > 0) {
        invite = {
          roomJid: directInvite.attr('jid'),
          from: msg.attr('from'),
          reason: directInvite.attr('reason'),
          password: directInvite.attr('password'),
          continuedThread: directInvite.attr('thread')
        };
      }

      return invite;
    },

    /** Class: Candy.Core.Event.Jabber.Room
     * Room specific events
     */
    Room: {
      /** Function: Disco
       * Sets informations to rooms according to the disco info received.
       *
       * Parameters:
       *   (String) msg - Raw XML Message
       *
       * Returns:
       *   (Boolean) - true
       */
      Disco: function(msg) {
        Candy.Core.log('[Jabber:Room] Disco');
        msg = $(msg);
        // Temp fix for #219
        // Don't go further if it's no conference disco reply
        // FIXME: Do this in a more beautiful way
        if(!msg.find('identity[category="conference"]').length) {
          return true;
        }
        var roomJid = Strophe.getBareJidFromJid(Candy.Util.unescapeJid(msg.attr('from')));

        // Client joined a room
        if(!Candy.Core.getRooms()[roomJid]) {
          Candy.Core.getRooms()[roomJid] = new Candy.Core.ChatRoom(roomJid);
        }
        // Room existed but room name was unknown
        var identity = msg.find('identity');
        if(identity.length) {
          var roomName = identity.attr('name'),
            room = Candy.Core.getRoom(roomJid);
          if(room.getName() === null) {
            room.setName(Strophe.unescapeNode(roomName));
          // Room name changed
          }/*else if(room.getName() !== roomName && room.getUser() !== null) {
            // NOTE: We want to notify the View here but jabber doesn't send anything when the room name changes :-(
          }*/
        }
        return true;
      },

      /** Function: Presence
       * Acts on various presence messages (room leaving, room joining, error presence) and notifies view.
       *
       * Parameters:
       *   (Object) msg - jQuery object of XML message
       *
       * Triggers:
       *   candy:core.presence.room using {roomJid, roomName, user, action, currentUser}
       *
       * Returns:
       *   (Boolean) - true
       */
      Presence: function(msg) {
        Candy.Core.log('[Jabber:Room] Presence');
        var from = Candy.Util.unescapeJid(msg.attr('from')),
          roomJid = Strophe.getBareJidFromJid(from),
          presenceType = msg.attr('type'),
          isNewRoom = self.Jabber.Room._msgHasStatusCode(msg, 201),
          nickAssign = self.Jabber.Room._msgHasStatusCode(msg, 210),
          nickChange = self.Jabber.Room._msgHasStatusCode(msg, 303);

        // Current User joined a room
        var room = Candy.Core.getRoom(roomJid);
        if(!room) {
          Candy.Core.getRooms()[roomJid] = new Candy.Core.ChatRoom(roomJid);
          room = Candy.Core.getRoom(roomJid);
        }

        var roster = room.getRoster(),
          currentUser = room.getUser() ? room.getUser() : Candy.Core.getUser(),
          action, user,
          nick,
          show = msg.find('show'),
          item = msg.find('item');
        // User joined a room
        if(presenceType !== 'unavailable') {
          if (roster.get(from)) {
            // role/affiliation change
            user = roster.get(from);

            var role = item.attr('role'),
              affiliation = item.attr('affiliation');

            user.setRole(role);
            user.setAffiliation(affiliation);

            user.setStatus("available");

            // FIXME: currently role/affilation changes are handled with this action
            action = 'join';
          } else {
            nick = Strophe.getResourceFromJid(from);
            user = new Candy.Core.ChatUser(from, nick, item.attr('affiliation'), item.attr('role'), item.attr('jid'));
            // Room existed but client (myself) is not yet registered
            if(room.getUser() === null && (Candy.Core.getUser().getNick() === nick || nickAssign)) {
              room.setUser(user);
              currentUser = user;
            }
            user.setStatus('available');
            roster.add(user);
            action = 'join';
          }

          if (show.length > 0) {
            user.setStatus(show.text());
          }
        // User left a room
        } else {
          user = roster.get(from);
          roster.remove(from);

          if(nickChange) {
            // user changed nick
            nick = item.attr('nick');
            action = 'nickchange';
            user.setPreviousNick(user.getNick());
            user.setNick(nick);
            user.setJid(Strophe.getBareJidFromJid(from) + '/' + nick);
            roster.add(user);
          } else {
            action = 'leave';
            if(item.attr('role') === 'none') {
              if(self.Jabber.Room._msgHasStatusCode(msg, 307)) {
                action = 'kick';
              } else if(self.Jabber.Room._msgHasStatusCode(msg, 301)) {
                action = 'ban';
              }
            }

            if (Strophe.getResourceFromJid(from) === currentUser.getNick()) {
              // Current User left a room
              self.Jabber.Room._selfLeave(msg, from, roomJid, room.getName(), action);
              return true;
            }
          }
        }
        /** Event: candy:core.presence.room
         * Room presence updates
         *
         * Parameters:
         *   (String) roomJid - Room JID
         *   (String) roomName - Room name
         *   (Candy.Core.ChatUser) user - User which does the presence update
         *   (String) action - Action [kick, ban, leave, join]
         *   (Candy.Core.ChatUser) currentUser - Current local user
         *   (Boolean) isNewRoom - Whether the room is new (has just been created)
         */
        $(Candy).triggerHandler('candy:core.presence.room', {
          'roomJid': roomJid,
          'roomName': room.getName(),
          'user': user,
          'action': action,
          'currentUser': currentUser,
          'isNewRoom': isNewRoom
        });
        return true;
      },

      _msgHasStatusCode: function (msg, code) {
        return msg.find('status[code="' + code + '"]').length > 0;
      },

      _selfLeave: function(msg, from, roomJid, roomName, action) {
        Candy.Core.log('[Jabber:Room] Leave');

        Candy.Core.removeRoom(roomJid);

        var item = msg.find('item'),
          reason,
          actor;

        if(action === 'kick' || action === 'ban') {
          reason = item.find('reason').text();
          actor  = item.find('actor').attr('jid');
        }

        var user = new Candy.Core.ChatUser(from, Strophe.getResourceFromJid(from), item.attr('affiliation'), item.attr('role'));

        /** Event: candy:core.presence.leave
         * When the local client leaves a room
         *
         * Also triggered when the local client gets kicked or banned from a room.
         *
         * Parameters:
         *   (String) roomJid - Room
         *   (String) roomName - Name of room
         *   (String) type - Presence type [kick, ban, leave]
         *   (String) reason - When type equals kick|ban, this is the reason the moderator has supplied.
         *   (String) actor - When type equals kick|ban, this is the moderator which did the kick
         *   (Candy.Core.ChatUser) user - user which leaves the room
         */
        $(Candy).triggerHandler('candy:core.presence.leave', {
          'roomJid': roomJid,
          'roomName': roomName,
          'type': action,
          'reason': reason,
          'actor': actor,
          'user': user
        });
      },

      /** Function: PresenceError
       * Acts when a presence of type error has been retrieved.
       *
       * Parameters:
       *   (Object) msg - jQuery object of XML message
       *
       * Triggers:
       *   candy:core.presence.error using {msg, type, roomJid, roomName}
       *
       * Returns:
       *   (Boolean) - true
       */
      PresenceError: function(msg) {
        Candy.Core.log('[Jabber:Room] Presence Error');
        var from = Candy.Util.unescapeJid(msg.attr('from')),
          roomJid = Strophe.getBareJidFromJid(from),
          room = Candy.Core.getRooms()[roomJid],
          roomName = room.getName();

        // Presence error: Remove room from array to prevent error when disconnecting
        Candy.Core.removeRoom(roomJid);
        room = undefined;

        /** Event: candy:core.presence.error
         * Triggered when a presence error happened
         *
         * Parameters:
         *   (Object) msg - jQuery object of XML message
         *   (String) type - Error type
         *   (String) roomJid - Room jid
         *   (String) roomName - Room name
         */
        $(Candy).triggerHandler('candy:core.presence.error', {
          'msg' : msg,
          'type': msg.children('error').children()[0].tagName.toLowerCase(),
          'roomJid': roomJid,
          'roomName': roomName
        });
        return true;
      },

      /** Function: Message
       * Acts on various message events (subject changed, private chat message, multi-user chat message)
       * and notifies view.
       *
       * Parameters:
       *   (String) msg - jQuery object of XML message
       *
       * Triggers:
       *   candy:core.message using {roomJid, message, timestamp}
       *
       * Returns:
       *   (Boolean) - true
       */
      Message: function(msg) {
        Candy.Core.log('[Jabber:Room] Message');

        var carbon = false,
          partnerJid = Candy.Util.unescapeJid(msg.attr('from'));

        if (msg.children('sent[xmlns="' + Strophe.NS.CARBONS + '"]').length > 0) {
          carbon = true;
          msg = $(msg.children('sent').children('forwarded').children('message'));
          partnerJid = Candy.Util.unescapeJid(msg.attr('to'));
        }

        if (msg.children('received[xmlns="' + Strophe.NS.CARBONS + '"]').length > 0) {
          carbon = true;
          msg = $(msg.children('received').children('forwarded').children('message'));
          partnerJid = Candy.Util.unescapeJid(msg.attr('from'));
        }

        // Room subject
        var roomJid, roomName, from, message, name, room, sender;
        if(msg.children('subject').length > 0 && msg.children('subject').text().length > 0 && msg.attr('type') === 'groupchat') {
          roomJid = Candy.Util.unescapeJid(Strophe.getBareJidFromJid(partnerJid));
          from = Candy.Util.unescapeJid(Strophe.getBareJidFromJid(msg.attr('from')));
          roomName = Strophe.getNodeFromJid(roomJid);
          message = { from: from, name: Strophe.getNodeFromJid(from), body: msg.children('subject').text(), type: 'subject' };
        // Error messsage
        } else if(msg.attr('type') === 'error') {
          var error = msg.children('error');
          if(error.children('text').length > 0) {
            roomJid = partnerJid;
            roomName = Strophe.getNodeFromJid(roomJid);
            message = { from: msg.attr('from'), type: 'info', body: error.children('text').text() };
          }
        // Chat message
        } else if(msg.children('body').length > 0) {
          // Private chat message
          if(msg.attr('type') === 'chat' || msg.attr('type') === 'normal') {
            from = Candy.Util.unescapeJid(msg.attr('from'));
            var barePartner = Strophe.getBareJidFromJid(partnerJid),
              bareFrom = Strophe.getBareJidFromJid(from),
              isNoConferenceRoomJid = !Candy.Core.getRoom(barePartner);

            if (isNoConferenceRoomJid) {
              roomJid = barePartner;

              var partner = Candy.Core.getRoster().get(barePartner);
              if (partner) {
                roomName = partner.getName();
              } else {
                roomName = Strophe.getNodeFromJid(barePartner);
              }

              if (bareFrom === Candy.Core.getUser().getJid()) {
                sender = Candy.Core.getUser();
              } else {
                sender = Candy.Core.getRoster().get(bareFrom);
              }
              if (sender) {
                name = sender.getName();
              } else {
                name = Strophe.getNodeFromJid(from);
              }
            } else {
              roomJid = partnerJid;
              room = Candy.Core.getRoom(Candy.Util.unescapeJid(Strophe.getBareJidFromJid(from)));
              sender = room.getRoster().get(from);
              if (sender) {
                name = sender.getName();
              } else {
                name = Strophe.getResourceFromJid(from);
              }
              roomName = name;
            }
            message = { from: from, name: name, body: msg.children('body').text(), type: msg.attr('type'), isNoConferenceRoomJid: isNoConferenceRoomJid };
          // Multi-user chat message
          } else {
            from = Candy.Util.unescapeJid(msg.attr('from'));
            roomJid = Candy.Util.unescapeJid(Strophe.getBareJidFromJid(partnerJid));
            var resource = Strophe.getResourceFromJid(partnerJid);
            // Message from a user
            if(resource) {
              room = Candy.Core.getRoom(roomJid);
              roomName = room.getName();
              if (resource === Candy.Core.getUser().getNick()) {
                sender = Candy.Core.getUser();
              } else {
                sender = room.getRoster().get(from);
              }
              if (sender) {
                name = sender.getName();
              } else {
                name = Strophe.unescapeNode(resource);
              }
              message = { from: roomJid, name: name, body: msg.children('body').text(), type: msg.attr('type') };
            // Message from server (XEP-0045#registrar-statuscodes)
            } else {
              // we are not yet present in the room, let's just drop this message (issue #105)
              if(!Candy.Core.getRooms()[partnerJid]) {
                return true;
              }
              roomName = '';
              message = { from: roomJid, name: '', body: msg.children('body').text(), type: 'info' };
            }
          }

          var xhtmlChild = msg.children('html[xmlns="' + Strophe.NS.XHTML_IM + '"]');
          if(xhtmlChild.length > 0) {
            var xhtmlMessage = $($('<div>').append(xhtmlChild.children('body').first().contents()).html());
            message.xhtmlMessage = xhtmlMessage;
          }

          self.Jabber.Room._checkForChatStateNotification(msg, roomJid, name);
        // Unhandled message
        } else {
          return true;
        }

        // besides the delayed delivery (XEP-0203), there exists also XEP-0091 which is the legacy delayed delivery.
        // the x[xmlns=jabber:x:delay] is the format in XEP-0091.
        var delay = msg.children('delay[xmlns="' + Strophe.NS.DELAY +'"]');

        message.delay = false; // Default delay to being false.

        if (delay.length < 1) {
          // The jQuery xpath implementation doesn't support the or operator
          delay = msg.children('x[xmlns="' + Strophe.NS.JABBER_DELAY +'"]');
        } else {
          // Add delay to the message object so that we can more easily tell if it's a delayed message or not.
          message.delay = true;
        }

        var timestamp = delay.length > 0 ? delay.attr('stamp') : (new Date()).toISOString();

        /** Event: candy:core.message
         * Triggers on various message events (subject changed, private chat message, multi-user chat message).
         *
         * The resulting message object can contain different key-value pairs as stated in the documentation
         * of the parameters itself.
         *
         * The following lists explain those parameters:
         *
         * Message Object Parameters:
         *   (String) from - The unmodified JID that the stanza came from
         *   (String) name - Sender name
         *   (String) body - Message text
         *   (String) type - Message type ([normal, chat, groupchat])
         *                   or 'info' which is used internally for displaying informational messages
         *   (Boolean) isNoConferenceRoomJid - if a 3rd-party client sends a direct message to
         *                                     this user (not via the room) then the username is the node
         *                                     and not the resource.
         *                                     This flag tells if this is the case.
         *   (Boolean) delay - If there is a value for the delay element on a message it is a delayed message.
         *                     This flag tells if this is the case.
         *
         * Parameters:
         *   (String) roomJid - Room jid. For one-on-one messages, this is sanitized to the bare JID for indexing purposes.
         *   (String) roomName - Name of the contact
         *   (Object) message - Depending on what kind of message, the object consists of different key-value pairs:
         *                        - Room Subject: {name, body, type}
         *                        - Error message: {type = 'info', body}
         *                        - Private chat message: {name, body, type, isNoConferenceRoomJid}
         *                        - MUC msg from a user: {name, body, type}
         *                        - MUC msg from server: {name = '', body, type = 'info'}
         *   (String) timestamp - Timestamp, only when it's an offline message
         *   (Boolean) carbon - Indication of wether or not the message was a carbon
         *   (String) stanza - The raw XML stanza
         *
         * TODO:
         *   Streamline those events sent and rename the parameters.
         */
        $(Candy).triggerHandler('candy:core.message', {
          roomJid: roomJid,
          roomName: roomName,
          message: message,
          timestamp: timestamp,
          carbon: carbon,
          stanza: msg
        });
        return true;
      },

      _checkForChatStateNotification: function (msg, roomJid, name) {
        var chatStateElements = msg.children('*[xmlns="http://jabber.org/protocol/chatstates"]');
        if (chatStateElements.length > 0) {
          /** Event: candy:core:message:chatstate
           * Triggers on any recieved chatstate notification.
           *
           * The resulting message object contains the name of the person, the roomJid, and the indicated chatstate.
           *
           * The following lists explain those parameters:
           *
           * Message Object Parameters:
           *   (String) name - User name
           *   (String) roomJid - Room jid
           *   (String) chatstate - Chatstate being indicated. ("active", "composing", "paused", "inactive", "gone")
           *
           */
          $(Candy).triggerHandler('candy:core:message:chatstate', {
            name: name,
            roomJid: roomJid,
            chatstate: chatStateElements[0].tagName
          });
        }
      }
    }
  };

  return self;
}(Candy.Core.Event || {}, Strophe, jQuery));


export default Candy;
