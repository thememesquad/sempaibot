import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class OsuUserModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column()
    public userId: string;

    @Column()
    public username: string;

    @Column()
    public pp: number;

    @Column()
    public rank: number;

    @Column()
    public lastUpdated: number;

    @Column()
    public lastChecked: number;

    @Column()
    public version: number;

    @Column()
    public mode: number;

    // this.servers = [String];
    // this.records = [Object];
    // this.extra = [Object];
}
