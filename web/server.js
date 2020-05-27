const server = require('http').createServer();
const express = require('express');
const process = require('process');
const url = require('url');
let bodyParser = require('body-parser');
global.dir = require('path').dirname(require.main.filename);
const spaceHunterWSS = require('./websocket-servers/space-hunter');

const port = process.env.PORT || 80;
const httpServer = express();

httpServer.use(bodyParser.json());
httpServer.use('/public', express.static('public'));

httpServer.get('/space-hunter', (req, res) => {
	res.status(200).sendFile(`${global.dir}/public/games/space-hunter/index.html`);
});

httpServer.get('*', (req, res) => {
	res.redirect(301, 'https://whynotgame.com/');
});

server.on('request', httpServer);
server.on('upgrade', function upgrade(request, socket, head) {
	const pathname = url.parse(request.url).pathname;
	if (pathname === '/games/space-hunter') {
		spaceHunterWSS.handleUpgrade(request, socket, head, function done(ws) {
			spaceHunterWSS.emit('connection', ws, request);
		});
	} else {
		socket.destroy();
	}
});

server.listen(port, () => {
	console.log(`http/ws server listening on port ${port}`);
});
