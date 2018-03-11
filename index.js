const Discord = require("discord.js");
const client = new Discord.Client();
const ytdl = require("ytdl-core");
const request = require("request");
const fs = require("fs");
const getYouTubeID = require("get-youtube-id");
const fetchVideoInfo = require("youtube-info");

var config = JSON.parse(fs.readFileSync('./settings.json', 'utf-8'));

var listaArchivo = JSON.parse(fs.readFileSync('./lista.json', 'utf-8'));

const yt_api_key = config.yt_api_key;
const bot_controller = config.bot_controller;
const prefix = config.prefix;
const discord_token = config.discord_token;

var queue = [];
var loop = true;
var prueba = false;
var bucle = true;
var puedes = false;
var connection2 = null;
var queueNames = [];
var parar = false;
var isPlaying = false;
var dispatcher = null;
var voiceChannel = null;
var skipReq = 0;
var skippers = [];
var currentSong = 0;
var currentSongName = null;

queue = listaArchivo.lista;
queueNames = listaArchivo.listaNombres;

client.login(discord_token);

client.on('message', function(message) {
    const member = message.member;
    const mess = message.content.toLowerCase();
    const args = message.content.split(' ').slice(1).join(" ");

    if (mess.startsWith(prefix + "musica")) {
        if (typeof queue[0] === "undefined") {
            message.reply(" No hay ninguna cancion en la lista.");
        } else {
            if (!isPlaying) {
                playMusic(queue[0], message, true);
                isPlaying = true;
            } else if (isPLaying) {
                message.channel.send(message.author + " <:canonf:406875779910205481>");
	    }
        }
    } else if (mess.startsWith(prefix + "pedir")) {
        if(message.member.roles.get("375843274482515977") || message.member.roles.get("407925157701877771")) {
            getID(args, function(id) {
                add_to_queue(id);
                fetchVideoInfo(id, function (err, videoInfo) {
                    if (err) throw new Error(err);
                    message.channel.send(message.author + " _ha pedido que toquen la canción_ <:acordeon:406917255998472193> **" + videoInfo.title + "**");
                    queueNames.push(videoInfo.title);
                    if (!isPlaying) {
                        playMusic(queue[0], message, true);
                    }
                });
            });
        } else {
            message.send(message.author + " <:tabernera:406895006004281345> ¡No puedes dar órdenes a los músicos si no pagas la cuenta!\n\n```diff\n- No tienes permisos para usar éste comando.\n```");            
        }
    } else if(mess.startsWith(prefix + "saltar")) {
        if (skippers.indexOf(message.author.id) === -1 && message.member.voiceChannel == voiceChannel) {
            skippers.push(message.author.id);
            skipReq++;
            if (skipReq >= Math.ceil((voiceChannel.members.size - 1) / 2)) {
		message.channel.send(message.author + " _ha votado para saltar esta canción_ \n```cs\n[Votos: " + skipReq + "/" + Math.ceil((voiceChannel.members.size - 1) / 2) + "]\n```");
                message.channel.send("<:tic:408639986934480908> **Saltar ésta canción ha sido aprobado. Saltando...**");
                skip_song(message);
            } else if(message.member.roles.get("375843274482515977") || message.member.roles.get("407925157701877771")) {
                skip_song(message);
                message.channel.send(message.author + " _ha votado para saltar esta canción_ \n```cs\n[Votos: " + skipReq + "/" + Math.ceil((voiceChannel.members.size - 1) / 2) + "]\n```");
		message.channel.send("<:tic:408639986934480908> **Saltar ésta canción ha sido aprobado. Saltando...**");
            } else {
                message.channel.send(message.author + " _ha votado para saltar esta canción_ \n```cs\n[Votos: " + skipReq + "/" + Math.ceil((voiceChannel.members.size - 1) / 2) + "]\n```");
            }
        } else {
            message.reply(" ya has votado!");
        }
    } else if(mess.startsWith(prefix + "lista")) {
        var message3 = "_" + message.author + " se acerca a la barra y le pregunta a la Tabernera qué canciones han pedido en el bar.\n\n<:tabernera:406895006004281345> La <@!406163280290250752> le reponde:_\n\n";
        var message2 = "```md\n# LISTA DE CANCIONES\n\n";
        for (var i = 0; i < queueNames.length; i++) {
            var temp = (i + 1) + ". " + queueNames[i] + "\n";
            if((message3 + message2 + temp).length <= 2000 - 3) {
                message2 += temp;
            } else {
                message2 += "```";
                message.channel.send(message3 + message2);
                message2 = "```";
            }
        }
        message2 += "```";
        message.channel.send(message3 + message2);
    } else if(mess.startsWith(prefix + "bucle")) {
        if (bucle == false) {
            bucle = true;
            message.channel.send(message.author + " deja caer una pesada bolsa de monedas y pide que la música no pare de sonar.\n\n```diff\n+ [Modo bucle: ACTIVADO]\n```");
        } else {
            bucle = false;
            message.channel.send(message.author + " le pide a los músicos que acaben el repertorio y se tomen un descanso.\n\n```diff\n- [Modo bucle: DESACTIVADO]\n```");
        }
    } else if (mess.startsWith(prefix + "parar")) {
        if (connection2 !== null) {
            parar = true;
            connection2.disconnect();
	    currentSong = 0;
            connection2 = null;
            isPlaying = false;
            parar = false;
            
            message.channel.send(message.author + " _le pide a los músicos que paren de tocar y se tomen un descanso. Les deja una propina._ <:moneda:406914038854057984>");
        } else if (message.member.roles.get("375843274482515977") || message.member.roles.get("407925157701877771")) {
            //message.reply(" Necesito estar tocando para pararme");
        } else {
            //message.reply(" No tienes lo permisos suficientes");
        }
    } else if(mess.startsWith(prefix + "actual")) {
        var message2 = "_" + message.author + " se acerca a la barra y le pregunta a la Tabernera cual es el nombre de la canción que está sonando.\n\n<:tabernera:406895006004281345> La <@!406163280290250752> le reponde:_\n\n";
        var message3 = "```md\n" + (currentSong) + ". " + (currentSong == 0 ? "Los músicos estan descansando" : queueNames[currentSong - 1]) + "\n```";

        message.channel.send(message2 + message3);
    } else if (mess.startsWith(prefix + "quitar")) {
        var indice = queue.indexOf(args);
        queue.splice(indice, 1);
        for (let i = 0; i < queueNames.length; i++) {
            if (parseInt(args) == (i + 1)) {
                for (let j = i; j < queueNames.length; j++) {
                    if (j < queueNames.length - 1) {
                        queueNames[j] = queueNames[j + 1];
                    } else {
                        var indice2 = queueNames.indexOf(j); 
                        queueNames.splice(indice2, 1);
                    }
                }
            }
        }
        message.channel.send(message.author + " _pide que quiten esa molesta canción de la lista con cara de pocos amigos y enseñando su garfio._ <:garfio:407239812873977857>");
    }
});

client.on('ready', function() {
    console.log("Listo!!");
});

function skip_song(message) {
    dispatcher.end();
}

function playMusic(id, message, yes) {
    if (yes) {
    	voiceChannel = message.member.voiceChannel;
    }

    voiceChannel.join().then(function (connection) {
        stream = ytdl("https://www.youtube.com/watch?v=" + id, {
            filter: 'audioonly'
        });
        skipReq = 0;
        skippers = [];
		console.log(id);

        connection2 = connection;

        dispatcher = connection.playStream(stream);
        if (!((currentSong + 1) == queue.length)) {
            currentSong += 1;
            prueba = false;
        } else {
            prueba = true;
            currentSong = 0;
        }
        dispatcher.on('end', function() {
            skipReq = 0;
            skippers = [];
    
            if (parar == true) {
                parar = false;
            }else if (bucle == true) {
                setTimeout(function() {
                    playMusic(queue[currentSong], message, false);
					console.log(id + '1');
                }, 1000);
            } else if (bucle == false && prueba) {
                dispatcher.disconnect();
				console.log(id);
                currentSong = 0;
                isPlaying = false;
            } else {
                setTimeout(function() {
					console.log(id + '2');
                    playMusic(queue[currentSong], message, false);
                }, 1000);
            }
        });
    });
}

function getID(str, cb) {
    if (isYoutube(str)) {
        cb(getYouTubeID(str));
    } else {
        search_video(str, function(id) {
            cb(id);
        });
    }
}

function add_to_queue(strID) {
    if (isYoutube(strID)) {
        queue.push(getYoutubeID(strID));
    } else {
        queue.push(strID);
    }
}

function search_video(query, cb) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + yt_api_key, function(error, response, body) {
        var json = JSON.parse(body);
        cb(json.items[0].id.videoId);
    });
}

function isYoutube(str) {
    return str.toLowerCase().indexOf("youtube.com") > -1;
}
