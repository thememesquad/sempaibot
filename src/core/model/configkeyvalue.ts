import "proxy-observe";
import { AfterLoad, Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ConfigKeyValueModel {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ type: "varchar", length: 255 })
    public key: string;

    @Column("text")
    public value: string;
}
