import * as Discord from "discord.js";

import { Server } from "../server";
import { User } from "../user/user";

export interface IMessageInterface {
    server?: Server;
    author?: Discord.User;
    channel: Discord.TextChannel;

    content: string;
    user?: User;
}
