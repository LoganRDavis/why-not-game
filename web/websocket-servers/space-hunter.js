const WebSocket = require('ws');
const uuidv4 = require('uuid').v4;

const wss = new WebSocket.Server({ noServer: true });

class Game {
	constructor() {
		this.players = {};
		this.bullets = {};
		this.mapWidth = 10000;
		this.mapHeight = 10000;
	}

	updateState() {
		for (let playerId in this.players) {
			let player = this.players[playerId];
			if (!player || player.health <= 0 ||
				Date.now() - player.lastShot > 60000) {
				delete this.players[playerId];
				continue;
			}
			if (player.ai) {
				this.rotateAi(player);
				player.fire = true;
			}
			this.moveObject(player);
			this.constrainToBounds(player);
			this.fireBullet(player);
		}

		for (let bulletId in this.bullets) {
			let bullet = this.bullets[bulletId];
			this.moveObject(bullet);
			this.constrainToBounds(bullet);
			if (this.checkCollide(bullet)) {
				delete this.bullets[bulletId];
			}
			if (Date.now() - bullet.born > 5000) {
				delete this.bullets[bulletId];
			}
		}

		if (Object.keys(this.players).length < 10) {
			this.addAi();
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
			score: 0,
			x: 500,
			y: 500,
			width: 132,
			height: 120,
			rotation: 0,
			maxSpeed: 10,
			acc: 1,
			xSpeed: 0,
			ySpeed: 0,
			lastShot: Date.now(),
		};

		this.players[clientId] = newPlayer;
		return newPlayer;
	}

	processPlayerAction(data) {
		if (!(data.clientId in this.players)) { return; }
		let player = this.players[data.clientId];
		player.rotation = data.rotation;
		player.fire = data.fire || false;
	}

	moveObject(object) {
		object.xSpeed += 0.5 * Math.cos(object.rotation);
		object.ySpeed += 0.5 * Math.sin(object.rotation);

		if (object.xSpeed > object.maxSpeed) {
			object.xSpeed = object.maxSpeed;
		} else if (object.xSpeed < -(object.maxSpeed)) {
			object.xSpeed = -(object.maxSpeed);
		}
		if (object.ySpeed > object.maxSpeed) {
			object.ySpeed = object.maxSpeed;
		} else if (object.ySpeed < -(object.maxSpeed)) {
			object.ySpeed = -(object.maxSpeed);
		}

		object.x += object.xSpeed;
		object.y += object.ySpeed;
	}

	constrainToBounds(object) {
		if (object.x < 0) {
			object.x = this.mapWidth;
		}
		if (object.x > this.mapWidth) {
			object.x = 0;
		}
		if (object.y < 0) {
			object.y = this.mapHeight; '';
		}
		if (object.y > this.mapHeight) {
			object.y = 0;
		}
	}

	fireBullet(player) {
		if (!player.fire || Date.now() - player.lastShot < 1000) { return; }
		let bullet = {
			x: player.x,
			y: player.y,
			width: 12,
			height: 12,
			rotation: player.rotation,
			xSpeed: player.xSpeed + 20 * Math.cos(player.rotation),
			ySpeed: player.ySpeed + 20 * Math.sin(player.rotation),
			maxSpeed: 20,
			acc: 100,
			playerId: player.id,
			born: Date.now(),
			id: uuidv4(),
		};
		this.bullets[bullet.id] = bullet;
		player.lastShot = Date.now();
	}

	checkCollide(bullet) {

		for (let playerId in this.players) {
			let hit = true;
			if (playerId === bullet.playerId) {
				hit = false;
			}
			let player = this.players[playerId];

			if (player.health <= 0) {
				hit = false;
			}
			if (player.x + player.width < bullet.x) {
				hit = false;
			}
			if (player.x > bullet.x + bullet.width) {
				hit = false;
			}
			if (player.y + player.height < bullet.y) {
				hit = false;
			}
			if (player.y > bullet.y + bullet.height) {
				hit = false;
			}

			if (hit) {
				player.health -= 1;
				try {
					this.players[bullet.playerId].score++;
				} catch (err) { }
				return true;
			}
		}
	}

	addAi() {
		const id = uuidv4();
		const aiPlayer = this.addPlayer(id);
		aiPlayer.ai = true;
		aiPlayer.x = Math.floor(Math.random() * 10000) + 1;
		aiPlayer.y = Math.floor(Math.random() * 10000) + 1;
	}

	rotateAi(aiPlayer) {
		let closestPlayer = null;
		for (let playerId in this.players) {
			if (playerId === aiPlayer.id) {
				continue;
			}

			let player = this.players[playerId];
			if (closestPlayer === null) {
				closestPlayer = player;
				continue;
			}

			let closestXDiff = Math.abs(aiPlayer.x - closestPlayer.x);
			let closestYDiff = Math.abs(aiPlayer.y - closestPlayer.y);
			let playerXDiff = Math.abs(aiPlayer.x - player.x);
			let playerYDiff = Math.abs(aiPlayer.y - player.y);

			if ((playerXDiff + playerYDiff) < (closestXDiff + closestYDiff)) {
				closestPlayer = player;
			}
		}

		if (closestPlayer) {
			aiPlayer.rotation = Math.atan2(
				closestPlayer.y - aiPlayer.y, closestPlayer.x - aiPlayer.x);
		}
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
	const state = game.getState();
	wss.clients.forEach(function each(client) {
		if (client.readyState === WebSocket.OPEN) {
			client.send(state);
		}
	});
}, 20);

module.exports = wss;
