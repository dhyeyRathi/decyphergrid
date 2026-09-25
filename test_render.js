const WebSocket = require('ws');

const roomCode = 'TEST99';

const ws1 = new WebSocket('wss://decyphergrid.onrender.com');
const ws2 = new WebSocket('wss://decyphergrid.onrender.com');

ws1.on('open', () => {
  ws1.send(JSON.stringify({ type: 'register', roomCode, playerId: 'player1' }));
  ws1.send(JSON.stringify({ type: 'action', action: 'create_room', roomCode, playerName: 'P1', playerId: 'player1' }));
});

ws1.on('message', (data) => {
  console.log('[WS1]', data.toString());
});

setTimeout(() => {
  ws2.on('open', () => {
    ws2.send(JSON.stringify({ type: 'register', roomCode, playerId: 'player2' }));
    ws2.send(JSON.stringify({ type: 'action', action: 'join_room', roomCode, playerName: 'P2', playerId: 'player2' }));
  });
  
  ws2.on('message', (data) => {
    console.log('[WS2]', data.toString());
  });
}, 2000);

setTimeout(() => {
  process.exit(0);
}, 5000);
