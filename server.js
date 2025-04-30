const Websocket = require('ws');
const wss = new Websocket.Server({ port: 3001});

const clients = new Map();

wss.on('connection', (ws) => {
    let clientId;
    console.log('Client connected')

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);
    

        if (data.type === 'register'){
            clientId = data.id;
            clients.set(clientId, ws);
            console.log(`Client registered with ID: ${clientId}`);
        }

        if (data.type === 'signal' && clients.has(data.to)) {
            clients.get(data.to).send(JSON.stringify({
                from: clientId,
                signal: data.signal
            }));
        }

    });

    ws.on('close', () => {
        if (clientId) {
            clients.delete(clientId);
            console.log(`Client ${clientId} disconnected`);
     }
  });
});
