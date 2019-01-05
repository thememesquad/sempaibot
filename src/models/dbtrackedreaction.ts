import { Entity, Column, BaseEntity, PrimaryGeneratedColumn, OneToMany, ManyToOne } from "typeorm";
import { ReactionType } from "../core/reactiontype";
import { DBUser } from "./dbuser";
import { DBTrackedMessage } from "./dbtrackedmessage";

@Entity()
export class DBTrackedReaction extends BaseEntity
{
    @PrimaryGeneratedColumn()
    id!: number;

    @Column("int")
    type!: ReactionType;

    @ManyToOne(type => DBUser, user => user.reactions)
    user!: Promise<DBUser>;

    @ManyToOne(type => DBTrackedMessage, message => message.reactions)
    message!: Promise<DBTrackedMessage>;
}