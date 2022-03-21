const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const child_process = require('child_process');
const path = require('path');
const fs = require('fs');
const ngrok = require('ngrok');

const ngrok_token = process.env['token'] || ""; // ngrok token 
const master = process.env['consoletoken'] || "123456789"; // default token for web gui
const auth = {login: process.env['mcuser'] || 'admin', password: process.env['mcpass'] || 'admin'} // default login arg for web gui
const mc_port = process.env['mcport'] || 25565; // deflaut Run port 25655 on ngrok will be another
const motd = process.env['mcmotd'] || "A Node Minecraft Server";  // delault motd of Minecraft server
const PORT = process.env['PORT'] || 8080; // web GUI Port default 8080
const ram = process.env['mcram'] || "1024";  //default ram use 1024MB => 1G

const setting = {
	token: ngrok_token, 
	proto: 'tcp',
	addr: mc_port,
	region: 'eu' // default is europe if need change
};

let isRun = false, child, ngrok_ip = "";

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))
app.use("/", express.static(__dirname + '/static'));


function grand_eula(){
	fs.appendFileSync("game/eula.txt", '#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://account.mojang.com/documents/minecraft_eula).\r\n')
	fs.appendFileSync("game/eula.txt", '#Wed Mar 09 09:22:57 EET 2022\r\n')
	fs.appendFileSync("game/eula.txt", 'eula=true\r\n')
}

function build_property(){
	fs.appendFileSync("game/server.properties", '#Minecraft server properties\r\n')
	fs.appendFileSync("game/server.properties", '#Wed Mar 09 09:22:57 EET 2022\r\n')
	fs.appendFileSync("game/server.properties", 'generator-settings=\r\n');
	fs.appendFileSync("game/server.properties", 'op-permission-level=4\r\n');
	fs.appendFileSync("game/server.properties", 'allow-nether=true\r\n');
	fs.appendFileSync("game/server.properties", 'level-name=world\r\n');
	fs.appendFileSync("game/server.properties", 'enable-query=false\r\n');
	fs.appendFileSync("game/server.properties", 'allow-flight=false\r\n');
	fs.appendFileSync("game/server.properties", 'prevent-proxy-connections=false\r\n');
	fs.appendFileSync("game/server.properties", `server-port=${mc_port}\r\n`);
	fs.appendFileSync("game/server.properties", 'max-world-size=29999984\r\n');
	fs.appendFileSync("game/server.properties", 'level-type=DEFAULT\r\n');
	fs.appendFileSync("game/server.properties", 'enable-rcon=false\r\n');
	fs.appendFileSync("game/server.properties", 'level-seed=\r\n');
	fs.appendFileSync("game/server.properties", 'force-gamemode=false\r\n');
	fs.appendFileSync("game/server.properties", 'server-ip=\r\n');
	fs.appendFileSync("game/server.properties", 'network-compression-threshold=256\r\n');
	fs.appendFileSync("game/server.properties", 'max-build-height=256\r\n');
	fs.appendFileSync("game/server.properties", 'spawn-npcs=true\r\n');
	fs.appendFileSync("game/server.properties", 'debug=false\r\n');
	fs.appendFileSync("game/server.properties", 'white-list=false\r\n');
	fs.appendFileSync("game/server.properties", 'spawn-animals=true\r\n');
	fs.appendFileSync("game/server.properties", 'hardcore=false\r\n');
	fs.appendFileSync("game/server.properties", 'snooper-enabled=true\r\n');
	fs.appendFileSync("game/server.properties", 'resource-pack-sha1=\r\n');
	fs.appendFileSync("game/server.properties", 'online-mode=false\r\n');
	fs.appendFileSync("game/server.properties", 'resource-pack=\r\n');
	fs.appendFileSync("game/server.properties", 'pvp=true\r\n');
	fs.appendFileSync("game/server.properties", 'difficulty=1\r\n');
	fs.appendFileSync("game/server.properties", 'enable-command-block=false\r\n');
	fs.appendFileSync("game/server.properties", 'gamemode=0\r\n');
	fs.appendFileSync("game/server.properties", 'player-idle-timeout=0\r\n');
	fs.appendFileSync("game/server.properties", 'max-players=20\r\n');
	fs.appendFileSync("game/server.properties", 'spawn-monsters=true\r\n');
	fs.appendFileSync("game/server.properties", 'generate-structures=true\r\n');
	fs.appendFileSync("game/server.properties", 'view-distance=10\r\n');
	fs.appendFileSync("game/server.properties", `motd=${motd}\r\n`);
}


io.on('connection', (socket) => {
  socket.on('login', (token)=>{
  	if(token == master){
  		addConsole(socket);
  		if(isRun){
  			getListener(socket)
  		}
  	}else{
  		socket.emit("log", "Token mis match!..\r\n");
  	}
  })
});

async function startNgrok(){
	ngrok_ip = await ngrok.connect(setting);
	ngrok_ip = ngrok_ip.split('://')[1];
}

async function stopNgrok(){
	await ngrok.kill();
	ngrok_ip = "";
}

function addConsole(socket){
	socket.on('console', (msg) => {
		switch(msg){
			case "download":
			    if(!fs.existsSync(__dirname + "/game/server.jar")){
				    child = child_process.spawn("wget", ["-O", __dirname + "/game/server.jar", "https://cdn.getbukkit.org/spigot/spigot-1.12.2.jar"], {shell: true, cwd: __dirname + "/game"});
					getDListener(socket);
				}else{
					socket.emit("log", "Server is Exists!..\r\n");
				}
				break;
			case "start":
			    if(!isRun){
					child = child_process.spawn("java", [`-Xms${ram}M`, "-jar", "server.jar", "nogui"], {shell: true, cwd: __dirname + "/game"});
					getListener(socket)
					startNgrok()
					socket.emit("log", "Starting!..\r\n");
				}else{
					socket.emit("log", "Server Is Already Running!..\r\n");
				}
				break;
			case "kill":
			    if(isRun){
			    	child.stdin.write('stop\n');
				    child.kill();
				    socket.emit("log", "Killing!..\r\n");
				}else{
					socket.emit("log", "Already Killed!..\r\n");
				}
				break;
			case "setup":
			    grand_eula();
			    build_property();
			    socket.emit("log", "OK Builded!..\r\n");
			    break;
			case "status":
			    socket.emit("status", {run: isRun, clear: !isRun, ip: ngrok_ip});
			    break;
			default:
			    if(isRun){
				    child.stdin.write(msg + '\n');
				    socket.emit("log", "OK!.");
				}else{
					socket.emit("log", "Server Not Running!..\r\n");
				}
			    break;
		}
	});

}

function getListener(socket){
	child.stdout.setEncoding('utf8');
	child.stdout.on('data', function(data) {
	    data=data.toString();
	    isRun = true;
	    if(data.includes('\r\n')){
	    	socket.emit("log", data);
	    }else{
	    	socket.emit("log", data + '\r\n');
	    }
	});

	child.stderr.setEncoding('utf8');
	child.stderr.on('data', function(data) {
		isRun = true;
		data=data.toString();
	    if(data.includes('\r\n')){
	    	socket.emit("log", data);
	    }else{
	    	socket.emit("log", data + '\r\n');
	    }
	});
	child.on('error', (error) => {
		isRun = false;
		stopNgrok();
	    socket.emit("log", error.message + '\r\n');
	});
	child.on('close', function(code) {
		isRun = false;
		stopNgrok();
		socket.emit("log", "Stopped!..\r\n");
	});
}

function getDListener(socket){
	child.stdout.setEncoding('utf8');
	child.stdout.on('data', function(data) {
	    data=data.toString();
	    if(data.includes('\r\n')){
	    	socket.emit("log", data);
	    }else{
	    	socket.emit("log", data + '\r\n');
	    }
	});

	child.stderr.setEncoding('utf8');
	child.stderr.on('data', function(data) {
		data=data.toString();
	    if(data.includes('\r\n')){
	    	socket.emit("log", data);
	    }else{
	    	socket.emit("log", data + '\r\n');
	    }
	});
	child.on('error', (error) => {
	    socket.emit("log", error.message + '\r\n');
	});
	child.on('close', function(code) {
		socket.emit("log", "Stopped!..\r\n");
	});
}

app.get("/token", (req, res)=>{
	if (!req.headers.authorization) {
		res.redirect("/");
	}else{
		res.send(`var token = "${master}";`);
	}
})
app.get("/panel", (req, res)=>{
	if (!req.headers.authorization) {
		res.redirect("/");
	}else{
		res.sendFile(__dirname + "/public/panel.html");
	}
})

app.use((req, res, next) => {
  const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
  const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':')
  if (login && password && login === auth.login && password === auth.password) {
    return next()
  }
  res.set('WWW-Authenticate', 'Basic realm="401"')
  res.status(401).send('Authentication required.') 
})

app.get("/", (req, res)=>{
	if (!req.headers.authorization) {
	    res.status(401).send('Authentication required.')
	  }else{
	  	res.redirect("/panel");
	  }
});

const server = http.listen(PORT, () => {
	 if(!fs.existsSync(__dirname + "/game")){
		fs.mkdir(path.join(__dirname, 'game'), (err) => {
		    if (err) {
			return console.error(err);
		    }
		    console.log('Directory created successfully!');
		});
	 }
	console.log(`Listening on port ${PORT}`);
});
