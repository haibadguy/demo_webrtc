import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { getDatabase, ref, push, onChildAdded, remove } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAamD8fu9Wm96njTogf7lXpKMPYioppt6g",
    authDomain: "btl-webrtc.firebaseapp.com",
    databaseURL: "https://btl-webrtc-default-rtdb.firebaseio.com",
    projectId: "btl-webrtc",
    storageBucket: "btl-webrtc.appspot.com",
    messagingSenderId: "76818406142",
    appId: "1:76818406142:web:84c90bb00f405ffb1723af",
    measurementId: "G-VP3GPNZQF3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const messagesRef = ref(database, "messages");

// DOM Elements
const yourVideo = document.getElementById("yourVideo");
const friendsVideo = document.getElementById("friendsVideo");
const callButton = document.getElementById("callButton");
const resetButton = document.getElementById("resetButton");

// WebRTC Variables
let yourId = Math.floor(Math.random() * 1000000000);
let pc;

// Initialize WebRTC
function initializeWebRTC() {
    const servers = {
        iceServers: [
            { urls: "stun:stun.services.mozilla.com" },
            { urls: "stun:stun.l.google.com:19302" }
        ]
    };

    pc = new RTCPeerConnection(servers);

    pc.onicecandidate = event => {
        if (event.candidate) {
            sendMessage({
                sender: yourId,
                message: JSON.stringify({ ice: event.candidate })
            });
        }
    };

    pc.ontrack = event => {
        friendsVideo.srcObject = event.streams[0];
    };
}

// Firebase Messaging
function sendMessage(data) {
    push(messagesRef, data);
}

onChildAdded(messagesRef, data => {
    const msg = JSON.parse(data.val().message);
    const sender = data.val().sender;

    if (sender !== yourId) {
        if (msg.ice) {
            pc.addIceCandidate(new RTCIceCandidate(msg.ice));
        } else if (msg.sdp && msg.sdp.type === "offer") {
            pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
                .then(() => pc.createAnswer())
                .then(answer => pc.setLocalDescription(answer))
                .then(() => {
                    sendMessage({
                        sender: yourId,
                        message: JSON.stringify({ sdp: pc.localDescription })
                    });
                });
        } else if (msg.sdp && msg.sdp.type === "answer") {
            pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
        }
    }
});

// Show Your Video
navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then(stream => {
        yourVideo.srcObject = stream;

        // Add tracks in a consistent order
        stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));
        stream.getVideoTracks().forEach(track => pc.addTrack(track, stream));
    })
    .catch(error => console.error("Error accessing media devices:", error));

// Start Call
callButton.addEventListener("click", () => {
    pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
            sendMessage({
                sender: yourId,
                message: JSON.stringify({ sdp: pc.localDescription })
            });
        });
});

// Reset Firebase and WebRTC on page reload
window.onload = () => {
    // Clear old messages
    remove(messagesRef)
        .then(() => console.log("Old messages cleared"))
        .catch(error => console.error("Error removing messages:", error));

    // Initialize WebRTC
    yourId = Math.floor(Math.random() * 1000000000); // Generate a new ID
    initializeWebRTC();
};

// Optional Reset Button for manual cleanup
// Optional Reset Button for manual cleanup
resetButton.addEventListener("click", () => {
    // Clear the Firebase database messages
    remove(messagesRef)
        .then(() => console.log("Database reset"))
        .catch(error => console.error("Error resetting database:", error));

    // Close and cleanup the current RTCPeerConnection
    if (pc) {
        pc.close(); // Close the current connection
    }

    // Reinitialize WebRTC (create a new RTCPeerConnection and reset the video stream)
    yourId = Math.floor(Math.random() * 1000000000); // Generate a new ID
    initializeWebRTC(); // Initialize a new WebRTC connection

    // Reset local and remote video elements (optional)
    yourVideo.srcObject = null; // Clear your local video stream
    friendsVideo.srcObject = null; // Clear the remote video stream

    // Re-request the user's media devices (video and audio)
    navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then(stream => {
            yourVideo.srcObject = stream;

            // Add tracks in a consistent order
            stream.getAudioTracks().forEach(track => pc.addTrack(track, stream));
            stream.getVideoTracks().forEach(track => pc.addTrack(track, stream));
        })
        .catch(error => console.error("Error accessing media devices:", error));
});

