interface IDiscordConfig {
    token: string;
}

interface IOsuConfig {
    apikey: string;
    apiurl: string;
}

interface IServerConfig {
    sonarr_url?: string;
    sonarr_key?: string;

    radarr_url?: string;
    radarr_key?: string;

    plex_url?: string;
    plex_username?: string;
    plex_password?: string;

    torrent_url?: string;
    torrent_username?: string;
    torrent_password?: string;
}

interface IConfig {
    identifiers: Array<string>;

    discord: IDiscordConfig;
    osu?: IOsuConfig;
    server?: IServerConfig;

    superadmins: Array<string>;
}

export let Config: IConfig;