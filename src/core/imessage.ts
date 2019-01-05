import * as Discord from "discord.js";
import { DBServer } from "../models/dbserver";
import { DBUser } from "../models/dbuser";
import { ReactionType } from "./reactiontype";
import { IModule } from "./imodule";

export interface IMessage extends Discord.Message {
    id: string;

    server: DBServer;
    channel: Discord.TextChannel;

    user: DBUser;
    track: (reactions: ReactionType[], module: IModule, namespace: string, data: string, reset: boolean) => void;
}