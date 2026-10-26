# SkyWatch

Private messaging hidden in plain sight inside a fully functioning weather application.

## Features

- **Plausible Deniability Weather App**: Disguised as a live weather forecast application with real-time hourly and 10-day forecasts from Open-Meteo API and location reverse geocoding.
- **Stealth Trigger Gestures**:
  - Tap 5 times quickly on the temperature display.
  - Press and hold the main weather condition icon for 2 seconds.
  - Matrix corner tap sequence (Top-Left -> Bottom-Right -> Top-Right).
  - Swipe gesture sequence (Tap x2 -> Left Swipe -> Tap x2 -> Left Swipe).
- **End-to-End Encrypted Realtime Chat**:
  - AES-GCM 256-bit encryption with PBKDF2 room key derivation.
  - Instant encrypted message streaming powered by Firebase Realtime Database.
  - Clear chat history and instant hide triggers.
- **Decoy Photo Gallery Mode**: Entering your secondary Decoy PIN unlocks a fake photo gallery with local image upload & lightbox viewer.
- **Panic Security**: Tap the top Panic Zone or shake your phone (`devicemotion`) to instantly return to the weather view.
- **Marketing Site & Live Demo**: High-fidelity landing page detailing stealth security features, interactive phone preview, and FAQ.

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Crypto**: Web Crypto API (AES-GCM, PBKDF2, SHA-256)
- **Backend / DB**: Firebase Realtime Database (client-side encrypted payloads)
- **Weather API**: Open-Meteo & BigDataCloud Reverse Geocoding