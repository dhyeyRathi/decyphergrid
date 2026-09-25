const WebSocket = require('ws');

const ws = new WebSocket('wss://decyphergrid.onrender.com');

ws.on('open', () => {
  console.log('Connected to WS');
  ws.send(JSON.stringify({
    type: 'register',
    roomCode: 'TESTING',
    playerId: 'tester'
  }));

  ws.send(JSON.stringify({
    type: 'action',
    action: 'create_room',
    roomCode: 'TESTING',
    playerName: 'Tester',
    playerId: 'tester'
  }));
});

ws.on('message', (data) => {
  console.log('Received:', data.toString());
  setTimeout(() => process.exit(0), 1000);
});

ws.on('error', (err) => {
  console.error('Error:', err);
  process.exit(1);
});
