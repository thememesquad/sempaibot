let canvas = null;

try
{
    canvas = require("canvas");
}
catch(e)
{
}

class Graphics
{
    constructor()
    {
        this.canvas = canvas;
        if(!canvas)
            return;
    }

    extend(obj)
    {
        for(let key in obj)
        {
            if(typeof obj[key] === "function")
            {
                this[key] = obj[key].bind(this);
            }
            else
            {
                this[key] = obj[key];
            }
        }
    }
}

module.exports = new Graphics();