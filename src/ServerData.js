"use strict";

const responses = require("./responses.js");
const db = require("./db.js");

//TODO: Actually save & restore this stuff.

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
        db.ConfigKeyValue.findOne({key: this.server.id + "_modules"}).then(function(doc){
            if(doc === null)
            {
                var doc = db.ConfigKeyValue.create({key: _this.server.id + "_modules", value: {modules: _this.modules}});
                doc.save().then(function(doc){
                    _this.on_load();
                }).catch(function(err){
                    console.log(err);
                });
            }
            else
            {
                _this.modules = doc.value.modules;
                _this.on_load();
            }
        }).catch(function(err){
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

        db.ConfigKeyValue.findOneAndUpdate({key: this.server.id + "_modules"}, {value: {modules: this.modules}}, {});
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

        db.ConfigKeyValue.findOneAndUpdate({key: this.server.id + "_" + modules}, {value: {modules: this.modules}}, {});
    }
}

module.exports = ServerData;
