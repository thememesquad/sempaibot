"use strict";

class Util
{
    static parse_id(id)
    {
        if(id.length < 4)
            return {type: "unknown", id: id};
            
        var type = "";
        
        id = id.substr(1, id.length - 2);
        switch(id.charAt(0))
        {
            case '@':
                type = "user";
                break;
                
            case '#':
                type = "channel";
                break;
                
            default:
                return {type: "unknown", id: id};
        }
        
        id = id.substr(1);
        if(id.charAt(0) == '!')
        {
            id = id.substr(1);
        }
        
        return {type: type, id: id};
    }
}

module.exports = Util;