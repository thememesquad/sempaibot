import { DiscordAPI } from "./core/api/discord";
import { Bot } from "./core/bot";

const bot: Bot = new Bot(new DiscordAPI());
process.on("SIGTERM", () => {
    bot.shutdown();
    process.exit(0);
});

bot.startup();
