"use strict";

class Channel
{
    constructor()
    {
        this.id = "3000";
        this.name = "Mocked Channel #1";
    }
}

class User
{
    constructor(id, name)
    {
        this.id = id;
        this.name = name;
    }
}

class Server
{
    constructor()
    {
        this.id = "1000";
        this.name = "Mocked Server #1";
        this.members = [
            new User("2000", "Mocked User #1"),
            new User("2001", "Mocked User #2"),
            new User("2002", "Mocked User #3"),
            new User("2003", "Mocked User #4"),
            new User("2004", "Mocked User #5")
        ];
        this.channels = [
            new Channel()
        ];
        this.owner = this.members[0];
        
        this.channels.get = function(prop, value){
            for(var i = 0;i<this.length;i++)
            {
                if(this[i][prop] === value)
                    return this[i];
            }
            
            return null;
        }.bind(this.channels);
    }
}

class Message
{
}

class Client
{
    constructor()
    {
        this.events = {};
        this.servers = [];
        this.status = "";
        this.messages = [];
        this.game = "";
        this._lastID = 0;
        
        for(var i = 0;i<Client._numServers;i++)
        {
            this.servers.push(new Server("" + (1000 + i), "Mocked Server #" + (i + 1)));
            this._lastID = 1000 + i;
        }
        
        Client._instance = this;
    }
    
    on(evt, callback)
    {
        if(this.events[evt] === undefined)
            this.events[evt] = [];
        
        this.events[evt].push(callback);
    }
    
    loginWithToken(token, callback)
    {
        this.fire("ready");
        callback(null, token);
    }
    
    fire(evt, args)
    {
        args = args || [];
        
        if(this.events[evt] === undefined)
            return;
        
        for(var i = 0;i<this.events[evt].length;i++)
            this.events[evt][i].apply(null, args);
    }
    
    stopTyping(channel)
    {
    }
    
    sendMessage(channel, message, flags, callback)
    {
        this.messages.push({
            channel: channel,
            message: message,
            flags: flags
        });
        
        setTimeout(function(){
            callback(null, {});
        }, 10);
    }
    
    setStatus(status, game)
    {
        this.status = status;
        this.game = game;
    }
    
    _newServer()
    {
        var server = new Server("" + (++this._lastID), "Mocked Server #" + this._lastID);
        this.servers.push(server);
        this.fire("serverCreated", server);
        
        return server.id;
    }
    
    _removeServer(id)
    {
    }
    
    _readdServer(id)
    {
    }
    
    static get numServers()
    {
        return Client._numServers;
    }
    
    static set numServers(num)
    {
        Client._numServers = num;
    }
    
    static newServer()
    {
        if(Client._instance === null)
            Client.numServers++;
        else
            return Client._instance._newServer();
        
        return "" + (1000 + (Client.numServers - 1));
    }
    
    static removeServer(id)
    {
        if(Client._instance === null)
            Client.numServers--;
        else
            Client._instance._removeServer(id);
    }
    
    static readdServer(id)
    {
        if(Client._instance === null)
            Client.numServers++;
        else
            Client._instance._readdServer(id);
    }
}
Client.numServers = 0;

module.exports = {
    Client: Client,
    Server: Server,
    User: User,
    Message: Message
};