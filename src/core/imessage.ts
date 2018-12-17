import * as Discord from "discord.js";
import { DBServer } from "./models/dbserver";
import { DBUser } from "./models/dbuser";

export interface IMessage extends Discord.Message {
    id: string;

    server: DBServer | null;
    channel: Discord.TextChannel;

    user: DBUser;
}