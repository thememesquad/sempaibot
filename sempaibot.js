"use strict";

const process = require("process");
process.env.TZ = "Europe/Amsterdam";

const Discord = require("discord.js");
const ServerData = require("./src/ServerData.js");

const modules = require('auto-loader').load(__dirname + "/modules");
const responses = require("./src/responses.js");
const db = require("./src/db.js");
const config = require("./config");
const users = require("./src/users.js");

String.prototype.format = function(args) {
    return this.replace(/{(.*?)}/g, function(match, key) {
        return typeof args[key] != 'undefined' ? args[key] : match;
    });
};

class Bot
{
    constructor()
    {
        this.discord = new Discord.Client();
        this.servers = {};
        this.modules = {};

        this.discord.on("message", this.handle_message.bind(this));
        this.discord.on("ready", this.on_ready.bind(this));
    }

    login()
    {
        this.discord.login(config.user, config.pass, function (error, token) {
            if(error != null)
            {
                console.log("Discord login error: " + error);
            }
        });
    }

    message(message, server)
    {
        var channel = server.channel;

        return this.discord.sendMessage(server.server.channels.get("name", channel), message);
    }

    respond(m, message)
    {
        return this.discord.sendMessage(m.channel, message);
    }

    get_module(name)
    {
        return (this.modules[name] === undefined) ? null : this.modules[name];
    }

    on_ready()
    {
        var _this = this;
        db.load().then(function(db_type){
            console.log("Loading config from DB.....");
            return db.ConfigKeyValue.find({});
        }).then(function(docs){
            for(var i = 0;i<docs.length;i++)
            {
                if(docs[i].key == "mode")
                {
                    if(docs[i].value.value != responses.currentMode)
                        responses.setMode(docs[i].value);
                }
            }
            
            console.log("Loading users from DB.....");
            return users.load();
        }).then(function(){
            for(var key in modules)
            {
                var mod = modules[key];
                if(mod.on_setup === undefined)
                {
                    console.log("Error: Module '" + key + "' is not setup correctly. missing function: on_setup");
                    continue;
                }

                var msg = "Setting up module '" + key + "'";
                while(msg.length != 70)
                    msg += ".";

                process.stdout.write(msg);
                try
                {
                    mod.on_setup(_this);
                    console.log("....Ok");
                }
                catch(e)
                {
                    console.log("Error:");
                    console.log(e);
                }

                _this.modules[mod.name] = mod;
            }

            _this.discord.joinServer(config.server, function (error, server) {
                for(var i = 0;i<_this.discord.servers.length;i++)
                {
                    var server = _this.discord.servers.get(i);
                    _this.servers[server.id] = new ServerData(_this, server);

                    for(var key in _this.modules)
                    {
                        if(_this.modules[key].always_on)
                            _this.servers[server.id].enable_module(key);
                    }
                }
            });
        }).catch(function(err){
            console.log(err.stack);
        });
    }

    handle_message(message)
    {
        if(message.content.indexOf("sempai") == 0 || message.content.indexOf("-") == 0)
        {
            var split = message.content.split(" ");
            var handled = false;

            var server = null;
            if(!message.channel.isPrivate)
                server = this.servers[message.channel.server.id];

            message.server = server;
            for(var key in this.modules)
            {
                if(this.modules[key].check_message(server, message, split))
                {
                    handled = true;
                    break;
                }
            }

            if(!handled)
            {
                this.respond(message, responses.get("NAME").format({author: message.author.id}));
            }
        }
    }
}

var bot = new Bot();
bot.login();
