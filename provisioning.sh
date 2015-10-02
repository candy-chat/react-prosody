#!/usr/bin/env bash
#
# Vagrant provisioning script
#
# Copyright 2014 Michael Weibel <michael.weibel@gmail.com>
# Copyright 2015 Adhearsion Foundation Inc <info@adhearsion.com>
# License: MIT
#

#
# Install Prosody XMPP server
#
echo "deb http://packages.prosody.im/debian precise main" > /etc/apt/sources.list.d/prosody.list
wget https://prosody.im/files/prosody-debian-packages.key -O- | sudo apt-key add -
apt-get update

apt-get install -y liblua5.1-bitop prosody lua-event

# Install Websockets module
wget -O /usr/lib/prosody/modules/mod_websocket.lua http://prosody-modules.googlecode.com/hg/mod_websocket/mod_websocket.lua

# Install Carbons module
wget -O /usr/lib/prosody/modules/mod_websocket.lua http://prosody-modules.googlecode.com/hg/mod_carbons/mod_carbons.lua

# Place config
cp /vagrant/prosody.cfg.lua /etc/prosody/prosody.cfg.lua

/etc/init.d/prosody restart

#
# Install nginx for static file serving
#
apt-get install -y nginx
cp /vagrant/nginx-default.conf /etc/nginx/sites-available/default
/etc/init.d/nginx restart


cd /vagrant

npm install && bower install
gulp watch
