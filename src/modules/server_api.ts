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

interface TorrentInterface {
    added_on: number;
    amount_left: number;
    category: string;

    completed: number;
    completion_on: number;
    downloaded: number;
    downloaded_session: number;
    eta: number;

    dl_limit: number;
    dlspeed: number;

    hash: string;
    name: string;

    num_complete: number;
    num_incomplete: number;

    size: number;
    state: string | TorrentState;

    total_size: number;
    discord_message?: Discord.Message;
    updating?: boolean;
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
        switch (state.toLowerCase().trim()) {
            case "downloading":
                return TorrentState.Downloading;

            case "pausedup":
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

@Module("ServerAPI", "API module for a server")
export class ServerAPIModule extends ModuleBase {
    private _torrentAPI: TorrentAPI;
    private _torrentMonitorQueue: { [key: string]: TorrentInterface };
    private _torrentMonitorLoop: NodeJS.Timer;

    constructor() {
        super();

        this._torrentAPI = new TorrentAPI();
        this._torrentMonitorQueue = {};
        this._torrentMonitorLoop = setInterval(async () => {
            let data = await this._torrentAPI.getDownloadList();
            for (let key in this._torrentMonitorQueue) {
                let monitor = this._torrentMonitorQueue[key];
                if (monitor.updating) {
                    console.log("still updating:", monitor.name);
                    continue;
                }

                for (let torrent of data) {
                    if (torrent.hash === monitor.hash) {
                        if (torrent.state !== monitor.state || torrent.dlspeed !== monitor.dlspeed || torrent.downloaded !== monitor.downloaded)
                            (this._updateTorrent(torrent, monitor) as Promise<Discord.Message>).then(message => {
                                monitor.discord_message = message;
                            });
                    }
                }
            }    
        }, 4000);
    }

    @Command("list downloads")
    private async onGetDownloads(message: MessageInterface, args: { [key: string]: any }): Promise<void> {
        let data = await this._torrentAPI.getDownloadList();
        
        for (let torrent of data) {
            let embed: Discord.RichEmbed = this._updateTorrent(torrent) as Discord.RichEmbed;
            
            if (torrent.state !== TorrentState.DoneFailed && torrent.state !== TorrentState.DoneSeeding) {
                this._bot.respond(message, embed).then(message => {
                    this._monitorTorrent(torrent, message);
                });
            } else {
                this._bot.respond(message, embed);
            }
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
        
        let percentage: number = torrent.downloaded / torrent.size;
        let numCrossed: number = Math.floor(percentage * 10);
        let numEmpty: number = 10 - numCrossed;
        let bar: string = "█".repeat(numCrossed) + "░".repeat(numEmpty) + " " + Math.floor(percentage * 100) + "%";
        let speed: string = "" + torrent.dlspeed;

        let embed: Discord.RichEmbed = new Discord.RichEmbed();
        embed.setTitle(torrent.name);
        embed.setColor(this._statusToColor(torrent.state as TorrentState));
        embed.addField("Progress", bar, true);
        embed.addField("Speed", speed, true);

        if (torrent.discord_message) {
            torrent.updating = true;
            return this._bot.edit(torrent.discord_message, embed).then(ret => {
                console.log("finished updating", torrent.name);
                torrent.updating = false;
                return ret;
            });
        } else {
            return embed;
        }
    }
}