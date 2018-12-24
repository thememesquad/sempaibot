import { injectable, inject } from "inversify";
import { LogManager, DatabaseManager } from "../core/managers";
import { Client, MessageOptions, MessageReaction, RichEmbed, RichEmbedOptions, TextChannel, User as DiscordUser, Guild, GuildMember, GuildChannel } from "discord.js";
import * as Config from "../../config";
import { DBServer } from "../core/models/dbserver";
import { DBUser } from "../core/models/dbuser";
import { IMessage } from "../core/imessage";
import { Bot } from "../core/bot";

export type MessageContent = string | RichEmbed | RichEmbedOptions;

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
        this._discord.on("messageReactionRemoveAll", this.onMessageReactionRemoveAll.bind(this));
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

    public async message(message: MessageContent | MessageContent[] | null, databaseServer: DBServer): Promise<IMessage | IMessage[] | null>
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

        return await actualChannel.send(message, options) as IMessage;
    }

    public async respond(m: IMessage, message: MessageContent | MessageContent[] | null): Promise<IMessage | IMessage[] | null>
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

        const actualChannel: TextChannel = m.channel as TextChannel;
        const options: MessageOptions = {};

        if (message instanceof RichEmbed) {
            options.embed = message;
            message = "";
        }

        return await actualChannel.send(message, options) as IMessage;
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
        message.channel.stopTyping();
    }

    public getGuild(guildId: string): Guild | null
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
        const repository = this._databaseManager.getRepository(DBServer);
        let server = await repository.findOne({
            id: guild.id
        });

        const members = [];

        for (const member of guild.members.array()) {
            let databaseMember = await this._databaseManager.getRepository(DBUser).findOne({
                id: member.id
            });

            if (!databaseMember) {
                databaseMember = new DBUser();
                databaseMember.id = member.id;

                await this._databaseManager.getRepository(DBUser).save(databaseMember);
            }

            members.push(databaseMember);
        }

        if (server) {
            server.users = members;
            await repository.save(server);

            return;
        }

        server = new DBServer();
        server.id = guild.id;
        server.users = members;
        await repository.save(server);
    }

    /**
     * Called when we have been removed from a server. This cleans the server up from the database
     *
     * @param guild The server we have been removed from
     */
    public async onGuildDeleted(guild: Guild)
    {
        const repository = this._databaseManager.getRepository(DBServer);

        await repository.delete({
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
        const serverRepository = this._databaseManager.getRepository(DBServer);
        const userRepository = this._databaseManager.getRepository(DBUser);

        let server = await serverRepository.findOne({
            id: member.guild.id
        });

        if (!server) {
            await this.onGuildAdded(member.guild);

            server = await serverRepository.findOne({
                id: member.guild.id
            });
        }

        let user = await userRepository.findOne({
            id: member.user.id
        });

        if (!user) {
            user = new DBUser();
            user.id = member.user.id;

            await userRepository.save(user);
        }

        server!.users.push(user);
        await serverRepository.save(server);
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
            return;
        }

        const serverRepository = this._databaseManager.getRepository(DBServer);
        const userRepository = this._databaseManager.getRepository(DBUser);

        let server: DBServer | null = message.guild ? await serverRepository.findOne({
            id: message.guild.id
        }) || null : null;

        if (!server && message.guild) {
            await this.onGuildAdded(message.guild);

            server = await serverRepository.findOne({
                id: message.guild.id
            }) as DBServer;
        }

        let user: DBUser | null = await userRepository.findOne({
            id: message.author.id
        }) || null;

        if (!user) {
            user = new DBUser();
            user.id = message.author.id;

            await userRepository.save(user);
        }

        message.content = message.content.trim().substr(usedIdentifier!.length).replace(/\s+/g, " ").trim();
        message.user = user;
        message.server = server || null;

        if ((server !== null && server.blacklisted) || user.blacklisted) {
            return;
        }

        await this.startTyping(message);
        await Bot.instance.handleMessage(message);
        await this.stopTyping(message);
    }

    public async onMessageReactionAdd(reaction: MessageReaction, user: DiscordUser)
    {
    }

    public async onMessageReactionRemove(reaction: MessageReaction, user: DiscordUser)
    {
    }

    public async onMessageReactionRemoveAll(message: IMessage)
    {
    }

    public async onReady()
    {
        const guilds = this._discord.guilds.array();

        for (const guild of guilds) {
            this.onGuildAdded(guild);
        }
    }
}