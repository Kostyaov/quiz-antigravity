// Firebase "mock" implementation until real credentials are provided
import { initializeApp } from "firebase/app";
import { getDatabase, ref, get, set, push } from "firebase/database";

// TEMPORARY: Placeholder config. User will need to replace this with real data.
const firebaseConfig = {
  apiKey: "AIzaSyDmIQHa7JNjxNkewK3OKTPW3kyQsJv9yLI",
  authDomain: "quiz-ames-ups.firebaseapp.com",
  projectId: "quiz-ames-ups",
  storageBucket: "quiz-ames-ups.firebasestorage.app",
  messagingSenderId: "571943018583",
  appId: "1:571943018583:web:9c05698587ca4e89aec312",
  databaseURL: "https://quiz-ames-ups-default-rtdb.firebaseio.com" // ПЕРЕВІРТЕ ЦЕ ПОСИЛАННЯ В КОНСОЛІ FIREBASE
};

// Initialize Firebase
const IS_CONFIGURED = firebaseConfig.apiKey !== "YOUR_API_KEY" && firebaseConfig.apiKey !== "";

let db = null;
if (IS_CONFIGURED) {
  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
}

export const getAppConfig = async () => {
  if (!IS_CONFIGURED) {
    const data = localStorage.getItem('app_config');
    return data ? JSON.parse(data) : null;
  }
  const snapshot = await get(ref(db, 'config'));
  return snapshot.val() || null;
};

export const saveAppConfig = async (config) => {
  if (!IS_CONFIGURED) {
    localStorage.setItem('app_config', JSON.stringify(config));
    return;
  }
  try {
    await set(ref(db, 'config'), config);
  } catch (err) {
    console.error("Firebase Save Config Error:", err);
    throw err;
  }
};

export const saveTestResult = async (result) => {
  if (!IS_CONFIGURED) {
    const existing = JSON.parse(localStorage.getItem('test_results') || '[]');
    existing.push(result);
    localStorage.setItem('test_results', JSON.stringify(existing));
    return;
  }
  try {
    await push(ref(db, 'results'), result);
  } catch (err) {
    console.error("Firebase Save Result Error:", err);
    throw err;
  }
};

export const getTestResults = async () => {
  if (!IS_CONFIGURED) {
    const data = localStorage.getItem('test_results');
    return data ? JSON.parse(data) : [];
  }
  const snapshot = await get(ref(db, 'results'));
  if (!snapshot.exists()) return [];
  const val = snapshot.val();
  // push returns an object with random keys, we want an array
  return Object.values(val);
};

export const getYoutubeVideoId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
  return (match && match[2].length === 11) ? match[2] : null;
};

export const getGoogleDriveFolderId = (url) => {
  if (!url) return "";
  // Check if it is a full URL
  if (url.includes("drive.google.com")) {
    // Try to extract ID from /folders/ID
    const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    // Try to extract ID from ?id=ID
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idMatch && idMatch[1]) {
      return idMatch[1];
    }
  }
  // Assume it is already an ID if it doesn't look like a URL
  return url;
};

export const getGoogleDriveDirectLink = (url) => {
  if (!url) return null;
  let fileId = null;

  // Pattern 1: https://drive.google.com/file/d/FILE_ID/view...
  const matchFile = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile && matchFile[1]) {
    fileId = matchFile[1];
  }

  // Pattern 2: id parameter
  if (!fileId) {
    const matchId = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchId && matchId[1]) {
      fileId = matchId[1];
    }
  }

  if (fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }

  return url;
};


export const ADMIN_PASSWORD = "admin123"; // Initial fixed password as requested
