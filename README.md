# QR Nexus ⚡

<p align="center">
  <img src="./assets/NexusQR.png" width="180" height="180" alt="QR Nexus Logo">
</p>

**QR Nexus** is a premium, high-performance QR code scanner and generator built with React Native and Expo. It features a modern **Bento UI** design, smooth animations, and advanced features focused on user experience and productivity.

![QR Nexus Dashboard](./assets/NexusQR.png) <!-- Aquí podrías poner un screenshot real luego -->

## ✨ Key Features

### 🔍 Advanced Scanner
- **High-Speed Detection:** Powered by `expo-camera` for instant scanning.
- **Smart Framing:** Beautiful focus frame with an animated scan line and corner accents.
- **Contextual Actions:** Auto-detects URLs, WiFi networks, and plain text.
- **Bottom Panel UI:** Fixed bottom panel with flashlight control and scanning tips.

### 🖼️ Gallery Scanning
- **Image Recognition:** Scan QR codes directly from your device's image gallery using an integrated WebView-based decoder.
- **Success Modal:** Instant feedback showing detected data with copy/share/open actions.

### 🔨 Intelligent Generator
- **Multiple Categories:** Create QR codes for URLs, WiFi networks, and plain text.
- **WiFi Refinement:** Supports WPA, WEP, and Open (nopass) encryption types.
- **Live Preview:** Real-time QR generation as you type.
- **Action Suite:** Save codes directly to your gallery, share them, or add them to your history.

### 📚 Interactive History
- **Dual Tab System:** Keep your Scanned and Generated codes organized in separate lists.
- **Interactive Layers:** 
    - **Tap:** Open a detail modal to re-activate the QR code actions (Copy, Open, Share).
    - **Swipe to Delete:** Effortless management of your history by swiping left.
    - **Favorites (⭐):** Pin important codes to the top of the list for quick access.
- **Persistent Storage:** All your data is saved locally on your device using `AsyncStorage`.

### 🎨 Premium UI/UX
- **Bento Design:** A clean, card-based interface inspired by modern design trends.
- **Dynamic Theming:** Seamless Dark and Light mode support with persistency.
- **Tactile Feedback:** Integrated Haptic feedback for every meaningful action.
- **Safe Area Support:** Perfectly adapted for devices with notches and different screen ratios.

---

## 🛠️ Technologies
- **Framework:** [React Native](https://reactnative.dev/) (Managed Workflow with [Expo](https://expo.dev/))
- **Navigation:** [React Navigation](https://reactnavigation.org/) (Native Stack)
- **Scanning:** `expo-camera`, `jsQR` (via WebView)
- **UI Components:** `expo-linear-gradient`, `@expo/vector-icons`
- **Logic & Storage:** `AsyncStorage`, `expo-haptics`, `expo-sharing`, `expo-clipboard`

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/)
- [Expo Go](https://expo.dev/expo-go) app on your physical device or an emulator.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/qr-nexus.git
   cd qr-nexus
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npx expo start
   ```

4. Scan the QR code from the terminal using **Expo Go** (Android) or the **Camera app** (iOS).

---

## ⚙️ Configuration & Support
Visit the **Settings** screen inside the app to:
- Toggle between Light and Dark modes.
- Enable or disable Haptic feedback.
- Access Privacy Policy and Terms of Service.
- Clear your history or contact support.

---

## ⚡ Developed by Jai
Focused on creating high-quality, aesthetic, and functional mobile experiences.
