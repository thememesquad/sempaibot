interface DiscordConfigInterface {
    token: string;
}

interface OsuConfigInterface {
    apikey: string;
    apiurl: string;
}

interface ServerConfigInterface {
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

interface ConfigInterface {
    identifiers: Array<string>;

    discord: DiscordConfigInterface;
    osu?: OsuConfigInterface;
    server?: ServerConfigInterface;

    superadmins: Array<string>;
}

export let Config: ConfigInterface;