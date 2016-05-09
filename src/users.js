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
                if(config.superadmins.indexOf(user._id) !== -1)
                {
                    for(var key in user.roles)
                    {
                        user.roles[key] = "superadmin";
                    }
                }
                
                _this.users[user._id] = user;
            }
            
            defer.resolve();
        });
        
        return defer.promise;
    }
    
    add_user(id, name, server, role)
    {
        if(this.users[id] !== undefined)
            return;
            
        role = role || "normal";
        
        var roles = {};
        roles[server.id] = role;
        
        console.log("Adding user '" + id + "' (" + name + ") from server '" + server.server.name + "'.");
        
        var user = User.create({_id: id, name: name, user_id: id, roles: roles});
        user.save().catch(function(err){
            console.log(err);
        });
    }
    
    assign_role(id, server, role)
    {
        if(this.users[id] === undefined)
            return;
            
        this.users[id].roles[server.id] = role;
        this.users[id].save().catch(function(err){
            console.log(err);
        });
    }
}

module.exports = new Users();
