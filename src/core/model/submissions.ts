import {BaseEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { IMessage } from "../index";
import { Events } from "./index";

@Entity()
export class Submissions extends BaseEntity {
    @PrimaryGeneratedColumn()
    public id: number;

    @Column("int")
    public messageid: string;

    @Column({ type: "varchar", length: 255 })
    public channelid: string;

    @Column({ type: "varchar", length: 255 })
    public content: string;

    @Column("int")
    public upvotes: number;
}
