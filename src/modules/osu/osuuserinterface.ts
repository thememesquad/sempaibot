import { OsuRecordModel } from "./model/osurecord";

export interface IOsuUser {
    checking?: boolean;
    updateInProgress?: Promise<IOsuUser>;

    userId: string;
    username: string;
    pp: number;
    rank: number;
    lastUpdated: number;
    lastChecked: number;
    lastRecord: number;
    mode: number;

    servers: string[];
    records: OsuRecordModel[];
    extra: { [key: string]: any };
}
