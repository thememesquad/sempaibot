import { Container, interfaces } from "inversify";
import "reflect-metadata";

import { CommandManager, CronManager, ModuleManager, AccessManager, TemplateManager, LogManager, DatabaseManager } from "./managers";
import { DiscordAPI } from "../api/discord";
import * as Modules from "../modules";
import { IModule } from "./imodule";
import { IMessage } from "./imessage";
import { TemplateMessageID } from "./itemplatemessageid";
import { DBModule } from "./models/dbmodule";

export class Bot extends Container
{
    public static instance: Bot;

    public constructor(containerOptions?: interfaces.ContainerOptions)
    {
        super(containerOptions);

        Bot.instance = this;
    }

    public async startup()
    {
        this.startupManagers();

        const logManager = this.get(LogManager);
        logManager.log("Starting up Sempaibot");

        // Start up all the core services required for the modules
        for (const type of [
            DatabaseManager,
            CommandManager,
            AccessManager,
            CronManager,
            TemplateManager,
            ModuleManager,
            DiscordAPI
        ]) {
            logManager.log("Starting up", type.name);

            if (!(await this.get(type).startup())) {
                logManager.log("Error starting up", type.name);
                return false;
            }
        }

        const modules = Modules as { [key: string]: any };
        const moduleRepository = this.get(DatabaseManager).getRepository(DBModule);

        // Start up all the modules
        for (const moduleName in modules) {
            logManager.log("Starting up module", moduleName);

            this.bind(moduleName.toLowerCase().trim()).to(modules[moduleName] as new() => IModule).inSingletonScope();

            const mod: IModule = this.get(moduleName.toLowerCase().trim());

            if (mod.disabled) {
                continue;
            }

            mod._bot = this;
            await mod.onSetup();

            let databaseModule = await moduleRepository.findOne({
                name: moduleName.toLowerCase().trim()
            }) || null;

            if (!databaseModule) {
                databaseModule = new DBModule();
                databaseModule.name = moduleName.toLowerCase().trim();
                await this.get(DatabaseManager).save(databaseModule);
            }
        }

        logManager.log("Sempaibot successfully started");

        return true;
    }

    public async handleMessage(message: IMessage)
    {
        const split = message.content.split(" ");
        const modules = Modules as { [key: string]: any };
        let tmp = [];
        let handled = false;

        for (const key in modules) {
            const module = this.get<IModule>(key.toLowerCase().trim());

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
            ret.push(moduleName.toLowerCase().trim());
        }

        return ret;
    }

    private startupManagers()
    {
        this.bind(LogManager).toSelf().inSingletonScope();
        this.bind(DatabaseManager).toSelf().inSingletonScope();
        this.bind(CommandManager).toSelf().inSingletonScope();
        this.bind(AccessManager).toSelf().inSingletonScope();
        this.bind(CronManager).toSelf().inSingletonScope();
        this.bind(TemplateManager).toSelf().inSingletonScope();
        this.bind(ModuleManager).toSelf().inSingletonScope();
    }
}