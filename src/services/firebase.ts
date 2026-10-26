import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref, onValue, off, push, remove, serverTimestamp, query, orderByChild, limitToLast } from 'firebase/database';
import { decryptMsg, encryptMsg, getClientID } from '../utils/crypto';
import { ChatMessage } from '../types';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBPxFR-_Nwh8KoM3HBTDOR8818uPfo79sY",
  authDomain: "weather-2026-d5ed7.firebaseapp.com",
  databaseURL: "https://weather-2026-d5ed7-default-rtdb.firebaseio.com",
  projectId: "weather-2026-d5ed7",
  storageBucket: "weather-2026-d5ed7.firebasestorage.app",
  messagingSenderId: "714772362588",
  appId: "1:714772362588:web:30c96298c7548f76d57d99"
};

const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];
const auth = getAuth(app);
const db = getDatabase(app);

let authPromise: Promise<unknown> | null = null;

export function ensureAuth() {
  if (!authPromise) {
    authPromise = signInAnonymously(auth).catch(err => {
      console.warn('Firebase anonymous auth warning:', err);
    });
  }
  return authPromise;
}

export function subscribeToRoom(
  roomId: string,
  roomKey: CryptoKey,
  onMessages: (msgs: ChatMessage[]) => void,
  onError: (err: string) => void
): () => void {
  ensureAuth();
  const roomRef = ref(db, `rooms/${roomId}/messages`);
  const roomQuery = query(roomRef, orderByChild('ts'), limitToLast(100));

  let currentSequence = 0;

  const callback = async (snapshot: any) => {
    const sequence = ++currentSequence;
    const items: Array<{ key: string; val: any }> = [];

    snapshot.forEach((childSnap: any) => {
      items.push({ key: childSnap.key, val: childSnap.val() });
    });

    try {
      const decryptedItems = await Promise.all(
        items.map(async item => {
          try {
            const raw = item.val;
            if (!raw || !raw.c || !raw.iv) return null;
            const payload = await decryptMsg(roomKey, { c: raw.c, iv: raw.iv });
            const senderId = (payload.s as string) || 'unknown';
            const text = (payload.t as string) || '';
            const ts = typeof raw.ts === 'number' ? raw.ts : Date.now();
            
            const timeFormatted = new Date(ts).toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit'
            });

            return {
              id: item.key,
              text,
              senderId,
              timestamp: ts,
              timeFormatted
            } as ChatMessage;
          } catch {
            return null;
          }
        })
      );

      if (sequence !== currentSequence) return;

      const validMessages = decryptedItems.filter((m): m is ChatMessage => m !== null);
      onMessages(validMessages);
    } catch (err: any) {
      onError('Decryption error: ' + (err?.message || 'failed'));
    }
  };

  const errorCallback = (err: any) => {
    onError('Connection error: ' + (err?.code || err?.message || 'unknown'));
  };

  onValue(roomQuery, callback, errorCallback);

  return () => {
    off(roomQuery, 'value', callback);
  };
}

export async function sendEncryptedMessage(roomId: string, roomKey: CryptoKey, text: string): Promise<void> {
  await ensureAuth();
  const cid = getClientID();
  const encryptedPayload = await encryptMsg(roomKey, { t: text, s: cid });
  
  const roomRef = ref(db, `rooms/${roomId}/messages`);
  await push(roomRef, {
    c: encryptedPayload.c,
    iv: encryptedPayload.iv,
    ts: serverTimestamp()
  });
}

export async function clearRoomMessages(roomId: string): Promise<void> {
  await ensureAuth();
  const roomRef = ref(db, `rooms/${roomId}/messages`);
  await remove(roomRef);
}
