"use strict";

const process = require("process");
process.env.TZ = "Europe/Amsterdam";

const Discord = require("discord.js");
const ServerData = require("./src/ServerData.js");

const modules = require("auto-loader").load(__dirname + "/modules");
const responses = require("./src/responses.js");
const db = require("./src/db.js");
const config = require("./config");
const users = require("./src/users.js");
const permissions = require("./src/permissions.js");
const Q = require("q");
const Document = require("camo").Document;
const changelog = require("./changelog.js");

class ChangelogDB extends Document
{
    constructor()
    {
        super();

        this.version = Number;
    }
}

String.prototype.format = function(args) {
    return this.replace(/{(.*?)}/g, function(match, key) {
        return typeof args[key] != "undefined" ? args[key] : match;
    });
};

class Bot
{
    constructor()
    {
        this.discord = new Discord.Client({
            autoReconnect: true
        });
        this.servers = {};
        this.modules = {};
        this.user_blacklist = null;
        this.server_blacklist = null;
        this.connected_once = false;
        this.connected = false;
        this.queue = [];
        this.ready = false;

        this.discord.on("message", this.handle_message.bind(this));
        this.discord.on("ready", this.on_ready.bind(this));
        this.discord.on("serverCreated", this.on_server_created.bind(this));
        this.discord.on("serverDeleted", this.on_server_deleted.bind(this));
        this.discord.on("disconnected", this.on_disconnected.bind(this));
        this.discord.on("error", this.on_error.bind(this));
    }

    login()
    {
        this.discord.loginWithToken(config.token, function (error, token) {
            if(error != null)
            {
                return console.error("Discord login error: " + error);
            }
            
            console.log("Logged in with token '" + token + "'.");
        });
    }

    set_status(status, game)
    {
        if(!this.connected)
        {
            return this.queue.push(this.set_status.bind(this, status, game));
        }
        
        try
        {
            this.discord.setStatus(status, game);
        }
        catch(e)
        {
            this.connected = false;
            this.queue.push(this.set_status.bind(this, status, game));
        }
    }
    
    message(message, server)
    {
        var defer = Q.defer();
        
        var channel = server.channel;
        if(channel.length === 0)
        {
            channel = server.server.channels[0].id;
        }
        
        var queue = function(message, server, defer){
            this.queue.push(this.discord.stopTyping.bind(this.discord, message.channel));
            this.queue.push(this.discord.sendMessage.bind(this.discord, server.server.channels.get("id", channel), message, {}, function(defer, err, message){
                if(err !== null)
                    return defer.reject(err);
                    
                defer.resolve(message);
            }.bind(this, defer)));
        }.bind(this, message, server, defer);
        
        if(!this.connected)
        {
            queue();
            return defer.promise;
        }
        
        try
        {
            this.discord.stopTyping(message.channel);
            this.discord.sendMessage(server.server.channels.get("id", channel), message, {}, function(err, message){
                if(err !== null)
                    return defer.reject(err);
                    
                defer.resolve(message);
            });
        }
        catch(e)
        {
            this.connected = false;
            queue();
        }
        
        return defer.promise;
    }

    message_queue(messages, server)
    {
        var defer = Q.defer();
        
        var send = function(server, messages, defer, index, send){
            if(index >= messages.length)
            {
                return defer.resolve();
            }
            
            this.message(messages[index], server).then(function(index, send){
                send(index + 1, send);
            }.bind(this, index, send)).catch(function(defer, error){
                defer.reject(error);
            }.bind(this, defer));
        }.bind(this, server, messages, defer);
        
        send(0, send);
        return defer.promise;
    }
    
    respond(m, message)
    {
        var defer = Q.defer();
        
        var queue = function(m, message, defer){
            this.queue.push(this.discord.stopTyping.bind(this.discord, m.channel));
            this.queue.push(this.discord.sendMessage.bind(this.discord, m.channel, message, {}, function(defer, err, message){
                if(err !== null)
                    return defer.reject(err);
                    
                defer.resolve(message);
            }.bind(this, defer)));
        }.bind(this, m, message, defer);
        
        if(!this.connected)
        {
            queue();
            return defer.promise;
        }
        
        try
        {
            this.discord.stopTyping(m.channel);
            this.discord.sendMessage(m.channel, message, {}, function(err, message){
                if(err !== null)
                    return defer.reject(err);
                    
                defer.resolve(message);
            });
        }
        catch(e)
        {
            this.connected = false;
            queue();
        }
        
        return defer.promise;
    }

    respond_queue(message, messages)
    {
        var defer = Q.defer();
        
        var send = function(message, messages, defer, index, send){
            if(index >= messages.length)
            {
                return defer.resolve();
            }
            
            this.respond(message, messages[index]).then(function(index, send){
                send(index + 1, send);
            }.bind(this, index, send, defer)).catch(function(defer, error){
                defer.reject(error);
            }.bind(this, defer));
        }.bind(this, message, messages, defer);
        
        send(0, send);
        return defer.promise;
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
        this.connected = true;
        
        console.log("Connected to discord.");
        
        if(this.connected_once)
        {
            while(this.queue.length != 0)
            {
                this.queue[0]();
                this.queue.splice(0, 1);
            }
            
            return;
        }
           
        this.connected_once = true;
        
        db.load().then(function(){
            this.print("Loading config from DB", 70, false);
            return db.ConfigKeyValue.find({});
        }.bind(this)).then(function(docs){
            console.log("....Ok");
            for(var i = 0;i<docs.length;i++)
            {
                if(docs[i].key == "mode")
                {
                    if(docs[i].value.value != responses.currentMode)
                        responses.setMode(docs[i].value);
                }
                else if(docs[i].key == "user_blacklist")
                {
                    this.user_blacklist = docs[i];
                }
                else if(docs[i].key == "server_blacklist")
                {
                    this.server_blacklist = docs[i];
                }
            }
            
            if(this.user_blacklist === null)
            {
                this.user_blacklist = db.ConfigKeyValue.create({key: "user_blacklist", value: {blacklist: []}});
                this.user_blacklist.save().catch(function(err){
                    console.log(err);
                });
            }
            
            if(this.server_blacklist === null)
            {
                this.server_blacklist = db.ConfigKeyValue.create({key: "server_blacklist", value: {blacklist: []}});
                this.server_blacklist.save().catch(function(err){
                    console.log(err);
                });
            }
            
            this.print("Loading users from DB", 70, false);
            return users.load();
        }.bind(this)).then(function(){
            console.log("....Ok");
            this.print("Loading permissions from DB", 70, false);
            return permissions.load();
        }.bind(this)).then(function(){
            console.log("....Ok");
            for(var key in modules)
            {
                var mod = modules[key];
                if(mod.on_setup === undefined)
                {
                    console.log("Error: Module '" + key + "' is not setup correctly. missing function: on_setup");
                    continue;
                }

                this.print("Setting up module '" + key + "'", 70, false);
                try
                {
                    mod.on_setup(this);
                    console.log("....Ok");
                }
                catch(e)
                {
                    console.log("Error:");
                    console.log(e.stack);
                }

                this.modules[mod.name] = mod;
            }

            return permissions.save();
        }.bind(this)).then(function(){
            var defer = Q.defer();
            
            ChangelogDB.findOne({}).then(function(doc){
                if(doc === null)
                {
                    return ChangelogDB.create({version: changelog.version}).save().then(function(doc){
                        defer.resolve(-1);
                    }).catch(function(err){
                        console.log(err);
                    });
                }
                
                if(doc.version !== changelog.version)
                {
                    var old = doc.version;
                    doc.version = changelog.version;
                    return doc.save().then(function(doc){
                        defer.resolve(old);
                    }).catch(function(err){
                        console.log(err);
                    });
                }
                
                defer.resolve(doc.version);
            }).catch(function(err){
                defer.reject(err);
            });
            
            return defer.promise;
        }.bind(this)).then(function(changelog_version){
            for(var i = 0;i<this.discord.servers.length;i++)
            {
                var server = this.discord.servers[i];
                this.servers[server.id] = new ServerData(this, server);
                this.servers[server.id].load_promise.promise.then(function(server, initial){
                    for(var key in this.modules)
                    {
                        if(this.modules[key].always_on)
                            this.servers[server.id].enable_module(key);
                        
                        if(initial && this.modules[key].default_on)
                            this.servers[server.id].enable_module(key);
                    }
                    
                    var msg = "";
                    for(var i = 0;i<changelog.changelog.length;i++)
                    {
                        if(changelog.changelog[i][0] <= changelog_version)
                            continue;
                        
                        if(msg.length !== 0)
                            msg += "\r\n";

                        msg += "- " + changelog.changelog[i][1];
                    }

                    if(msg.length !== 0)
                        this.message(responses.get("CHANGELOG").format({changelog: msg}), this.servers[server.id]);
                }.bind(this, this.servers[server.id]));
            }
            
            this.ready = true;
        }.bind(this)).catch(function(err){
            console.log(err.stack);
        });
    }

    on_server_created(server)
    {
        if(!this.connected || !this.ready)
            return;
            
        console.log("Joined server '" + server.name + "'.");
        
        this.servers[server.id] = new ServerData(this, server);
        this.servers[server.id].load_promise.promise.then(function(server){
            for(var key in this.modules)
            {
                if(this.modules[key].always_on)
                    this.servers[server.id].enable_module(key);

                if(this.modules[key].default_on)
                    this.servers[server.id].enable_module(key);
            }
        }.bind(this, server)).catch(function(err){
            console.log(err);
        });
    }
    
    on_server_deleted(server)
    {
        if(!this.connected || !this.ready)
            return;
            
        console.log("Left server '" + server.name + "'.");
        
        delete this.servers[server.id];
    }
    
    on_disconnected()
    {
        this.connected = false;
        
        console.log("Disconnected from discord.");
    }
    
    on_error(err)
    {
        console.log("Discord error: " + err);
    }
    
    handle_message(message)
    {
        var server = null;
        var key;
        
        if(!message.channel.isPrivate)
            server = this.servers[message.channel.server.id];
            
        message.user = users.get_user(message.author, server);
        message.server = server;
        
        //Is the user blacklisted/ignored
        if(this.is_user_blacklisted(message.user) || (message.server !== null && message.server.is_user_ignored(message.user)))
            return;
            
        if(message.author.id !== this.discord.user.id && message.server !== null)
        {
            for(key in this.modules)
            {
                if(!server.is_module_enabled(key) && (this.modules[key].always_on === undefined || this.modules[key].always_on == false))
                    continue;
                    
                if(this.modules[key].on_raw_message === undefined)
                    continue;
                    
                this.modules[key].on_raw_message(message);
            }
        }
        
        if(message.content.toLowerCase().indexOf("sempai") == 0 || message.content.indexOf("-") == 0)
        {
            var msg = message.content;
            if(msg.toLowerCase().indexOf("sempai") == 0)
            {
                msg = msg.substr("sempai".length + 1).replace(/\s+/g, " ").trim();
            }
            else
            {
                msg = msg.substr(1).replace(/\s+/g, " ").trim();
            }
            
            message.content = msg;
            var split = message.content.split(" ");
            var handled = false;
            
            for(key in this.modules)
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
    
    blacklist_user(user)
    {
        this.user_blacklist.value.blacklist.push(user.user_id);
        this.user_blacklist.save().catch(function(err){
            console.log(err);
        });
    }
    
    blacklist_server(server_id)
    {
        this.server_blacklist.value.blacklist.push(server_id);
        this.server_blacklist.save().catch(function(err){
            console.log(err);
        });
    }
    
    whitelist_user(user)
    {
        var idx = this.user_blacklist.value.blacklist.indexOf(user.user_id);
        if(idx === -1)
            return false;
        
        this.user_blacklist.value.blacklist.splice(idx, 1);
        this.user_blacklist.save().catch(function(err){
            console.log(err);
        });
        
        return true;
    }
    
    whitelist_server(server_id)
    {
        var idx = this.server_blacklist.value.blacklist.indexOf(server_id);
        if(idx === -1)
            return false;
        
        this.server_blacklist.value.blacklist.splice(idx, 1);
        this.server_blacklist.save().catch(function(err){
            console.log(err);
        });
        
        return true;
    }
    
    is_user_blacklisted(user)
    {
        return this.user_blacklist.value.blacklist.indexOf(user.user_id) !== -1;
    }
    
    get user()
    {
        return users.get_user_by_id(this.discord.user.id);
    }
}

var bot = new Bot();
bot.login();
