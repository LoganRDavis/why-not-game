'use strict';
const server = require('http').createServer();
const express = require('express');
const WebSocket = require('ws');
let bodyParser = require('body-parser');
global.dir = require('path').dirname(require.main.filename);

const port = 80;
const httpServer = express();

httpServer.use(bodyParser.json());
httpServer.use('/public', express.static('public'));

httpServer.get('/', (req, res) => {
	res.status(200).sendFile(`${global.dir}/public/html/index.html`);
});

server.on('request', httpServer);
const wsServer = new WebSocket.Server({ server: server });

wsServer.on('connection', function connection(ws) {
	ws.on('message', function incoming(message) {
		ws.send(JSON.stringify({
			answer: 42,
		}));
	});
});

server.listen(port, () => {
	console.log(`http/ws server listening on port ${port}`);
});
