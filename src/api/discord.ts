import { injectable, inject } from "inversify";
import { LogManager, DatabaseManager } from "../core/managers";
import { Client, MessageOptions, MessageReaction, RichEmbed, RichEmbedOptions, TextChannel, User as DiscordUser, Guild, GuildMember, GuildChannel, Emoji, DMChannel, Message } from "discord.js";
import * as Config from "../../config";
import { DBServer } from "../models/dbserver";
import { DBUser } from "../models/dbuser";
import { IMessage } from "../core/imessage";
import { Bot } from "../core/bot";
import { DBPermission } from "../models/dbpermission";
import { DBRole } from "../models/dbrole";
import { RoleType } from "../core/roletype";
import { ReactionType } from "../core/reactiontype";
import { IModule } from "../core/imodule";
import { DBTrackedMessage } from "../models/dbtrackedmessage";
import { DBModule } from "../models/dbmodule";
import { DBTrackedReaction } from "../models/dbtrackedreaction";
import { constants } from "../core/constants";

export type MessageContent = string | RichEmbed | RichEmbedOptions;
export const REACTION_TO_DISCORD = {
    [ReactionType.ThumbsUp]: "👍",
    [ReactionType.ThumbsDown]: "👎",
    [ReactionType.Left]: "⬅️",
    [ReactionType.Right]: "➡️",
    [ReactionType.Up]: "⬆️",
    [ReactionType.Down]: "️️️️⬇️",
};

const events: { [key: string]: string } = {
    MESSAGE_REACTION_ADD: 'messageReactionAdd',
    MESSAGE_REACTION_REMOVE: 'messageReactionRemove',
};

export const DISCORD_TO_REACTION: { [key: string]: ReactionType } = {
    "👍": ReactionType.ThumbsUp,
    "👎": ReactionType.ThumbsDown,
    "⬅️": ReactionType.Left,
    "➡️": ReactionType.Right,
    "⬆️": ReactionType.Up,
    "️️️️⬇️": ReactionType.Down,
};

@injectable()
export class DiscordAPI
{
    private _discord!: Client;

    @inject(LogManager)
    protected _logManager!: LogManager;

    @inject(DatabaseManager)
    protected _databaseManager!: DatabaseManager;

    constructor()
    {
    }

    /**
     * Initializes the Discord connection and sets up some callbacks
     */
    public async startup()
    {
        this._discord = new Client({
            restTimeOffset: 200,
            restWsBridgeTimeout: 1000
        });

        this._discord.on("disconnect", this.onDisconnect.bind(this));
        this._discord.on("error", this.onError.bind(this));
        this._discord.on("guildCreate", this.onGuildAdded.bind(this));
        this._discord.on("guildDelete", this.onGuildDeleted.bind(this));
        this._discord.on("guildMemberAdd", this.onGuildMemberAdded.bind(this));
        this._discord.on("message", this.onMessage.bind(this));
        this._discord.on("messageReactionAdd", this.onMessageReactionAdd.bind(this));
        this._discord.on("messageReactionRemove", this.onMessageReactionRemove.bind(this));
        this._discord.on("raw", this.onRawEvent.bind(this));
        this._discord.on("ready", this.onReady.bind(this));

        try {
            await this._discord.login(Config.discord.token);
            this._logManager.log(`logged in with token '${Config.discord.token}'.`);
        } catch (err) {
            this._logManager.error("discord login error", err);
            return false;
        }

        return true;
    }

    public async message(message: MessageContent | MessageContent[], databaseServer: DBServer): Promise<IMessage | IMessage[]>
    {
        if (message === null) {
            return null;
        }

        if (Array.isArray(message)) {
            let ids = [];

            for (const msg of message) {
                ids.push(this.message(msg, databaseServer));
            }

            ids = await Promise.all(ids);
            return ids as IMessage[];
        }

        if (typeof message === "string") {
            const embed = new RichEmbed();
            embed.setDescription(message);

            message = embed;
        }

        if (message.footer) {
            message.footer.icon_url = constants.IMAGE;
            message.footer.text = constants.NAME + " - " + constants.VERSION + " - " + message.footer.text;
        } else {
            message.footer = {};
            message.footer.icon_url = constants.IMAGE;
            message.footer.text = constants.NAME + " " + constants.VERSION;
        }

        if (!message.color) {
            message.color = constants.COLOR;
        }

        let guild = this._discord.guilds.find((guild: Guild) => guild.id == databaseServer.id);

        if (!guild) {
            return null;
        }

        let actualChannel: TextChannel = null;
        let channel: string = databaseServer.getChannel();

        if (channel) {
            actualChannel = guild.channels.get(channel) as TextChannel;
        }

        if (!actualChannel) {
            actualChannel = guild.channels.filter((guild: GuildChannel) => {
                return guild instanceof TextChannel;
            }).first() as TextChannel;
        }

        if (!actualChannel) {
            return null;
        }

        const options: MessageOptions = {};

        if (message instanceof RichEmbed) {
            options.embed = message;
            message = "";
        }

        const newMessage = await actualChannel.send(message, options) as IMessage;

        newMessage.track = this.onTrackMessage.bind(this, newMessage);

        return newMessage;
    }

    public async respond(m: IMessage, message: MessageContent | MessageContent[]): Promise<IMessage | IMessage[]>
    {
        if (message === null) {
            return null;
        }

        if (Array.isArray(message)) {
            let ids = [];

            for (const msg of message) {
                ids.push(this.respond(m, msg));
            }

            ids = await Promise.all(ids);
            return ids as IMessage[];
        }

        if (typeof message === "string") {
            const embed = new RichEmbed();
            embed.setDescription(message);

            message = embed;
        }

        if (message.footer) {
            message.footer.icon_url = constants.IMAGE;
            message.footer.text = constants.NAME + " " + constants.VERSION + " - " + message.footer.text;
        } else {
            message.footer = {};
            message.footer.icon_url = constants.IMAGE;
            message.footer.text = constants.NAME + " " + constants.VERSION;
        }

        if (!message.color) {
            message.color = constants.COLOR;
        }

        message.footer.text += ` - Responding to ${m.user.getName(m.server)}`;

        const actualChannel: TextChannel = m.channel as TextChannel;
        const options: MessageOptions = {};

        if (message instanceof RichEmbed) {
            options.embed = message;
            message = "";
        }

        const newMessage = await actualChannel.send(message, options) as IMessage;

        newMessage.track = this.onTrackMessage.bind(this, newMessage);

        return newMessage;
    }

    public async edit(original: IMessage, message: MessageContent): Promise<IMessage>
    {
        const options: MessageOptions = {};

        if (message instanceof RichEmbed) {
            options.embed = message;
            message = "";
        }

        return await original.edit(message, options) as IMessage;
    }

    public async startTyping(message: IMessage): Promise<void>
    {
        message.channel.startTyping();
    }

    public async stopTyping(message: IMessage): Promise<void>
    {
        message.channel.stopTyping(true);
    }

    public getGuild(guildId: string): Guild
    {
        return this._discord.guilds.get(guildId) || null;
    }

    public getUserName(userId: string): string
    {
        const user = this._discord.users.get(userId) || null;

        if (user === null) {
            return null;
        }

        return user.username;
    }

    public async syncReactions(message: DBTrackedMessage)
    {
        const guild = this._discord.guilds.get((await message.server).id);
        const channel: TextChannel = guild.channels.get(message.channel) as TextChannel;
        const discordMessage = await channel.fetchMessage(message.id);
        const existingReactions = await message.reactions;

        for (const reaction in existingReactions) {
            (existingReactions[reaction] as any).__user = await existingReactions[reaction].user;
        }

        let deletedReactions = existingReactions;

        for (const key of discordMessage.reactions.keyArray()) {
            const reaction = discordMessage.reactions.get(key);

            if (DISCORD_TO_REACTION[reaction.emoji.name] === undefined) {
                continue;
            }

            let users = await reaction.fetchUsers();
            users = users.filter((value, key, collection) => {
                return value.id !== this._discord.user.id;
            });

            for (const user of users.values()) {
                const trackedReaction = existingReactions.filter(x =>
                    x.type === DISCORD_TO_REACTION[reaction.emoji.name] &&
                    (x as any).__user.id === user.id
                );

                deletedReactions = deletedReactions.concat(trackedReaction).filter(function (e, i, array) {
                    // Check if the element is appearing only once
                    return array.indexOf(e) === array.lastIndexOf(e);
                });

                if (trackedReaction.length > 0) {
                    continue;
                }

                this._discord.emit("messageReactionAdd", reaction, user);
            }
        }

        for (const reaction of deletedReactions) {
            const emoji = new Emoji(guild, { name: REACTION_TO_DISCORD[reaction.type] });
            const messageReaction = new MessageReaction(discordMessage, emoji, 1, (reaction as any).__user.id === this._discord.user.id);
            const user = this._discord.users.get((reaction as any).__user.id);

            this._discord.emit("messageReactionRemove", messageReaction, user);

            await reaction.remove();
        }
    }

    /**
     * Self explainatory: Called when we have disconnected from Discord
     */
    public async onDisconnect()
    {
        this._logManager.log("disconnected from discord");
    }

    /**
     * Self explainatory: Called when we have received an error from Discord
     */
    public async onError(error: Error)
    {
        this._logManager.error("discord error", error);
    }

    /**
     * Called when the bot has been added to a new server. This sets it up in the database and registers any un-registered members
     * @param guild The server we have been added to
     */
    public async onGuildAdded(guild: Guild)
    {
        let server = await DBServer.findOne({
            id: guild.id
        });

        const members = [];

        for (const member of guild.members.array()) {
            let databaseMember = await DBUser.findOne({
                id: member.id
            });

            if (!databaseMember) {
                databaseMember = new DBUser();
                databaseMember.id = member.id;

                await DBUser.save(databaseMember);
            }

            members.push(databaseMember);
        }

        if (server) {
            server.users = Promise.resolve(members);
            await DBServer.save(server);

            return;
        }

        const roles = [];

        server = new DBServer();
        server.id = guild.id;
        server.users = Promise.resolve(members);
        server.roles = Promise.resolve([]);
        server.roleLinks = Promise.resolve([]);
        await server.save();

        for (const roleType of [RoleType.SuperAdmin, RoleType.Admin, RoleType.Moderator, RoleType.Normal])
        {
            const role = new DBRole();
            role.role = roleType;
            role.server = server;
            role.save();

            roles.push(role);
        }

        server.roles = Promise.resolve(roles);

        const permissions = await DBPermission.find();

        for (const permission of permissions) {
            for (let i = 0; i < permission.defaultRole + 1; i++) {
                await server.allow(permission, i as RoleType);
            }
        }
    }

    /**
     * Called when we have been removed from a server. This cleans the server up from the database
     *
     * @param guild The server we have been removed from
     */
    public async onGuildDeleted(guild: Guild)
    {
        await DBServer.delete({
            id: guild.id
        });
    }

    /**
     * Called when we a new member has been added to a server. This checks if the new member is already registered with us
     * and registers it if needed.
     *
     * @param member The added member
     */
    public async onGuildMemberAdded(member: GuildMember)
    {
        let server = await DBServer.findOne({
            id: member.guild.id
        });

        if (!server) {
            await this.onGuildAdded(member.guild);

            server = await DBServer.findOne({
                id: member.guild.id
            });
        }

        let user = await DBUser.findOne({
            id: member.user.id
        });

        if (!user) {
            user = new DBUser();
            user.id = member.user.id;

            await DBUser.save(user);
        }

        const users = await server!.users;
        users.push(user);

        server.users = Promise.resolve(users);
        await server.save();
    }

    /**
     * Called when we receive a new message through a private channel or server channel. Does some basic processing
     * and then runs the message through the message pipeline
     *
     * @param message The metadata of the received message
     */
    public async onMessage(message: IMessage)
    {
        if (message.author.id == this._discord.user.id) {
            return;
        }

        message = await this.wrapMessage(message);

        if ((message.server !== null && message.server.blacklisted) || message.user.blacklisted) {
            return;
        }

        let found = false;
        let usedIdentifier = null;

        for (const identifier of Config.identifiers) {
            if (message.content.trim().toLowerCase().startsWith(identifier)) {
                found = true;
                usedIdentifier = identifier;
                break;
            }
        }

        if (!found) {
            await Bot.instance.handleMiscMessage(message);
            return;
        }

        message.content = message.content.trim().substr(usedIdentifier!.length).replace(/\s+/g, " ").trim();

        const replyPromise = this.respond(message, Config.processingMessage);
        await Bot.instance.handleMessage(message);

        const reply = await replyPromise as IMessage;
        await reply.delete();
    }

    public async onMessageReactionAdd(reaction: MessageReaction, user: DiscordUser)
    {
        if (user.id === this._discord.user.id) {
            return;
        }

        const tracked = await DBTrackedMessage.findOne({
            id: reaction.message.id
        });

        if (tracked === null) {
            return;
        }

        if (DISCORD_TO_REACTION[reaction.emoji.name] === undefined) {
            return;
        }

        const type = DISCORD_TO_REACTION[reaction.emoji.name];

        if ((tracked.trackedReactions & type) === 0) {
            return;
        }

        const databaseUser = await DBUser.findOne({ id: user.id });
        let databaseReaction = await DBTrackedReaction.findOne({
            type: DISCORD_TO_REACTION[reaction.emoji.name],
            user: Promise.resolve(databaseUser),
            message: Promise.resolve(tracked)
        });

        if (databaseReaction) {
            return;
        }

        if (!tracked.reset) {
            databaseReaction = new DBTrackedReaction();
            databaseReaction.user = Promise.resolve(databaseUser);
            databaseReaction.type = DISCORD_TO_REACTION[reaction.emoji.name];
            databaseReaction.message = Promise.resolve(tracked);
            await databaseReaction.save();
        } else {
            await reaction.remove(user);
        }

        await (Bot.instance.get((await tracked.module).name) as IModule).onReactionAdded(
            await this.wrapMessage(reaction.message),
            databaseUser,
            DISCORD_TO_REACTION[reaction.emoji.name],
            tracked.namespace,
            tracked.data
        );
    }

    public async onMessageReactionRemove(reaction: MessageReaction, user: DiscordUser)
    {
        if (user.id === this._discord.user.id) {
            return;
        }

        const tracked = await DBTrackedMessage.findOne({
            id: reaction.message.id
        });

        if (tracked === null) {
            return;
        }

        if (tracked.reset) {
            return;
        }

        if (DISCORD_TO_REACTION[reaction.emoji.name] === undefined) {
            return;
        }

        const type = DISCORD_TO_REACTION[reaction.emoji.name];

        if ((tracked.trackedReactions & type) === 0) {
            return;
        }

        const databaseUser = await DBUser.findOne({ id: user.id });
        let databaseReaction = await DBTrackedReaction.createQueryBuilder("reaction")
            .where("reaction.messageId=:messageId", { messageId: tracked.id })
            .where("reaction.userId=:userId", { userId: databaseUser.id })
            .where("reaction.type=:type", { type: DISCORD_TO_REACTION[reaction.emoji.name] })
            .getMany();

        if (databaseReaction.length === 0) {
            return;
        }

        for (const reaction of databaseReaction) {
            await reaction.remove();
        }

        await (Bot.instance.get((await tracked.module).name) as IModule).onReactionRemoved(
            await this.wrapMessage(reaction.message),
            databaseUser,
            DISCORD_TO_REACTION[reaction.emoji.name],
            tracked.namespace,
            tracked.data
        );
    }

    public async onRawEvent(event: { t: string, d: { user_id: string, guild_id: string, channel_id: string, message_id: string, emoji: { id: string, name: string } } })
    {
        if (!events.hasOwnProperty(event.t)) {
            return;
        }

        const { d: data } = event;
        const user = this._discord.users.get(data.user_id);
        const channel: TextChannel | DMChannel = this._discord.channels.get(data.channel_id) as TextChannel || await user.createDM();

        if (channel.messages.has(data.message_id)) {
            return;
        }

        const message = await channel.fetchMessage(data.message_id);
        const emojiKey = (data.emoji.id) ? `${data.emoji.name}:${data.emoji.id}` : data.emoji.name;
        let reaction = message.reactions.get(emojiKey);

        if (!reaction) {
            const emoji = new Emoji(this._discord.guilds.get(data.guild_id), data.emoji);
            reaction = new MessageReaction(message, emoji, 1, data.user_id === this._discord.user.id);
        }

        this._discord.emit(events[event.t], reaction, user);
    }

    public async onReady()
    {
        const guilds = this._discord.guilds.array();

        for (const guild of guilds) {
            this.onGuildAdded(guild);
        }

        const trackedMessages = await DBTrackedMessage.find();

        for (const message of trackedMessages) {
            this.syncReactions(message);
        }
    }

    private async onTrackMessage(message: IMessage, reactions: ReactionType[], module: IModule, namespace: string, data: string, reset: boolean = false)
    {
        let reactionData: number = 0;

        for (const type of reactions) {
            await message.react(REACTION_TO_DISCORD[type]);
            reactionData |= type;
        }

        const trackedMessage = new DBTrackedMessage();
        trackedMessage.id = message.id;
        trackedMessage.channel = message.channel.id;
        trackedMessage.server = Promise.resolve(await DBServer.findOne({ id: message.guild.id }));
        trackedMessage.module = Promise.resolve(await DBModule.findOne({ name: module.name.toLowerCase().trim() }));
        trackedMessage.trackedReactions = reactionData;
        trackedMessage.namespace = namespace;
        trackedMessage.data = data;
        trackedMessage.reset = reset;
        await trackedMessage.save();

        console.log("Started tracking message", message.id);
    }

    private async wrapMessage(message: Message): Promise<IMessage>
    {
        const wrapped: IMessage = message as IMessage;

        let server: DBServer = message.guild ? await DBServer.findOne({
            id: message.guild.id
        }) || null : null;

        if (!server && message.guild) {
            await this.onGuildAdded(message.guild);

            server = await DBServer.findOne({
                id: message.guild.id
            }) as DBServer;
        }

        let user: DBUser = await DBUser.findOne({
            id: message.author.id
        }) || null;

        if (!user) {
            user = new DBUser();
            user.id = message.author.id;

            await DBUser.save(user);
        }

        wrapped.user = user;
        wrapped.server = server || null;
        wrapped.track = this.onTrackMessage.bind(this, wrapped);

        return wrapped;
    }
}