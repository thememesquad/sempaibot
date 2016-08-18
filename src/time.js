const moment = require("moment");

function parse_timestring_internal(str)
{
    str = str.toLowerCase().trim();
    
    var time = "";
    var currentDate = moment();
    
    var day_func = function(target, day){
        var current = currentDate.day();
        
        if(current == target)
            return null;
            
        var num = 0;
        if(current > target)
            num = ((target + 6) - current) + 1;
        else
            num = target - current;
        
        return ["on " + day, currentDate.add(num, "days")];
    };
    
    var match = str.trim().split(" ");
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
    
    if(match.length == 2)
    {
        switch(match[1])
        {
            case "second":
            case "seconds":
            {
                var num = parseInt(match[0]);
                if(isNaN(num))
                {
                    console.log("Unknown second: " + match[0]);
                    return null;
                }
                
                var name = "" + num;
                if(num == 1)
                    name += " second";
                else
                    name += " seconds";
                    
                return ["in " + name, moment(currentDate.getTime() + (num * 1000))];
            }
            
            case "minute":
            case "minutes":
            {
                var num = parseInt(match[0]);
                if(isNaN(num))
                {
                    console.log("Unknown minute: " + match[0]);
                    return null;
                }
                
                var name = "" + num;
                if(num == 1)
                    name += " minute";
                else
                    name += " minutes";
                
                return ["in " + name, currentDate.add(num, "minutes")];
            }
            
            case "hour":
            case "hours":
            {
                var num = parseInt(match[0]);
                if(isNaN(num))
                {
                    console.log("Unknown hour: " + match[0]);
                    return null;
                }
                
                var name = "" + num;
                if(num == 1)
                    name += " hour";
                else
                    name += " hours";
                
                return ["in " + name, currentDate.add(num, "hours")];
            }
            
            case "day":
            case "days":
            {
                var num = parseInt(match[0]);
                if(isNaN(num))
                {
                    console.log("Unknown day: " + match[0]);
                    return null;
                }
                
                var name = "" + num;
                if(num == 1)
                    name += " day";
                else
                    name += " days";
                
                return ["in " + name, currentDate.add(num, "days")];
            }
            
            case "week":
            case "weeks":
            {
                var num = parseInt(match[0]);
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
                
                var name = "" + num;
                if(num == 1)
                    name += " week";
                else
                    name += " weeks";
                
                return ["in " + name, currentDate.add(num, "weeks")];
            }
            
            case "month":
            case "months":
            {
                var num = parseInt(match[0]);
                if(isNaN(num))
                {
                    console.log("Unknown month: " + match[0]);
                    return null;
                }
                
                var name = "" + num;
                if(num == 1)
                    name += " month";
                else
                    name += " months";
                
                return ["in " + name, currentDate.add(num, "months")];
            }
            
            case "year":
            case "years":
            {
                var num = parseInt(match[0]);
                if(isNaN(num))
                {
                    console.log("Unknown year: " + match[0]);
                    return null;
                }
                
                var name = "" + num;
                if(num == 1)
                    name += " year";
                else
                    name += " years";
                
                return ["in " + name, currentDate.add(num, "years")];
            }
        }
    }
    
    var tmp = moment(str, [
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
    var ret = [];
    var split = str.trim().split(" ");
    
    var size = split.length;
    while(true)
    {
        var matches = [];
                
        for(var i = 0;i<split.length;i++)
        {
            var tmp = "";
            var full = true;
            
            for(var j = 0;j<size;j++)
            {
                if(i + j >= split.length)
                {
                    full = false;
                    break;
                }
                   
                if(j != 0)
                    tmp += " ";
                    
                tmp += split[i + j];
            }
                
            if(!full)
            {
                continue;
            }
                
            var tmp2 = parse_timestring_internal(tmp);
            if(tmp2 === null || !tmp2[1].isValid())
            {
                continue;
            }
            
            var index = str.indexOf(tmp);
            matches.push({index: index, str: tmp, ret: tmp2});
        }
        
        ret = ret.concat(matches);
        size--;
        
        if(size < 1)
            break;
    }
    
    return ret;
}

module.exports = {
    parse: parse_timestring
};