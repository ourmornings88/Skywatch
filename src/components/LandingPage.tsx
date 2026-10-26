import React, { useState } from 'react';

interface LandingPageProps {
  onOpenApp: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenApp }) => {
  const [activePhoneTab, setActivePhoneTab] = useState<'weather' | 'chat'>('weather');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const faqs = [
    {
      q: 'How does SkyWatch disguise itself?',
      a: 'SkyWatch looks, acts, and functions as a real live weather app. No chat icons, no notifications, and no digital footprint. Only your custom stealth tap or swipe gesture reveals the hidden vault.'
    },
    {
      q: 'Is the messaging end-to-end encrypted?',
      a: 'Yes. All messages are encrypted directly on your device using 256-bit AES-GCM with PBKDF2 key derivation. Your secret room key never touches any server.'
    },
    {
      q: 'What is Decoy Mode?',
      a: 'If forced to enter a code, enter your secondary Decoy PIN. SkyWatch will open a fake, innocent photo gallery with custom uploaded photos instead of your private messages.'
    },
    {
      q: 'How do I hide the app quickly if someone looks?',
      a: 'Tap the top Panic Zone area or give your phone a firm shake. The secret chat instantly closes and returns to the harmless weather screen.'
    }
  ];

  return (
    <div className="landing-container">
      {/* Navigation */}
      <nav>
        <div className="nav-logo">
          Sky<span>Watch</span>
        </div>
        <button className="nav-cta" onClick={onOpenApp}>
          Open App
        </button>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-eyebrow">STEALTH ENCRYPTED MESSAGING</div>
        <h1>
          Private Messaging, <em>Hidden in Plain Sight</em>
        </h1>
        <p className="hero-sub">
          Disguised as a fully functioning weather application. End-to-end encrypted chats, decoy PIN photo gallery, and instant panic hide gestures.
        </p>
        <div className="hero-actions">
          <button className="btn-main" onClick={onOpenApp}>
            Launch Weather App
          </button>
          <div className="hero-price">
            One-time key activation • <strong>Zero footprint</strong>
          </div>
        </div>
      </section>

      {/* Phone Interactive Visual Demo */}
      <section className="demo-wrap">
        <div className="phone">
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 10,
              display: 'flex',
              gap: '6px',
              background: 'rgba(0,0,0,0.4)',
              padding: '4px 8px',
              borderRadius: '12px'
            }}
          >
            <button
              onClick={() => setActivePhoneTab('weather')}
              style={{
                background: activePhoneTab === 'weather' ? '#5BA4CF' : 'transparent',
                color: activePhoneTab === 'weather' ? '#070C18' : '#EDF2FA',
                border: 'none',
                borderRadius: '8px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Weather View
            </button>
            <button
              onClick={() => setActivePhoneTab('chat')}
              style={{
                background: activePhoneTab === 'chat' ? '#5BA4CF' : 'transparent',
                color: activePhoneTab === 'chat' ? '#070C18' : '#EDF2FA',
                border: 'none',
                borderRadius: '8px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Secret Chat
            </button>
          </div>

          <div className="phone-screen">
            {activePhoneTab === 'weather' ? (
              <div className="wx-screen" style={{ position: 'relative' }}>
                <div className="wx-city">Sullivan</div>
                <div style={{ fontSize: '38px', margin: '4px 0' }}>🌤️</div>
                <div className="wx-temp-s">76°</div>
                <div className="wx-cond-s">Mostly Sunny</div>
                <div className="wx-hilo-s">H:79° L:56°</div>
                <div className="wx-card-s">
                  <div className="wx-row-s">
                    <span>Humidity</span>
                    <span>45%</span>
                  </div>
                  <div className="wx-row-s">
                    <span>Wind</span>
                    <span>6 mph</span>
                  </div>
                  <div className="wx-row-s">
                    <span>UV Index</span>
                    <span>4</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="chat-screen" style={{ position: 'relative' }}>
                <div className="chat-hdr-s">
                  <div>Chat 🔒</div>
                  <div className="chat-hdr-sub">AES-256 Encrypted</div>
                </div>
                <div className="chat-msgs">
                  <div className="bubble-s bubble-them">Did you send the confirmation?</div>
                  <div className="bubble-s bubble-me">Yes, encrypted and delivered.</div>
                  <div className="bubble-s bubble-them">Perfect. Returning to weather now.</div>
                </div>
                <div className="chat-inp-s">
                  <span style={{ fontSize: '11px', color: '#6B83A3' }}>Message…</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '28px', marginBottom: '32px' }}>
          Stealth Security Features
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px'
          }}
        >
          <div
            style={{
              background: 'var(--navy2)',
              border: '1px solid var(--border)',
              padding: '24px',
              borderRadius: '12px'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🌦️</div>
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Plausible Deniability</h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
              Functions as a legitimate live weather forecaster. Anyone inspecting your phone sees a normal weather app.
            </p>
          </div>

          <div
            style={{
              background: 'var(--navy2)',
              border: '1px solid var(--border)',
              padding: '24px',
              borderRadius: '12px'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🔐</div>
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>AES-GCM Encryption</h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
              Messages are encrypted on-device before transmission with PBKDF2 derived keys. No readable text on servers.
            </p>
          </div>

          <div
            style={{
              background: 'var(--navy2)',
              border: '1px solid var(--border)',
              padding: '24px',
              borderRadius: '12px'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>🖼️</div>
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Decoy Gallery Mode</h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
              Entering your secondary Decoy PIN opens a fake photo gallery with photos you select to satisfy suspicion.
            </p>
          </div>

          <div
            style={{
              background: 'var(--navy2)',
              border: '1px solid var(--border)',
              padding: '24px',
              borderRadius: '12px'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '12px' }}>⚡</div>
            <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>Panic Gestures</h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
              Tap top panic zone or shake your phone to instantly close the private vault and return to weather.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 24px 80px' }}>
        <h2 style={{ textAlign: 'center', fontSize: '26px', marginBottom: '28px' }}>
          Frequently Asked Questions
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
              style={{
                background: 'var(--navy2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '16px 20px',
                cursor: 'pointer'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: 600,
                  fontSize: '15px'
                }}
              >
                <span>{faq.q}</span>
                <span>{activeFaq === idx ? '−' : '+'}</span>
              </div>
              {activeFaq === idx && (
                <div style={{ marginTop: '12px', fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6' }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '48px' }}>
          <button className="btn-main" onClick={onOpenApp}>
            Try SkyWatch Now
          </button>
        </div>
      </section>
    </div>
  );
};
