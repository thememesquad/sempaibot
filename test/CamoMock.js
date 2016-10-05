"use strict";
const Q = require("q");

class Document
{
    constructor()
    {
    }
    
    save()
    {
        var defer = Q.defer();
        
        defer.resolve(this);
        
        return defer.promise;
    }
    
    static find()
    {
        var defer = Q.defer();
        
        defer.resolve([]);
        
        return defer.promise;
    }
    
    static findOne()
    {
        var defer = Q.defer();
        
        defer.resolve(null);
        
        return defer.promise;
    }
    
    static create(data)
    {
        var A = new this();
        A._schema = {};
        
        for(var key in data)
        {
            A._schema[key] = A[key];
            A[key] = data[key];
        }
       
        return A;
    }
}

class EmbeddedDocument
{
    constructor()
    {
    }
    
    static create()
    {
        return new EmbeddedDocument();
    }
}

var CamoMock = {
    Document: Document,
    EmbeddedDocument: EmbeddedDocument,
    
    connect: function(url){
        var defer = Q.defer();

        if(CamoMock.failMongoDB && url.startsWith("mongodb"))
            defer.reject();
        else if(CamoMock.failNeDB && url.startsWith("nedb"))
            defer.reject();
        else
            defer.resolve();

        return defer.promise;
    },
    
    failMongoDB: false,
    failNeDB: false
};

module.exports = CamoMock;