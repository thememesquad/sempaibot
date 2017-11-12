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
    ReactionId,
    ReactionManager,
    User
} from "../../core";

@Module("Reminders", "Reminders", ModuleOptions.DefaultOn)
export class ReminderModule extends ModuleBase {
    @Command("test reminder", CommandOptions.Global)
    private async handleTest(message: IMessage, args: { [key: string]: any }): Promise<void> {
        const msg = await this._bot.respond(message, "page1") as IMessage;

        ReactionManager.instance.registerMessage(msg, {
            [ReactionId.ThumbsUp]: (added, user) => {
                Bot.instance.edit(msg, "page2");
            },
            [ReactionId.ThumbsDown]: (added, user) => {
                Bot.instance.edit(msg, "page1");
            }
        });
    }
}
