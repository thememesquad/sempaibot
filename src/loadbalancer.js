"use strict";
const Q = require("q");

class LoadBalancer
{
    constructor(max_per_second)
    {
        max_per_second = max_per_second || 10;
        
        this.limit = max_per_second;
        this.requests = [];
        this.log = [];
        
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
        
        var time = Date.now();
        var end = -1;
        for(var i = 0;i<this.log.length;i++)
        {
            if(this.log[i] < time - 1000)
                end = i;
            else
                break;
        }
        
        if(end !== -1)
        {
            this.log.splice(0, end);
        }
        
        if(this.log.length === this.limit)
            return;
        
        var req = this.requests[0];
        this.requests.splice(0, 1);
        
        this.log.push(time);
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