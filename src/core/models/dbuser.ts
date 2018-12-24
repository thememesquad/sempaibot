import { Entity, Column, PrimaryColumn, ManyToMany, OneToMany } from "typeorm";
import { DBServer } from "./dbserver";
import { DBRole } from "./dbrole";
import { RoleType } from "../roletype";
import { superadmins } from "../../../config";
import { Guild, User, GuildMember } from "discord.js";
import { Bot } from "../bot";
import { DiscordAPI } from "../../api/discord";

@Entity()
export class DBUser
{
    @PrimaryColumn("varchar", { length: 255 })
    id!: string;

    @ManyToMany(type => DBServer, server => server.users, {
        cascade: true
    })
    servers!: DBServer[];

    @OneToMany(type => DBRole, role => role.user, {
        eager: true
    })
    roles!: DBRole[];

    @Column()
    blacklisted: boolean = false;

    public getName(server: DBServer | null): string
    {
        const guild: Guild = Bot.instance.get(DiscordAPI).getGuild(server.id);

        if (guild === null) {
            return Bot.instance.get(DiscordAPI).getUserName(this.id) || "Unknown";
        }

        const user: GuildMember = guild.members.get(this.id);

        if (user === null) {
            return Bot.instance.get(DiscordAPI).getUserName(this.id) || "Unknown";
        }

        return user.displayName;
    }

    public getRole(server: DBServer | null): RoleType {
        if (superadmins.indexOf(this.id) !== -1) {
            return RoleType.SuperAdmin;
        }

        if (server === null) {
            return RoleType.Normal;
        }

        const role = this.roles.find((item) => {
            return item.server == server;
        }) || null;

        if (!role) {
            return RoleType.Normal;
        }

        return role.role;
    }
}