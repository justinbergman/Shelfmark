// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCvcjK6nDZ3HN_m9rh2EzafqUnCWXa-RCE",
  authDomain: "shelfmark-a9e59.firebaseapp.com",
  projectId: "shelfmark-a9e59",
  storageBucket: "shelfmark-a9e59.firebasestorage.app",
  messagingSenderId: "564497315550",
  appId: "1:564497315550:web:fb0150e41e359c0155b44f"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
