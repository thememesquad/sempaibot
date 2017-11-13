import { RichEmbed } from "discord.js";
import * as lodash from "lodash";
import * as moment from "moment";
import { Repository } from "typeorm";
import {
    Command,
    CommandDescription,
    CommandPermission,
    CommandProcessor,
    CommandSample,
    Cron,
    DB,
    ICronInterface,
    IMessage,
    IRequest,
    IResponse,
    LoadBalancer,
    MessageID,
    Module,
    ModuleBase,
    ModuleOptions,
    PermissionManager,
    PersonalityManager,
    RoleType,
    Server
} from "../../core";
import { IOsuUser } from "./iosuuser";
import { OsuRecordModel } from "./model/osurecord";
import { OsuUserModel } from "./model/osuuser";
import { OsuAPI } from "./osuapi";
import { OsuMessageID } from "./osumessageid";
import { OsuMode } from "./osumode";
import { OsuDefaultPersonalityExpansion } from "./personality/osudefaultpersonality";

const USER_UPDATE_INTERVAL = 1200000;
const BEST_UPDATE_INTERVAL = 60000;
const CURRENT_DB_VERSION = 1;

@Module("osu!", "This is a game module for osu! Follow your friends and keep track of whenever they set a new top PP score! Great if you want to fanboy about Cookiezi, or make fun of your friend for setting a new PP score with bad acc!", ModuleOptions.DefaultOn)
export class OsuModule extends ModuleBase {
    private static _modsList: string[] = ["NF", "EZ", "b", "HD", "HR", "SD", "DT", "RX", "HT", "NC", "FL", "c", "SO", "d", "PF"];
    private _lastChecked: number;
    private _users: IOsuUser[];
    private _servers: { [key: string]: Server };
    private _check: ICronInterface;
    private _userRepository: Repository<OsuUserModel>;
    private _recordRepository: Repository<OsuRecordModel>;

    constructor() {
        super();

        this._lastChecked = -1;
        this._users = [];
        this._servers = {};
        this._check = null;

        // StatsManager.register("osu_api_calls", 0);
        // StatsManager.register("osu_num_users", 0);

        PermissionManager.instance.register("OSU_CHANGE_LIMIT", RoleType.SuperAdmin);
        PermissionManager.instance.register("OSU_FOLLOW", RoleType.Moderator);
        PermissionManager.instance.register("OSU_UNFOLLOW", RoleType.Moderator);
        PermissionManager.instance.register("OSU_CHECK", RoleType.Moderator);

        CommandProcessor.addCustomType("osumode", (msg) => {
            const tmp = msg.toLowerCase();

            if (tmp.endsWith("standard"))
                return OsuMode.Standard;
            else if (tmp.endsWith("taiko"))
                return OsuMode.Taiko;
            else if (tmp.endsWith("mania"))
                return OsuMode.Mania;
            else if (tmp.endsWith("ctb"))
                return OsuMode.CatchTheBeat;

            return OsuMode.Standard;
        });

        PersonalityManager.instance.expand("default", new OsuDefaultPersonalityExpansion());

        /*this.addCommand({
            formats: [
                "set osu limit to {int!limit} for {int!server}"
            ],
            sample: "set osu limit to __*limit*__ for __*server*__",
            description: "Changes the osu server limit",
            permission: "OSU_CHANGE_LIMIT",
            global: true,

            execute: this.onSetLimit
        });

        this.addCommand({
            formats: [
                "what is my osu limit",
                "osu limit"
            ],
            sample: "what is my osu limit",
            description: "Displays this servers osu limit",
            permission: null,
            global: false,

            execute: this.onShowLimit
        });

        this.addCommand({
            defaults: { mode: OsuMode.Standard },
            formats: [
                "who are you following <in {osumode!mode}>",
                "who do you follow <in {osumode!mode}>",
                "list following <in {osumode!mode}>",
                "list follows <in {osumode!mode}>",
                "show follow list <in {osumode!mode}>",
                "show followlist <in {osumode!mode}>",
                "show following list <in {osumode!mode}>",
                "show follows list <in {osumode!mode}>",
            ],
            sample: "who are you following in __*optional mode*__ (standard, taiko, mania, ctb)",
            description: "Lists all the people I'm following on osu!",
            permission: null,
            global: false,

            execute: this.onListFollowing
        });

        /*this.api_stats = setInterval(() => {
            let curr = (new Date()).getMinutes();

            if (this.stats.last_minute !== curr) {
                stats.update("osu_api_calls", this.stats.last);

                this.stats.last = 0;
                this.stats.last_minute = curr;
            }
        }, 10);*/
    }

    // public async onSetLimit(message: IMessageInterface, args: { [key: string]: any }) {
    //     const server = this._bot.getServer(args.server);
    //     if (server === null)
    //         return this._bot.respond(message, PersonalityManager.instance.get("INVALID_SERVER", {
    //             author: message.author.id,
    //             id: server.server.name,
    //         }));

    //     const oldLimit = server.config.value.osu_limit;
    //     server.config.value.osu_limit = args.limit;
    //     await server.saveConfig();

    //     return this._bot.respond(message, PersonalityManager.instance.get("OSU_SERVER_LIMIT_CHANGED", {
    //         author: message.author.id,
    //         old_limit: oldLimit,
    //         new_limit: args.limit,
    //         server_name: server.server.name
    //     }));
    // }

    // onShowLimit(message: IMessageInterface, args: { [key: string]: any }) {
    //     return this._bot.respond(message, StringFormat(Responses.get("OSU_SERVER_LIMIT"), {
    //         author: message.author.id,
    //         limit: message.server.config.value.osu_limit
    //     }));
    // }

    // onListFollowing(message: IMessageInterface, args: { [key: string]: any }) {
    //     if (this._users.length === 0)
    //         return this._bot.respond(message, Responses.get("OSU_FOLLOWING_EMPTY"));

    //     let users = lodash.clone(this._users);
    //     users.sort((a, b) => {
    //         return b.pp - a.pp;
    //     });

    //     let data = [];
    //     for (let i in users) {
    //         //Check if the server is actually following this player
    //         if (users[i].servers.indexOf(message.server.id) === -1)
    //             continue;

    //         if (users[i].mode !== args.mode)
    //             continue;

    //         data.push({
    //             rank: "#" + users[i].rank,
    //             name: users[i].username,
    //             pp: users[i].pp.toFixed(1) + "pp"
    //         });
    //     }

    //     if (data.length === 0) {
    //         this._bot.respond(message, StringFormat(Responses.get("OSU_FOLLOW_LIST_EMPTY"), {
    //             author: message.author.id
    //         }));
    //     } else {
    //         if (args.mode === OsuMode.Standard) {
    //             let messages = GenerateTable(StringFormat(Responses.get("OSU_FOLLOWING"), {
    //                 author: message.author.id
    //             }), {
    //                     rank: "Rank",
    //                     name: "Name",
    //                     pp: "PP"
    //                 }, data);
    //             this._bot.respond(message, messages);
    //         } else {
    //             let messages = GenerateTable(StringFormat(Responses.get("OSU_FOLLOWING_MODE"), {
    //                 author: message.author.id,
    //                 mode: (args.mode as OsuMode).toString()
    //             }), {
    //                     rank: "Rank",
    //                     name: "Name",
    //                     pp: "PP"
    //                 }, data);
    //             this._bot.respond(message, messages);
    //         }
    //     }
    // }

    @Command("follow {user} <in {osumode!mode}>")
    @Command("stalk {user} <in {osumode!mode}>")
    @CommandSample("follow __*osu! username*__ in __*optional mode*__ (standard, taiko, mania, ctb)")
    @CommandDescription("Adds the specified person to my following list for osu!")
    @CommandPermission("OSU_FOLLOW")
    public async onFollow(message: IMessage, args: { [key: string]: any }) {
        const username: string = args.user;
        const mode: OsuMode = args.mode || OsuMode.Standard;

        let profile: IOsuUser = null;
        let num = 0;

        for (const user of this._users) {
            if (user.username.toLowerCase() === username.toLowerCase() || user.user_id === username.toLowerCase())
                if (user.mode === mode)
                    profile = user;

            if (user.servers.indexOf(message.server.id) !== -1)
                num++;
        }

        if (profile !== null) {
            if (profile.servers.indexOf(message.server.id) === -1) {
                profile.servers.push(message.server.id);

                this._userRepository.update({
                    user_id: profile.user_id
                }, {
                    servers: profile.servers
                });

                if (mode === OsuMode.Standard) {
                    return this._bot.respond(message, PersonalityManager.instance.getExtended("osu", OsuMessageID.AddedFollowing, {
                        author: message.author.id,
                        user: profile.username
                    }));
                } else {
                    return this._bot.respond(message, PersonalityManager.instance.getExtended("osu", OsuMessageID.AddedFollowingWithMode, {
                        author: message.author.id,
                        mode: mode.toString(),
                        user: profile.username
                    }));
                }
            }

            if (mode === OsuMode.Standard) {
                return this._bot.respond(message, PersonalityManager.instance.getExtended("osu", OsuMessageID.AlreadyFollowingUser, {
                    author: message.author.id,
                    user: profile.username
                }));
            } else {
                return this._bot.respond(message, PersonalityManager.instance.getExtended("osu", OsuMessageID.AlreadyFollowingUserWithMode, {
                    author: message.author.id,
                    mode: mode.toString(),
                    user: profile.username
                }));
            }
        }

        if (num === message.server.osuLimit) {
            return this._bot.respond(message, PersonalityManager.instance.getExtended("osu", OsuMessageID.ReachedServerLimit, {
                author: message.author.id,
                limit: message.server.osuLimit,
                user: profile.username
            }));
        }

        const json = await OsuAPI.instance.getUser(username, mode);
        if (json === undefined || json.username === undefined) {
            if (message !== undefined) {
                if (mode === OsuMode.Standard) {
                    this._bot.respond(message, PersonalityManager.instance.getExtended("osu", OsuMessageID.InvalidUser, {
                        author: message.author.id,
                        user: username
                    }));
                } else {
                    this._bot.respond(message, PersonalityManager.instance.getExtended("osu", OsuMessageID.InvalidUserWithMode, {
                        author: message.author.id,
                        mode: mode.toString(),
                        user: username
                    }));
                }
            }

            return;
        }

        const time = Date.now();
        json.dbVersion = CURRENT_DB_VERSION;
        json.checking = false;
        json.mode = mode;
        json.records = [];
        json.servers = [message.server.id];
        json.updateInProgress = null;

        const dbuser = this._userRepository.create(json);
        this._users.push(dbuser);

        await this._userRepository.save(dbuser);

        // StatsManager.update("osu_num_users", this._users.length);

        this.forceCheck(json, true, mode);

        if (mode === OsuMode.Standard) {
            this._bot.respond(message, PersonalityManager.instance.getExtended("osu", OsuMessageID.StartedFollowingUser, {
                author: message.author.id,
                user: json.username
            }));
        } else {
            this._bot.respond(message, PersonalityManager.instance.getExtended("osu", OsuMessageID.StartedFollowingUserWithMode, {
                author: message.author.id,
                mode: mode.toString(),
                user: json.username
            }));
        }
    }

    @Command("stop following {user} <in {osumode!mode}>")
    @Command("stop stalking {user} <in {osumode!mode}>")
    @Command("unfollow {user} <in {osumode!mode}>")
    @CommandSample("stop following __*osu! username*__ in __*optional mode*__ (standard, taiko, mania, ctb)")
    @CommandDescription("Removes the specified person from my following list for osu!")
    @CommandPermission("OSU_UNFOLLOW")
    public onUnfollow(message: IMessage, args: { [key: string]: any }) {
        const mode: OsuMode = args.mode || OsuMode.Standard;

        let i = null;
        for (const j in this._users) {
            const user = this._users[j];

            if (user.username.toLowerCase() === args.user.toLowerCase() || user.user_id === args.user.toLowerCase()) {
                if (this._users[j].mode === mode) {
                    i = j;
                    break;
                }
            }
        }

        if (i === null) {
            return this._bot.respond(message, PersonalityManager.instance.getExtended("osu", OsuMessageID.NotFollowingUser, {
                author: message.author.id,
                user: args.user
            }));
        }

        const profile = this._users[i];
        if (profile.servers.indexOf(message.server.id) === -1) {
            return this._bot.respond(message, PersonalityManager.instance.getExtended("osu", OsuMessageID.NotFollowingUser, {
                author: message.author.id,
                user: args.user
            }));
        }

        if (profile.servers.length === 1) {
            this._users.splice(i, 1);

            this._userRepository.delete({
                user_id: profile.user_id
            });
        } else {
            profile.servers.splice(profile.servers.indexOf(message.server.id), 1);

            this._userRepository.update({
                user_id: profile.user_id
            }, {
                servers: profile.servers
            });
        }

        if (mode === OsuMode.Standard) {
            this._bot.respond(message, PersonalityManager.instance.getExtended("osu", OsuMessageID.StoppedFollowing, {
                author: message.author.id,
                user: profile.username
            }));
        } else {
            this._bot.respond(message, PersonalityManager.instance.getExtended("osu", OsuMessageID.StoppedFollowingWithMode, {
                author: message.author.id,
                mode: mode.toString(),
                user: profile.username
            }));
        }
    }

    public onNewRecord(profile: IOsuUser, record) {
        for (const serverID of profile.servers) {
            const server = this._servers[serverID];

            if (server === undefined)
                continue;

            const embed = new RichEmbed()
                .setTitle(`${record.user} has set a #${record.top_rank} score!`)
                .setThumbnail(`https://a.ppy.sh/${profile.user_id}_${Date.now()}.png`)
                .setColor("#4ec1ff")
                .setURL(`https://osu.ppy.sh/u/${profile.user_id}`)
                .setDescription(`**${record.map_artist} - ${record.map_title} [${record.map_diff_name}] ${record.mods}**`)
                .addField("Score", `**${record.acc}%** | **${record.pp}pp** | **Rank: ${record.rank}** ${record.additional}`, false);

            if (record.delta_pp === "0.00")
                embed.addField("PP Changes", `**${record.old_total_pp}pp** -> **${record.new_total_pp}pp** (no gain)`, true);
            else
                embed.addField("PP Changes", `**${record.old_total_pp}pp** -> **${record.new_total_pp}pp** (+${record.delta_pp}pp)`, true);

            if (record.delta_rank === 0)
                embed.addField("Rank Changes", `#**${record.old_rank}** -> #**${record.new_rank}**! (no gain)`, false);
            else
                embed.addField("PP Changes", `#**${record.old_rank}** -> #**${record.new_rank}**! (${record.delta_rank} gain)`, true);

            embed.addField("Map links", `[Map link](https://osu.ppy.sh/b/${record.beatmap_id}) | [Osu direct](osu://b/${record.beatmap_id})`, false)
                .addField("\u200b", "This score has been tracked by [Sempaibot!](http://sempai.moe) | Follow us [@sempaibot](https://twitter.com/osusempaibot)");

            this._bot.message(embed, server);
        }
    }

    public getUserCheckInterval(user: IOsuUser, time: number) {
        if (user.last_record === -1)
            return BEST_UPDATE_INTERVAL;

        const num = Math.ceil((time - user.last_record) / (60 * 1000));
        const times = Math.min(num / 30, 5);

        // todo: add an extra case for people who haven't gotten a record in a few days.

        return times * BEST_UPDATE_INTERVAL;
    }

    public getUserUpdateInterval(user: IOsuUser, time: number) {
        if (user.last_record === -1)
            return USER_UPDATE_INTERVAL;

        const num = Math.ceil((time - user.last_record) / (60 * 1000));
        const times = Math.min(num / 30, 5);

        // TODO: add an extra case for people who haven't gotten a record in a few days.

        return times * USER_UPDATE_INTERVAL;
    }

    public async onSetup() {
        this._userRepository = DB.connection.getRepository(OsuUserModel);
        this._recordRepository = DB.connection.getRepository(OsuRecordModel);

        this._check = Cron.instance.addInterval(100, (time: number) => {
            for (const user of this._users) {
                if ((time - user.last_checked) >= this.getUserCheckInterval(user, time))
                    this.forceCheck(user, false, user.mode);
            }

            for (const user of this._users) {
                if ((time - user.last_updated) >= this.getUserUpdateInterval(user, time))
                    this.updateUser(user);
            }
        });

        try {
            const users: OsuUserModel[] = await this._userRepository.find();

            for (const dbuser of users) {
                this._users.push(dbuser);

                const time = Date.now();
                if (dbuser.last_updated === undefined || time - dbuser.last_updated >= this.getUserUpdateInterval(dbuser, time))
                    this.updateUser(dbuser);
            }
        } catch (e) {
            // empty
        }

        // StatsManager.update("osu_num_users", this._users.length);
    }

    public onShutdown() {
        Cron.instance.remove(this._check);
        // clearInterval(this._apiStats);
    }

    public onLoad(server: Server) {
        if (this._servers[server.id] !== undefined)
            return;

        this._servers[server.id] = server;
    }

    public onUnload(server: Server) {
        if (this._servers[server.id] === undefined)
            return;

        delete this._servers[server.id];
    }

    public updateUser(profile: IOsuUser): Promise<IOsuUser> {
        if (profile.updateInProgress !== null)
            return profile.updateInProgress;

        const promise = async () => {
            try {
                const data = await OsuAPI.instance.getUser(profile.username, profile.mode);
                profile.last_updated = Date.now();

                for (const key in data) {
                    profile[key] = data[key];
                }

                await this._userRepository.save(profile);

                profile.updateInProgress = null;
                return data;
            } catch (err) {
                profile.updateInProgress = null;
                throw err;
            }
        };

        profile.updateInProgress = promise();
        return profile.updateInProgress;
    }

    private forceCheck(profile: IOsuUser, noReport: boolean, mode: OsuMode) {
        noReport = noReport || false;
        mode = mode || OsuMode.Standard;

        if (profile === null || profile.checking)
            return;

        profile.checking = true;

        let topRank;
        const handle = async () => {
            const json = await OsuAPI.instance.getUserBest(profile.user_id, profile.mode, 50);
            for (let j = 0; j < json.length; j++) {
                const beatmap = json[j];
                beatmap.count50 = parseInt(beatmap.count50 as string, 10);
                beatmap.count100 = parseInt(beatmap.count100 as string, 10);
                beatmap.count300 = parseInt(beatmap.count300 as string, 10);
                beatmap.countmiss = parseInt(beatmap.countmiss as string, 10);
                beatmap.countkatu = parseInt(beatmap.countkatu as string, 10);
                beatmap.countgeki = parseInt(beatmap.countgeki as string, 10);
                beatmap.enabled_mods = parseInt(beatmap.enabled_mods as string, 10);
                beatmap.perfect = parseInt(beatmap.perfect as string, 10);
                beatmap.pp = Math.round(parseFloat(beatmap.pp as string));
                beatmap.acc = this.calculateAccuracy(beatmap, mode);

                if (["X", "XH"].indexOf(beatmap.rank) !== -1)
                    beatmap.rank = "SS";
                else if (beatmap.rank === "SH")
                    beatmap.rank = "S";

                beatmap.mods = "";

                for (let i = 0; i < 16; i++) {
                    if ((beatmap.enabled_mods & (1 << i)) > 0)
                        if (i !== 6 || ((beatmap.enabled_mods & (1 << 9)) === 0))
                            beatmap.mods += ((beatmap.mods.length !== 0) ? "" : "+") + OsuModule._modsList[i];
                }

                let skip = false;
                let index = -1;
                const date = moment(new Date(beatmap.date + " UTC")).subtract("8", "hours").toDate().valueOf();

                profile.last_record = Math.max(profile.last_record, date);

                for (let i = 0; i < profile.records.length; i++) {
                    if (profile.records[i].beatmap_id === beatmap.beatmap_id) {
                        index = i;
                        if (profile.records[i].date === date) {
                            skip = true;
                            break;
                        }
                    }
                }

                if (skip)
                    continue;

                topRank = j + 1;

                if (index === -1)
                    profile.records.push(this._recordRepository.create(beatmap));

                profile.records[index].date = date;

                if (noReport)
                    continue;

                const beatmapInfo = await OsuAPI.instance.getBeatmaps(beatmap.beatmap_id);
                const userData = await this.updateUser(profile);

                const oldTotalpp = parseFloat(profile.pp_raw);
                const newTotalpp = parseFloat(userData.pp_raw);
                const deltapp = newTotalpp - oldTotalpp;
                const oldRank = parseFloat(profile.pp_rank);
                const newRank = parseFloat(userData.pp_rank);
                const deltaRank = newRank - oldRank;

                profile.pp_rank = userData.pp_rank;
                profile.pp_raw = userData.pp_raw;

                beatmap.additional = "";
                if (beatmap.perfect === 0) {
                    if (beatmapInfo.max_combo === null)
                        beatmapInfo.max_combo = "err";

                    beatmap.additional = "| **" + beatmap.maxcombo + "/" + beatmapInfo.max_combo + "** " + beatmap.countmiss + "x Miss";
                }

                const announcement = {
                    acc: beatmap.acc,
                    additional: beatmap.additional,
                    beatmap_id: beatmap.beatmap_id,
                    delta_pp: deltapp.toFixed(2),
                    delta_rank: deltaRank,
                    map_artist: beatmapInfo.artist,
                    map_diff_name: beatmapInfo.version,
                    map_title: beatmapInfo.title,
                    mode: (profile.mode as OsuMode).toString(),
                    mods: beatmap.mods,
                    new_rank: newRank,
                    new_total_pp: newTotalpp.toFixed(2),
                    old_rank: oldRank,
                    old_total_pp: oldTotalpp.toFixed(2),
                    pp: beatmap.pp,
                    rank: beatmap.rank,
                    top_rank: topRank,
                    user: profile.username
                };

                this.onNewRecord(profile, announcement);
            }

            profile.last_checked = (new Date()).getTime();
            profile.checking = false;

            await this._userRepository.save(profile);
        };

        handle();
    }

    private calculateAccuracy(beatmap, mode) {
        let totalPointOfHits = 0;
        let totalNumberOfHits = 0;

        switch (mode) {
            case OsuMode.Taiko:
                totalPointOfHits = (beatmap.count100 * 0.5 + beatmap.count300 * 1) * 300;
                totalNumberOfHits = beatmap.countmiss + beatmap.count100 + beatmap.count300;

                return (totalPointOfHits / (totalNumberOfHits * 300) * 100).toFixed(2);

            case OsuMode.CatchTheBeat:
                totalPointOfHits = beatmap.count50 + beatmap.count100 + beatmap.count300;
                totalNumberOfHits = beatmap.countmiss + beatmap.count50 + beatmap.count100 + beatmap.count300 + beatmap.countkatu;

                return ((totalPointOfHits / totalNumberOfHits) * 100).toFixed(2);

            case OsuMode.Mania:
                totalPointOfHits = beatmap.count50 * 50 + beatmap.count100 * 100 + beatmap.countkatu * 200 + beatmap.count300 * 300;
                totalNumberOfHits = beatmap.countmiss + beatmap.count50 + beatmap.count100 + beatmap.countkatu + beatmap.count300;

                return (totalPointOfHits / (totalNumberOfHits * 300) * 100).toFixed(2);

            default:
            case OsuMode.Standard:
                totalPointOfHits = beatmap.count50 * 50 + beatmap.count100 * 100 + beatmap.count300 * 300;
                totalNumberOfHits = beatmap.countmiss + beatmap.count50 + beatmap.count100 + beatmap.count300;

                return (totalPointOfHits / (totalNumberOfHits * 300) * 100).toFixed(2);
        }
    }
}
