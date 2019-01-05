import { Container, interfaces } from "inversify";
import "reflect-metadata";

import { CronManager, AccessManager, TemplateManager, LogManager, DatabaseManager } from "./managers";
import { DiscordAPI } from "../api/discord";
import * as Modules from "../modules";
import { IModule } from "./imodule";
import { IMessage } from "./imessage";
import { TemplateMessageID } from "./itemplatemessageid";
import { DBModule } from "../models/dbmodule";
import { Channel } from "discord.js";
import { DBUser } from "../models/dbuser";

interface IReply
{
    channelId: string,
    userId: string,
    resolve: (message: IMessage) => void;
    reject: (err: any) => void;
}

export class Bot extends Container
{
    public static instance: Bot;
    private replies: IReply[];

    public constructor(containerOptions?: interfaces.ContainerOptions)
    {
        super(containerOptions);

        Bot.instance = this;
        this.replies = [];
    }

    public async startup()
    {
        this.startupManagers();

        const logManager = this.get(LogManager);
        logManager.log("Starting up Sempaibot");

        // Start up all the core services required for the modules
        for (const type of [
            DatabaseManager,
            AccessManager,
            CronManager,
            TemplateManager,
            DiscordAPI
        ]) {
            logManager.log("Starting up", type.name);

            if (!(await this.get(type).startup())) {
                logManager.log("Error starting up", type.name);
                return false;
            }
        }

        const modules = Modules as { [key: string]: any };

        // Start up all the modules
        for (const moduleName in modules) {
            const name = modules[moduleName]._moduleName.toLowerCase().trim();
            logManager.log("Starting up module", modules[moduleName]._moduleName);

            this.bind(name).to(modules[moduleName] as new() => IModule).inSingletonScope();

            const mod: IModule = this.get(name);

            if (mod.disabled) {
                continue;
            }

            mod._bot = this;
            await mod.onStartup();

            let databaseModule = await DBModule.findOne({
                name
            }) || null;

            if (!databaseModule) {
                databaseModule = new DBModule();
                databaseModule.name = name;
                await this.get(DatabaseManager).save(databaseModule);
            }
        }

        logManager.log("Sempaibot successfully started");

        return true;
    }

    public async handleMiscMessage(message: IMessage)
    {
        for (const reply of this.replies)
        {
            if (reply.userId !== message.user.id) {
                continue;
            }

            if (reply.channelId !== message.channel.id) {
                continue;
            }

            reply.resolve(message);
            this.replies = this.replies.filter(x => x !== reply);
            break;
        }
    }

    public async handleMessage(message: IMessage)
    {
        let split = message.content.split(" ");
        const modules = Modules as { [key: string]: any };
        let tmp = [];
        let handled = false;

        for (const key in modules) {
            const module = this.get<IModule>(modules[key]._moduleName.toLowerCase().trim());

            if (module.disabled) {
                continue;
            }

            const resp = await module.checkMessage(message);

            if (typeof resp === "string") {
                tmp.push(resp);
            } else if (resp) {
                handled = true;
                break;
            }
        }

        if (handled) {
            return;
        }

        split = split.filter(x => x.trim().length > 0);
        if (split.length === 0) {
            await this.get(DiscordAPI).respond(message, this.get(TemplateManager).get(TemplateMessageID.SempaiCalled, {
                author: message.author.id,
            }));

            return;
        }

        await this.get(DiscordAPI).respond(message, this.get(TemplateManager).get(TemplateMessageID.UnknownCommand, {
            author: message.author.id,
        }));
    }

    public get modules(): string[]
    {
        const modules = Modules as { [key: string]: any };
        let ret = [];

        for (const moduleName in modules) {
            ret.push(modules[moduleName]._moduleName.toLowerCase().trim());
        }

        return ret;
    }

    public onReplyFrom(channel: Channel, user: DBUser): Promise<IMessage>
    {
        return new Promise((resolve, reject) => {
            this.replies.push({
                channelId: channel.id,
                userId: user.id,
                resolve,
                reject
            });
        });
    }

    private startupManagers()
    {
        this.bind(LogManager).toSelf().inSingletonScope();
        this.bind(DatabaseManager).toSelf().inSingletonScope();
        this.bind(AccessManager).toSelf().inSingletonScope();
        this.bind(CronManager).toSelf().inSingletonScope();
        this.bind(TemplateManager).toSelf().inSingletonScope();
    }
}