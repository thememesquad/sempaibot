"use strict";

const permissions = require("./permissions.js");
const db = require("./db.js");
const config = require("../config.js");
const Q = require("q");
const Document = require('camo').Document;

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
                this.save().catch(function(err){
                    console.log(err);
                });
            }
            
            return "superadmin";
        }
        
        if(this.roles[server.id] === undefined)
        {
            this.roles[server.id] = "normal";
            this.save().catch(function(err){
                console.log(err);
            });
        }
        
        return this.roles[server.id];
    }
    
    get_role_id(server)
    {
        var role = this.get_role();
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
}

class Users
{
    constructor()
    {
        this.users = {};
    }
    
    load()
    {
        var defer = Q.defer();
        var _this = this;
        
        User.find({}).then(function(docs){
            for(var i = 0;i<docs.length;i++)
            {
                var user = docs[i];
                if(config.superadmins.indexOf(user.user_id) !== -1)
                {
                    for(var key in user.roles)
                    {
                        user.roles[key] = "superadmin";
                    }
                }
                
                _this.users[user.user_id] = user;
            }
            
            defer.resolve();
        });
        
        return defer.promise;
    }
    
    add_user(id, name, server, role)
    {
        if(this.users[id] !== undefined)
        {
            if(this.users[id].name != name)
            {
                this.users[id].name = name;
                this.users[id].save().catch(function(err){
                    console.log(err);
                });
            }
            
            return this.users[id];
        }
          
        role = role || "normal";
        
        if(config.superadmins.indexOf(id) !== -1)
            role = "superadmin";
            
        var roles = {};
        roles[server.id] = role;
        
        console.log("Adding user '" + id + "' (" + name + ") from server '" + server.server.name + "'.");
        
        var user = User.create({name: name, user_id: id, roles: roles});
        user.save().catch(function(err){
            console.log(err);
        });
        
        this.users[id] = user;
        return this.users[id];
    }
    
    get_user_by_id(id)
    {
        return (this.users[id] === undefined) ? null : this.users[id];
    }
    
    get_user(user, server)
    {
        var ret = this.get_user_by_id(user.id);
        if(ret === null)
            return this.add_user(user.id, user.name, server);
            
        return ret;
    }
    
    assign_role(id, server, role)
    {
        if(this.users[id] === undefined)
            return false;
            
        this.users[id].roles[server.id] = role;
        this.users[id].save().catch(function(err){
            console.log(err);
        });
        
        return true;
    }
}

module.exports = new Users();
