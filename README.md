# Cafe Bébé 🍼☕

**Real-time multiplayer baby shower party game app** — Jackbox-style: the TV shows a live dashboard, guests play on their phones via QR codes, and the host controls everything from a laptop.

> Built for Mai & Binh's baby shower. *A little bean is brewing!*

---

## Games

### 🤰 Guess the Belly Size
Guests guess the circumference of the mom-to-be's belly in inches. Closest guess wins. Host enters the real measurement at reveal time.

### 💩 Name That Poop
A candy bar is melted in a diaper. Guests type which candy it is. Host enters the correct answer — closest text match wins.

### 💉 IVF Needle Count
Guests guess how many needles the mom-to-be endured during IVF. A physical jar of needles is displayed at the event as a visual clue. Closest number wins.

### 💰 Price is Right (Baby Edition)
5-round elimination game. All 5 rounds are configured before the game starts. Guests guess the price of baby products shown on the TV. Closest guess wins each round; bottom 50% are eliminated. Last one standing wins the prize.

**Key PIR features:**
- Pre-configure all 5 products (name, price, optional image URL) + prize + round timer before starting
- Live lobby: guests join by name before Round 1 — TV shows player bubbles pop in as each person joins
- Curtain reveal animation when each round starts
- Persistent QR code on TV during rounds so late arrivals can still join
- Countdown ring on TV + countdown bar on guest phones
- Live guess tally on guest phone after submitting ("4 of ~5 people have locked in their guess")
- Entry pop toasts on TV as guesses arrive
- Server auto-ends round when timer expires

---

## Features

- **Live TV dashboard** — 2-column game cards update in real time as guesses come in
- **Guest Hub** — `/play` landing page lists all games with live open/closed status; guests scan once and navigate freely between games
- **QR codes** — auto-generated per game; guests scan and play on their phones instantly
- **Name persistence** — player name saved to `localStorage` so guests only type it once across all games all night
- **Back navigation** — "← All Games" link on every game page to return to the hub
- **Host panel** — start games, set correct answers & prizes, reveal winners
- **Winner reveal** — full-screen confetti explosion with winner name and prize
- **Tiebreaker spinner** — slot-machine style wheel randomly picks a winner when scores tie
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

| Screen | URL | Who uses it |
|--------|-----|-------------|
| TV Dashboard | `http://localhost:3001/` | Projector / TV |
| Host Panel | `http://localhost:3001/host` | Host laptop |
| Guest Hub | `http://localhost:3001/play` | Guests (scan once) |
| Belly Game | `http://localhost:3001/play/belly` | Guests |
| Poop Game | `http://localhost:3001/play/poop` | Guests |
| IVF Game | `http://localhost:3001/play/ivf` | Guests |
| Price is Right | `http://localhost:3001/play/priceisright` | Guests |

### Testing on Phones
When `npm run dev` starts, the console prints your local network IP. Open that on any phone connected to the same WiFi:
```
Share with phones on WiFi: http://192.168.1.x:3001
```

---

## How to Play

### Recommended Setup
- **TV / projector** — open `http://<your-url>/` in full-screen browser
- **Host laptop** — open `http://<your-url>/host`
- **Guests** — scan the QR code on the TV to reach the Guest Hub, then tap any open game

### Regular Game Flow (Belly / Poop / IVF)

**Host:**
1. Open `/host` and find the game you want to run
2. Enter the correct answer and an optional prize
3. Click **Start Game** — QR codes go live on the TV screen
4. Watch guesses appear on the TV in real time
5. Click **Reveal Winner** — winner appears on TV with confetti
6. If there's a tie, click **Spin the Wheel!** to randomly pick a winner
7. Reset and move to the next game

**Guests:**
1. Scan the QR code on the TV (or tap the game on the hub)
2. Enter your name (auto-filled after first game all night)
3. Enter your guess and hit Submit
4. Watch the TV for the reveal!

### Price is Right Flow

**Host (before the party):**
1. Fill in all 5 round configs: product name, correct price, optional image URL
2. Set the prize and round timer (default 90s; set 0 for no timer)
3. Click **Start Price is Right** — lobby opens, QR appears on TV

**During the party:**
1. Guests scan and join the lobby by entering their name
2. Click **Start Round 1** — curtains open on TV revealing the product; countdown begins
3. After guesses are in (or timer fires), click **End Round** — TV shows advancing vs eliminated
4. Click **Start Round 2** — repeat through Round 5
5. Round 5 produces a single winner automatically

**Guests:**
1. Scan QR → enter name → tap **Join Game**
2. See the live lobby with everyone who's joined
3. When round starts: see the product name, countdown bar, and guess input
4. After guessing: see a live tally of how many others have locked in their guess
5. Between rounds: see if you advanced or were eliminated instantly on your phone

---

## Deploy to Render

1. Push code to GitHub (`main` branch)
2. Go to [render.com](https://render.com) and sign up (free, no credit card needed)
3. Click **New > Web Service** and connect your GitHub repo
4. Render auto-detects `render.yaml` — click **Deploy**
5. Wait ~2 minutes for your live URL (e.g. `https://baby-shower-bash.onrender.com`)
6. Every `git push origin main` auto-deploys

### Environment Variables (set in Render dashboard)

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port (Render sets this to `10000` automatically) |
| `NODE_ENV` | `development` | Set to `production` on Render |
| `MOM_NAME` | `Baby Shower` | Mom's name used in game descriptions |
| `APP_TITLE` | `Baby Shower Bash` | App title shown on all screens |
| `HOST_PASSWORD` | *(empty)* | Optional password to protect the host panel |

> **Note:** Render free tier spins down after 15 minutes of inactivity. The first visit after idle may take ~30 seconds to wake up. Consider upgrading to a paid tier before the event for instant response times.

---

## Project Structure

```
baby-shower-bash/
├── server.js           # Express + WebSocket server, game state, all API routes
├── public/
│   ├── tv.html         # TV dashboard (show on projector/TV)
│   ├── host.html       # Host control panel (laptop)
│   ├── hub.html        # Guest hub — lists all games with live status
│   └── play.html       # Guest mobile experience (phone)
├── render.yaml         # Render.com deploy config
└── package.json
```

---

## API Reference

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/` | TV dashboard |
| `GET` | `/host` | Host panel |
| `GET` | `/play` | Guest hub |
| `GET` | `/play/:gameId` | Guest game page |
| `GET` | `/api/qr/:gameId` | QR code image + URL for a game (`hub` returns hub QR) |
| `POST` | `/api/entry/:gameId` | Guest submits an answer |
| `POST` | `/api/host/setup/:gameId` | Host starts a game with correct answer + prize |
| `POST` | `/api/host/reveal/:gameId` | Host reveals the winner |
| `POST` | `/api/host/reset/:gameId` | Host resets a game |
| `POST` | `/api/pir/join` | Guest joins the PIR lobby |
| `POST` | `/api/pir/entry` | Guest submits a PIR price guess |
| `POST` | `/api/host/pir/start` | Host starts PIR with all 5 round configs + timer |
| `POST` | `/api/host/pir/set-round` | Host starts the next round |
| `POST` | `/api/host/pir/end-round` | Host manually ends the current round |
| `POST` | `/api/host/pir/end` | Host ends the entire PIR game |

---

## Live URL

🌐 **https://baby-shower-bash.onrender.com**
