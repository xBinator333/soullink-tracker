import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDngLct33NtqMl_DbhNvVTM8vblgpt_TTQ",
  authDomain: "soullink-99c6a.firebaseapp.com",
  databaseURL: "https://soullink-99c6a-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "soullink-99c6a",
  storageBucket: "soullink-99c6a.firebasestorage.app",
  messagingSenderId: "893802885425",
  appId: "1:893802885425:web:13873bfb941a6320080010",
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
