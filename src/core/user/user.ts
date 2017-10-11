import * as Discord from "discord.js";
import { Config } from "../../../config";
import { UserModel } from "../model";
import { RoleType } from "../permission/roletype";
import { Server } from "../server";

export class User {
    public _name: string;
    public _userID: string;
    public _roles: { [key: string]: RoleType };

    constructor(user?: UserModel) {
        if (user) {
            this._name = user.name;
            this._userID = user.discordId;
            this._roles = {};

            for (const role of user.roles) {
                this._roles[role.serverId] = role.role;
            }
        }
    }

    public load(): Promise<void> {
        return new Promise((resolve: () => void, reject: (err) => void) => {
            resolve();
        });
    }

    public save(): Promise<void> {
        return new Promise((resolve: () => void, reject: (err) => void) => {
            resolve();
        });
    }

    public getRole(server: Server): RoleType {
        if (server === null || server === undefined) {
            if (Config.superadmins.indexOf(this._userID) !== -1)
                return RoleType.SuperAdmin;

            return RoleType.Normal;
        }

        if (Config.superadmins.indexOf(this._userID) !== -1) {
            if (this._roles[server.id] === undefined || this._roles[server.id] !== RoleType.SuperAdmin) {
                this._roles[server.id] = RoleType.SuperAdmin;
                this.save().catch((err) => {
                    console.log(err);
                });
            }

            return RoleType.SuperAdmin;
        }

        if (this._roles[server.id] === undefined) {
            this._roles[server.id] = RoleType.Normal;
            this.save().catch((err) => {
                console.log(err);
            });
        }

        return this._roles[server.id];
    }

    public getName(server: Server): string {
        for (const key of server.server.members.keyArray()) {
            const member = server.server.members.get(key);

            if (member.id === this._userID) {
                if (member.nickname)
                    return member.nickname;

                return this._name;
            }
        }

        return this._name;
    }

    public getDetailedName(server: Server, member?: Discord.GuildMember): string {
        if (member === undefined) {
            for (const key of server.server.members.keyArray()) {
                const tmp = server.server.members.get(key);

                if (tmp.id === this._userID) {
                    member = tmp;
                    break;
                }
            }
        }

        if (member === undefined)
            return this._name + "#unknown";

        let name: string;
        const details = member.nickname;
        if (member.nickname) {
            name = member.nickname + " (" + this._name + "#" + member.id + ")";
        } else {
            name = this._name + "#" + member.id;
        }

        return name;
    }
}
