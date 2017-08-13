interface DiscordConfigInterface {
    token: string;
}

interface OsuConfigInterface {
    apikey: string;
    apiurl: string;
}

interface ConfigInterface {
    identifiers: Array<string>;

    discord: DiscordConfigInterface;
    osu?: OsuConfigInterface;

    superadmins: Array<string>;
}

export let Config: ConfigInterface;