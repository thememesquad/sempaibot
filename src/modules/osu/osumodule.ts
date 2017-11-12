import * as lodash from "lodash";
import * as moment from "moment";
import {
    CommandProcessor,
    IMessage,
    Module,
    ModuleBase,
    ModuleOptions,
    PermissionManager,
    PersonalityManager,
    RoleType,
    Server,
} from "../../core";
import { OsuRecordModel } from "./model/osurecord";
import { OsuUserModel } from "./model/osuuser";
import { OsuAPI } from "./osuapi";
import { OsuMode } from "./osumode";
import { IOsuUser } from "./osuuserinterface";
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
    // private _loadBalancer: LoadBalancer;
    // private _pending: Array<Promise<ResponseInterface>>;

    constructor() {
        super();

        this._lastChecked = -1;
        this._users = [];
        this._servers = {};
        // this._loadBalancer = new LoadBalancer(60);
        // this._pending = [];

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

        this.addCommand({
            defaults: { mode: OsuMode.Standard },
            formats: [
                "follow {user} <in {osumode!mode}>",
                "stalk {user} <in {osumode!mode}>",
            ],
            sample: "follow __*osu! username*__ in __*optional mode*__ (standard, taiko, mania, ctb)",
            description: "Adds the specified person to my following list for osu!",
            permission: "OSU_FOLLOW",
            global: false,

            execute: this.onFollow
        });

        this.addCommand({
            defaults: { mode: OsuMode.Standard },
            formats: [
                "stop following {user} <in {osumode!mode}>",
                "stop stalking {user} <in {osumode!mode}>",
                "unfollow {user} <in {osumode!mode}>",
            ],
            sample: "stop following __*osu! username*__ in __*optional mode*__ (standard, taiko, mania, ctb)",
            description: "Removes the specified person from my following list for osu!",
            permission: "OSU_UNFOLLOW",
            global: false,

            execute: this.onUnfollow
        });*/

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

    // async onFollow(message: MessageInterface, args: { [key: string]: any }) {
    //     let username = args.user;

    //     let profile = null;
    //     let num = 0;

    //     for (let i in this._users) {
    //         let user = this._users[i];
    //         if (user.username.toLowerCase() === username.toLowerCase() || user.userId === username.toLowerCase()) {
    //             if (this._users[i].mode === args.mode) {
    //                 profile = this._users[i];
    //             }
    //         }

    //         if (this._users[i].servers.indexOf(message.server.id) !== -1)
    //             num++;
    //     }

    //     if (profile !== null) {
    //         if (profile.servers.indexOf(message.server.id) === -1) {
    //             profile.servers.push(message.server.id);
    //             //OsuUser.findOneAndUpdate({ user_id: profile.user_id }, { servers: profile.servers }, {});

    //             if (args.mode === OsuMode.Standard) {
    //                 return this._bot.respond(message, StringFormat(Responses.get("OSU_ADDED_FOLLOWING"), {
    //                     author: message.author.id,
    //                     user: profile.username
    //                 }));
    //             } else {
    //                 return this._bot.respond(message, StringFormat(Responses.get("OSU_ADDED_FOLLOWING_MODE"), {
    //                     author: message.author.id,
    //                     user: profile.username,
    //                     mode: (args.mode as OsuMode).toString()
    //                 }));
    //             }
    //         }

    //         if (args.mode === OsuMode.Standard) {
    //             return this._bot.respond(message, StringFormat(Responses.get("OSU_ALREADY_FOLLOWING"), {
    //                 author: message.author.id,
    //                 user: profile.username
    //             }));
    //         } else {
    //             return this._bot.respond(message, StringFormat(Responses.get("OSU_ALREADY_FOLLOWING_MODE"), {
    //                 author: message.author.id,
    //                 user: profile.username,
    //                 mode: (args.mode as OsuMode).toString()
    //             }));
    //         }
    //     }

    //     if (num === message.server.config.value.osu_limit) {
    //         return this._bot.respond(message, StringFormat(Responses.get("OSU_MAX_USER_LIMIT"), {
    //             author: message.author.id,
    //             limit: message.server.config.value.osu_limit,
    //             user: profile.username
    //         }));
    //     }

    //     let json = await this.getUser(username, args.mode);
    //     if (json === undefined || json.username === undefined) {
    //         if (message !== undefined) {
    //             if (args.mode === OsuMode.Standard) {
    //                 this._bot.respond(message, StringFormat(Responses.get("OSU_USER_NOT_FOUND"), {
    //                     author: message.author.id,
    //                     user: username
    //                 }));
    //             } else {
    //                 this._bot.respond(message, StringFormat(Responses.get("OSU_USER_NOT_FOUND_MODE"), {
    //                     author: message.author.id,
    //                     user: username,
    //                     mode: args.mode
    //                 }));
    //             }
    //         }

    //         return;
    //     }

    //     let time = Date.now();
    //     let user = {
    //         userId: json.user_id,
    //         username: json.username,
    //         pp: Number(json.pp_raw),
    //         rank: Number(json.pp_rank),
    //         servers: [message.server.id],
    //         update_in_progress: null,
    //         lastChecked: time,
    //         lastUpdated: time,
    //         records: [],
    //         lastRecord: -1,
    //         checking: false,
    //         db_version: CURRENT_DB_VERSION,
    //         mode: args.mode,
    //         extra: json
    //     };
    //     this._users.push(user);

    //     StatsManager.update("osu_num_users", this._users.length);

    //     //await OsuUser.create(user).save();

    //     this.forceCheck(user.username, null, true, false, args.mode);

    //     if (args.mode === OsuMode.Standard) {
    //         this._bot.respond(message, StringFormat(Responses.get("OSU_ADDED_FOLLOWING"), {
    //             author: message.author.id,
    //             user: json.username
    //         }));
    //     } else {
    //         this._bot.respond(message, StringFormat(Responses.get("OSU_ADDED_FOLLOWING_MODE"), {
    //             author: message.author.id,
    //             user: json.username,
    //             mode: (args.mode as OsuMode).toString()
    //         }));
    //     }
    // }

    // onUnfollow(message: MessageInterface, args: { [key: string]: any }) {
    //     let i = null;
    //     for (let j in this._users) {
    //         let user = this._users[j];
    //         if (user.username.toLowerCase() === args.user.toLowerCase() || user.userId === args.user.toLowerCase()) {
    //             if (this._users[j].mode === args.mode) {
    //                 i = j;
    //                 break;
    //             }
    //         }
    //     }

    //     if (i === null) {
    //         return this._bot.respond(message, StringFormat(Responses.get("OSU_NOT_FOLLOWING"), {
    //             author: message.author.id,
    //             user: args.user
    //         }));
    //     }

    //     let profile = this._users[i];
    //     if (profile.servers.indexOf(message.server.id) === -1) {
    //         return this._bot.respond(message, StringFormat(Responses.get("OSU_NOT_FOLLOWING"), {
    //             author: message.author.id,
    //             user: args.user
    //         }));
    //     }

    //     if (profile.servers.length === 1) {
    //         this._users.splice(i, 1);
    //         //OsuUser.deleteOne({ user_id: profile.userId }, {}, () => { });
    //     } else {
    //         profile.servers.splice(profile.servers.indexOf(message.server.id), 1);
    //         //OsuUser.findOneAndUpdate({ user_id: profile.userId }, { servers: profile.servers }, {});
    //     }

    //     if (args.mode === OsuMode.Standard) {
    //         this._bot.respond(message, StringFormat(Responses.get("OSU_STOPPED"), {
    //             author: message.author.id,
    //             user: profile.username
    //         }));
    //     } else {
    //         this._bot.respond(message, StringFormat(Responses.get("OSU_STOPPED_MODE"), {
    //             author: message.author.id,
    //             user: profile.username,
    //             mode: (args.mode as OsuMode).toString()
    //         }));
    //     }
    // }

    // onNewRecord(profile, record) {
    //     for (let i = 0; i < profile.servers.length; i++) {
    //         let server = this._servers[profile.servers[i]];

    //         if (server === undefined)
    //             continue;

    //         let embed = new RichEmbed()
    //             .setTitle(`${record.user} has set a #${record.top_rank} score!`)
    //             .setThumbnail(`https://a.ppy.sh/${profile.user_id}_${Date.now()}.png`)
    //             .setColor("#4ec1ff")
    //             .setURL(`https://osu.ppy.sh/u/${profile.user_id}`)
    //             .setDescription(`**${record.map_artist} - ${record.map_title} [${record.map_diff_name}] ${record.mods}**`)
    //             .addField("Score", `**${record.acc}%** | **${record.pp}pp** | **Rank: ${record.rank}** ${record.additional}`, false);

    //         if (record.delta_pp === "0.00")
    //             embed.addField("PP Changes", `**${record.old_total_pp}pp** -> **${record.new_total_pp}pp** (no gain)`, true);
    //         else
    //             embed.addField("PP Changes", `**${record.old_total_pp}pp** -> **${record.new_total_pp}pp** (+${record.delta_pp}pp)`, true);

    //         if (record.delta_rank === 0)
    //             embed.addField("Rank Changes", `#**${record.old_rank}** -> #**${record.new_rank}**! (no gain)`, false);
    //         else
    //             embed.addField("PP Changes", `#**${record.old_rank}** -> #**${record.new_rank}**! (${record.delta_rank} gain)`, true);

    //         embed.addField("Map links", `[Map link](https://osu.ppy.sh/b/${record.beatmap_id}) | [Osu direct](osu://b/${record.beatmap_id})`, false)
    //             .addField("\u200b", "This score has been tracked by [Sempaibot!](http://sempai.moe) | Follow us [@sempaibot](https://twitter.com/osusempaibot)");

    //         this._bot.message(embed, server);
    //     }
    // }

    // getCheckInterval(user, time) {
    //     if (user.last_record === -1)
    //         return BEST_UPDATE_INTERVAL;

    //     let num = Math.ceil((time - user.last_record) / (60 * 1000));
    //     let times = Math.min(num / 30, 5);

    //     //todo: add an extra case for people who haven't gotten a record in a few days.

    //     return times * BEST_UPDATE_INTERVAL;

    //     //Disabled for now since it wasn't working.
    //     //return BEST_UPDATE_INTERVAL;
    // }

    public getUserUpdateInterval(user, time) {
        if (user.last_record === -1)
            return USER_UPDATE_INTERVAL;

        const num = Math.ceil((time - user.last_record) / (60 * 1000));
        const times = Math.min(num / 30, 5);

        // TODO: add an extra case for people who haven't gotten a record in a few days.

        return times * USER_UPDATE_INTERVAL;
    }

    public async onSetup() {
        // this._check = setInterval(() => {
        //     let time = Date.now();
        //     let user = null;

        //     for (let i = 0; i < this._users.length; i++) {
        //         user = this._users[i];
        //         if ((time - user.last_checked) >= this.get_check_interval(user, time))
        //             this.force_check(user.username, null, false, false, user.mode);
        //     }

        //     for (let i = 0; i < this._users.length; i++) {
        //         if ((time - this._users[i].lastUpdated) >= this.get_user_update_interval(user, time))
        //             this.update_user(this._users[i]);
        //     }
        // }, 10);

        const docs: OsuUserModel[] = []; // await OsuUser.find({});
        for (const dbuser of docs) {
            const records: OsuRecordModel[] = [];
            // for (const record of dbuser.records) {
            //     records.push(record);
            // }

            const user: IOsuUser = {
                checking: false,
                extra: {}, // dbuser.extra || {}
                lastChecked: dbuser.lastChecked || Date.now(),
                lastRecord: -1,
                lastUpdated: dbuser.lastUpdated,
                mode: dbuser.mode || OsuMode.Standard,
                pp: dbuser.pp,
                rank: dbuser.rank,
                records,
                servers: [], // docs[i].servers,
                updateInProgress: null,
                userId: dbuser.userId,
                username: dbuser.username,
            };

            this._users.push(user);

            const time = Date.now();
            if (user.lastUpdated === undefined || time - user.lastUpdated >= this.getUserUpdateInterval(user, time))
                this.updateUser(user);
        }

        // StatsManager.update("osu_num_users", this._users.length);
    }

    public onShutdown() {
        // clearInterval(this._check);
        // clearInterval(this._apiStats);

        // for (let i = 0; i < this.pending.length; i++) {
        //     this._loadBalancer.cancel(this.pending[i]);
        // }
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

    // calculateAccuracy(beatmap, mode) {
    //     if (mode === OsuMode.Taiko) {
    //         let totalPointOfHits = (beatmap.count100 * 0.5 + beatmap.count300 * 1) * 300;
    //         let totalNumberOfHits = beatmap.countmiss + beatmap.count100 + beatmap.count300;

    //         return (totalPointOfHits / (totalNumberOfHits * 300) * 100).toFixed(2);
    //     } else if (mode === OsuMode.CatchTheBeat) {
    //         let totalPointOfHits = beatmap.count50 + beatmap.count100 + beatmap.count300;
    //         let totalNumberOfHits = beatmap.countmiss + beatmap.count50 + beatmap.count100 + beatmap.count300 + beatmap.countkatu;

    //         return ((totalPointOfHits / totalNumberOfHits) * 100).toFixed(2);
    //     } else if (mode === OsuMode.Mania) {
    //         let totalPointOfHits = beatmap.count50 * 50 + beatmap.count100 * 100 + beatmap.countkatu * 200 + beatmap.count300 * 300;
    //         let totalNumberOfHits = beatmap.countmiss + beatmap.count50 + beatmap.count100 + beatmap.countkatu + beatmap.count300;

    //         return (totalPointOfHits / (totalNumberOfHits * 300) * 100).toFixed(2);
    //     }

    //     let totalPointOfHits = beatmap.count50 * 50 + beatmap.count100 * 100 + beatmap.count300 * 300;
    //     let totalNumberOfHits = beatmap.countmiss + beatmap.count50 + beatmap.count100 + beatmap.count300;

    //     return (totalPointOfHits / (totalNumberOfHits * 300) * 100).toFixed(2);
    // }

    // forceCheck(_username, _message, _no_report, _force, _mode) {
    //     let username = _username;
    //     let message = _message || null;
    //     let no_report = _no_report || false;
    //     let force = _force || false;
    //     let mode = _mode || OsuMode.Standard;

    //     let profile = null;
    //     for (let i in this._users) {
    //         let user = this._users[i];

    //         if (user.username.toLowerCase() === username.toLowerCase() || user.userId === username.toLowerCase()) {
    //             if (user.mode !== mode)
    //                 continue;

    //             profile = this._users[i];
    //             break;
    //         }
    //     }

    //     if (profile === null) {
    //         if (message) {
    //             this._bot.respond(message, StringFormat(Responses.get("OSU_NOT_FOLLOWING"), {
    //                 author: message.author.id,
    //                 user: username
    //             }));
    //         }

    //         return;
    //     }

    //     if (message) {
    //         if (profile.mode === OsuMode.Standard)
    //             this._bot.respond(message, StringFormat(Responses.get("OSU_CHECK"), {
    //                 author: message.author.id,
    //                 user: profile.username
    //             }));
    //         else
    //             this._bot.respond(message, StringFormat(Responses.get("OSU_CHECK_MODE"), {
    //                 author: message.author.id,
    //                 user: profile.username,
    //                 mode: (profile.mode as OsuMode).toString()
    //             }));
    //     }

    //     if (!force && profile.checking)
    //         return;

    //     profile.checking = true;

    //     let topRank;
    //     let handle = async () => {
    //         let json = await this.getUserBest(profile.user_id, profile.mode, 50);
    //         for (let j = 0; j < json.length; j++) {
    //             let beatmap = json[j];
    //             beatmap.count50 = parseInt(beatmap.count50);
    //             beatmap.count100 = parseInt(beatmap.count100);
    //             beatmap.count300 = parseInt(beatmap.count300);
    //             beatmap.countmiss = parseInt(beatmap.countmiss);
    //             beatmap.countkatu = parseInt(beatmap.countkatu);
    //             beatmap.countgeki = parseInt(beatmap.countgeki);
    //             beatmap.enabled_mods = parseInt(beatmap.enabled_mods);
    //             beatmap.perfect = parseInt(beatmap.perfect);
    //             beatmap.pp = Math.round(parseFloat(beatmap.pp));
    //             beatmap.acc = this.calculateAccuracy(beatmap, mode);

    //             if (["X", "XH"].indexOf(beatmap.rank) !== -1)
    //                 beatmap.rank = "SS";
    //             else if (beatmap.rank === "SH")
    //                 beatmap.rank = "S";

    //             beatmap.mods = "";

    //             for (let i = 0; i < 16; i++) {
    //                 if ((beatmap.enabled_mods & (1 << i)) > 0)
    //                     if (i !== 6 || ((beatmap.enabled_mods & (1 << 9)) === 0))
    //                         beatmap.mods += ((beatmap.mods.length !== 0) ? "" : "+") + OsuModule._modsList[i];
    //             }

    //             let skip = false;
    //             let index = -1;
    //             let date = moment(new Date(beatmap.date + " UTC")).subtract("8", "hours").toDate().valueOf();

    //             profile.last_record = Math.max(profile.last_record, date);

    //             for (let i = 0; i < profile.records.length; i++) {
    //                 if (profile.records[i].beatmap_id === beatmap.beatmap_id) {
    //                     index = i;
    //                     if (profile.records[i].date === date) {
    //                         skip = true;
    //                         break;
    //                     }
    //                 }
    //             }

    //             if (skip)
    //                 continue;

    //             topRank = j + 1;

    //             if (index === -1)
    //                 profile.records.push({ date: date, beatmap_id: beatmap.beatmap_id });
    //             else
    //                 profile.records[index].date = date;

    //             if (no_report)
    //                 continue;

    //             let beatmap_info = await this.getBeatmaps(beatmap.beatmap_id);
    //             let user_data = await this.updateUser(profile, profile.mode);

    //             let oldTotalpp = parseFloat(profile.pp);
    //             let newTotalpp = parseFloat(user_data.pp_raw);
    //             let deltapp = user_data.pp_raw - profile.pp;
    //             let oldRank = profile.rank;
    //             let deltaRank = user_data.pp_rank - profile.rank;

    //             let newRank = profile.rank = parseInt(user_data.pp_rank);
    //             profile.pp = parseFloat(user_data.pp_raw);

    //             beatmap.additional = "";
    //             if (beatmap.perfect === 0) {
    //                 if (beatmap_info.max_combo === null)
    //                     beatmap_info.max_combo = "err";

    //                 beatmap.additional = "| **" + beatmap.maxcombo + "/" + beatmap_info.max_combo + "** " + beatmap.countmiss + "x Miss";
    //             }

    //             let announcement = {
    //                 user: profile.username,
    //                 beatmap_id: beatmap.beatmap_id,
    //                 pp: beatmap.pp,
    //                 rank: beatmap.rank,
    //                 acc: beatmap.acc,
    //                 mods: beatmap.mods,
    //                 map_artist: beatmap_info.artist,
    //                 map_title: beatmap_info.title,
    //                 map_diff_name: beatmap_info.version,
    //                 additional: beatmap.additional,
    //                 top_rank: topRank,
    //                 old_total_pp: oldTotalpp.toFixed(2),
    //                 new_total_pp: newTotalpp.toFixed(2),
    //                 delta_pp: deltapp.toFixed(2),
    //                 old_rank: oldRank,
    //                 new_rank: newRank,
    //                 delta_rank: deltaRank,
    //                 mode: (profile.mode as OsuMode).toString()
    //             };

    //             this.onNewRecord(profile, announcement);
    //         }

    //         profile.last_checked = (new Date()).getTime();
    //         //OsuUser.findOneAndUpdate({ user_id: profile.user_id }, { db_version: CURRENT_DB_VERSION, records: profile.records, last_checked: profile.last_checked }, {});

    //         profile.checking = false;
    //     };

    //     handle();
    // }

    public updateUser(profile: IOsuUser, _mode: OsuMode = OsuMode.Standard): Promise<IOsuUser> {
        if (profile.updateInProgress !== null)
            return profile.updateInProgress;

        const promise = async () => {
            try {
                const data = await OsuAPI.instance.getUser(profile.username, profile.mode);
                profile.lastUpdated = Date.now();

                /*await OsuUser.findOneAndUpdate({ user_id: profile.user_id }, {
                    db_version: CURRENT_DB_VERSION,
                    user_id: data.user_id,
                    pp: parseFloat(data.pp_raw),
                    rank: parseInt(data.pp_rank),
                    last_updated: profile.last_updated,
                    extra: data
                });*/

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
}
