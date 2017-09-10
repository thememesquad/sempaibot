import { ModuleBase, Module, ModuleOptions, Command, CommandSample, CommandDescription, CommandPermission, CommandOptions, MessageInterface } from "../modulebase";
import { Config } from "../../config";
import * as request from "request";
import * as Discord from "discord.js";

enum TorrentState {
    MetaDownloading,
    Downloading,
    DoneSeeding,
    DoneFailed,
    Paused,
    Unknown
}

interface TorrentEpisodeInterface {
    season: number | Array<number>;
    episode: number | Array<number>;
    thumbnail?: string;
}

interface TorrentInterface {
    added_on?: number;
    amount_left?: number;
    category?: string;

    completed?: number;
    completion_on?: number;
    downloaded?: number;
    downloaded_session?: number;
    eta?: number;
    num_leechs?: number;
    num_seeds?: number;

    dl_limit?: number;
    dlspeed?: number;

    hash?: string;
    name?: string;

    num_complete?: number;
    num_incomplete?: number;

    size?: number;
    state?: string | TorrentState;

    total_size?: number;

    episode_data?: TorrentEpisodeInterface;
    discord_message?: Discord.Message;
    updating?: boolean;
    translator?: string;
}

interface SonarrEpisodeInterface {
    seasonNumber: number;
    episodeNumber: number;
    title: string;
    airDate: string;
    airDateUtc: string;
    overview: string;
    absoluteEpisodeNumber: number;
}

interface SonarrImageInterface {
    coverType: string;
    url: string;
}

interface SonarrSeasonInterface {
    seasonNumber: number;
    monitored: boolean;
}

interface SonarrRatingsInterface {
    votes: number;
    value: number;
}

interface SonarrSeriesInterface {
    title: string;
    sortTitle: string;
    seasonCount: number;
    status: string;
    overview: string;
    network: string;
    airTime: string;

    images: Array<SonarrImageInterface>;
    seasons: Array<SonarrSeasonInterface>;

    year: number;
    path: string;
    profileId: number;

    seasonFolder: boolean;
    monitored: boolean;
    useSceneNumbering: boolean;
    runtime: number;
    tvdbId: number;
    tvRageId: number;
    tvMazeId: number;
    firstAired: string;
    seriesType: string;
    cleanTitle: string;
    imdbId: number;
    titleSlug: string;
    certification: string;
    genres: Array<string>;
    tags: Array<string>;
    added: string;
    ratings: SonarrRatingsInterface;
    qualityProfileId: number;
    id: number;
}

interface SonarrQualityInterface {
    id: number;
    name: string;
}

interface SonarrRevisionInterface {
    version: number;
    real: number;
}

interface SonarrQualityContainerInterface {
    quality: SonarrQualityInterface;
    revision: SonarrRevisionInterface;
}

interface SonarrDownloadInterface {
    series: SonarrSeriesInterface;
    episode: SonarrEpisodeInterface;
    quality: SonarrQualityContainerInterface;
    size: number;
    title: string;
    sizeleft: number;
    timeleft: string;
    estimatedCompletionTime: string;
    status: string;
    trackedDownloadStatus: string;
    statusMessages: Array<string>;
    downloadId: string;
    protocol: string;
    id: number;
}

class SonarrAPI {
    private _cookieJar: request.CookieJar = request.jar();

    public getQueue(): Promise<Array<SonarrDownloadInterface>> {
        return this._apiCall("get", "/queue").then(result => {
            return (JSON.parse(result) as Array<SonarrDownloadInterface>);
        });
    }

    private _apiCall(method: string, path: string, options?: { [key: string]: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!Config.server.sonarr_url.endsWith("/"))
                Config.server.sonarr_url += "/";

            if (path.startsWith("/"))
                path = path.substr(1);

            let url = `${Config.server.sonarr_url}${path}`;
            let requestOptions: request.CoreOptions = {
                jar: this._cookieJar
            };

            if (options && method.toLowerCase() === "post") {
                requestOptions.qs = {
                    "apikey": Config.server.sonarr_key
                };
                requestOptions.form = options;
            } else {
                if (!options)
                    options = {};

                options["apikey"] = Config.server.sonarr_key;
                requestOptions.qs = options;
            }

            request(url, requestOptions, (err, response, body) => {
                if (err)
                    reject(err);
                else
                    resolve(body);
            });
        });
    }
}

class TorrentAPI {
    private _loggedIn: boolean = false;
    private _loginPromise: Promise<void> = null;
    private _cookieJar: request.CookieJar = request.jar();

    public getDownloadList(): Promise<Array<TorrentInterface>> {
        return new Promise<Array<TorrentInterface>>((resolve: (result: Array<TorrentInterface>) => void, reject: (err: any) => void) => {
            let execute = () => {
                this._apiCall("get", "/query/torrents").then(result => {
                    if (result.trim().length === 0)
                        return Promise.reject("empty result");

                    let data: Array<TorrentInterface> = JSON.parse(result);
                    for (let i in data)
                        data[i].state = this._convertTorrentState(data[i].state as string);

                    resolve(data);
                }).catch(err => {
                    reject(err);
                });
            };

            if (!this._loggedIn) {
                this._login();
                this._loginPromise.then(() => {
                    execute();
                });

                return;
            }

            execute();
        });
    }

    private _login(): void {
        this._loginPromise = this._apiCall("post", "/login", { username: Config.server.torrent_username, password: Config.server.torrent_password }).then(body => {
            if (body !== "Ok.")
                return Promise.reject(body);
        });
    }

    private _apiCall(method: string, path: string, options?: { [key: string]: string }): Promise<any> {
        return new Promise((resolve, reject) => {
            if (!Config.server.torrent_url.endsWith("/"))
                Config.server.torrent_url += "/";

            if (path.startsWith("/"))
                path = path.substr(1);

            let url = `${Config.server.torrent_url}${path}`;
            let requestOptions: request.CoreOptions = {
                jar: this._cookieJar
            };

            if (options && method.toLowerCase() === "post")
                requestOptions.form = options;
            else if (options)
                requestOptions.qs = options;

            request(url, requestOptions, (err, response, body) => {
                if (err)
                    reject(err);
                else
                    resolve(body);
            });
        });
    }

    private _convertTorrentState(state: string): TorrentState {
        if (typeof state !== "string")
            return state as TorrentState;

        switch (state.toLowerCase().trim()) {
            case "downloading":
                return TorrentState.Downloading;

            case "pausedup":
            case "uploading":
                return TorrentState.DoneSeeding;

            case "metadl":
            case "checkingResumeData":
                return TorrentState.MetaDownloading;

            case "pauseddl":
            case "stalleddl":
            case "stalledup":
                return TorrentState.Paused;
            
            default:
                console.log("Unknown torrent state: ", state);
                return TorrentState.Unknown;
        }
    }
}

@Module("ServerAPI", "API module for a server", ModuleOptions.Hidden)
export class ServerAPIModule extends ModuleBase {
    private _sonarrAPI: SonarrAPI;
    private _torrentAPI: TorrentAPI;
    private _torrentMonitorQueue: { [key: string]: TorrentInterface };
    private _torrentMonitorLoop: boolean;

    constructor() {
        super();

        this._sonarrAPI = new SonarrAPI();
        this._torrentAPI = new TorrentAPI();
        this._torrentMonitorQueue = {};
        this._torrentMonitorLoop = true;

        this._monitorTorrents();
    }

    private async _monitorTorrents() {
        if (!this._torrentMonitorLoop)
            return;

        let data = await this._torrentAPI.getDownloadList();
        for (let key in this._torrentMonitorQueue) {
            let monitor = this._torrentMonitorQueue[key];
            if (monitor.updating)
                continue;

            /*for (let torrent of data) {
                if (torrent.hash === monitor.hash)
                    await (this._updateTorrent(torrent, monitor) as Promise<Discord.Message>);
            }*/
        }
        
        setTimeout(this._monitorTorrents.bind(this), 500);
    }

    @Command("list downloads")
    private async onGetDownloads(message: MessageInterface, args: { [key: string]: any }): Promise<void> {
        let data: Array<TorrentInterface> = await this._torrentAPI.getDownloadList();
        let sonarr: Array<SonarrDownloadInterface> = await this._sonarrAPI.getQueue();
        let messages: Array<Discord.RichEmbed> = [];

        for (let torrent of data) {
            let show: SonarrSeriesInterface = null;
            let episode: SonarrEpisodeInterface | Array<SonarrEpisodeInterface> = null;

            for (let download of sonarr) {
                if (download.downloadId.toLowerCase() !== torrent.hash.toLowerCase())
                    continue;

                show = download.series;
                if (episode !== null) {
                    if (Array.isArray(episode))
                        episode.push(download.episode);
                    else
                        episode = [episode, download.episode];
                } else {
                    episode = download.episode;
                }
            }

            if (show !== null) {
                let thumbnail: string = null;
                for (let img of show.images) {
                    if (img.coverType === "poster") {
                        thumbnail = img.url;
                        break;
                    }
                }

                if (thumbnail === null && show.images.length > 0)
                    thumbnail = show.images[0].url;

                if (!Array.isArray(episode)) {
                    torrent.name = show.title + ": " + episode.title;
                    torrent.episode_data = {
                        season: episode.seasonNumber,
                        episode: episode.episodeNumber,
                        thumbnail: thumbnail
                    };
                } else {
                    torrent.name = show.title;

                    let seasons: Array<number> = [];
                    let episodes: Array<number> = [];

                    for (let ep of episode as Array<SonarrEpisodeInterface>) {
                        if (seasons.indexOf(ep.seasonNumber) === -1)
                            seasons.push(ep.seasonNumber);

                        episodes.push(ep.episodeNumber);
                    }

                    torrent.episode_data = {
                        season: seasons,
                        episode: episodes,
                        thumbnail: thumbnail
                    };
                }
            }

            let embed: Discord.RichEmbed = this._updateTorrent(torrent) as Discord.RichEmbed;
            
            messages.push(embed);
        }

        let ids = await this._bot.respond(message, messages);
        for (let i in ids) {
            this._monitorTorrent(data[i], ids[i]);
        }
    }

    private _monitorTorrent(torrent: TorrentInterface, message: Discord.Message): void {
        torrent.discord_message = message;
        this._torrentMonitorQueue[torrent.hash] = torrent;
    }

    private _statusToColor(state: TorrentState): Discord.ColorResolvable {
        switch (state) {
            case TorrentState.Downloading:
                return [190, 190, 0];

            case TorrentState.DoneSeeding:
                return [0, 190, 0];

            case TorrentState.MetaDownloading:
            case TorrentState.DoneFailed:
                return [190, 0, 0];
        }

        return [255, 255, 255];
    }

    private _updateTorrent(torrent: TorrentInterface, monitor?: TorrentInterface): Promise<Discord.Message> | Discord.RichEmbed {
        if (monitor) {
            let tmp = torrent;
            torrent = monitor;
            monitor = tmp;

            torrent.downloaded = monitor.downloaded;
            torrent.dlspeed = monitor.dlspeed;
            torrent.state = monitor.state;
        }

        if (torrent.updating)
            return null;
        
        let percentage: number = torrent.downloaded / torrent.total_size;
        let numCrossed: number = Math.floor(percentage * 10);
        let numEmpty: number = 10 - numCrossed;
        let bar: string = "█".repeat(numCrossed) + "░".repeat(numEmpty) + " " + Math.floor(percentage * 100) + "%";
        let speed: string = this._formatSpeed(torrent.dlspeed);

        let embed: Discord.RichEmbed = new Discord.RichEmbed();
        embed.setTitle(torrent.name);
        embed.setColor(this._statusToColor(torrent.state as TorrentState));
        
        if (torrent.episode_data) {
            if (torrent.episode_data.thumbnail)
                embed.setThumbnail(torrent.episode_data.thumbnail);

            embed.addField("Season", Array.isArray(torrent.episode_data.season) ? torrent.episode_data.season.join(", ") : `${torrent.episode_data.season}`, true);
            embed.addField("Episode", Array.isArray(torrent.episode_data.episode) ? torrent.episode_data.episode.join(", ") : `${torrent.episode_data.episode}`, true);
        }
        
        if (torrent.translator) {
            embed.addField("Translator", `${torrent.translator}`);
        }

        embed.addField("Progress", bar, true);
        embed.addField("Speed", speed, true);
        embed.setFooter(`Seeders: ${torrent.num_seeds} Leechers: ${torrent.num_leechs}`);

        if (torrent.discord_message) {
            torrent.updating = true;
            return this._bot.edit(torrent.discord_message, embed).then(ret => {
                torrent.updating = false;
                return ret;
            });
        } else {
            return embed;
        }
    }

    private _formatSpeed(speed: number): string {
        let ret: string = "";

        if (speed < 1000)
            return speed + "b/s";

        speed /= 1000;
        if (speed < 1000)
            return speed.toFixed(2) + "kb/s";

        speed /= 1000;
        if (speed < 1000)
            return speed.toFixed(2) + "mb/s";

        speed /= 1000;
        if (speed < 1000)
            return speed.toFixed(2) + "gb/s";

        speed /= 1000;
        return speed.toFixed(2) + "tb/s";
    }
}