interface IDiscordConfig {
    token: string;
}

interface IOsuConfig {
    apikey: string;
    apiurl: string;
}

interface IConfig {
    identifiers: Array<string>;

    discord: IDiscordConfig;
    osu?: IOsuConfig;

    superadmins: Array<string>;
}

export let Config: IConfig;