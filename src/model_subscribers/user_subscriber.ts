import { EventSubscriber, InsertEvent } from "typeorm";
import { DBUser } from "../models/dbuser";
import { DBServer } from "../models/dbserver";
import { LogManager } from "../core/managers";
import { Bot } from "../core/bot";

@EventSubscriber()
export class UserSubscriber
{
    async afterInsert(event: InsertEvent<any>)
    {
        if (event.entity instanceof DBUser) {
            Bot.instance.get(LogManager).log("New user registered with ID", event.entity.id);
        } else if (event.entity instanceof DBServer) {
            Bot.instance.get(LogManager).log("New server registered with ID", event.entity.id);
        }
    }
}