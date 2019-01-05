import { Entity, Column, PrimaryColumn, BaseEntity, OneToMany, ManyToOne } from "typeorm";
import { DBTrackedReaction } from "./dbtrackedreaction";
import { DBModule } from "./dbmodule";
import { DBServer } from "./dbserver";

@Entity()
export class DBTrackedMessage extends BaseEntity
{
    @PrimaryColumn("varchar", { length: 255 })
    id!: string;

    @Column("varchar", { length: 255 })
    channel!: string;

    @Column("int")
    trackedReactions!: number;

    @Column("varchar", { length: 255 })
    namespace!: string;

    @Column("varchar", { length: 255 })
    data!: string;

    @Column("tinyint", { default: false })
    reset!: boolean;

    @ManyToOne(type => DBModule, module => module.messages)
    module!: Promise<DBModule>;

    @ManyToOne(type => DBServer, server => server.messages)
    server!: Promise<DBServer>;

    @OneToMany(type => DBTrackedReaction, reaction => reaction.message)
    reactions!: Promise<DBTrackedReaction[]>;
}