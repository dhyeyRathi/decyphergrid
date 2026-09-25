const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'register', roomCode: 'CUSTOM', playerId: 'tester' }));
  ws.send(JSON.stringify({ type: 'action', action: 'create_room', roomCode: 'CUSTOM', playerName: 'Tester', playerId: 'tester' }));
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
  setTimeout(() => process.exit(0), 1000);
});

ws.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});
