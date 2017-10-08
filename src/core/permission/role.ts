import { Server } from "../server";
import { IRoleOptions } from "./roleoptions";
import { RoleType } from "./roletype";

export class Role {
    // private _dbrole: DBRole;
    private _name: RoleType;
    private _options: IRoleOptions;
    private _permissions: { [key: string]: { [key: string]: boolean } };

    constructor(name: RoleType, options?: IRoleOptions) {
        options = options || {};

        // this._dbrole = null;
        this._name = name;
        this._options = options;

        this._permissions = {
            null: {},
        };
    }

    public setup(id: string): void {
        if (this._permissions[id] === undefined) {
            this._permissions[id] = {};

            // use the null server permissions object as template
            for (const key in this._permissions.null)
                this._permissions[id][key] = this._permissions.null[key];
        }
    }

    public add(server: Server, permission: string): void {
        if (server === null) {
            this._permissions.null[permission] = true;

            for (const key in this._permissions) {
                if (this._permissions[key][permission] === undefined)
                    this._permissions[key][permission] = true;
            }

            return;
        }

        this.setup(server.id);
        this._permissions[server.id][permission] = true;
    }

    public remove(server: Server, permission: string): void {
        if (server === null) {
            this._permissions.null[permission] = false;
            return;
        }

        this.setup(server.id);
        this._permissions[server.id][permission] = false;
    }

    public isAllowed(server: Server, permission: string): boolean {
        if (this._name === RoleType.SuperAdmin)
            return true;

        if (server === null) {
            if (this._permissions.null === undefined)
                return false;

            if (this._permissions.null[permission] === undefined)
                return false;

            return this._permissions.null[permission];
        }

        this.setup(server.id);
        if (this._permissions[server.id][permission] === undefined) {
            this._permissions[server.id][permission] = this._permissions.null[permission];

            if (this._permissions[server.id][permission] === undefined)
                return false;
        }

        return this._permissions[server.id][permission];
    }

    public getPermissions(server: Server): { [key: string]: boolean } {
        this.setup(server.id);
        return this._permissions[server.id];
    }

    public save(): Promise<void> {
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

    public load(): Promise<void> {
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
