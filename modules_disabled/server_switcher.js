var ping = require ("net-ping");
var dns = require("dns");
const PING_THRESHOLD = 100;

//TODO: UPDATE TO THE NEW MODULE API.

module.exports = {
    load: function(Bot){
        Bot.discord.getServers = function(){
            return this.internal.apiRequest("get", "https://discordapp.com/api/voice/regions", true);
        };

        var serverSwitcher = function(){
            if(Bot.discord.servers.length == 0)
                return;

            Bot.discord.getServers().then(function(res){
                var session = ping.createSession ();
                var pending = 0;
                var pings = {};
                var names = {};

                for(var i = 0;i<res.length;i++)
                {
                    names[res[i].id] = res[i].name;

                    pending++;
                    dns.resolve(res[i].sample_hostname, function(res, err, addresses){
                        session.pingHost(addresses[0], function(err, target, sent, rcvd){
                            pending--;

                            var ms = rcvd - sent;
                            if(err)
                            {
                                pings[res.id] = 99999;
                            }else{
                                pings[res.id] = ms;
                            }

                            if(pending == 0)
                            {
                                for(var sid = 0;sid<Bot.discord.servers.length;sid++)
                                {
                                    if(pings[Bot.discord.servers[sid].region] >= PING_THRESHOLD)
                                    {
                                        var best = null;
                                        for(var key in pings)
                                        {
                                            if(best == null || pings[key] < pings[best])
                                            {
                                                best = key;
                                            }
                                        }

                                        if(Bot.discord.servers[sid].region == best)
                                            return;

                                        //todo: change the channel where it outputs per server instead of using just 1 channel.
                                        var old = Bot.discord.servers[sid].region;
                                        Bot.discord.internal.apiRequest("patch", "https://discordapp.com/api/guilds/" + Bot.discord.servers[sid].id, true, {name: Bot.discord.servers[sid].name, region: best}).then(function(res){
                                            Bot.discord.sendMessage(Bot.discord.channels.get("name", "osu"), responses.get("REGION_CHANGED").format({old_region: names[old], new_region: names[best]}));
                                        }).catch(function(res){
                                            console.log("Failed to switch region to '" + best + "'. Error: ", res.response.error);
                                        });
                                    }
                                }
                            }
                        });
                    }.bind(null, res[i]));
                }
            }).catch(function(err){
                console.log(err);
            });
        };

        setInterval(serverSwitcher, 10000);
    }
};
