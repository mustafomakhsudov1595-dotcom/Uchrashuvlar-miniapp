# Uchrashuvlar — Telegram Mini App

A mobile-first meeting manager. The whole interface is in Uzbek (Latin).
Add, edit and delete meetings; keep a checklist of things to bring or give; browse a calendar and upcoming meetings.

## Run it on your computer

1. Install Node.js (version 20 or newer) from https://nodejs.org
2. Open a terminal in this folder and run:

```bash
npm install     # downloads the libraries (only the first time)
npm run dev     # starts the app
```

3. Open http://localhost:5173 in your browser. Press F12 and choose a phone size to see it like on a phone.

To see it on your real phone: connect the phone to the same Wi-Fi and open the "Network" address that `npm run dev` prints.

## Put it inside Telegram

Telegram only opens Mini Apps from an `https://` address, so `localhost` will not work there.

1. Get a temporary https link for testing: `npx cloudflared tunnel --url http://localhost:5173`
   (or deploy the `dist` folder later to Vercel, Netlify or GitHub Pages for a permanent link).
2. In Telegram, open @BotFather → `/newbot` (skip if you already have a bot).
3. Send `/newapp`, choose your bot, and paste the https link as the Web App URL.
   Alternatively: `/mybots` → your bot → Bot Settings → Menu Button → paste the link.
4. Open your bot in Telegram and tap the menu button.

For a permanent link, run `npm run build`. It creates a `dist` folder, and that folder is what you upload.

## Secrets and security

- There is **no token or secret in this project**, and there should never be one in frontend code.
  Anyone can read frontend code. The bot token belongs only on a server.
- Data is stored in the browser's local storage on the user's device. It is private to that device and is not synced between devices.
- If you add a server later, validate Telegram's `initData` **on the server** before trusting who the user is.
  Never trust `initDataUnsafe` for anything important.

## What is where

```
index.html            page shell, loads Telegram's official script
src/main.jsx          starts the app
src/App.jsx           holds the state, connects screens, back button, toasts
src/styles.css        all colors, fonts, light/dark theme
src/lib/telegram.js   Telegram connection: theme, haptics, back button, links
src/lib/storage.js    saving and loading (swap this file to use a server)
src/lib/dates.js      Uzbek date formatting and calendar grid
src/lib/meetings.js   sorting, grouping, "2 soatdan keyin" text
src/components/       screens and small pieces (calendar, form, detail, ...)
```

## Ideas for next steps

- Reminders in Telegram: needs a small server and the bot (the Mini App alone cannot send messages).
- Sync across devices: store meetings on a server, keyed by the validated Telegram user id.
