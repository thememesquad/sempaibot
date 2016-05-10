"use strict";

const responses = require("./responses.js");
const db = require("./db.js");
const users = require("./users.js");

class ServerData
{
    constructor(bot, server)
    {
        this.bot = bot;
        this.server = server;
        this.modules = [];
        this.channel = "osu";
        this.id = server.id;

        var _this = this;

        for(var i = 0;i<server.members.length;i++)
        {
            var member = server.members[i];
            users.add_user(member.id, member.name, this);
        }

        db.ConfigKeyValue.findOne({key: this.server.id + "_modules"}).then(function(doc){
            if(doc === null)
            {
                var doc = db.ConfigKeyValue.create({_id: this.server.id + "_modules", key: this.server.id + "_modules", value: {modules: this.modules}});
                doc.save().then(function(doc){
                    this.on_load();
                }.bind(this)).catch(function(err){
                    console.log(err);
                    this.on_load();
                }.bind(this));
            }
            else
            {
                this.modules = doc.value.modules;
                this.on_load();
            }
        }.bind(this)).catch(function(err){
            console.log(err);
        });
    }

    on_load()
    {
        this.bot.message(responses.get("ONLINE"), this);
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

        db.ConfigKeyValue.findOneAndUpdate({key: this.server.id + "_modules"}, {value: {modules: this.modules}}, {}).catch(function(err){
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

        db.ConfigKeyValue.findOneAndUpdate({key: this.server.id + "_modules"}, {value: {modules: this.modules}}, {}).catch(function(err){
            console.log(err);
        });
    }
}

module.exports = ServerData;
