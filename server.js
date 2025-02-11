const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');

// Create HTTP server to serve HTML files
const server = http.createServer((req, res) => {
  let filePath = './broadcaster.html';
  if (req.url === '/listener') {
    filePath = './listener.html';
  }
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("File not found");
    } else {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    }
  });
});

// Create WebSocket server and attach it to HTTP server
const wss = new WebSocket.Server({ server });

let broadcaster = null;
const listeners = new Set();

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      if (data.type === 'broadcast') {
        broadcaster = ws;
        ws.isBroadcaster = true;
        console.log("Broadcaster connected");
      } else if (data.type === 'listen') {
        listeners.add(ws);
        console.log("Listener connected. Total listeners:", listeners.size);
      } else if (data.type === 'audio') {
        if (ws.isBroadcaster) {
          // Forward audio data to all listeners
          listeners.forEach(listener => {
            if (listener.readyState === WebSocket.OPEN) {
              listener.send(JSON.stringify({ audio: data.audio }));
            }
          });
        }
      } else if (data.type === 'stopBroadcast') {
        if (ws.isBroadcaster) {
          broadcaster = null;
          ws.isBroadcaster = false;
          console.log("Broadcaster stopped broadcasting");
        }
      } else if (data.type === 'stopListening') {
        listeners.delete(ws);
        console.log("Listener stopped listening. Remaining listeners:", listeners.size);
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  });

  ws.on('close', (code, reason) => {
    if (ws.isBroadcaster) {
      broadcaster = null;
      console.log("Broadcaster disconnected");
    } else {
      listeners.delete(ws);
      console.log("Listener disconnected. Remaining listeners:", listeners.size);
    }
    console.log("WebSocket closed with code:", code, "Reason:", reason);
  });
});

server.listen(8080, () => {
  console.log("HTTP and WebSocket server running on http://localhost:8080");
});
