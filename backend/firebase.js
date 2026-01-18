const firebase = require('firebase/compat/app');
require('firebase/compat/firestore');
require('dotenv').config();

const firebaseConfig = {
    apiKey: "AIzaSyB39pfV4ExpXK6yluNrC2WbjOjiVaCA9C0",
    authDomain: "habit-tracker-ca775.firebaseapp.com",
    projectId: "habit-tracker-ca775",
    storageBucket: "habit-tracker-ca775.firebasestorage.app",
    messagingSenderId: "165834993258",
    appId: "1:165834993258:web:1645c18706a79e7afa6413",
    measurementId: "G-730JLVHB65"
};

// Initialize Firebase (Compat)
// Check if already initialized
let app;
if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
    console.log("🔥 Firebase Client SDK Initialized via Config");
} else {
    app = firebase.app();
}

const db = firebase.firestore();

module.exports = { db };
