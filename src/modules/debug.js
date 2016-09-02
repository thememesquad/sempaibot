"use strict";

const ModuleBase = require("../modulebase.js");
const permissions = require("../permissions.js");
const util = require("../util.js");
const moment = require("moment");

class DebugModule extends ModuleBase
{
    constructor()
    {
        super();
        
        permissions.register("SUPERADMIN", "superadmin");
        
        this.add_command({
            match: function(message){
                if(!message.content.startsWith("debug"))
                    return null;
                
                return [];
            },
            sample: "",
            description: "",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_debug
        });
    }
    
    handle_debug(message)
    {
        var splitted = message.content.split(" ");
        switch(splitted[1])
        {
            case "osu":
                this.handle_debug_osu(message, splitted);
                break;
                
            case "db":
                this.handle_debug_db(message, splitted);
                break;
        }
    }
    
    handle_debug_osu_user(message, username)
    {
        var osu = this.bot.get_module("osu!");
        
        var profile = null;
        for(var i in osu.users)
        {
            if(osu.users[i].username.toLowerCase() === username.toLowerCase() || osu.users[i].user_id === username.toLowerCase())
            {
                profile = osu.users[i];
                break;
            }
        }
        
        if(profile === null)
            return;
        
        this.bot.respond(message, "Retrieving debug data for osu user '" + username + "'...please wait...");
        
        var profile_data = [];
        for(var key in profile)
        {
            if(Array.isArray(profile[key]))
            {
                for(var i = 0;i<profile[key].length;i++)
                {
                    if(typeof profile[key][i] === "object")
                    {
                        profile_data.push({
                            name: key + "[" + i + "]",
                            value: JSON.stringify(profile[key][i])
                        });
                    }
                    else
                    {
                        profile_data.push({
                            name: key + "[" + i + "]",
                            value: "" + profile[key][i]
                        });
                    }
                }
            }
            else
            {
                profile_data.push({
                    name: key,
                    value: "" + profile[key]
                });
            }
        }
        
        var _this = this;
        osu.get_user_best(username, 0, 50).then(function(profile, json){
            var data = [];
            
            for (var j = 0; j < json.length; j++)
            {
                var beatmap = json[j];
                beatmap.count50 = parseInt(beatmap.count50);
                beatmap.count100 = parseInt(beatmap.count100);
                beatmap.count300 = parseInt(beatmap.count300);
                beatmap.countmiss = parseInt(beatmap.countmiss);
                beatmap.enabled_mods = parseInt(beatmap.enabled_mods);
                beatmap.perfect = parseInt(beatmap.perfect);
                beatmap.pp = Math.round(parseFloat(beatmap.pp));

                var totalPointOfHits = beatmap.count50 * 50 + beatmap.count100 * 100 + beatmap.count300 * 300;
                var totalNumberOfHits = beatmap.countmiss + beatmap.count50 + beatmap.count100 + beatmap.count300;

                beatmap.acc = (totalPointOfHits / (totalNumberOfHits * 300) * 100).toFixed(2);

                if(["X", "XH"].indexOf(beatmap.rank) !== -1)
                    beatmap.rank = "SS";
                else if(beatmap.rank === "SH")
                    beatmap.rank = "S";

                beatmap.mods = "";

                var i;
                for(i = 0;i<16;i++)
                {
                    if((beatmap.enabled_mods & (1 << i)) > 0)
                        if(i !== 6 || ((beatmap.enabled_mods & (1 << 9)) === 0))
                            beatmap.mods += ((beatmap.mods.length !== 0) ? "" : "+") + osu.modsList[i];
                }

                var skip = false;
                var index = -1;
                var date = moment(new Date(beatmap.date + " UTC")).subtract("8", "hours").toDate().valueOf();
                
                for(i = 0;i<profile.records.length;i++)
                {
                    if(profile.records[i].beatmap_id === beatmap.beatmap_id)
                    {
                        if(profile.records[i].date === date)
                        {
                            index = i;
                            skip = true;
                            break;
                        }
                    }
                }
                
                data.push({
                    rank: "" + (j + 1),
                    id: beatmap.beatmap_id,
                    date: moment(new Date(date)).format(),
                    skip: (skip) ? moment(new Date(profile.records[index].date)).format() : "no"
                });
            }
            
            var messages1 = util.generate_table("Debug info:", {name: "Name", value: "Value"}, profile_data);
            var messages2 = util.generate_table("", {rank: "Rank", id: "ID", date: "Date", skip: "Last Showed"}, data);
            var messages = messages1.concat(messages2);
            
            _this.bot.respond_queue(message, messages);
        }.bind(null, profile)).catch(function(err){
            console.log(err, err.stack);
        });
    }
    
    handle_debug_osu_users(message)
    {
        var osu = this.bot.get_module("osu!");
        var data = [];
        
        for(var i = 0;i<osu.users.length;i++)
        {
            data.push({
                name: osu.users[i].username,
                id: "" + osu.users[i].user_id,
                num_servers: "" + osu.users[i].servers.length,
                check: moment(osu.users[i].last_checked).format()
            });
        }
        
        data.sort(function(a, b){
            return parseInt(b.num_servers) - parseInt(a.num_servers);
        });
        
        var messages = util.generate_table("Osu users debug info:", {name: "Name", id: "ID", num_servers: "Num. Servers", check: "Last checked"}, data);
        this.bot.respond_queue(message, messages);
    }
    
    handle_debug_osu(message, splitted)
    {
        switch(splitted[2])
        {
            case "user":
                this.handle_debug_osu_user(message, splitted[3]);
                break;
                
            case "users":
                this.handle_debug_osu_users(message);
                break;
        }
    }
    
    handle_debug_db(message, splitted)
    {
    }
    
    on_setup(bot)
    {
        this.bot = bot;
    }
}

module.exports = new DebugModule();