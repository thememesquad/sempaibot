import { Module } from "../../core/attributes/module";
import { injectable } from "inversify";
import { IModule } from "../../core/imodule";
import { IMessage } from "../../core/imessage";
import { Command, CommandSample, CommandDescription } from "../../core/command";
import { RichEmbed } from "discord.js";
import { DiscordAPI } from "../../api/discord";
import { TemplateManager } from "../../core/managers";
import { ReactionType } from "../../core/reactiontype";
import { DBUser } from "../../models/dbuser";
import { DBEvent } from "./models/dbevent";
import { EventDefaultTemplate } from "./templates/eventdefault";
import { EventMessageID } from "./eventmessageid";

@Module("Event", "This is the event module.")
@injectable()
export class EventModule extends IModule
{
    @Command("start event {eventName}")
    @CommandSample("start event __event name__")
    @CommandDescription("Starts a new event")
    public async onNewEventStart(message: IMessage, eventName: string)
    {
        const newMessage: IMessage = await this._bot.get(DiscordAPI).respond(
            message,
            this._bot.get(TemplateManager).getExtended("event", EventMessageID.NewEventStarted, {
                author: message.author.id,
                name: eventName
            })
        ) as IMessage;

        this._bot.onReplyFrom(message.channel, message.user).then(async (reply) => {
            const event = new DBEvent();
            event.location = "";
            event.date = null;
            event.name = eventName;
            event.description = reply.content;
            event.thumbnail = null;
            await event.save();

            const embed = this.createEventEmbed(event);
            const newMessage: IMessage = await this._bot.get(DiscordAPI).respond(reply, embed) as IMessage;

            event.messageId = newMessage.id;
            await event.save();

            newMessage.pin();
            newMessage.track([
                ReactionType.ThumbsUp,
                ReactionType.ThumbsDown
            ], this, "event", "" + event.id, true);
        });
    }

    @Command("list events")
    @CommandSample("list events")
    @CommandDescription("List all currently active events")
    public async onListEvents(message: IMessage)
    {
        const data: { [key: string]: string }[] = [];
        const events = await DBEvent.find();

        for (const event of events) {
            data.push({
                "id": "" + event.id,
                "name": event.name,
                "location": event.location || "",
                "date": event.date ? event.date.toString() : ""
            });
        }

        const response = new RichEmbed();

        if (data.length === 0) {
            response.setDescription("No events found!");
        } else {
            const id = data.map(x => x.id).join("\r\n");
            const name = data.map(x => x.name).join("\r\n");
            const location = data.map(x => x.location).join("\r\n");
            const when = data.map(x => x.date).join("\r\n");

            if (id.trim().length > 0) {
                response.addField("ID", id, true);
            }

            if (name.trim().length > 0) {
                response.addField("Name", name, true);
            }

            if (location.trim().length > 0) {
                response.addField("Location", location, true);
            }

            if (when.trim().length > 0) {
                response.addField("When", when, true);
            }
        }

        this._bot.get(DiscordAPI).respond(message, response);
    }

    @Command("show event {int!id}")
    @CommandSample("show event __event id__")
    @CommandDescription("Displays the info for that event again")
    public async onShowEvent(message: IMessage, id: number)
    {
        const event = await DBEvent.findOne({ id });

        if (!event) {
            // todo: no event found with that name
            return;
        }

        const embed = this.createEventEmbed(event);
        const response = await this._bot.get(DiscordAPI).respond(message, embed) as IMessage;

        response.track([
            ReactionType.ThumbsUp,
            ReactionType.ThumbsDown
        ], this, "event", "" + event.id, true);
    }

    public onStartup()
    {
        this._bot.get(TemplateManager).extend("default", new EventDefaultTemplate());
    }

    public async onReactionAdded(message: IMessage, user: DBUser, reaction: ReactionType, namespace: string, data: string) {
        if (namespace !== "event") {
            return;
        }

        const event = await DBEvent.findOne({ id: +data });
        this._bot.get(DiscordAPI).respond(message, `User '${user.getName(message.server)}' pressed '${ReactionType[reaction]}' for event '${event.name}'`);
    }

    public async onReactionRemoved(message: IMessage, user: DBUser, reaction: ReactionType, namespace: string, data: string) {
        if (namespace !== "event") {
            return;
        }

        const event = await DBEvent.findOne({ id: +data });
        console.log("remove", event);
    }

    private createEventEmbed(event: DBEvent): RichEmbed
    {
        const embed = new RichEmbed();
        embed.setTitle(event.name);
        embed.setDescription(event.description);

        // if (event.date !== null) {
            embed.addField("When", "...", true);
        // }

        // if (event.location !== null) {
            embed.addField("Where", "...", true);
        // }

        // if (event.thumbnail !== null) {
            embed.setThumbnail("https://upload.wikimedia.org/wikipedia/commons/1/1c/Yakinikuwiki.jpg");
        // }

        return embed;
    }
}