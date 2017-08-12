import { Guild, Message, RichEmbed, RichEmbedOptions, Snowflake } from "discord.js";
import { Server } from "./server";
import { ModuleBase, MessageInterface } from "./modulebase";
import { User } from "./users";

export abstract class BotBase {
    abstract log(...args): void;
    abstract error(...args): void;

    abstract isUserBlacklisted(user: User): boolean;
    abstract isServerBlacklisted(server: string): boolean;
    abstract setStatus(status: string): void;
    abstract getModule(name: string): ModuleBase;
    abstract getInternalServerId(server): number;
    abstract getInternalServer(serverID): Server;
    
    abstract embed(message: RichEmbed | RichEmbedOptions, server: Server);
    abstract message(message: string, server: Server);
    abstract messageQueue(messages: Array<string>, server: Server);
    abstract respond(m: MessageInterface, message: string);
    abstract respondQueue(m: MessageInterface, messages: Array<string>);
    abstract edit(message: Snowflake, edit: string);
    
    abstract onReady(): void;
    abstract onMessage(message: Message): void;
    abstract onServerCreated(server: Guild): void;
    abstract onServerDeleted(server: Guild): void;

    abstract blacklistServer(server_id: string): void;
    abstract blacklistUser(user: User): void;

    abstract whitelistServer(server_id: string): void;
    abstract whitelistUser(user: User): void;
    
    abstract get user(): User;
    abstract get modules(): { [key: string]: ModuleBase };
    abstract get internalServers(): Array<Server>;
}