# Cafe Bébé 🍼☕

**Real-time multiplayer baby shower party game app** — Jackbox-style: the TV shows a live dashboard, guests play on their phones via QR codes, and the host controls everything from a laptop.

> Built for Mai & Binh's baby shower. *A little bean is brewing!*

---

## Games

### 🤰 Guess the Belly Size
Guests guess the circumference of the mom-to-be's belly in inches. Closest guess wins! The host enters the real measurement at reveal time.

### 💩 Name That Poop
A candy bar is melted in a diaper. Guests type which candy it is. The host enters the correct answer — closest text match wins!

### 💉 IVF Needle Count
Guests guess how many needles the mom-to-be endured during IVF. A physical jar of needles is displayed at the event as a visual clue. Closest number wins.

### 💰 Price is Right (Baby Edition)
3-round elimination game. Guests guess the price of baby products. Closest guess without going over advances each round. Last one standing wins.

---

## Features

- **Live TV dashboard** — 2-column game cards update in real time as guesses come in
- **QR codes** — auto-generated per game; guests scan and play on their phones instantly
- **Host panel** — start games, set correct answers & prizes, reveal winners
- **Winner reveal** — full-screen confetti explosion with winner name and prize
- **Tiebreaker spinner** — slot-machine style wheel randomly picks a winner when scores tie; accessible any time via "Spin the Wheel!" button on the TV card
- **Price is Right takeover** — full-screen themed UI replaces the TV dashboard when that game is active

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js + Express |
| Real-time | WebSockets (`ws`) |
| QR Codes | `qrcode` npm package |
| Frontend | Vanilla HTML / CSS / JS (no framework) |
| Hosting | Render.com |

---

## Local Development

### Prerequisites
- Node.js 18+

### Setup
```bash
git clone https://github.com/binhftw/baby-shower-bash.git
cd baby-shower-bash
npm install
npm run dev             # Starts on port 3001 with auto-reload
```

### Screens

| Screen | URL |
|--------|-----|
| TV Dashboard | http://localhost:3001/ |
| Host Panel | http://localhost:3001/host |
| Belly Game (guest) | http://localhost:3001/play/belly |
| Poop Game (guest) | http://localhost:3001/play/poop |
| IVF Game (guest) | http://localhost:3001/play/ivf |
| Price is Right (guest) | http://localhost:3001/play/priceisright |

### Testing on Phones
When `npm run dev` starts, the console prints your local network IP. Open that on any phone connected to the same WiFi:
```
Share with phones on WiFi: http://192.168.1.x:3001
```

---

## How to Play

### Recommended Setup
- **TV / projector** — open the TV screen (`/`) in full-screen browser
- **Host laptop** — open the host panel (`/host`)
- **Guests** — scan the QR code on the TV for each game

### Host Flow
1. Open `/host` on your laptop
2. Enter the correct answer and an optional prize for each game
3. Click **Start Game** — QR codes go live on the TV screen
4. Watch guesses appear on the TV dashboard in real time
5. Click **End Game & Reveal Winner** — winner appears on TV with confetti!
6. If there's a tie, click **Spin the Wheel!** on the TV card to randomly pick a winner
7. Reset and start the next game

### Guest Flow
1. Scan the QR code on the TV with your phone
2. Enter your name and your guess
3. Hit Submit — your entry appears on the TV instantly
4. Watch the TV for the winner reveal!

---

## Deploy to Render

1. Push code to GitHub
2. Go to [render.com](https://render.com) and sign up (free, no credit card needed)
3. Click **New > Web Service** and connect your GitHub repo
4. Render auto-detects `render.yaml` — click **Deploy**
5. Wait ~2 minutes for your live URL (e.g. `https://baby-shower-bash.onrender.com`)

### Environment Variables (set in Render dashboard)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port (Render sets this to `10000` automatically) |
| `NODE_ENV` | `development` | Set to `production` on Render |
| `MOM_NAME` | `Baby Shower` | Mom's name used in game descriptions |
| `APP_TITLE` | `Baby Shower Bash` | App title shown on all screens |
| `HOST_PASSWORD` | *(empty)* | Optional password to protect the host panel |

---

## Project Structure

```
baby-shower-bash/
├── server.js           # Express + WebSocket server, game state, all API routes
├── public/
│   ├── tv.html         # TV dashboard (show on projector/TV)
│   ├── host.html       # Host control panel (laptop)
│   └── play.html       # Guest mobile experience (phone)
├── render.yaml         # Render.com deploy config
└── package.json
```

---

## Adding a New Game

1. **`server.js`** — add a game object inside `createInitialState()`:
   ```js
   mygame: {
     id: 'mygame',
     title: 'My New Game',
     emoji: '🎮',
     description: 'Short description shown to guests',
     status: 'waiting',     // 'waiting' | 'active' | 'reveal'
     correctAnswer: null,
     entries: [],
     winner: null,
     tiedEntries: [],
     prize: ''
   }
   ```

2. **`server.js`** — add winner logic in `calculateWinner()`. For closest-number games, add `|| game.id === 'mygame'` to the existing belly/IVF condition — no new logic needed.

3. **`play.html`** *(optional)* — add an `else if (gameId === 'mygame')` branch in `handleState()` to customize the input label, placeholder, and submit button text for guests.

4. The TV dashboard and host panel render generically from state — no changes needed there for basic games.

---

## Live URL

🌐 **https://baby-shower-bash.onrender.com**

> **Note:** Render free tier spins down after 15 minutes of inactivity. The first visit after idle may take ~30 seconds to wake up. Consider upgrading to a paid tier before the event for instant response times.
