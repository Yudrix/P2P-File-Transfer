const ws = new WebSocket('ws://localhost:3001');  //Will probably change this to a public server
const localId = Math.random().toString(36).substr(2,6); //I know, very very unique id
let peerConnection;
let dataChannel;
let remoteId;
let fileName = '';

function updateStatus(message, isError = false) {
    const statusElement = document.getElementById('status');
    statusElement.textContent = message;
    statusElement.className = isError ? 'error' : '';
}

ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'register', id: localId }));
        console.log("Registered with ID:", localId);
        document.getElementById('localIdDisplay').textContent = localId;
        updateStatus('Connected to signaling server. Share your ID with a friend.');

    
};

ws.onerror = (error) => {
    console.error('Websocket error:', error);
    updateStatus('Connection to server failed. Please check if it is running.', true);

};

ws.onmessage = async (msg) => {
    try{
    const data = JSON.parse(msg.data);
    if (data.signal && data.signal.type === 'offer') {
        remoteId = data.from;
        updateStatus(`Incoming connection from ${remoteId}...`);
        peerConnection = createPeerConnection();
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        sendSignal(remoteId, answer);
    }
    else if (data.signal && data.signal.type === 'answer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
        updateStatus(`Connected to ${remoteId}`);
    }
    else if (data.signal && data.signal.candidate) {
        try{
         await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
    } catch (e) {
        console.error('Error adding ICE candidate:', e);
    }
}
    } catch (error) {
        console.error('Error processing message:', error);
        updateStatus('Error in establishing connection. Please try again.', true);
        
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
    try{
    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
           
        ]
    });
    pc.onicecandidate = (event) => {
        if (event.candidate) sendSignal(remoteId, { candidate: event.candidate });
    };

    pc.ondatachannel = (event) => {
        dataChannel = event.channel;
        setupDataChannel();
    };
    pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            updateStatus('Connection lost or failed. try again.', true);
    }
};
    return pc;
} catch (error) {
        console.error('Error creating peer connection:', error);
        updateStatus('Failed to create connection. try again.', true);
}
}

function connect() {
    try {
    remoteId = document.getElementById("peerId").value;
    if (!remoteId) {
        updateStatus('Please enter a valid ID to connect to.', true);
        return;
    }
    updateStatus(`Connecting to ${remoteId}...`);
    peerConnection = createPeerConnection();
    dataChannel = peerConnection.createDataChannel("fileTransfer");
    setupReceiver();

    peerConnection.createOffer()
        .then(offer => peerConnection.setLocalDescription(offer))
        .then(() => sendSignal(remoteId, peerConnection.localDescription))
        .catch(error => {
            console.error('Error creating offer:', error);
            updateStatus('Failed to create offer. Please try again.', true);
        });
    } catch (error) {
        console.error('Connection error:', error);
        updateStatus('Error in connection process. Please try again.', true);
    }
}
        
        //!! Till here for the day !!!
        
        //!! This is the next day gonna start rn !!
 
function setupDataChannel() {
    dataChannel.onopen = () => {
        console.log("Data channel is open, you can send files safely.");
        updateStatus(`Connected to ${remoteId}. Ready to transfer files.`);
        document.getElementById('sendFileBtn').disabled = false;
    };

    dataChannel.onclose = () => {
        updateStatus('File transfer channel closed.');
        document.getElementById('sendFileBtn').disabled = true;
    };

    dataChannel.onerror = (error) => {
        console.error('Data channel error:', error);
        updateStatus('Error in data connection.', true);
    };

    dataChannel.onmessage = (event) => {
        try {
            if (typeof event.data === 'string') {
                const metadata = JSON.parse(event.data);
                fileName = metadata.name || 'received_file';
                updateStatus(`Receiving: ${fileName}`);
                return;
            }

            const blob = new Blob([event.data]);
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = fileName || 'received_file';
            a.click();
            updateStatus(`File ${fileName} received successfully!! Let's goo!!`);
        } catch (error) {
            console.error('Error in receiving da file:', error);
            updateStatus('Error in receiving da File.', true);
        }
    };
}

//Replacing old temporary function with sendFile.

function sendFile() {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select a file to send brotha.", true);
        return;
    }

    if (!datachannel || dataChannel.readyState !== "open") {
        updateStatus("Connection not made yet, connect first.", true);
        return;
    }

    try {
        dataChannel.send(JSON.stringify({
            name: file.name,
            type: file.type,
            size: file.size
        }));

        const reader = new FileReader();
        reader.onload = () => {
            updateStatus(`Sending ${file.name}...`);
            dataChannel.send(reader.result);
            updateStatus(`File ${file.name} has been sent successfully!!`);
        };
        reader.onerror = () => {
            updateStatus('Error in reading file. Possible that file is to large or unsupported.', true);
        };
        reader.readAsArrayBuffer(file);
    } catch (error) {
        console.error('Error in sending file:', error);
        updateStatus('Error in sending file.', true);
    }
}
//COMMENTING IT FOR NOW

//function setupReceiver() {
    //dataChannel.onopen = () => console.log("Connection with Broski established");
    //dataChannel.onmessage = (event) => {
      //  const blob = new Blob([event.data]);
        //const a = document.createElement("a");
        //a.href = URL.createObjectURL(blob);
        //a.download = "received_file";
        //a.click();
    //};
//}

//function sendFile() {
    //const fileInput = document.getElementById("fileInput");
    //const file = fileInput.files[0];

    //if (!file) {
      //  alert("Please select a file to send, genius.")
     //   return;
   // }

   // if (!dataChannel || dataChannel.readyState !== "open") {
       // alert("Connection not established yet. Connect first brotha.")
      //  return;
    //}

   // const reader = new FileReader();

   // reader.onload = () => {
       // dataChannel.send(reader.result);
      //  console.log("File Sent!");
   // };
   // reader.readAsArrayBuffer(file);
//}