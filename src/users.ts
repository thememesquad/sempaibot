import { Server } from "./server";
import { Config } from "../config";
import { DB } from "./db";
import { UserModel } from "./model/user";

import * as Discord from "discord.js";

export class User {
    public _name: string;
    public _userID: string;
    public _roles: { [key: string]: string };

    constructor(user?: UserModel) {
        if (user) {
            this._name = user.name;
            this._userID = user.discordId;
            this._roles = {};
        }    
    }

    load() {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    save() {
        return new Promise((resolve, reject) => {
            resolve();
        });
    }

    getRole(server: Server) {
        if (server === null || server === undefined) {
            if (Config.superadmins.indexOf(this._userID) !== -1)
                return "superadmin";

            return "normal";
        }

        if (Config.superadmins.indexOf(this._userID) !== -1) {
            if (this._roles[server.id] === undefined || this._roles[server.id] !== "superadmin") {
                this._roles[server.id] = "superadmin";
                this.save().catch(err => {
                    console.log(err);
                });
            }

            return "superadmin";
        }

        if (this._roles[server.id] === undefined) {
            this._roles[server.id] = "normal";
            this.save().catch(err => {
                console.log(err);
            });
        }

        return this._roles[server.id];
    }

    getRoleId(server: Server) {
        let role = this.getRole(server);
        switch (role) {
            case "superadmin":
                return 0;

            case "admin":
                return 1;

            case "moderator":
                return 2;
        }

        return 3;
    }

    getName(server: Server) {
        for (let key of server._server.members.keyArray()) {
            let member = server._server.members.get(key);

            if (member.id === this._userID) {
                if (member.nickname)
                    return member.nickname;

                return this._name;
            }
        }

        return this._name;
    }

    getDetailedName(server: Server, member?: Discord.GuildMember) {
        if (member === undefined) {
            for (let key of server._server.members.keyArray()) {
                let tmp = server._server.members.get(key);

                if (tmp.id === this._userID) {
                    member = tmp;
                    break;
                }
            }
        }

        if (member === undefined)
            return this._name + "#unknown";

        let name = this._name;
        let details = member.nickname;
        if (member.nickname) {
            name = member.nickname + " (" + this._name + "#" + member.id + ")";
        } else {
            name = this._name + "#" + member.id;
        }

        return name;
    }
}

export class Users {
    private static _users: { [key: string]: User } = {};
    
    static async load() {
        let users = await DB.connection.manager.find(UserModel);
        for (let user of users) {
            if (Config.superadmins.indexOf(user.discordId) !== -1) {
                //todo: override all roles with superadmin

                /*for (let key in user.roles) {
                    user.roles[key] = "superadmin";
                }*/
            }

            this._users[user.discordId] = new User(user);
        }
    }

    static registerUser(id: string, name: string, server: Server, role?: string) {
        if (this._users[id] !== undefined) {
            if (this._users[id]._name !== name) {
                this._users[id]._name = name;
                this._users[id].save().catch(err => {
                    console.log(err);
                });
            }

            return this._users[id];
        }

        role = role || "normal";

        if (Config.superadmins.indexOf(id) !== -1)
            role = "superadmin";

        let server_id = server !== null ? server.id : -1;
        let roles = {};
        roles[server_id] = role;

        if (server !== null) {
            console.log("Adding user '" + id + "' (" + name + ") from server '" + server._server.name + "'.");
        } else {
            console.log("Adding user '" + id + "' (" + name + ")");
        }

        let user = new User();
        user._name = name;
        user._userID = id;
        user._roles = roles;

        user.save().catch(err => {
            console.log(err);
        });

        this._users[id] = user;
        return this._users[id];
    }

    static getUserById(id: Discord.Snowflake, server?: Server) {
        let user = this._users[id];
        if (user === undefined) {
            if (server !== undefined && server !== null) {
                for (let user of server._server.members) {
                    if (user[0] === id)
                        return this.registerUser(id, user[1].user.username, server);
                }
            }

            return null;
        }

        return (this._users[id] === undefined) ? null : this._users[id];
    }

    static getUser(user: Discord.User, server) {
        let ret = this.getUserById(user.id, server);
        if (ret === null) {
            return this.registerUser(user.id, user.username, server);
        }

        return ret;
    }

    static assignRole(id: string, server: Server, role: string) {
        if (this._users[id] === undefined)
            return false;

        this._users[id]._roles[server.id] = role;
        this._users[id].save().catch(err => {
            console.log(err);
        });

        return true;
    }
}
