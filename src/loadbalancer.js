"use strict";
const Q = require("q");

class LoadBalancer
{
    constructor(max_per_minute)
    {
        this.limit = max_per_minute;
        this.requests = [];
        this.old_minutes = (new Date()).getMinutes();
        this.current = 0;
        
        this.balancer = -1;
    }
    
    balance()
    {
        if(this.requests.length === 0)
        {
            clearInterval(this.balancer);
            this.balancer = -1;
            
            return;
        }
        
        var time = (new Date()).getMinutes();
        if(time !== this.old_minutes)
        {
            this.current = 0;
        }
        
        if(this.current >= this.limit)
            return;
        
        var req = this.requests[0];
        this.requests.splice(0, 1);
        this.current++;
        this.old_minutes = time;
        
        req.resolve();
    }
    
    create()
    {
        var defer = Q.defer();
        
        this.requests.push(defer);
        
        var promise = defer.promise;
        promise.__baseRequest = defer;
        
        if(this.balancer === -1)
        {
            this.balancer = setInterval(this.balance.bind(this), 1);
        }
        
        return promise;
    }
    
    cancel(request)
    {
        delete this.requests[request.__baseRequest];
    }
    
    close()
    {
        if(this.balancer !== -1)
            clearInterval(this.balancer);
        
        this.balancer = -1;
    }
}

module.exports = LoadBalancer;