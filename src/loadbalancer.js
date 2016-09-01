"use strict";
const Q = require("q");
const request = require("request");

class LoadBalancer
{
    constructor(max_per_minute)
    {
        this.limit = max_per_minute;
        this.requests = [];
        this.pendingRequests = [];
        this.namedRequests = {};
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
        
        request(req.url, function(request, error, response, body){
            if(request.url !== undefined)
            {
                delete this.namedRequests[request.url];
                this.namedRequests[request.url] = undefined;
            }
        
            this.pendingRequests.splice(this.pendingRequests.indexOf(request));
            
            if(error)
                request.defer.reject(error);
            else
                request.defer.resolve({response: response, body: body});
        }.bind(this, req));
        
        this.pendingRequests.push(req);
    }
    
    create(url)
    {
        if(this.namedRequests[url] !== undefined)
            return this.namedRequests[url];
        
        var defer = Q.defer();
        
        this.requests.push({
            defer: defer,
            url: url
        });
        
        var promise = defer.promise;
        promise.__baseRequest = defer;
        promise.__baseURL = url;
        
        if(this.balancer === -1)
        {
            this.balancer = setInterval(this.balance.bind(this), 1);
        }
        
        this.namedRequests[url] = promise;
        return promise;
    }
    
    cancel(request)
    {
        if(this.namedRequests[request.__baseURL] === undefined)
            return;
        
        delete this.namedRequests[request.__baseURL];
        
        for(var i = 0;i<this.requests.length;i++)
        {
            if(this.requests[i].url === request.__baseURL)
            {
                this.requests.splice(i, 1);
                break;
            }
        }
        
        for(var i = 0;i<this.pendingRequests.length;i++)
        {
            if(this.pendingRequests[i].url === request.__baseURL)
            {
                this.pendingRequests[i].pending.abort();
                this.pendingRequests.splice(i, 1);
                break;
            }
        }
    }
    
    close()
    {
        while(this.requests.length > 0)
            this.cancel(this.requests[0].defer.promise);
        
        while(this.pendingRequests.length > 0)
            this.cancel(this.pendingRequests[0].defer.promise);
        
        if(this.balancer !== -1)
            clearInterval(this.balancer);
        
        this.balancer = -1;
    }
    
    get numRequests()
    {
        return this.requests.length + this.pendingRequests.length;
    }
}

module.exports = LoadBalancer;