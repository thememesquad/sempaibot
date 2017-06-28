const grpc = require("grpc"),
    config = require("../../config.js"),
    EmbeddedAssistantClient = require("./google/assistant/embedded/v1alpha1/embedded_assistant_grpc_pb").EmbeddedAssistantClient,
    embedded = require("./google/assistant/embedded/v1alpha1/embedded_assistant_pb"),
    google = require("googleapis"),
    OAuth2 = google.auth.OAuth2,
    ModuleBase = require("../modulebase.js"),
    Document = require("camo").Document,
    responses = require("../responses.js"),
    Bromise = require("bluebird"),
    ffmpeg = require("fluent-ffmpeg"),
    stream = require("stream"),
    fs = require("fs");

class AssistantToken extends Document {
    constructor() {
        super();

        this.user_id = String;
        this.access_token = String;
        this.refresh_token = String;
        this.token_type = String;
        this.expiry_date = Number;
    }
}

class VoiceRecorder {
    constructor(conversation, mod) {
        this.conversation = conversation;
        this.module = mod;
        this.interval = setInterval(this.send_data.bind(this), 100);
        this.last = Date.now();
        this.buffer = new Buffer(0);
        this.actual = new Buffer(0);
        this.chunkSize = 2048;
    }

    send_data() {
        let delta_samples = Math.floor(((Date.now() - this.last) / 1000.0) * (this.sample_rate * 2));
        this.last = Date.now();

        if(delta_samples > 0) {
            let empty = Buffer.alloc(delta_samples);
            this.buffer = Buffer.concat([this.buffer, empty]);
        }

        while(this.buffer.length > this.chunkSize) {
            let data = this.buffer.slice(0, this.chunkSize > this.buffer.length ? this.buffer.length : this.chunkSize);
            this.buffer = this.buffer.slice(data.length);

            this.conversation.write(this.module.generate_audio_request(data));
            this.actual = Buffer.concat([this.actual, data]);
        }
    }

    push_samples(data) {
        let delta_samples = Math.floor(((Date.now() - this.last) / 1000.0) * (this.sample_rate * 2)) - data.length;
        this.last = Date.now();

        if(delta_samples > 0) {
            let empty = Buffer.alloc(delta_samples);
            this.buffer = Buffer.concat([this.buffer, empty, data]);
        } else {
            this.buffer = Buffer.concat([this.buffer, data]);
        }
    }

    stop() {
        clearInterval(this.interval);
    }

    get sample_rate() {
        return 16000;
    }
}

class VoiceModule extends ModuleBase{
    constructor() {
        super();

        this.name = "voiceapi";
        this.description = "Google Assistant Integration";
        this.hidden = true;
        this.always_on = true;
        this.disabled = typeof config.voice === "undefined";

        this.tokens = {};
        this.oauth = {};
        this.services = {};
        this.connections = {};
        this.receivers = {};
        this.audio_data = {};
        this.audio_stream = {};
        this.conversation = {};
        this.recorders = {};
        this.detectors = {};

        this.add_command({
            formats: [
                "register"
            ],
            sample: "",
            description: "",
            global: true,

            execute: this.handle_register
        });

        this.add_command({
            formats: [
                "register {code}"
            ],
            sample: "",
            description: "",
            global: true,

            execute: this.handle_register_code
        });

        this.add_command({
            formats: [
                "start listening"
            ],
            sample: "",
            description: "",

            execute: this.handle_start_listening
        });

        this.add_command({
            formats: [
                "stop listening"
            ],
            sample: "",
            description: "",

            execute: this.handle_stop_listening
        });

        this.voice_setup = false;
    }

    handle_register(message) {
        this.setup_voice();

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
            "urn:ietf:wg:oauth:2.0:oob"
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

    handle_register_code(message, args) {
        this.setup_voice();

        if(this.oauth[message.author.id] === undefined) {
            return this.bot.respond(message, responses.get("VOICE_REGISTRATION_NOT_STARTED").format({
                author: message.author.id
            }));
        }
        
        this.oauth[message.author.id].getToken(args.code, async (err, tokens) => {
            if(err) {
                return this.bot.respond(message, responses.get("VOICE_REGISTRATION_ERROR").format({
                    author: message.author.id,
                    error: "" + err
                }));
            }

            tokens["user_id"] = message.author.id;
            let token = AssistantToken.create(tokens);
            await token.save();

            this.tokens[message.author.id] = token;
            this.oauth[message.author.id].setCredentials(tokens);

            return this.bot.respond(message, responses.get("VOICE_REGISTRATION_COMPLETE").format({
                author: message.author.id
            }));
        });
    }

    async handle_start_listening(message) {
        this.setup_voice();

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
                    this.audio_stream[user.id] = this.receivers[message.server.id].createPCMStream(user);
                    this.detectors[user.id] = new this.Detector({
                        resource: "resources/common.res",
                        models: this.models,
                        audioGain: 1.0
                    });

                    this.detectors[user.id].on("hotword", () => {
                        if(this.conversation[user.id] === undefined) {
                            this.conversation[user.id] = this.services[user.id].converse();
                            this.conversation[user.id].write(this.generate_setup_request(16000));

                            let buffers = [];
                            this.conversation[user.id].on("data", (response) => {
                                if(response.hasEventType()) {
                                    console.log("eventtype", response.getEventType());

                                    if(response.getEventType() === 1) {
                                        console.log("Conversation ended.");

                                        this.recorders[user.id].stop();
                                        delete this.recorders[user.id];

                                        this.conversation[user.id].end();
                                        return;
                                    }
                                }
                                
                                if(response.hasAudioOut()) {
                                    buffers.push(Buffer.from(response.getAudioOut().getAudioData()));
                                }

                                if(response.hasResult()) {
                                    /*let result = response.getResult();
                                    let spoken_request = result.getSpokenRequestText();
                                    let spoken_response = result.getSpokenResponseText();
                                    //let state = result.getConversationState();
                                    let mode = result.getMicrophoneMode();
                                    let volume = result.getVolumePercentage();

                                    console.log("result", {
                                        spoken_request: spoken_request,
                                        spoken_response: spoken_response,
                                        //state: state,
                                        mode: mode,
                                        volume: volume
                                    });*/
                                }

                                if(response.hasError()) {
                                    console.log("error", response.getError());
                                }
                            });

                            this.conversation[user.id].on("end", () => {
                                delete this.conversation[user.id];

                                if(buffers.length === 0) {
                                    this.connections[message.server.id].playFile("resources/dong.wav");
                                } else {
                                    let rnd = Math.random() * 10000000000000000;
                                    fs.writeFile(`output/audio_response_${rnd}.ogg`, Buffer.concat(buffers), () => {
                                        this.connections[message.server.id].playFile(`output/audio_response_${rnd}.ogg`).on("end", () => {
                                            fs.unlink(`output/audio_response_${rnd}.ogg`);
                                        });
                                    });
                                }
                            });

                            /*this.conversation[user.id].on("status", (status) => {
                                console.log("status", status);
                            });

                            this.conversation[user.id].on("error", (err) => {
                                console.log("error", err);
                            });*/

                            this.recorders[user.id] = new VoiceRecorder(this.conversation[user.id], this);
                            this.connections[message.server.id].playFile("resources/ding.wav");
                        }
                    });

                    let customStream = new stream.Writable();
                    customStream._write = function(userid, chunk) {
                        if(this.recorders[userid] !== undefined)
                            this.recorders[userid].push_samples(chunk);
                        
                        let tmp = Array.from(arguments).splice(1);
                        this.detectors[user.id]._write.apply(this.detectors[user.id], tmp);
                    }.bind(this, user.id);

                    ffmpeg(this.audio_stream[user.id])
                        .inputFormat("s32le")
                        .audioFrequency(16000)
                        .audioChannels(1)
                        .audioCodec("pcm_s16le")
                        .format("s16le")
                        .on("error", (err) => console.log(err))
                        .pipe(customStream);
                } else if(!speaking && this.audio_stream[user.id] !== undefined) {
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

    async handle_stop_listening(message) {
        this.setup_voice();
        this.connections[message.server.id].leave();
    }
    
    async on_setup() {
        this.setup_voice();
        let tokens = await AssistantToken.find({});
        for(let i = 0;i<tokens.length;i++) {
            this.tokens[tokens[i].user_id] = tokens[i];
        }
    }

    async on_shutdown() {

    }

    async on_load() {

    }

    async on_unload() {

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
            this.oauth[user.id].refreshAccessToken = Bromise.promisify(this.oauth[user.id].refreshAccessToken, {context: this.oauth[user.id]});
            this.oauth[user.id].setCredentials(this.tokens[user.id]);

            if(this.tokens[user.id].expiry_date < Date.now()) {
                let tokens = await this.oauth[user.id].refreshAccessToken();
                this.tokens[user.id].access_token = tokens.access_token;
                this.tokens[user.id].refresh_token = tokens.refresh_token;
                this.tokens[user.id].token_type = tokens.token_type;
                this.tokens[user.id].expiry_date = tokens.expiry_date;
                await this.tokens[user.id].save();
            }
        }

        let ssl_credentials = grpc.credentials.createSsl();
        let call_credentials = grpc.credentials.createFromGoogleCredential(this.oauth[user.id]);
        let combined_credentials = grpc.credentials.combineChannelCredentials(ssl_credentials, call_credentials);

        return new EmbeddedAssistantClient("embeddedassistant.googleapis.com", combined_credentials);
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
        const audioInConfig = new embedded.AudioInConfig();
        audioInConfig.setEncoding(embedded.AudioInConfig.Encoding.LINEAR16);
        audioInConfig.setSampleRateHertz(sample_rate);

        const audioOutConfig = new embedded.AudioOutConfig();
        audioOutConfig.setSampleRateHertz(sample_rate);
        audioOutConfig.setEncoding(embedded.AudioOutConfig.Encoding.OPUS_IN_OGG);
        audioOutConfig.setVolumePercentage(80);

        const converseConfig = new embedded.ConverseConfig();
        converseConfig.setAudioInConfig(audioInConfig);
        converseConfig.setAudioOutConfig(audioOutConfig);

        /*if (this.currentConversationState) {
            const converseState = new embedded.ConverseState();
            converseState.setConversationState(this.currentConversationState);
            converseConfig.setConverseState(converseState);
        }*/

        const converseRequest = new embedded.ConverseRequest();
        converseRequest.setConfig(converseConfig);

        return converseRequest;
    }

    generate_audio_request(data) {
        const converseRequest = new embedded.ConverseRequest();
        converseRequest.setAudioIn(data);

        return converseRequest;
    }

    setup_voice() {
        if(this.voice_setup)
            return;

        this.snowboy = require("snowboy");
        this.Detector = this.snowboy.Detector;
        this.Models = this.snowboy.Models;

        this.models = new this.Models();
        this.models.add({
            file: "resources/sempai.pmdl",
            sensitivity: "0.5",
            hotwords : "sempai"
        });

        this.voice_setup = true;
    }
}

module.exports = new VoiceModule();