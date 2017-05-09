const path = require("path"),
    grpc = require("grpc"),
    config = require("../../config.js"),
    embedded = grpc.load({
        root: path.resolve(__dirname, "../proto"), 
        file: "embedded_assistant.proto"
    }).google.assistant.embedded.v1alpha1,
    GoogleAuth = require("google-auth-library"),
    streamBuffers = require("stream-buffers"),
    google = require("googleapis"),
    OAuth2 = google.auth.OAuth2,
    express = require("express"),
    ModuleBase = require("../modulebase.js"),
    Document = require("camo").Document,
    responses = require("../responses.js"),
    url = require("url");

class AssistantToken extends Document {
    constructor() {
        super();

        this.user_id = String;
        this.access_token = String;
        this.remember_token = String;
        this.token_type = String;
        this.expiry_date = Number;
    }
}

class VoiceModule extends ModuleBase{
    constructor() {
        super();

        this.name = "voiceapi";
        this.description = "Google Assistant Integration";
        this.hidden = true;
        this.always_on = true;

        this.tokens = {};
        this.oauth = {};
        this.services = {};
        this.connections = {};
        this.receivers = {};
        this.audio_data = {};
        this.audio_stream = {};
        this.conversation = {};

        this.add_command({
            formats: [
                "register <with> assistant"
            ],
            sample: "register with assistant",
            description: "",

            execute: this.handle_register
        });

        this.add_command({
            formats: [
                "start listening"
            ],
            sample: "start listening",
            description: "",

            execute: this.handle_start_listening
        });

        this.add_command({
            formats: [
                "stop listening"
            ],
            sample: "stop listening",
            description: "",

            execute: this.handle_stop_listening
        });

        let app = express();

        app.get("/oauthcallback", (request, response) => {
            let url_parts = url.parse(request.url, true);
            let query = url_parts.query;

            let user = query.state;
            let code = query.code;

            if(this.oauth[user] === undefined)
                return response.send("Invalid authentication.");
            
            this.oauth[user].getToken(code, async (err, tokens) => {
                if(err)
                    return response.send(err);
                
                tokens["user_id"] = user;
                let token = AssistantToken.create(tokens);
                await token.save();

                this.tokens[user] = token;

                this.oauth[user].setCredentials(tokens);
                return response.send("We're done now! You can close this window.");
            });
        });

        this.server = app.listen(8000);
    }

    handle_register(message, args) {
        if(this.tokens[message.author.id] !== undefined) {
            return this.bot.respond(message, responses.get("VOICE_ALREADY_REGISTERED").format({
                author: message.author.id
            }));
        }

        if(this.oauth[message.author.id] !== undefined) {
            return this.bot.respond(message, responses.get("VOICE_REGISTRATION_ALREADY_STARTED").format({
                author: message.author.id
            }));
        }

        this.oauth[message.author.id] = new OAuth2(
            config.voice.client_id,
            config.voice.client_secret,
            "http://" + config.voice.redirect_ip + ":8000/oauthcallback"
        );

        let url = this.oauth[message.author.id].generateAuthUrl({
            access_type: "offline",
            scope: "https://www.googleapis.com/auth/assistant-sdk-prototype",
            state: message.author.id
        });

        return this.bot.respond(message, responses.get("VOICE_REGISTRATION_URL").format({
            author: message.author.id,
            url: url
        }));
    }

    async handle_start_listening(message, args) {
        if(this.connections[message.server.id] !== undefined) {
            //already listening on server
        }

        if(message.server === null) {
            //not in a server
        }

        if(message.member.voiceChannel === null) {
            //not in a voice channel
        }

        this.connections[message.server.id] = await message.member.voiceChannel.join();
        this.receivers[message.server.id] = this.connections[message.server.id].createReceiver();
        this.connections[message.server.id].on("speaking", async function(user, speaking) {
            try {
                if(this.services[user.id] === undefined) {
                    this.services[user.id] = await this.create_service(user);
                    if(this.services[user.id] === null) {
                        delete this.services[user.id];
                        return;
                    }
                }

                if(speaking) {
                    if(this.conversation[user.id] === undefined) {
                        this.conversation[user.id] = this.services[user.id].converse();
                        this.conversation[user.id].write(this.generate_setup_request(16000));

                        let buffers = [];
                        this.conversation[user.id].on("data", (response) => { 
                            console.log(response);

                            if(response.event_type === "END_OF_UTTERANCE") {
                                this.conversation[user.id].end();
                                return;
                            }
                            
                            if(response.audio_out !== null) {
                                buffers.push(response.audio_out.audio_data);
                            }
                        });

                        this.conversation[user.id].on("end", () => {
                            let stream = new streamBuffers.ReadableStreamBuffer();
                            stream.put(Buffer.concat(buffers));

                            this.connections[message.server.id].playStream(stream);
                            console.log("ended");

                            delete this.conversation[user.id];
                        });

                        this.conversation[user.id].on("status", (status) => {
                            console.log("status", status);
                        });

                        this.conversation[user.id].on("error", (err) => {
                            console.log("error", err);
                        });
                    }

                    this.audio_stream[user.id] = this.receivers[message.server.id].createPCMStream(user);
                    this.audio_stream[user.id].on("data", (data) => {
                        this.conversation[user.id].write(this.generate_audio_request(this.convert_to_linear16(data)));
                    });
                } else if(!speaking && this.audio_stream[user.id] !== undefined) {
                    //todo: delete stream
                    delete this.audio_stream[user.id];
                }
            } catch(err) {
                console.log(err);
            }
        }.bind(this));

        this.connections[message.server.id].on("error", (err) => {
            console.log(err);
        });
    }

    async handle_stop_listening(message, args) {
        this.connections[message.server.id].leave();
    }

    async on_setup() {
        let tokens = await AssistantToken.find({});
        for(let i = 0;i<tokens.length;i++) {
            this.tokens[tokens[i].user_id] = tokens[i];
        }
    }

    async on_shutdown() {

    }

    async on_load(server) {

    }

    async on_unload(server) {

    }

    async create_service(user) {
        if(this.tokens[user.id] === undefined)
            return null;
        
        if(this.oauth[user.id] === undefined) {
            this.oauth[user.id] = new OAuth2(
                config.voice.client_id,
                config.voice.client_secret,
                "http://" + config.voice.redirect_ip + ":8000/oauthcallback"
            );

            this.oauth[user.id].setCredentials(this.tokens[user.id]);
        }

        let ssl_credentials = grpc.credentials.createSsl();
        let call_credentials = grpc.credentials.createFromMetadataGenerator((auth_context, callback) => {
            let metadata = new grpc.Metadata();
            metadata.add("authorization", this.oauth[user.id].credentials.token_type + " " + this.oauth[user.id].credentials.access_token);
            callback(null, metadata);
        });
        let combined_credentials = grpc.credentials.combineChannelCredentials(ssl_credentials, call_credentials);

        return new embedded.EmbeddedAssistant("embeddedassistant.googleapis.com", combined_credentials);
    }

    convert_to_linear16(buffer) {
        let l = buffer.length;
        let buf = new Int16Array(l / 3);

        while (l--) {
            if(l % 3 === 0){
                buf[l / 3] = buffer[l] * 0xFFFF;
            }
        }

        return buf.buffer;
    }

    simplify_message(message) {
        return message.replace(/[\*\_\;\@]/gi, "").trim();
    }

    generate_setup_request(sample_rate) {
        let audioInConfig = new embedded.AudioInConfig({
            encoding: embedded.AudioInConfig.Encoding.LINEAR16,
            sample_rate_hertz: sample_rate
        });

        let audioOutConfig = new embedded.AudioOutConfig({
            encoding: embedded.AudioOutConfig.Encoding.OPUS_IN_OGG,
            sample_rate_hertz: sample_rate,
            volume_percentage: 50
        });

        let config = new embedded.ConverseConfig({
            audio_in_config: audioInConfig,
            audio_out_config: audioOutConfig
        });

        return new embedded.ConverseRequest({
            config: config
        });
    }

    generate_audio_request(data) {
        return new embedded.ConverseRequest({
            audio_in: data
        });
    }
}

module.exports = new VoiceModule();