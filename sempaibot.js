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
const permissions = require("./src/permissions.js");

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
        if(channel.length === 0)
        {
            for(var i = 0;i<server.server.channels.length;i++)
            {
                this.discord.sendMessage(server.server.channels[i], message);
            }
            
            return;
        }
        
        return this.discord.sendMessage(server.server.channels.get("id", channel), message);
    }

    respond(m, message)
    {
        this.discord.stopTyping(m.channel);
        return this.discord.sendMessage(m.channel, message);
    }

    get_module(name)
    {
        return (this.modules[name] === undefined) ? null : this.modules[name];
    }

    print(message, length, newline)
    {
        while(message.length != length)
            message += ".";
            
        if(newline)
            console.log(message);
        else
            process.stdout.write(message);
    }
    
    on_ready()
    {
        var _this = this;
        db.load().then(function(db_type){
            _this.print("Loading config from DB", 70, false);
            return db.ConfigKeyValue.find({});
        }).then(function(docs){
            console.log("....Ok");
            for(var i = 0;i<docs.length;i++)
            {
                if(docs[i].key == "mode")
                {
                    if(docs[i].value.value != responses.currentMode)
                        responses.setMode(docs[i].value);
                }
            }
            
            _this.print("Loading users from DB", 70, false);
            return users.load();
        }).then(function(){
            console.log("....Ok");
            _this.print("Loading permissions from DB", 70, false);
            return permissions.load();
        }).then(function(){
            console.log("....Ok");
            for(var key in modules)
            {
                var mod = modules[key];
                if(mod.on_setup === undefined)
                {
                    console.log("Error: Module '" + key + "' is not setup correctly. missing function: on_setup");
                    continue;
                }

                _this.print("Setting up module '" + key + "'", 70, false);
                try
                {
                    mod.on_setup(_this);
                    console.log("....Ok");
                }
                catch(e)
                {
                    console.log("Error:");
                    console.log(e.stack);
                }

                _this.modules[mod.name] = mod;
            }

            return permissions.save();
        }).then(function(){
            _this.discord.joinServer(config.server, function (error, server) {
                for(var i = 0;i<_this.discord.servers.length;i++)
                {
                    var server = _this.discord.servers[i];
                    _this.servers[server.id] = new ServerData(_this, server);
                    _this.servers[server.id].load_promise.promise.then(function(){
                        for(var key in _this.modules)
                        {
                            if(_this.modules[key].always_on)
                                _this.servers[server.id].enable_module(key);
                        }
                    });
                }
            });
        }).catch(function(err){
            console.log(err.stack);
        });
    }

    handle_message(message)
    {
        var server = null;
        if(!message.channel.isPrivate)
            server = this.servers[message.channel.server.id];
            
        message.user = users.get_user(message.author, server);
        message.server = server;
        
        if(message.author.id !== this.discord.user.id)
        {
            for(var key in this.modules)
            {
                if(!server.is_module_enabled(key) && (this.modules[key].always_on === undefined || this.modules[key].always_on == false))
                    continue;
                    
                if(this.modules[key].on_raw_message === undefined)
                    continue;
                    
                this.modules[key].on_raw_message(message);
            }
        }
        
        if(message.content.indexOf("sempai") == 0 || message.content.indexOf("-") == 0)
        {
            var split = message.content.split(" ");
            var handled = false;
            
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
                if(split.length == 1)
                    this.respond(message, responses.get("NAME").format({author: message.author.id}));
                else
                    this.respond(message, responses.get("UNKNOWN_COMMAND").format({author: message.author.id}));
            }
        }
    }
}

var bot = new Bot();
bot.login();
