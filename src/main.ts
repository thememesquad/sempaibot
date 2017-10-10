import { DiscordAPI } from "./api/discordapi";
import { Bot, parseTime } from "./core";

const bot: Bot = new Bot(new DiscordAPI());
process.on("SIGTERM", () => {
    bot.shutdown();
    process.exit(0);
});

bot.startup();
