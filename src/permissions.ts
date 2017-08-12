/*class DBRole extends Document {
    constructor() {
        super();

        this.name = String;
        this.permissions = Object;
    }
}*/

interface RoleOptions {
    global?: boolean;
    default?: boolean;
}

class DBRole {

}

export class Role {
    _dbrole: DBRole;
    _name: string;
    _options: RoleOptions;
    _permissions: { [key: string]: { [key: string]: boolean } };

    constructor(name, options?: RoleOptions) {
        options = options || {};

        this._dbrole = null;
        this._name = name;
        this._options = options;

        this._permissions = {
            "null": {}
        };
    }

    setup(id) {
        if (this._permissions[id] === undefined) {
            this._permissions[id] = {};

            //use the null server permissions object as template
            for (let key in this._permissions["null"])
                this._permissions[id][key] = this._permissions["null"][key];
        }
    }

    add(server, permission) {
        if (server === null) {
            this._permissions["null"][permission] = true;

            for (let key in this._permissions) {
                if (this._permissions[key][permission] === undefined)
                    this._permissions[key][permission] = true;
            }

            return;
        }

        this.setup(server.id);
        this._permissions[server.id][permission] = true;
    }

    remove(server, permission) {
        if (server === null) {
            this._permissions["null"][permission] = false;
            return;
        }
        
        this.setup(server.id);
        this._permissions[server.id][permission] = false;
    }

    isAllowed(server, permission) {
        if (this._name === "superadmin")
            return true;

        if (server === null) {
            if (this._permissions["null"] === undefined)
                return false;

            if (this._permissions["null"][permission] === undefined)
                return false;

            return this._permissions["null"][permission];
        }

        this.setup(server.id);
        if (this._permissions[server.id][permission] === undefined) {
            this._permissions[server.id][permission] = this._permissions["null"][permission];

            if (this._permissions[server.id][permission] === undefined)
                return false;
        }

        return this._permissions[server.id][permission];
    }

    getPermissions(server) {
        this.setup(server.id);
        return this._permissions[server.id];
    }

    save() {
        return new Promise((resolve, reject) => {
            resolve();
        });

        /*return new Promise((resolve, reject) => {
            this._dbrole.save().then(() => {
                resolve();
            }).catch(err => {
                reject(err);
            });
        });*/
    }

    load() {
        return new Promise((resolve, reject) => {
            resolve();
        });

        /*return new Promise((resolve, reject) => {
            DBRole.findOne({ name: this.name }).then(doc => {
                if (doc === null) {
                    this.dbrole = DBRole.create({ name: this.name, permissions: this.permissions });
                    this.dbrole.save().then(() => {
                        resolve();
                    }).catch(err => {
                        reject(err);
                    });
                }
                else {
                    this.dbrole = doc;
                    this.permissions = this.dbrole.permissions;
                    resolve();
                }
            }).catch(err => {
                reject(err);
            });
        });*/
    }
}

export class Permissions {
    private static _roles: { [key: string]: Role } = null;
    private static _permissions: Array<String> = null;

    constructor() {
        if (Permissions._roles === null) {
            Permissions._roles = {};
            Permissions._roles["superadmin"] = new Role("superadmin", { global: true });
            Permissions._roles["admin"] = new Role("admin");
            Permissions._roles["moderator"] = new Role("moderator");
            Permissions._roles["normal"] = new Role("normal", { default: true });

            Permissions._permissions = [];
        }    
    }

    save() {
        return new Promise((resolve, reject) => {
            Permissions._roles["superadmin"].save().then(() => {
                return Permissions._roles["admin"].save();
            }).then(() => {
                return Permissions._roles["moderator"].save();
            }).then(() => {
                return Permissions._roles["normal"].save();
            }).then(() => {
                resolve();
            }).catch(err => {
                reject(err);
            });
        });
    }

    load() {
        return new Promise((resolve, reject) => {
            Permissions._roles["superadmin"].load().then(() => {
                return Permissions._roles["admin"].load();
            }).then(() => {
                return Permissions._roles["moderator"].load();
            }).then(() => {
                return Permissions._roles["normal"].load();
            }).then(() => {
                resolve();
            }).catch(err => {
                reject(err);
            });
        });
    }

    register(name, defaultRole) {
        //Can't register a permission twice
        if (Permissions._permissions.indexOf(name) !== -1) {
            console.log("Permission '" + name + "' already registered.");
            return;
        }

        Permissions._permissions.push(name);

        defaultRole = defaultRole || "normal";

        Permissions._roles["superadmin"].add(null, name);
        if (defaultRole === "superadmin") {
            Permissions._roles["admin"].remove(null, name);
            Permissions._roles["moderator"].remove(null, name);
            Permissions._roles["normal"].remove(null, name);
            return;
        }

        Permissions._roles["admin"].add(null, name);
        if (defaultRole === "admin") {
            Permissions._roles["moderator"].remove(null, name);
            Permissions._roles["normal"].remove(null, name);
            return;
        }

        Permissions._roles["moderator"].add(null, name);
        if (defaultRole === "moderator") {
            Permissions._roles["normal"].remove(null, name);
            return;
        }

        Permissions._roles["normal"].add(null, name);
    }

    add(name, role, server) {
        if (Permissions._roles[role] === undefined)
            return false;

        Permissions._roles[role].add(server, name);
        Permissions._roles[role].save();

        return true;
    }

    remove(name, role, server) {
        if (Permissions._roles[role] === undefined)
            return false;

        Permissions._roles[role].remove(server, name);
        Permissions._roles[role].save();

        return true;
    }

    isAllowed(name, role, server) {
        return Permissions._roles[role].isAllowed(server, name);
    }

    getRole(name) {
        return Permissions._roles[name];
    }
}
