const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { WebSocketServer } = require('ws');

const root = __dirname;
const port = Number(process.env.PORT) || 3000;
const lobbies = new Map();
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };

function createCode() {
	let code;
	do code = crypto.randomBytes(3).toString('hex').toUpperCase(); while (lobbies.has(code));
	return code;
}

function send(socket, message) {
	if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function broadcast(lobby, message, except) {
	for (const player of lobby.players) if (player !== except) send(player, message);
}

function removeFromLobby(socket) {
	if (!socket.lobbyCode) return;
	const lobby = lobbies.get(socket.lobbyCode);
	if (!lobby) return;
	lobby.players = lobby.players.filter(player => player !== socket);
	broadcast(lobby, { type: 'player-left', players: lobby.players.length });
	if (lobby.players.length === 0) lobbies.delete(socket.lobbyCode);
	socket.lobbyCode = null;
}

function lobbyCapacity(mode) { return mode === 'ONLINE 1V1' ? 2 : 4; }

function handleMessage(socket, raw) {
	let message;
	try { message = JSON.parse(raw); } catch { return send(socket, { type: 'error', message: 'Invalid JSON message.' }); }

	if (message.type === 'host') {
		removeFromLobby(socket);
		const code = createCode();
		const mode = String(message.mode || 'ONLINE 1V1');
		lobbies.set(code, { code, mode, players: [socket] });
		socket.lobbyCode = code;
		socket.slot = 0;
		return send(socket, { type: 'hosted', code, mode, slot: socket.slot, players: 1, capacity: lobbyCapacity(mode) });
	}

	if (message.type === 'join') {
		removeFromLobby(socket);
		const code = String(message.code || '').trim().toUpperCase();
		const lobby = lobbies.get(code);
		if (!lobby) return send(socket, { type: 'error', message: 'Lobby not found.' });
		if (lobby.players.length >= lobbyCapacity(lobby.mode)) return send(socket, { type: 'error', message: 'Lobby is full.' });
		lobby.players.push(socket); socket.lobbyCode = code; socket.slot = lobby.players.length - 1;
		send(socket, { type: 'joined', code, mode: lobby.mode, slot: socket.slot, players: lobby.players.length, capacity: lobbyCapacity(lobby.mode) });
		broadcast(lobby, { type: 'player-joined', players: lobby.players.length }, socket);
		if (lobby.players.length === lobbyCapacity(lobby.mode)) return broadcast(lobby, { type: 'match-ready', mode: lobby.mode, players: lobby.players.length });
		return;
	}

	const lobby = socket.lobbyCode && lobbies.get(socket.lobbyCode);
	if (message.type === 'relay' && lobby) return broadcast(lobby, { type: 'relay', payload: message.payload }, socket);
	if (message.type === 'leave') removeFromLobby(socket);
}

const server = http.createServer((request, response) => {
	const requestPath = decodeURIComponent(request.url.split('?')[0]);
	const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
	const filePath = path.resolve(root, relativePath);
	if (!filePath.startsWith(root + path.sep)) return response.writeHead(403).end('Forbidden');
	fs.readFile(filePath, (error, data) => {
		if (error) return response.writeHead(error.code === 'ENOENT' ? 404 : 500).end('Not found');
		response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' }); response.end(data);
	});
});

const websocketServer = new WebSocketServer({ server });
websocketServer.on('connection', socket => {
	socket.lobbyCode = null;
	socket.on('message', message => handleMessage(socket, message.toString()));
	socket.on('close', () => removeFromLobby(socket));
	socket.on('error', () => removeFromLobby(socket));
});

server.listen(port, '0.0.0.0', () => console.log(`Neon Rift relay listening on http://0.0.0.0:${port}`));