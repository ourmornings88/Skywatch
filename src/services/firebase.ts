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
      console.warn('Firebase anonymous auth notice:', err);
    });
  }
  return authPromise;
}

// Fallback local storage key
function getFallbackKey(roomId: string) {
  return `_sw_room_msgs_${roomId}`;
}

// Helper to handle local fallback messages
function getLocalFallbackMessages(roomId: string): Array<{ c: string; iv: string; ts: number; id: string }> {
  try {
    return JSON.parse(localStorage.getItem(getFallbackKey(roomId)) || '[]');
  } catch {
    return [];
  }
}

function saveLocalFallbackMessages(roomId: string, items: Array<{ c: string; iv: string; ts: number; id: string }>) {
  try {
    localStorage.setItem(getFallbackKey(roomId), JSON.stringify(items));
  } catch {}
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
  let firebaseActive = false;

  const processPayloads = async (items: Array<{ id: string; val: { c: string; iv: string; ts?: number } }>) => {
    const sequence = ++currentSequence;
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
              id: item.id,
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
      const valid = decryptedItems.filter((m): m is ChatMessage => m !== null);
      onMessages(valid);
    } catch (err: any) {
      onError('Decryption error: ' + (err?.message || 'failed'));
    }
  };

  // BroadcastChannel for cross-tab local fallback syncing
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel(`skywatch_room_${roomId}`);
    channel.onmessage = () => {
      if (!firebaseActive) {
        const localItems = getLocalFallbackMessages(roomId);
        processPayloads(localItems.map(item => ({ id: item.id, val: item })));
      }
    };
  } catch {}

  const callback = async (snapshot: any) => {
    firebaseActive = true;
    const items: Array<{ id: string; val: any }> = [];
    snapshot.forEach((childSnap: any) => {
      items.push({ id: childSnap.key, val: childSnap.val() });
    });
    await processPayloads(items);
  };

  const errorCallback = (err: any) => {
    console.warn('Firebase RTDB falling back to local sync:', err);
    firebaseActive = false;
    onError('');
    const localItems = getLocalFallbackMessages(roomId);
    processPayloads(localItems.map(item => ({ id: item.id, val: item })));
  };

  onValue(roomQuery, callback, errorCallback);

  return () => {
    off(roomQuery, 'value', callback);
    if (channel) channel.close();
  };
}

export async function sendEncryptedMessage(roomId: string, roomKey: CryptoKey, text: string): Promise<void> {
  const cid = getClientID();
  const encryptedPayload = await encryptMsg(roomKey, { t: text, s: cid });
  const ts = Date.now();

  try {
    await ensureAuth();
    const roomRef = ref(db, `rooms/${roomId}/messages`);
    await push(roomRef, {
      c: encryptedPayload.c,
      iv: encryptedPayload.iv,
      ts: serverTimestamp()
    });
  } catch (err) {
    console.warn('Firebase push failed, saving to local fallback:', err);
  }

  // Always save to local fallback for reliability
  const current = getLocalFallbackMessages(roomId);
  const newItem = {
    id: Date.now() + '_' + Math.random().toString(36).slice(2),
    c: encryptedPayload.c,
    iv: encryptedPayload.iv,
    ts
  };
  current.push(newItem);
  saveLocalFallbackMessages(roomId, current);

  try {
    const channel = new BroadcastChannel(`skywatch_room_${roomId}`);
    channel.postMessage({ type: 'new_msg' });
    channel.close();
  } catch {}
}

export async function clearRoomMessages(roomId: string): Promise<void> {
  try {
    await ensureAuth();
    const roomRef = ref(db, `rooms/${roomId}/messages`);
    await remove(roomRef);
  } catch {}

  saveLocalFallbackMessages(roomId, []);

  try {
    const channel = new BroadcastChannel(`skywatch_room_${roomId}`);
    channel.postMessage({ type: 'clear' });
    channel.close();
  } catch {}
}
