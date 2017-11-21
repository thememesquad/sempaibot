import {
    Bot,
    Command,
    CommandDescription,
    CommandOptions,
    CommandPermission,
    CommandSample,
    IMessage,
    Module,
    ModuleBase,
    ModuleOptions,
    PermissionManager,
    ReactionId,
    ReactionManager,
    RoleType
} from "../../core";

import {
    Events,
    Submissions
} from "../../core/model";

@Module("chillhop", "This is a community module for chillhop!")
export class ChillhopModule extends ModuleBase {
    constructor() {
        super();

        PermissionManager.instance.register("MANAGE_CHILLHOP", RoleType.Admin);
    }

    public onSetup() {
        this._bot.addHookable("chillhop", this, "_handleEvent");
    }

    public onShutdown() {
        this._bot.removeHookable("chillhop");
    }

    public async _handleEvent(message: IMessage) {
        const channel: string = message.channel.id;

        const event = await Events.findOne({ channelid: channel });

        if (event === undefined) {
            return;
        }

        const submission = new Submissions();
        submission.messageid = message.id;
        submission.content = message.content;
        submission.upvotes = 0;
        submission.channelid = channel;
        submission.save();

        ReactionManager.instance.registerMessage(
            message,
            {
                [ReactionId.ThumbsUp]: (added, user) => {
                    if (added) {
                        submission.upvotes++;
                        submission.save();
                    } else {
                        submission.upvotes--;
                        submission.save();
                    }
                },
                [ReactionId.ThumbsDown]: (added, user) => {
                    if (added) {
                        submission.upvotes--;
                        submission.save();
                    } else {
                        submission.upvotes++;
                        submission.save();
                    }
                }
            },
            false
        );
    }

    @Command("start event in {channelid!channel}")
    @CommandSample("start event in __*#channel*__")
    @CommandDescription("Starts a community vote event in the desired channel.")
    @CommandPermission("MANAGE_CHILLHOP")
    private async handleEvent(message: IMessage, args: { [key: string]: any }): Promise<IMessage> {
        const channel: string = args.channel;

        if (!message.server.server.channels.exists("id", channel)) {
            return await this._bot.respond(message, "Couldn't find the channel, do I have permissions?") as IMessage;
        }

        const eventExists = await Events.find({ channelid: channel });

        if (eventExists.length > 0) {
            return await this._bot.respond(message, "I'm already holding an event here!") as IMessage;
        }

        const event = new Events();
        event.channelid = channel;
        event.save();

        return await this._bot.respond(message, "Successfully started watching the channel") as IMessage;
    }

    @Command("end event in {channelid!channel}")
    @CommandSample("end event in __*#channel*__")
    @CommandDescription("Ends a community vote event in the desired channel.")
    @CommandPermission("MANAGE_CHILLHOP")
    private async handleEndEvent(message: IMessage, args: { [key: string]: any }): Promise<IMessage> {
        const channel: string = args.channel;

        if (!message.server.server.channels.exists("id", channel)) {
            return await this._bot.respond(message, "Couldn't find the channel, do I have permissions?") as IMessage;
        }

        const event = await Events.find({ channelid: channel });

        if (event.length <= 0) {
            return await this._bot.respond(message, "I'm not holding an event here!") as IMessage;
        }

        Events.remove(event);

        return await this._bot.respond(message, "Successfully ended the event!") as IMessage;
    }

    @Command("get most upvoted in {channelid!channel}")
    @CommandSample("get most upvoted in __*#channel*__")
    @CommandDescription("See what is the highest upvoted post.")
    private async handleMostUpvoted(message: IMessage, args: { [key: string]: any }): Promise<IMessage> {
        const channel: string = args.channel;

        const event = await Events.findOne({ channelid: channel });

        if (event === undefined) {
            return await this._bot.respond(message, "I'm not holding an event in this channel!") as IMessage;
        }

        const submissions = await Submissions.find({ channelid: channel });

        let upvotes;
        let content: string;

        for (const i in submissions) {
            const submission = submissions[i];

            if (upvotes === undefined || submission.upvotes > upvotes) {
                upvotes = submission.upvotes;
                content = submission.content;
            }
        }

        return await this._bot.respond(message, `This song got the most upvotes with ${upvotes} :thumbsup:\n${content}`) as IMessage;
    }
}
