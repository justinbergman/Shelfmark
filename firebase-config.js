// Paste in the config object from Firebase Console:
// Project Settings (gear icon) > General tab > "Your apps" > Web app > SDK setup and configuration
//
// It's safe for this to be public / committed to GitHub — Firebase web config
// values are not secret keys. Your data is protected by the Firestore
// security rules (see firestore.rules), not by hiding this config.

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
