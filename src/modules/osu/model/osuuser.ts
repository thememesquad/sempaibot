import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { IOsuUser } from "../iosuuser";
import { OsuMode } from "../osumode";
import { OsuRecordModel } from "./osurecord";

@Entity()
export class OsuUserModel implements IOsuUser {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column("varchar")
    // tslint:disable-next-line:variable-name
    public user_id: string;

    @Column("varchar")
    public accuracy: string;

    @Column("varchar")
    // tslint:disable-next-line:variable-name
    public count_rank_a: string;

    @Column("varchar")
    // tslint:disable-next-line:variable-name
    public count_rank_s: string;

    @Column("varchar")
    // tslint:disable-next-line:variable-name
    public count_rank_ss: string;

    @Column("varchar")
    public count100: string;

    @Column("varchar")
    public count300: string;

    @Column("varchar")
    public count50: string;

    @Column("varchar")
    public country: string;

    @Column("varchar")
    public level: string;

    @Column("varchar")
    public playcount: string;

    @Column("varchar")
    // tslint:disable-next-line:variable-name
    public pp_country_rank: string;

    @Column("varchar")
    // tslint:disable-next-line:variable-name
    public pp_rank: string;

    @Column("varchar")
    // tslint:disable-next-line:variable-name
    public pp_raw: string;

    @Column("varchar")
    // tslint:disable-next-line:variable-name
    public ranked_score: string;

    @Column("varchar")
    // tslint:disable-next-line:variable-name
    public total_score: string;

    @Column("varchar")
    public username: string;

    @Column("int")
    public mode: OsuMode;

    @Column("int")
    public dbVersion: number;

    @Column("simple-array")
    public servers: string[];

    @OneToMany((type) => OsuRecordModel, (record) => record.user, {
        cascadeInsert: true,
        cascadeUpdate: true
    })
    public records: OsuRecordModel[];

    @Column("int", { nullable: true })
    // tslint:disable-next-line:variable-name
    public last_record: number;

    @Column("int", { nullable: true })
    // tslint:disable-next-line:variable-name
    public last_updated: number;

    @Column("int", { nullable: true })
    // tslint:disable-next-line:variable-name
    public last_checked: number;
}
