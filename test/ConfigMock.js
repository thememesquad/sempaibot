"use strict";

class Config
{
    set(props)
    {
        for(var key in props)
            this[key] = props[key];
    }
}

module.exports = new Config();