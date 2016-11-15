"use strict";

const moment = require("moment");

function parse_timestring_internal(str)
{
    str = str.toLowerCase().trim();
    
    let currentDate = moment();
    
    let day_func = (target, day) => {
        let current = currentDate.day();
        
        if(current === target)
            return null;
            
        let num = 0;
        if(current > target)
            num = ((target + 6) - current) + 1;
        else
            num = target - current;
        
        return ["on " + day, currentDate.add(num, "days")];
    };
    
    let match = str.trim().split(" ");
    switch(match[0])
    {
        case "monday":
            {
                return day_func(1, "monday");
            }
        
        case "tuesday":
            {
                return day_func(2, "tuesday");
            }
        
        case "wednesday":
            {
                return day_func(3, "wednesday");
            }
        
        case "thursday":
            {
                return day_func(4, "thursday");
            }
        
        case "friday":
            {
                return day_func(5, "friday");
            }
        
        case "saturday":
            {
                return day_func(6, "saturday");
            }
        
        case "sunday":
            {
                return day_func(0, "sunday");
            }
        
        case "tomorrow":
            {
                return ["tomorrow", currentDate.add(1, "day")];
            }
    }
    
    if(match.length === 2)
    {
        let num, name;
        
        switch(match[1])
        {
            case "second":
            case "seconds":
                {
                    num = parseInt(match[0]);
                    if(isNaN(num))
                    {
                        console.log("Unknown second: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if(num === 1)
                        name += " second";
                    else
                        name += " seconds";

                    return ["in " + name, moment(currentDate.getTime() + (num * 1000))];
                }
            
            case "minute":
            case "minutes":
                {
                    num = parseInt(match[0]);
                    if(isNaN(num))
                    {
                        console.log("Unknown minute: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if(num === 1)
                        name += " minute";
                    else
                        name += " minutes";

                    return ["in " + name, currentDate.add(num, "minutes")];
                }
            
            case "hour":
            case "hours":
                {
                    num = parseInt(match[0]);
                    if(isNaN(num))
                    {
                        console.log("Unknown hour: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if(num === 1)
                        name += " hour";
                    else
                        name += " hours";

                    return ["in " + name, currentDate.add(num, "hours")];
                }
            
            case "day":
            case "days":
                {
                    num = parseInt(match[0]);
                    if(isNaN(num))
                    {
                        console.log("Unknown day: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if(num === 1)
                        name += " day";
                    else
                        name += " days";

                    return ["in " + name, currentDate.add(num, "days")];
                }
            
            case "week":
            case "weeks":
                {
                    num = parseInt(match[0]);
                    if(isNaN(num))
                    {
                        switch(match[0])
                        {
                            case "next":
                                num = 1;
                                break;

                            default:
                                console.log("Unknown week: " + match[0]);
                                return null;
                        }
                    }

                    name = "" + num;
                    if(num === 1)
                        name += " week";
                    else
                        name += " weeks";

                    return ["in " + name, currentDate.add(num, "weeks")];
                }
            
            case "month":
            case "months":
                {
                    num = parseInt(match[0]);
                    if(isNaN(num))
                    {
                        console.log("Unknown month: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if(num === 1)
                        name += " month";
                    else
                        name += " months";

                    return ["in " + name, currentDate.add(num, "months")];
                }
            
            case "year":
            case "years":
                {
                    num = parseInt(match[0]);
                    if(isNaN(num))
                    {
                        console.log("Unknown year: " + match[0]);
                        return null;
                    }

                    name = "" + num;
                    if(num === 1)
                        name += " year";
                    else
                        name += " years";

                    return ["in " + name, currentDate.add(num, "years")];
                }
        }
    }
    
    let tmp = moment(str, [
        "YYYY-MM-DD HH:mm",
        "HH:mm",
        "YYYY-MM-DD",
        "DD MMMM YYYY",
        "D MMMM YYYY",
        "Do MMMM YYYY",
        "MMMM DD YYYY",
        "MMMM D YYYY",
        "MMMM Do YYYY",
        "YYYY MMMM DD",
        "YYYY MMMM D",
        "YYYY MMMM Do"
    ], true);
    
    return [tmp.calendar(), tmp];
}
    
function parse_timestring(str)
{
    let ret = [];
    let split = str.trim().split(" ");
    
    let size = split.length;
    while(size > 1)
    {
        let matches = [];
                
        for(let i = 0;i<split.length;i++)
        {
            let tmp = "";
            let full = true;
            
            for(let j = 0;j<size;j++)
            {
                if(i + j >= split.length)
                {
                    full = false;
                    break;
                }
                   
                if(j !== 0)
                    tmp += " ";
                    
                tmp += split[i + j];
            }
                
            if(!full)
            {
                continue;
            }
                
            let tmp2 = parse_timestring_internal(tmp);
            if(tmp2 === null || !tmp2[1].isValid())
            {
                continue;
            }
            
            let index = str.indexOf(tmp);
            matches.push({index: index, str: tmp, ret: tmp2});
        }
        
        ret = ret.concat(matches);
        size--;
    }
    
    return ret;
}

module.exports = {
    parse: parse_timestring
};