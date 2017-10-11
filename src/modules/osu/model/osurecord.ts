import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class OsuRecordModel {
    @PrimaryGeneratedColumn()
    public id: number;
}
