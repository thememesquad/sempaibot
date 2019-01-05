import { Entity, Column, PrimaryGeneratedColumn, BaseEntity } from "typeorm";

@Entity()
export class DBEvent extends BaseEntity
{
    @PrimaryGeneratedColumn()
    id!: number;

    @Column("varchar", { length: 255, nullable: true })
    messageId!: string;

    @Column("varchar", { length: 255 })
    name!: string;

    @Column("text")
    description!: string;

    @Column("datetime", { nullable: true })
    date!: Date;

    @Column("text", { nullable: true })
    location!: string;

    @Column("text", { nullable: true })
    thumbnail!: string;
}