class Document {
    constructor() {
    }

    save() {
        return Promise.resolve(this);
    }

    static find() {
        return Promise.resolve([]);
    }

    static findOne() {
        return Promise.resolve(null);
    }

    static create(data) {
        let A = new this();
        A._schema = {};

        for (let key in data) {
            A._schema[key] = A[key];
            A[key] = data[key];
        }

        return A;
    }
}

class EmbeddedDocument {
    constructor() {
    }

    static create() {
        return new EmbeddedDocument();
    }
}

const CamoMock = {
    Document: Document,
    EmbeddedDocument: EmbeddedDocument,

    connect: function (url) {
        if (CamoMock.failMongoDB && url.startsWith("mongodb"))
            return Promise.reject();
        else if (CamoMock.failNeDB && url.startsWith("nedb"))
            return Promise.reject();

        return Promise.resolve();
    },

    failMongoDB: false,
    failNeDB: false
};

module.exports = CamoMock;