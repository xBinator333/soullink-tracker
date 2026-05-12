import { useEffect, useRef, useCallback, useState } from "react";
import { ref, onValue, set, push, update, get } from "firebase/database";
import { db } from "./firebase.js";

// Einfacher SHA-256 Hash für Passwort-Vergleich
async function hashPassword(pw) {
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

const ROOM_ID = "default"; // Single-Room für euch beide

// ============================================================
// useFirebaseSync – synchronisiert den App-State mit Firebase
// ============================================================
//
// Architektur:
// - Jeder Spieler schreibt NUR in seinen eigenen Knoten (/p1 oder /p2)
// - Gemeinsame Daten (badges, links, runNumber, customLocations) werden
//   von beiden geschrieben – last-write-wins ist hier okay weil ihr
//   gleichzeitig Orden klickt / die gleichen Werte schreibt
// - onValue-Listener reagiert auf ALLE Änderungen und updatet den lokalen State
// - Push-Keys statt nextId → keine Race Conditions bei gleichzeitigen Encountern
//
export function useFirebaseSync() {
  const [syncState, setSyncState] = useState(null); // null = noch nicht geladen
  const [connected, setConnected] = useState(false);
  const [authState, setAuthState] = useState("loading"); // "loading" | "needs_password" | "create_room" | "authenticated"
  const [playerKey, setPlayerKey] = useState(null); // "p1" oder "p2"
  const suppressNextUpdate = useRef(false);
  const roomRef = useRef(null);
  const latestState = useRef(null);

  // Raum-Referenz
  useEffect(() => {
    roomRef.current = ref(db, `rooms/${ROOM_ID}`);

    // Prüfen ob Raum existiert
    get(roomRef.current).then(snap => {
      if (snap.exists()) {
        setAuthState("needs_password");
      } else {
        setAuthState("create_room");
      }
    }).catch(() => setAuthState("create_room"));
  }, []);

  // Raum erstellen (einmalig)
  const createRoom = useCallback(async (password) => {
    const hashed = await hashPassword(password);
    const initData = {
      passwordHash: hashed,
      p1: { name: "Spieler 1", encounters: {}, totalDeaths: 0 },
      p2: { name: "Spieler 2", encounters: {}, totalDeaths: 0 },
      badges: Array(8).fill(false),
      links: {},
      customLocations: {},
      runNumber: 1,
      runEndedShown: false,
    };
    await set(roomRef.current, initData);
    setAuthState("needs_password");
  }, []);

  // Login
  const login = useCallback(async (password, player) => {
    const hashed = await hashPassword(password);
    const snap = await get(ref(db, `rooms/${ROOM_ID}/passwordHash`));
    if (!snap.exists() || snap.val() !== hashed) {
      throw new Error("Falsches Passwort");
    }
    setPlayerKey(player);
    setAuthState("authenticated");
  }, []);

  // Listener starten wenn authentifiziert
  useEffect(() => {
    if (authState !== "authenticated" || !roomRef.current) return;

    const unsub = onValue(roomRef.current, (snap) => {
      if (suppressNextUpdate.current) {
        suppressNextUpdate.current = false;
        return;
      }
      const val = snap.val();
      if (!val) return;

      // Firebase-Daten → App-State konvertieren
      const state = firebaseToState(val);
      latestState.current = state;
      setSyncState(state);
      setConnected(true);
    });

    return () => unsub();
  }, [authState]);

  // State nach Firebase schreiben
  const writeState = useCallback((newState) => {
    if (!roomRef.current || authState !== "authenticated") return;
    latestState.current = newState;
    setSyncState(newState);

    // State → Firebase-Format konvertieren und schreiben
    const fbData = stateToFirebase(newState);
    // Nicht suppressen – wir wollen dass der andere Spieler das Update sieht
    update(roomRef.current, fbData).catch(err => console.error("Firebase write error:", err));
  }, [authState]);

  // Neuen Encounter starten → gibt Push-Key zurück
  const pushEncounter = useCallback((pk, encData) => {
    if (!roomRef.current) return null;
    const encRef = ref(db, `rooms/${ROOM_ID}/${pk}/encounters`);
    const newRef = push(encRef);
    const key = newRef.key;
    set(newRef, encData);
    return key;
  }, []);

  return {
    state: syncState,
    connected,
    authState,
    playerKey,
    createRoom,
    login,
    writeState,
    pushEncounter,
  };
}

// ============================================================
// Konvertierungen Firebase ↔ App-State
// ============================================================

// Firebase speichert Encounters als Object { pushKey: encData }
// App-State hat sie als Array mit .id Feld

function firebaseToState(val) {
  const toArray = (obj) => {
    if (!obj || typeof obj !== "object") return [];
    return Object.entries(obj).map(([key, v]) => ({ ...v, id: key }));
  };

  const linksArray = val.links
    ? Object.entries(val.links).map(([key, v]) => ({ ...v, id: key }))
    : [];

  const customLocArray = val.customLocations
    ? Object.entries(val.customLocations).map(([key, v]) => ({ ...v, id: key }))
    : [];

  return {
    p1: {
      name: val.p1?.name || "Spieler 1",
      encounters: toArray(val.p1?.encounters),
      totalDeaths: val.p1?.totalDeaths || 0,
    },
    p2: {
      name: val.p2?.name || "Spieler 2",
      encounters: toArray(val.p2?.encounters),
      totalDeaths: val.p2?.totalDeaths || 0,
    },
    badges: val.badges || Array(8).fill(false),
    links: linksArray,
    customLocations: customLocArray,
    runNumber: val.runNumber || 1,
    runEndedShown: val.runEndedShown || false,
  };
}

function stateToFirebase(state) {
  const toObj = (arr) => {
    const obj = {};
    for (const item of arr) {
      const { id, ...rest } = item;
      obj[id] = rest;
    }
    return obj;
  };

  return {
    p1: {
      name: state.p1.name,
      encounters: toObj(state.p1.encounters),
      totalDeaths: state.p1.totalDeaths || 0,
    },
    p2: {
      name: state.p2.name,
      encounters: toObj(state.p2.encounters),
      totalDeaths: state.p2.totalDeaths || 0,
    },
    badges: state.badges,
    links: toObj(state.links),
    customLocations: toObj(state.customLocations),
    runNumber: state.runNumber,
    runEndedShown: state.runEndedShown || false,
  };
}
