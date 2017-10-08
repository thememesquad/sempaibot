import * as Discord from "discord.js";
import { Config } from "../../../config";
import { UserModel } from "../../model/user";
import { DB } from "../db";
import { RoleType } from "../permission/roletype";
import { Server } from "../server";
import { User } from "./user";

export class UserManager {
    private static _instance: UserManager = new UserManager();

    public static get instance(): UserManager {
        return UserManager._instance;
    }

    private _users: { [key: string]: User } = {};

    public async load() {
        const users = await DB.connection.manager.find(UserModel);
        for (const user of users) {
            if (Config.superadmins.indexOf(user.discordId) !== -1) {
                // todo: override all roles with superadmin

                /*for (let key in user.roles) {
                    user.roles[key] = "superadmin";
                }*/
            }

            this._users[user.discordId] = new User(user);
        }
    }

    public registerUser(id: string, name: string, server: Server, role?: string): User {
        if (this._users[id] !== undefined) {
            if (this._users[id]._name !== name) {
                this._users[id]._name = name;
                this._users[id].save().catch((err) => {
                    console.log(err);
                });
            }

            return this._users[id];
        }

        role = role || "normal";

        if (Config.superadmins.indexOf(id) !== -1)
            role = "superadmin";

        const serverId = server !== null ? server.id : -1;
        const roles = {};
        roles[serverId] = role;

        if (server !== null) {
            console.log("Adding user '" + id + "' (" + name + ") from server '" + server.server.name + "'.");
        } else {
            console.log("Adding user '" + id + "' (" + name + ")");
        }

        const user = new User();
        user._name = name;
        user._userID = id;
        user._roles = roles;

        user.save().catch((err) => {
            console.log(err);
        });

        this._users[id] = user;
        return this._users[id];
    }

    public getUserById(id: Discord.Snowflake, server?: Server): User {
        const user = this._users[id];
        if (user === undefined) {
            if (server !== undefined && server !== null) {
                for (const member of server.server.members) {
                    if (member[0] === id)
                        return this.registerUser(id, member[1].user.username, server);
                }
            }

            return null;
        }

        return (this._users[id] === undefined) ? null : this._users[id];
    }

    public getUser(user: Discord.User, server: Server): User {
        const ret = this.getUserById(user.id, server);
        if (ret === null)
            return this.registerUser(user.id, user.username, server);

        return ret;
    }

    public assignRole(id: string, server: Server, role: RoleType): boolean {
        if (this._users[id] === undefined)
            return false;

        this._users[id]._roles[server.id] = role;
        this._users[id].save().catch((err) => {
            console.log(err);
        });

        return true;
    }

    public get users(): { [key: string]: User } {
        return this._users;
    }
}
