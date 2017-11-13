import { IOsuRecord } from "./iosurecord";
import { OsuMode } from "./osumode";

export interface IOsuUser {
    checking?: boolean;
    updateInProgress?: Promise<IOsuUser>;

    accuracy: string;
    count_rank_a: string;
    count_rank_s: string;
    count_rank_ss: string;
    count100: string;
    count300: string;
    count50: string;
    country: string;
    level: string;
    playcount: string;
    pp_country_rank: string;
    pp_rank: string;
    pp_raw: string;
    ranked_score: string;
    total_score: string;
    user_id: string;
    username: string;

    mode: OsuMode;
    dbVersion: number;

    servers: string[];
    records: IOsuRecord[];

    last_record: number;
    last_updated: number;
    last_checked: number;
}
