import { Entity, Column, PrimaryColumn, ManyToMany, OneToMany, BaseEntity } from "typeorm";
import { DBServer } from "./dbserver";
import { RoleType } from "../core/roletype";
import { superadmins } from "../../config";
import { Guild, User, GuildMember } from "discord.js";
import { Bot } from "../core/bot";
import { DiscordAPI } from "../api/discord";
import { DBRoleLink } from "./dbrolelink";
import { DBTrackedReaction } from "./dbtrackedreaction";

@Entity()
export class DBUser extends BaseEntity
{
    @PrimaryColumn("varchar", { length: 255 })
    id!: string;

    @ManyToMany(type => DBServer, server => server.users, {
        cascade: true
    })
    servers!: DBServer[];

    @OneToMany(type => DBRoleLink, link => link.user)
    roles!: Promise<DBRoleLink[]>

    @OneToMany(type => DBTrackedReaction, reaction => reaction.user)
    reactions!: Promise<DBTrackedReaction[]>;

    @Column()
    blacklisted: boolean = false;

    public getName(server: DBServer): string
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

    public async getRole(server: DBServer): Promise<RoleType> {
        if (superadmins.indexOf(this.id) !== -1) {
            return RoleType.SuperAdmin;
        }

        if (server === null) {
            return RoleType.Normal;
        }

        const roles = await this.roles;
        const role = roles.reduce((x, y) => x.server.id === server.id ? x : y);

        if (role.server.id !== server.id) {
            return RoleType.Normal;
        }

        return role.role;
    }
}