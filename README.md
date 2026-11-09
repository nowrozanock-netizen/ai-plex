# Ai Plex

Upgrade my existing AI PLEX application with a professional AI experience. Keep the existing design, features, and functionality. Do NOT create any login or signup page. The app must work without user authentication.

Implement the following features:

CAMERA: Add a camera button allowing users to capture photos and upload images for AI analysis. Support gallery image selection.

VOICE INPUT: Add a microphone button with speech-to-text functionality. Users should be able to ask AI questions using their voice.

AI VOICE READING: Add a speaker button to every completed AI response. Use Text-to-Speech so AI can read the complete response aloud. Include Play, Pause, Resume, and Stop controls.

NOTIFICATIONS: Integrate Firebase Cloud Messaging with Capacitor. Notify users when AI responses are ready, including background notifications where supported.

OFFLINE SAVE: Add a Save Offline button under every AI response. Use Capacitor SQLite to store responses locally. Users must access saved results without internet.

OFFLINE LIBRARY: Create a dedicated page for saved AI responses with search, view, and delete options.

RESPONSIVE DESIGN: Ensure all features work smoothly on Android devices and web browsers.

Use compatible Capacitor plugins, request required permissions, handle errors gracefully, and never expose API keys.

IMPORTANT: Inspect the existing project before modifying anything. Preserve all existing AI functionality and UI. Do not add authentication.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ai-plex.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6bc58330-e924-4c09-a5d4-1f47b5158e15).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
