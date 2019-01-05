import { Bot } from "./core/bot";
import { DiscordAPI } from "./api/discord";

process.on('unhandledRejection', error => {
    // Will print "unhandledRejection err is not defined"
    console.log('unhandledRejection', error);
});

const bot = new Bot();
bot.bind<DiscordAPI>(DiscordAPI).toSelf().inSingletonScope();
bot.startup().then((result) => {
    if (!result) {
        process.exit(0);
    }
});
