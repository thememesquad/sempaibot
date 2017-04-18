"use strict";

class Util
{
    static parse_id(id)
    {
        let base_id = id;
        if(id.length < 4)
            return {type: "unknown", id: base_id, alias: false};
            
        let type = "";
        let is_alias = false;
        
        id = id.substr(1, id.length - 2);
        switch(id.charAt(0))
        {
            case "@":
                type = "user";
                break;
                
            case "#":
                type = "channel";
                break;
                
            default:
                return {type: "unknown", id: base_id, alias: false};
        }
        
        id = id.substr(1);
        if(id.charAt(0) === "!")
        {
            is_alias = true;
            id = id.substr(1);
        }
        
        return {type: type, id: id, alias: is_alias};
    }
    
    static generate_table(base_message, columns, data, minimum_lengths)
    {
        minimum_lengths = minimum_lengths || null;
        if(base_message === null || base_message === undefined)
            return [];
            
        if(data === null || data === undefined || data.length === 0)
            return [];
        
        if(columns === null || columns === undefined)
        {
            columns = {};
            
            for(let i = 0;i<data.length;i++)
            {
                for(let key in data[i])
                {
                    columns[key] = key;
                }
            }
        }
        
        let lengths = {};
        
        for(let key in columns)
        {
            if(minimum_lengths !== null)
                lengths[key] = Math.max(columns[key].length, minimum_lengths[key]);
            else
                lengths[key] = columns[key].length;
        }
        
        for(let i = 0;i<data.length;i++)
        {
            for(let key in columns)
            {
                lengths[key] = Math.max(data[i][key].length, lengths[key]);
            }
        }
        
        for(let key in columns)
        {
            lengths[key] += 2;
        }
        
        let message = "";
        let write_headers = () => {
            for(let key in columns)
            {
                let val = columns[key];
                while(val.length !== lengths[key])
                    val += " ";
                    
                message += val;
            }
            
            message = message.trim();
            message += "\r\n";
        };
        
        let write_item = index => {
            let tmp = "";
            for(let key in columns)
            {
                let val = data[index][key];
                while(val.length !== lengths[key])
                    val += " ";
                    
                tmp += val;
            }
            
            tmp = tmp.replace(/\s+$/gm, "");
            tmp += "\r\n";
            
            message += tmp;
        };
        
        let messages = [];
        for(let i = 0;i<data.length;i++)
        {
            if(message.length === 0)
            {
                message = "```";
                write_headers();
            }
            
            write_item(i);
            
            if(message.length >= 1800)
            {
                message += "```";
                messages.push(message);
                message = "";
            }
        }
        
        if(message.length !== 0)
        {
            message += "```";
            messages.push(message);
        }
        
        messages[0] = base_message + " " + messages[0];
        return messages;
    }
}

module.exports = Util;