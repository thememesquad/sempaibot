import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { IOsuRecord } from "../iosurecord";
import { OsuUserModel } from "./osuuser";

@Entity()
export class OsuRecordModel implements IOsuRecord {

    @PrimaryGeneratedColumn()
    public id: number;

    @ManyToOne((type) => OsuUserModel, (author: OsuUserModel) => author.records)
    public user: OsuUserModel;

    @Column("int")
    // tslint:disable-next-line:variable-name
    public beatmap_id: string | number;

    @Column("int")
    public count100: string | number;

    @Column("int")
    public count300: string | number;

    @Column("int")
    public count50: string | number;

    @Column("int")
    public countgeki: string | number;

    @Column("int")
    public countkatu: string | number;

    @Column("int")
    public countmiss: string | number;

    @Column("int")
    public date: string | number;

    @Column("int")
    // tslint:disable-next-line:variable-name
    public enabled_mods: string | number;

    @Column("int")
    public maxcombo: string | number;

    @Column("int")
    public perfect: string | number;

    @Column("int")
    public pp: string | number;

    @Column("varchar")
    public rank: string;

    @Column("int")
    public score: string | number;

    @Column("varchar")
    // tslint:disable-next-line:variable-name
    public user_id: string;
}
