import { Entity, Column, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class ConfigKeyValueModel {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    key: string;

    @Column()
    value: string;
}