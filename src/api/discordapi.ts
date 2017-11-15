import { Client, Message, MessageOptions, MessageReaction, RichEmbed, RichEmbedOptions, TextChannel, User as DiscordUser } from "discord.js";
import { Config } from "../../config";
import { IAPI, IMessage, MessageContent, ReactionId, ReactionManager, Server, User, UserManager } from "../core";
import { BotBase } from "../core/botbase";

const REACTION_TO_DISCORD = {
    [ReactionId.ThumbsUp]: "👍",
    [ReactionId.ThumbsDown]: "👎",
    [ReactionId.Left]: "⬅️",
    [ReactionId.Right]: "➡️",
    [ReactionId.Up]: "⬆️",
    [ReactionId.Down]: "️️️️⬇️",
};

const DISCORD_TO_REACTION = {
    "➡️": ReactionId.Right,
    "⬅️": ReactionId.Left,
    "⬆️": ReactionId.Up,
    "⬇️": ReactionId.Down,
    "👍": ReactionId.ThumbsUp,
    "👎": ReactionId.ThumbsDown
};

export class DiscordAPI implements IAPI {
    private _connectedOnce: boolean;
    private _connected: boolean;

    private _bot: BotBase;
    private _discord: Client;

    constructor() {
        this._connectedOnce = false;
        this._connected = false;

        this._discord = new Client({
            restTimeOffset: 200,
            restWsBridgeTimeout: 1000
        });
        this._discord.on("message", this.onMessage.bind(this));
        this._discord.on("ready", this.onReady.bind(this));
        this._discord.on("serverCreated", this.onServerCreated.bind(this));
        this._discord.on("serverDeleted", this.onServerDeleted.bind(this));
        this._discord.on("disconnected", this.onDisconnected.bind(this));
        this._discord.on("error", this.onError.bind(this));

        this._discord.on("messageReactionAdd", this.onMessageReactionAdded.bind(this));
    }

    public setBot(bot: BotBase): void {
        this._bot = bot;
    }

    public async message(message: MessageContent | MessageContent[], server: Server): Promise<IMessage | IMessage[]> {
        if (Array.isArray(message)) {
            let ids = [];

            for (const msg of message) {
                ids.push(this.message(msg, server));
            }

            ids = await Promise.all(ids);
            return ids;
        }

        let channel = server.channel;
        if (channel.length === 0)
            channel = server.server.channels.first().id;

        const actualChannel: TextChannel = server.server.channels.get(channel) as TextChannel;
        const options: MessageOptions = {};

        if (message instanceof RichEmbed) {
            options.embed = message;
            message = "";
        }

        return await actualChannel.send(message, options) as IMessage;
    }

    public async respond(m: IMessage, message: MessageContent | MessageContent[]): Promise<IMessage | IMessage[]> {
        if (Array.isArray(message)) {
            let ids = [];

            for (const msg of message) {
                ids.push(this.respond(m, msg));
            }

            ids = await Promise.all(ids);
            return ids;
        }

        const actualChannel: TextChannel = m.channel as TextChannel;
        const options: MessageOptions = {};

        if (message instanceof RichEmbed) {
            options.embed = message;
            message = "";
        }

        return await actualChannel.send(message, options) as IMessage;
    }

    public async edit(original: IMessage, message: MessageContent): Promise<IMessage> {
        const options: MessageOptions = {};

        if (message instanceof RichEmbed) {
            options.embed = message;
            message = "";
        }

        return await (original as Message).edit(message, options) as IMessage;
    }

    public async addReaction(message: IMessage, reaction: ReactionId | ReactionId[] | string | string[]): Promise<IMessage> {
        if (Array.isArray(reaction)) {
            const promises = [];

            for (const id of reaction) {
                promises.push(this.addReaction(message, id));
            }

            await Promise.all(promises);
            return message;
        }

        await (message as Message).react(this._getEmojiForReactionId(reaction));
        return message;
    }

    public async removeReaction(message: IMessage, reaction: ReactionId | string, user?: User): Promise<IMessage> {
        let userid: string = this.getUserId();
        if (user !== null)
            userid = user.getUserID();

        const emoji = this._getEmojiForReactionId(reaction);
        const tmp = await (message as Message).reactions.find((value, key, collection) => {
            return value.emoji.name === emoji;
        });
        await tmp.remove(userid);

        return message;
    }

    public async clearReactions(message: IMessage): Promise<IMessage> {
        return await (message as Message).clearReactions() as IMessage;
    }

    public async startup() {
        try {
            await this._discord.login(Config.discord.token);
            this._bot.log(`logged in with token '${Config.discord.token}'.`);
        } catch (err) {
            this._bot.error("discord login error:", err, err.stack);
        }
    }

    public async shutdown() {
        await this._discord.destroy();
    }

    public async processServers(): Promise<Server[]> {
        const servers = [];

        for (const server of this.servers) {
            servers.push(new Server(this._bot, server));
        }

        return servers;
    }

    public async onMessageReactionAdded(messageReaction: MessageReaction, discorduser: DiscordUser) {
        if (discorduser.id === this.getUserId())
            return;

        const user = UserManager.instance.getUserById(discorduser.id);
        if (user === null)
            return;

        if (messageReaction.message.author.id !== this.getUserId())
            return;

        if (!messageReaction.me)
            return;

        const id = this._getReactionIdForEmoji(messageReaction.emoji.name);
        if (id === null)
            return;

        ReactionManager.instance.reaction(id, messageReaction.message as IMessage, user);
    }

    public async onMessage(message: IMessage) {
        await this._bot.onMessage(message);
    }

    public async onServerCreated(server) {
        if (!this._connected)
            return;

        await this._bot.onServerCreated(server);
    }

    public async onReady() {
        this._connected = true;

        this._bot.log("Connected to discord.");

        this._connectedOnce = true;
        await this._bot.onReady();
    }

    public async onServerDeleted(server) {
        if (!this._connected)
            return;

        await this._bot.onServerDeleted(server);
    }

    public async onDisconnected() {
        this._connected = false;
        this._bot.log("disconnected from discord.");
    }

    public async onError(err) {
        this._bot.log("discord error: ", err);
    }

    public getUserId(): string {
        return this.user.id;
    }

    public get servers() {
        return this._discord.guilds.array();
    }

    public get user() {
        return this._discord.user;
    }

    public async startTyping(message: IMessage): Promise<void> {
        message.channel.startTyping();
    }

    public async stopTyping(message: IMessage): Promise<void> {
        message.channel.stopTyping();
    }

    private _getReactionIdForEmoji(name: string): ReactionId {
        if (typeof DISCORD_TO_REACTION[name] === "undefined")
            return null;

        return DISCORD_TO_REACTION[name];
    }

    private _getEmojiForReactionId(reaction: ReactionId | string): string {
        if (typeof reaction === "string")
            reaction = parseInt(reaction, 10) as ReactionId;

        if (typeof REACTION_TO_DISCORD[reaction] === "undefined")
            return null;

        return REACTION_TO_DISCORD[reaction];
    }
}
