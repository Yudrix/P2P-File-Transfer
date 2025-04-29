const ws = new WebSocket('ws://localhost:3000');
const localId = Math.random().toString(36).substr(2,6);
let peerConnection;
let dataChannel;
let remoteId;

ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'register', id: localId }));
        console.log("Registered with ID:", localId);

    
};

ws.onmessage = async (msg) => {
    const data = JSON.parse(msg.data);
    if (data.fromsignal.type === 'offer') {
        remoteId = data.from;
        peerConnection = createPeerConnection();
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        sendSignal(remoteId, answer);
    }
    else if (data.fromsignal.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
    }
    else if (data.signal.candidate) {
        peerConnection.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
    }
};

function sendSignal(to, signal) {
    ws.send(JSON.stringify({
        type: 'signal',
        to: to,
        signal: signal
    }));
}

function createPeerConnection() {
    const pc = new RTCPeerConnection();
    pc.onicecandidate = (event) => {
        if (event.candidate) sendSignal(remoteId, { candidate: event.candidate });
    };
    pc.ondatachannel = (event) => {
        dataChannel = event.channel;
        setupReceiver();
    };
    return pc;
}

function connect() {
    remoteId = document.getElementById("peerId").value;
    peerConnection = createPeerConnection();
    dataChannel = peerConnection.createDataChannel("file")
    setupReceiver();

    peerConnection.createOffer().then(offer => {
        peerConnection.setLocalDescription(offer);
        sendSignal(remoteId, offer);
    });
}

function setupReceiver() {
    dataChannel.onopen = () => Console.log("Connection with Broski established");
    dataChannel.onmessage = (event) => {
        const blob = new Blob([event.data]);
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "received_file";
        a.click();
    };
}

function sendFile() {
    const file = document.getElementById("fileInput").files[0];
    const reader = new FileReader();
    reader.onload = () => {
        dataChannel.send(reader.result);
    };
    reader.readAsArrayBuffer(file);
}