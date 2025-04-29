const Websocket = require('ws');
const wss = new Websocket.Server({ port: 3000});

const clients = new Map();

wss.on('connection', (ws) => {
    let clientId;

    ws.on('message', (msg) => {
        const data = JSON.parse(msg);

        if (data.type === 'register'){
            clientID = data.id;
            clients.set(clientId, ws);
        }

        if (data.type === 'signal' && clients.has(data.to)) {
            clients.get(data.to).send(JSON.stringify({
                from: clientId,
                signal: data.signal
            }));
        }

    });

    ws.on('close', () => {
        if (clientId) clients.delete(clientId);
    });
});