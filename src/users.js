"use strict";

const config = require("../config.js");
const Document = require("camo").Document;

class User extends Document
{
    constructor()
    {
        super();
        
        this.name = String;
        this.user_id = String;
        this.roles = Object;
    }
    
    get_role(server)
    {
        if(server === null || server === undefined)
        {
            if(config.superadmins.indexOf(this.user_id) !== -1)
                return "superadmin";
                
            return "normal";
        }
        
        if(config.superadmins.indexOf(this.user_id) !== -1)
        {
            if(this.roles[server.id] === undefined || this.roles[server.id] !== "superadmin")
            {
                this.roles[server.id] = "superadmin";
                this.save().catch(err => {
                    console.log(err);
                });
            }
            
            return "superadmin";
        }
        
        if(this.roles[server.id] === undefined)
        {
            this.roles[server.id] = "normal";
            this.save().catch(err => {
                console.log(err);
            });
        }
        
        return this.roles[server.id];
    }
    
    get_role_id(server)
    {
        let role = this.get_role(server);
        switch(role)
        {
            case "superadmin":
                return 0;
                
            case "admin":
                return 1;
                
            case "moderator":
                return 2;
        }
        
        return 3;
    }
    
    get_name(server)
    {
        for(let i = 0;i<server.server.members.length;i++)
        {
            if(server.server.members[i].id === this.user_id)
            {
                let details = server.server.detailsOf(server.server.members[i]);
                if(details.nick)
                    return details.nick;
                    
                return this.name;
            }
        }
        
        return this.name;
    }
    
    get_name_detailed(server, member)
    {
        if(member === undefined)
        {
            for(let i = 0;i<server.server.members.length;i++)
            {
                if(server.server.members[i].id === this.user_id)
                {
                    member = server.server.members[i];
                    break;
                }
            }
        }
        
        if(member === undefined)
            return this.name + "#unknown";
            
        let name = this.name;
        let details = server.server.detailsOf(member);
        if(details.nick)
        {
            name = details.nick + " (" + this.name + "#" + member.discriminator + ")";
        }
        else
        {
            name = this.name + "#" + member.discriminator;
        }
            
        return name;
    }
}

class Users
{
    constructor()
    {
        this.users = {};
    }
    
    load()
    {
        return new Promise((resolve, reject) => {
            User.find({}).then(docs => {
                for(let i = 0;i<docs.length;i++)
                {
                    let user = docs[i];
                    if(config.superadmins.indexOf(user.user_id) !== -1)
                    {
                        for(let key in user.roles)
                        {
                            user.roles[key] = "superadmin";
                        }
                    }
                    
                    this.users[user.user_id] = user;
                }
                
                resolve();
            });
        });
    }
    
    add_user(id, name, server, role)
    {
        if(this.users[id] !== undefined)
        {
            if(this.users[id].name !== name)
            {
                this.users[id].name = name;
                this.users[id].save().catch(err => {
                    console.log(err);
                });
            }
            
            return this.users[id];
        }
          
        role = role || "normal";
        
        if(config.superadmins.indexOf(id) !== -1)
            role = "superadmin";
            
        let roles = {};
        roles[server.id] = role;
        
        console.log("Adding user '" + id + "' (" + name + ") from server '" + server.server.name + "'.");
        
        let user = User.create({name: name, user_id: id, roles: roles});
        user.save().catch(err => {
            console.log(err);
        });
        
        this.users[id] = user;
        return this.users[id];
    }
    
    get_user_by_id(id, server)
    {
        let user = this.users[id];
        if(user === undefined)
        {
            if(server !== undefined)
            {
                for(let i = 0;i<server.server.members.length;i++)
                {
                    if(server.server.members[i].id === id)
                    {
                        return this.add_user(id, server.server.members[i].user.username, server);
                    }
                }
            }
            
            return null;
        }
        
        return (this.users[id] === undefined) ? null : this.users[id];
    }
    
    get_user(user, server)
    {
        let ret = this.get_user_by_id(user.id, server);
        if(ret === null)
        {
            return this.add_user(user.id, user.username, server);
        }

        return ret;
    }
    
    assign_role(id, server, role)
    {
        if(this.users[id] === undefined)
            return false;
            
        this.users[id].roles[server.id] = role;
        this.users[id].save().catch(err => {
            console.log(err);
        });
        
        return true;
    }
}

module.exports = new Users();
