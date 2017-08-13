import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class OsuUserModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    userId: string;

    @Column()
    username: string;

    @Column()
    pp: number;

    @Column()
    rank: number;

    @Column()
    lastUpdated: number;

    @Column()
    lastChecked: number;

    @Column()
    version: number;

    @Column()
    mode: number;

    //this.servers = [String];
    //this.records = [Object];
    //this.extra = [Object];
}