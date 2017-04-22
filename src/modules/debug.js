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
        
        this.name = "Debug";
        this.description = "";
        this.always_on = true;
        this.hidden = true;
        
        this.add_command({
            formats: [
                "debug"
            ],
            sample: "debug ...",
            description: "internal debug command",
            permission: "SUPERADMIN",
            global: true,
            
            execute: this.handle_debug
        });
    }
    
    handle_debug(message)
    {
        let splitted = message.content.split(" ");
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
    
    async handle_debug_osu_user(message, username)
    {
        let osu = this.bot.get_module("osu!");
        
        let profile = null;
        for(let i in osu.users)
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
        
        let profile_data = [];
        for(let key in profile)
        {
            if(Array.isArray(profile[key]))
            {
                for(let i = 0;i<profile[key].length;i++)
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
        
        let json = await osu.get_user_best(username, 0, 50);
        let data = [];
        
        for (let j = 0; j < json.length; j++)
        {
            let beatmap = json[j];
            beatmap.count50 = parseInt(beatmap.count50);
            beatmap.count100 = parseInt(beatmap.count100);
            beatmap.count300 = parseInt(beatmap.count300);
            beatmap.countmiss = parseInt(beatmap.countmiss);
            beatmap.enabled_mods = parseInt(beatmap.enabled_mods);
            beatmap.perfect = parseInt(beatmap.perfect);
            beatmap.pp = Math.round(parseFloat(beatmap.pp));

            let totalPointOfHits = beatmap.count50 * 50 + beatmap.count100 * 100 + beatmap.count300 * 300;
            let totalNumberOfHits = beatmap.countmiss + beatmap.count50 + beatmap.count100 + beatmap.count300;

            beatmap.acc = (totalPointOfHits / (totalNumberOfHits * 300) * 100).toFixed(2);

            if(["X", "XH"].indexOf(beatmap.rank) !== -1)
                beatmap.rank = "SS";
            else if(beatmap.rank === "SH")
                beatmap.rank = "S";

            beatmap.mods = "";

            for(let i = 0;i<16;i++)
            {
                if((beatmap.enabled_mods & (1 << i)) > 0)
                    if(i !== 6 || ((beatmap.enabled_mods & (1 << 9)) === 0))
                        beatmap.mods += ((beatmap.mods.length !== 0) ? "" : "+") + osu.modsList[i];
            }

            let skip = false;
            let index = -1;
            let date = moment(new Date(beatmap.date + " UTC")).subtract("8", "hours").toDate().valueOf();
            
            for(let i = 0;i<profile.records.length;i++)
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
        
        let messages1 = util.generate_table("Debug info:", {name: "Name", value: "Value"}, profile_data);
        let messages2 = util.generate_table("", {rank: "Rank", id: "ID", date: "Date", skip: "Last Showed"}, data);
        let messages = messages1.concat(messages2);
        
        this.bot.respond_queue(message, messages);
    }
    
    handle_debug_osu_users(message)
    {
        let osu = this.bot.get_module("osu!");
        let data = [];
        
        for(let i = 0;i<osu.users.length;i++)
        {
            data.push({
                name: osu.users[i].username,
                id: "" + osu.users[i].user_id,
                mode: osu.users[i].mode,
                num_servers: "" + osu.users[i].servers.length,
                check: moment(osu.users[i].last_checked).format()
            });
        }
        
        data.sort((a, b) => {
            return parseInt(b.num_servers) - parseInt(a.num_servers);
        });
        
        let messages = util.generate_table("Osu users debug info:", {
            name: "Name", 
            id: "ID", 
            mode: "Mode",
            num_servers: "Num. Servers", 
            check: "Last checked"
        }, data);
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
    
    handle_debug_db()//message, splitted)
    {
    }
    
    on_setup()
    {
    }
    
    on_load()//server)
    {
    }
}

module.exports = new DebugModule();