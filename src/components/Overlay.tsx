import React, { useState, useEffect, useRef } from 'react';
import { Keypad } from './Keypad';
import { PinDots } from './PinDots';
import {
  PIN_LEN,
  LIC_KEY,
  CODES_KEY,
  GALLERY_KEY,
  hashPin,
  deriveRoom,
  getClientID
} from '../utils/crypto';
import { subscribeToRoom, sendEncryptedMessage, clearRoomMessages } from '../services/firebase';
import { ScreenType, ChatMessage, DecoyPhoto, StoredCodes } from '../types';

interface OverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SETUP_LABELS = [
  { title: 'Choose a 4-digit code', hint: 'This code will open your private chat from now on.' },
  { title: 'Confirm your code', hint: 'Type your 4-digit code again to confirm.' },
  { title: 'Choose a decoy code', hint: 'This code opens the fake photo gallery under pressure.' },
  { title: 'Confirm decoy code', hint: 'Type your decoy code again to confirm.' }
];

export const Overlay: React.FC<OverlayProps> = ({ isOpen, onClose }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('pinScreen');

  // PIN entry state
  const [pinEntry, setPinEntry] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // First-time PIN setup flow state
  const [setupStep, setSetupStep] = useState<number>(0);
  const [setupEntry, setSetupEntry] = useState<string>('');
  const [setupErrorMsg, setSetupErrorMsg] = useState<string>('');
  const [setupTmp, setSetupTmp] = useState<{ r?: string; d?: string }>({});

  // License screen state
  const [licenseKeyInput, setLicenseKeyInput] = useState<string>('');
  const [licenseError, setLicenseError] = useState<string>('');

  // Setup / Secret phrase state
  const [phraseInput, setPhraseInput] = useState<string>('');
  const [roomData, setRoomData] = useState<{ roomId: string; key: CryptoKey } | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgInput, setMsgInput] = useState<string>('');
  const [chatStatus, setChatStatus] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const cid = getClientID();

  // Gallery state
  const [photos, setPhotos] = useState<DecoyPhoto[]>([]);
  const [activeLightboxImg, setActiveLightboxImg] = useState<DecoyPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset PIN entry when overlay opens
  useEffect(() => {
    if (isOpen) {
      setPinEntry('');
      setPinError('');
      setCurrentScreen('pinScreen');
    } else {
      setActiveLightboxImg(null);
    }
  }, [isOpen]);

  // Read stored PIN codes helper
  const readCodes = (): StoredCodes | null => {
    try {
      return JSON.parse(localStorage.getItem(CODES_KEY) || 'null');
    } catch {
      return null;
    }
  };

  // -------------------------------------------------------------
  // PIN Verification Logic
  // -------------------------------------------------------------
  const triggerPinVerify = async (entry: string) => {
    setPinEntry('');
    let codes = readCodes();

    if (!codes) {
      // Unconfigured PIN defaults
      if (entry === '2588') {
        setCurrentScreen('licenseScreen');
      } else if (entry === '6969') {
        loadGallery();
        setCurrentScreen('galleryScreen');
      } else {
        showPinError('Wrong code');
      }
      return;
    }

    // Migration if unhashed plaintext pins exist
    if (codes.r.length === PIN_LEN && codes.d.length === PIN_LEN) {
      codes = { r: await hashPin(codes.r), d: await hashPin(codes.d) };
      try {
        localStorage.setItem(CODES_KEY, JSON.stringify(codes));
      } catch {}
    }

    const entryHash = await hashPin(entry);
    if (entryHash === codes.r) {
      const isLicensed = localStorage.getItem(LIC_KEY);
      if (isLicensed) {
        setCurrentScreen(roomData ? 'chatScreen' : 'setupScreen');
      } else {
        setCurrentScreen('licenseScreen');
      }
    } else if (entryHash === codes.d) {
      loadGallery();
      setCurrentScreen('galleryScreen');
    } else {
      showPinError('Wrong code');
    }
  };

  const showPinError = (msg: string) => {
    setPinError(msg);
    setTimeout(() => setPinError(''), 900);
  };

  const handlePinDigit = (digit: string) => {
    if (pinEntry.length < PIN_LEN) {
      const updated = pinEntry + digit;
      setPinEntry(updated);
      if (updated.length === PIN_LEN) {
        setTimeout(() => triggerPinVerify(updated), 50);
      }
    }
  };

  const handlePinBack = () => {
    setPinEntry(prev => prev.slice(0, -1));
  };

  // -------------------------------------------------------------
  // First-Time PIN Setup Flow Logic
  // -------------------------------------------------------------
  const startPinSetupFlow = () => {
    setSetupEntry('');
    setSetupStep(0);
    setSetupTmp({});
    setCurrentScreen('pinSetupScreen');
  };

  const triggerSetupError = (msg: string, backToStep?: number) => {
    setSetupErrorMsg(msg);
    setTimeout(() => {
      setSetupEntry('');
      setSetupErrorMsg('');
      if (backToStep !== undefined) setSetupStep(backToStep);
    }, 900);
  };

  const handleSetupPinComplete = async (entry: string) => {
    if (setupStep === 0) {
      setSetupTmp({ r: entry });
      setSetupStep(1);
      setSetupEntry('');
      return;
    }
    if (setupStep === 1) {
      if (entry !== setupTmp.r) {
        triggerSetupError("Codes didn't match", 0);
        return;
      }
      setSetupStep(2);
      setSetupEntry('');
      return;
    }
    if (setupStep === 2) {
      if (entry === setupTmp.r) {
        triggerSetupError('Decoy must be different');
        return;
      }
      setSetupTmp(prev => ({ ...prev, d: entry }));
      setSetupStep(3);
      setSetupEntry('');
      return;
    }
    if (setupStep === 3) {
      if (entry !== setupTmp.d) {
        triggerSetupError("Codes didn't match", 2);
        return;
      }
      // Save hashed PINs
      try {
        const rHash = await hashPin(setupTmp.r!);
        const dHash = await hashPin(entry);
        localStorage.setItem(CODES_KEY, JSON.stringify({ r: rHash, d: dHash }));
      } catch {}

      setSetupTmp({});
      setSetupEntry('');
      setCurrentScreen('setupScreen');
    }
  };

  const handleSetupDigit = (digit: string) => {
    if (setupEntry.length < PIN_LEN) {
      const updated = setupEntry + digit;
      setSetupEntry(updated);
      if (updated.length === PIN_LEN) {
        setTimeout(() => handleSetupPinComplete(updated), 50);
      }
    }
  };

  const handleSetupBack = () => {
    setSetupEntry(prev => prev.slice(0, -1));
  };

  // -------------------------------------------------------------
  // License Activation
  // -------------------------------------------------------------
  const handleActivate = () => {
    const key = licenseKeyInput.trim();
    if (key.length < 4) {
      setLicenseError('Please enter a valid license key.');
      return;
    }
    try {
      localStorage.setItem(LIC_KEY, key);
    } catch {}
    setLicenseError('');
    if (!readCodes()) {
      startPinSetupFlow();
    } else {
      setCurrentScreen('setupScreen');
    }
  };

  // -------------------------------------------------------------
  // Room Connection & Encrypted Realtime Chat
  // -------------------------------------------------------------
  const handleJoinChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const phrase = phraseInput.trim().toLowerCase();
    if (phrase.length < 8) {
      alert('Secret phrase must be at least 8 characters long.');
      return;
    }
    try {
      setChatStatus('Deriving encryption keys…');
      const derived = await deriveRoom(phrase);
      setRoomData(derived);
      setCurrentScreen('chatScreen');
    } catch (err: any) {
      alert('Failed to derive security key: ' + err?.message);
    }
  };

  useEffect(() => {
    if (currentScreen !== 'chatScreen' || !roomData) return;

    setChatStatus('Connecting…');
    const unsubscribe = subscribeToRoom(
      roomData.roomId,
      roomData.key,
      (msgs) => {
        setMessages(msgs);
        setChatStatus('');
      },
      (err) => {
        setChatStatus(err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [currentScreen, roomData]);

  // Scroll chat to bottom on new messages
  useEffect(() => {
    if (currentScreen === 'chatScreen') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentScreen]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = msgInput.trim();
    if (!text || !roomData) return;

    setMsgInput('');
    try {
      await sendEncryptedMessage(roomData.roomId, roomData.key, text);
    } catch (err: any) {
      setMsgInput(text);
      setChatStatus('Send failed: ' + (err?.code || 'network'));
    }
  };

  const handleClearChat = async () => {
    if (!roomData || !window.confirm('Delete all messages in this chat for everyone?')) return;
    try {
      await clearRoomMessages(roomData.roomId);
    } catch (err: any) {
      setChatStatus('Clear failed: ' + (err?.code || 'network'));
    }
  };

  // -------------------------------------------------------------
  // Decoy Photo Gallery Logic
  // -------------------------------------------------------------
  const loadGallery = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]');
      setPhotos(stored);
    } catch {
      setPhotos([]);
    }
  };

  const saveGallery = (newPhotos: DecoyPhoto[]): boolean => {
    try {
      localStorage.setItem(GALLERY_KEY, JSON.stringify(newPhotos));
      setPhotos(newPhotos);
      return true;
    } catch {
      alert('Storage is full. Please delete some photos.');
      return false;
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onerror = () => reject();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject();
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.onerror = () => reject();
        img.src = fr.result as string;
      };
      fr.readAsDataURL(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArr = Array.from(e.target.files);
    let failedCount = 0;
    const addedPhotos: DecoyPhoto[] = [];

    for (const f of filesArr) {
      try {
        const compressedDataUrl = await compressImage(f);
        addedPhotos.push({
          id: Date.now() + '_' + Math.random().toString(36).slice(2),
          src: compressedDataUrl
        });
      } catch {
        failedCount++;
      }
    }

    e.target.value = '';
    const updated = [...photos, ...addedPhotos];
    saveGallery(updated);

    if (failedCount > 0) {
      alert(`${failedCount} photo(s) could not be processed.`);
    }
  };

  const handleDeletePhoto = (photoId: string) => {
    const updated = photos.filter(p => p.id !== photoId);
    saveGallery(updated);
    setActiveLightboxImg(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div id="overlay" className="show">
        {/* Top Panic Zone */}
        <div id="panicZone" title="Tap to panic hide" onClick={onClose} />

        {/* 1. PIN Screen */}
        {currentScreen === 'pinScreen' && (
          <div id="pinScreen">
            <div className="pin-label">Enter code</div>
            <PinDots length={pinEntry.length} />
            <div className="pin-error">{pinError}</div>
            <Keypad onDigit={handlePinDigit} onBack={handlePinBack} />
            <button className="btn-ghost" onClick={onClose}>
              Back to weather
            </button>
          </div>
        )}

        {/* 2. License / Activation Screen */}
        {currentScreen === 'licenseScreen' && (
          <div id="licenseScreen">
            <div className="setup-title">Activate App</div>
            <div className="hint">Enter your license key to unlock SkyWatch.</div>
            <input
              id="licenseInput"
              type="text"
              placeholder="License Key"
              autoComplete="off"
              value={licenseKeyInput}
              onChange={(e) => setLicenseKeyInput(e.target.value)}
            />
            <div className="hint" style={{ color: '#d9534f', minHeight: '20px' }}>
              {licenseError}
            </div>
            <button className="btn-primary" onClick={handleActivate}>
              Activate
            </button>
            <button className="btn-ghost" onClick={onClose}>
              Back
            </button>
          </div>
        )}

        {/* 3. First-time PIN Setup Wizard Screen */}
        {currentScreen === 'pinSetupScreen' && (
          <div id="pinSetupScreen">
            <div className="setup-title">{SETUP_LABELS[setupStep]?.title}</div>
            <div className="hint">{SETUP_LABELS[setupStep]?.hint}</div>
            <PinDots length={setupEntry.length} />
            <div className="pin-error">{setupErrorMsg}</div>
            <Keypad onDigit={handleSetupDigit} onBack={handleSetupBack} />
          </div>
        )}

        {/* 4. Setup / Secret Phrase Screen */}
        {currentScreen === 'setupScreen' && (
          <div id="setupScreen">
            <div className="setup-title">Enter Secret Phrase</div>
            <div className="hint">Both people type the exact same phrase (8+ characters) to connect securely.</div>
            <input
              id="roomInput"
              type="text"
              placeholder="e.g. secret-phrase-xyz"
              autoComplete="off"
              autoCapitalize="off"
              value={phraseInput}
              onChange={(e) => setPhraseInput(e.target.value)}
            />
            <button className="btn-primary" onClick={handleJoinChat}>
              Join Chat
            </button>
            <button className="btn-ghost" onClick={onClose}>
              Back
            </button>
          </div>
        )}

        {/* 5. Encrypted Chat Screen */}
        {currentScreen === 'chatScreen' && (
          <div id="chatScreen">
            <div className="chat-hdr">
              <button className="hbtn" onClick={onClose}>
                ‹ Hide
              </button>
              <div className="title">Chat 🔒</div>
              <button className="clearbtn" onClick={handleClearChat}>
                Clear
              </button>
            </div>
            <div id="status">{chatStatus}</div>
            <div id="messages">
              {messages.map((m) => (
                <div key={m.id || m.timestamp} className={`bubble ${m.senderId === cid ? 'me' : 'them'}`}>
                  {m.text}
                  {m.timeFormatted && <span className="ts">{m.timeFormatted}</span>}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form className="chat-inp" onSubmit={handleSendMessage}>
              <input
                id="msgInput"
                type="text"
                placeholder="Message…"
                autoComplete="off"
                value={msgInput}
                onChange={(e) => setMsgInput(e.target.value)}
              />
              <button id="sendBtn" type="submit">
                Send
              </button>
            </form>
          </div>
        )}

        {/* 6. Decoy Gallery Screen */}
        {currentScreen === 'galleryScreen' && (
          <div id="galleryScreen">
            <div className="gal-hdr">
              <button onClick={onClose}>‹ Back</button>
              <div style={{ fontWeight: 600, flex: 1, textAlign: 'center' }}>Photos</div>
            </div>
            <div className="gal-grid" id="galleryGrid">
              {photos.map((p) => (
                <img
                  key={p.id}
                  src={p.src}
                  alt="Decoy photo"
                  onClick={() => setActiveLightboxImg(p)}
                />
              ))}
              <div
                className="gal-add"
                id="galleryAdd"
                onClick={() => fileInputRef.current?.click()}
              >
                ＋
              </div>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              multiple
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {activeLightboxImg && (
        <div id="lightbox" className="show">
          <button className="lb-close" onClick={() => setActiveLightboxImg(null)}>
            ✕
          </button>
          <img id="lbImg" src={activeLightboxImg.src} alt="Full view" />
          <button className="lb-del" onClick={() => handleDeletePhoto(activeLightboxImg.id)}>
            Delete photo
          </button>
        </div>
      )}
    </>
  );
};
