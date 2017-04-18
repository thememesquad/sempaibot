"use strict";
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
        
        let time = (new Date()).getMinutes();
        if(time !== this.old_minutes)
        {
            this.current = 0;
        }
        
        if(this.current >= this.limit)
            return;
        
        let req = this.requests[0];
        this.requests.splice(0, 1);
        this.current++;
        this.old_minutes = time;
        
        request(req.url, (error, response, body) => {
            if(req.url !== undefined)
            {
                delete this.namedRequests[req.url];
                this.namedRequests[req.url] = undefined;
            }
        
            this.pendingRequests.splice(this.pendingRequests.indexOf(req));
            
            if(error)
                req.reject(error);
            else
                req.resolve({response: response, body: body});
        });
        
        this.pendingRequests.push(req);
    }
    
    create(url)
    {
        if(this.namedRequests[url] !== undefined)
            return this.namedRequests[url];
        
        this.namedRequests[url] = new Promise((resolve, reject) => {
            this.requests.push({
                resolve: resolve,
                reject: reject,
                url: url
            });

            if(this.balancer === -1)
            {
                this.balancer = setInterval(this.balance.bind(this), 1);
            }
        });
        
        return this.namedRequests[url];
    }
    
    cancel(request)
    {
        if(this.namedRequests[request.url] === undefined)
            return;
        
        delete this.namedRequests[request.url];
        
        for(let i = 0;i<this.requests.length;i++)
        {
            if(this.requests[i].url === request.url)
            {
                this.requests.splice(i, 1);
                break;
            }
        }
        
        for(let i = 0;i<this.pendingRequests.length;i++)
        {
            if(this.pendingRequests[i].url === request.url)
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
            this.cancel(this.requests[0]);
        
        while(this.pendingRequests.length > 0)
            this.cancel(this.pendingRequests[0]);
        
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