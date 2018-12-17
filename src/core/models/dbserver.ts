import { Entity, Column, PrimaryColumn, ManyToMany, OneToMany, JoinTable } from "typeorm";
import { DBUser } from "./dbuser";
import { DBRole } from "./dbrole";
import { DBModule } from "./dbmodule";
import { Bot } from "../bot";
import { LogManager } from "../managers";

@Entity()
export class DBServer
{
    @PrimaryColumn("varchar", { length: 255 })
    id!: string;

    @ManyToMany(type => DBUser, user => user.servers, { eager: true })
    @JoinTable()
    users!: DBUser[];

    @ManyToMany(type => DBModule, module => module.servers, { eager: true })
    @JoinTable()
    modules!: DBModule[];

    @OneToMany(type => DBRole, role => role.server)
    roles!: DBRole[];

    @Column()
    blacklisted: boolean = false;

    public isModuleEnabled(moduleName: string): boolean
    {
        Bot.instance.get(LogManager).log("todo: add isModuleEnabled check for", moduleName);
        return true;
    }
}