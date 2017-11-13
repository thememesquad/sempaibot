export interface IOsuRecord {
    beatmap_id: string | number;
    count100: string | number;
    count300: string | number;
    count50: string | number;
    countgeki: string | number;
    countkatu: string | number;
    countmiss: string | number;
    date: string | number;
    enabled_mods: string | number;
    maxcombo: string | number;
    perfect: string | number;
    pp: string | number;
    rank: string;
    score: string | number;
    user_id: string;

    acc?: string;
    mods?: string;
    additional?: string;
}
