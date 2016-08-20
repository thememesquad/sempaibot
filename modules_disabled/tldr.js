"use strict";

const IModule = require("../src/IModule.js");
const summary = require("node-tldr");
const responses = require("../src/responses.js");

class TLDRModule extends IModule
{
    constructor()
    {
        super();
        
        this.name = "tldr";
        this.description = "tldr module";
        this.always_on = true;
        
        this.add_command({
            match: function(message){
                if(!message.content.toLowerCase().startsWith("tldr"))
                    return null;
                    
                var url = message.content.substr("tldr".length + 1).trim();
                if(url.length == 0)
                {
                    message.almost = true;
                    return null;
                }
                
                return [url];
            },
            sample: "sempai tldr __*url*__",
            description: "Creates a summary of the page.",
            permission: null,
            global: true,
            
            execute: this.handle_tldr
        });
    }
    
    handle_tldr(message, url)
    {
        summary.summarize(url, {shortenFactor: 0.3}, function(message, result, failure){
            if(failure)
            {
                console.log(result.error);
            }
            
            if(failure || result.words == 0)
            {
                return this.bot.respond(message, responses.get("TLDR_FAILED").format({author: message.author.id}));
            }
            
            var summary = "";
            for(var i = 0;i<result.summary.length;i++)
            {
                if(i != 0)
                    summary += " ";
                    
                summary += result.summary[i];
            }
            
            var reduction = "" + ((1.0 - result.compressFactor) * 100);
            if(reduction.indexOf(".") !== -1)
                reduction = reduction.substr(0, reduction.indexOf("."));
                
            this.bot.respond(message, responses.get("TLDR").format({author: message.author.id, title: result.title, summary: summary, num_words: result.words, percentage: reduction}));
        }.bind(this, message));
    }
    
    on_setup(bot)
    {
        this.bot = bot;
    }
    
    on_load()
    {
    }
    
    on_unload()
    {
    }
}

module.exports = new TLDRModule();