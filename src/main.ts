import { Bot } from "./core/bot";
import { DiscordAPI } from "./api/discord";
import { LogManager } from "./core/managers";

const bot = new Bot();
bot.bind<DiscordAPI>(DiscordAPI).toSelf().inSingletonScope();
bot.startup().then((result) => {
    if (!result) {
        process.exit(0);
    }
});
