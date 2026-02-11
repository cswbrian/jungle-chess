const { PeerServer } = require('peer');

const port = process.env.PORT || 9000;

const server = PeerServer({
  port,
  path: '/',
  allow_discovery: false,
});

console.log(`PeerJS signaling server running on port ${port}`);
