# Changelog 📜

All notable changes to the **QR Nexus** project will be documented in this file.

## [1.0.0] - 2026-02-25
### Added
- **Interactive History:**
  - Swipe-to-delete functionality for scan and generated records.
  - Favorite system (⭐) with persistence to pin important items.
  - Detail modal for history items to re-trigger actions (Copy, Open URL, Share).
- **Privacy & Support:**
  - Integrated Privacy Policy and Terms of Service links in Settings.
  - Added "Rate App" and "Support" email contact options.
- **WiFi Generator Refinement:**
  - Support for multiple encryption types (WPA, WEP, None).
  - Dynamic password field visibility based on encryption choice.

## [0.9.0] - 2026-02-25
### Added
- **Settings Persistency:**
  - Theme (Dark/Light) and Haptic settings are now saved across app restarts using `AsyncStorage`.
  - Global Haptic wrapper to respect user vibration preferences.
- **Gallery Scanning:**
  - Capability to scan QR codes from existing images in the device library.
  - Hybrid implementation using `expo-image-picker` and a hidden JS-based decoder.
- **Premium Generator:**
  - Live QR generation for URLs, WiFi, and Plain Text.
  - Ability to Save to Gallery and Share generated codes.

## [0.8.0] - 2026-02-24
### Added
- **Bento Dashboard (v2):** 
  - Redesigned MenuScreen with 1x2 grid layout.
  - Animated entry transitions (Fade-in + TranslateY).
  - Integrated Scanned/Generated tabbed history view.
- **Theme System:** 
  - Dedicated `ThemeContext` for global Dark/Light switching.
  - Status bar auto-adaptation based on the active theme.

## [0.5.0] - 2026-02-23
### Added
- **Core Scanner:**
  - Implemented `ScannerScreen` with `expo-camera`.
  - Added visual scanning frame with animated laser line.
  - Modal interaction for scan results.
- **History Foundation:**
  - Local persistence for scanned records using `AsyncStorage`.

## [0.1.0] - 2026-02-22
### Added
- **Initial Setup:**
  - Project initialized with Expo.
  - Navigation infrastructure using `React Navigation`.
  - Basic screen structures (Menu, Scanner, Settings).
