const WebSocket = require('ws');

const wss = new WebSocket.Server({ noServer: true });

class Game {
	constructor() {
		this.players = {};
		this.bullets = {};
	}

	updateState() {
		for (let playerId in this.players) {
			let player = this.players[playerId];
			if (!player) { continue; }
			this.movePlayer(player);
		}
	}

	getState() {
		return JSON.stringify({
			players: this.players,
			bullets: this.bullets,
		});
	}

	addPlayer(clientId) {
		if (clientId in this.players) {
			return;
		}

		let newPlayer = {
			id: clientId,
			health: 3,
			x: 500,
			y: 500,
			xSpeed: 0,
			ySpeed: 0,
			rotation: 0,
		};

		this.players[clientId] = newPlayer;
		console.log(newPlayer);
	}

	processPlayerAction(data) {
		if (!(data.clientId in this.players)) { return; }
		let player = this.players[data.clientId];
		player.rotation = data.rotation;
		player.fire = data.fire || false;
	}

	movePlayer(player) {
		let xSpeed = 0.5;
		let ySpeed = 0.5;

		player.xSpeed += xSpeed * Math.cos(player.rotation);
		player.ySpeed += ySpeed * Math.sin(player.rotation);

		if (player.xSpeed > 10) {
			player.xSpeed = 10;
		} else if (player.xSpeed < -10) {
			player.xSpeed = -10;
		}
		if (player.ySpeed > 10) {
			player.ySpeed = 10;
		} else if (player.ySpeed < -10) {
			player.ySpeed = -10;
		}

		player.x += player.xSpeed;
		player.y += player.ySpeed;
	}
}

const game = new Game();

wss.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
		const data = JSON.parse(message);
		if (!(data.clientId in game.players)) {
			game.addPlayer(data.clientId);
			return;
		}
		game.processPlayerAction(data);
	});
});

setInterval(function() {
	game.updateState();
	wss.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(game.getState());
		}
	});
}, 20);

module.exports = wss;
