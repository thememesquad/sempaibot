"use strict";

const responses = require("./responses.js");
const db = require("./db.js");
const users = require("./users.js");
const Q = require("q");

class ServerData
{
    constructor(bot, server)
    {
        this.bot = bot;
        this.config = null;
        this.server = server;
        this.id = server.id;
        this.load_promise = Q.defer();
        
        var _this = this;

        for(var i = 0;i<server.members.length;i++)
        {
            var member = server.members[i];
            users.add_user(member.id, member.name, this);
        }

        db.ConfigKeyValue.findOne({key: this.server.id + "_config"}).then(function(doc){
            if(doc === null)
            {
                this.config = db.ConfigKeyValue.create({
                    key: this.server.id + "_config", 
                    value: {
                        channel: "", 
                        modules: [],
                        ignorelist: []
                    }
                });
                
                this.config.save().then(function(doc){
                    this.on_load();
                }.bind(this)).catch(function(err){
                    console.log("save: " + err);
                    this.on_load();
                }.bind(this));
            }
            else
            {
                this.config = doc;
                
                for(var i = 0;i<this.modules.length;i++)
                {
                    var module = this.bot.get_module(this.modules[i]);
                    if(module === null)
                        continue;
                        
                    module.on_load(this);
                }
                
                this.on_load();
            }
        }.bind(this)).catch(function(err){
            console.log("findOne: " + err.stack);
        });
    }

    on_load()
    {
        this.channel_check = setInterval(function(){
            if(this.channel.length !== 0)
            {
                if(this.server.channels.get("id", this.channel) === null)
                {
                    this.channel = "";
                    this.bot.message(responses.get("CHANNEL_DELETED"), this);
                }
            }
        }.bind(this), 100);
        
        if(this.channel.length !== 0)
        {
            if(this.server.channels.get("id", this.channel) === null)
            {
                this.bot.message(responses.get("CHANNEL_DELETED"), this);
                this.channel = "";
            }
        }else{
            users.assign_role(this.server.owner.id, this.server, "admin");
            this.bot.message(responses.get("SETTING_UP"), this);
        }
        
        this.load_promise.resolve();
    }

    enable_module(name)
    {
        if(this.modules.indexOf(name) !== -1)
            return; //already enabled

        var module = this.bot.get_module(name);
        if(module === null)
            return; //no such module

        this.modules.push(name);
        module.on_load(this);

        this.config.value.modules = this.modules;
        this.config.save().catch(function(err){
            console.log(err);
        });
    }

    is_module_enabled(name)
    {
        return this.modules.indexOf(name) !== -1;
    }

    disable_module(name)
    {
        if(this.modules.indexOf(name) === -1)
            return; //already enabled

        var module = this.bot.get_module(name);
        if(module === null)
            return; //no such module

        this.modules.splice(this.modules.indexOf(name), 1);
        module.on_unload(this);

        this.config.value.modules = this.modules;
        this.config.save().catch(function(err){
            console.log(err);
        });
    }
    
    ignore_user(user)
    {
        if(this.ignorelist.indexOf(user.user_id) === -1)
        {
            this.config.value.ignorelist.push(user.user_id);
            this.config.save().catch(function(err){
                console.log(err);
            });
        }
    }
    
    unignore_user(user)
    {
        var idx = this.ignorelist.indexOf(user.user_id);
        if(idx !== -1)
        {
            this.config.value.ignorelist.splice(idx, 1);
            this.config.save().catch(function(err){
                console.log(err);
            });
        }
    }
    
    is_user_ignored(user)
    {
        return this.ignorelist.indexOf(user.user_id) !== -1;
    }
    
    set channel(channel)
    {
        this.config.value.channel = channel;
        this.config.save().catch(function(err){
            console.log(err);
        });
    }
    
    get channel()
    {
        return this.config.value.channel;
    }
    
    get modules()
    {
        return this.config.value.modules;
    }
    
    get ignorelist()
    {
        return this.config.value.ignorelist;
    }
}

module.exports = ServerData;
