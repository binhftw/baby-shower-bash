# Baby Shower Bash

Real-time multiplayer baby shower party game app. Jackbox-style: a TV shows the live dashboard, guests play on their phones via QR codes, and the host controls everything from a laptop.

## Games

### Guess the Belly Size
Guests guess the circumference of the mom-to-be's belly in inches or cm. Closest guess wins!

### Name That Poop
A candy bar is melted in a diaper. Guests guess which candy it is. First correct match wins!

## Tech Stack

- **Backend**: Node.js + Express
- **Real-time**: WebSockets (ws)
- **QR Codes**: qrcode npm package
- **Frontend**: Vanilla HTML/CSS/JS
- **Hosting**: Render.com (free tier)

## Local Development

### Prerequisites
- Node.js 18+

### Setup
```bash
git clone https://github.com/YOUR_USERNAME/baby-shower-bash.git
cd baby-shower-bash
cp .env.example .env    # Edit with your values
npm install
npm run dev             # Starts on port 3001 with hot-reload
```

### Screens
- **TV Screen**: http://localhost:3001/
- **Host Panel**: http://localhost:3001/host
- **Belly Game**: http://localhost:3001/play/belly
- **Poop Game**: http://localhost:3001/play/poop

### Testing on Phones (Local Network)
When you run `npm run dev`, the server prints your local network IP. Open that URL on any phone connected to the same WiFi:
```
Share with phones on WiFi: http://192.168.1.x:3001
```

## How to Play

### Host Flow
1. Open `/host` on your laptop
2. Enter the correct answer and prize for each game
3. Click "Start Game" — QR codes go live on the TV
4. Wait for guests to submit answers
5. Click "End Game & Reveal Winner" — winner shows on TV with confetti!
6. Reset and play again if needed

### Guest Flow
1. Scan the QR code on the TV screen with your phone
2. Enter your name and answer
3. Submit! You can change your answer before the game ends
4. Watch the TV for the winner reveal

## Deploy to Render

1. Push your code to GitHub
2. Go to https://render.com and sign up (free, no credit card)
3. Click **New > Web Service**
4. Connect your GitHub repo `baby-shower-bash`
5. Render auto-detects the `render.yaml` config — click **Deploy**
6. Wait ~2 minutes for your live URL (e.g. `https://baby-shower-bash.onrender.com`)
7. Set environment variables in the Render dashboard:
   - `MOM_NAME` — name for the belly game description
   - `APP_TITLE` — custom app title (optional)

## Adding More Games

To add a new game:

1. Add a new game object in `server.js` inside `createInitialState()`:
   ```js
   newgame: {
     id: 'newgame',
     title: 'My New Game',
     emoji: '🎮',
     description: 'Description here',
     status: 'waiting',
     correctAnswer: null,
     entries: [],
     winner: null,
     prize: ''
   }
   ```

2. Add winner logic in the `calculateWinner()` function

3. The TV, host, and play screens automatically render any game in the state — no frontend changes needed for basic games

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port (Render uses 10000) |
| NODE_ENV | development | Environment mode |
| MOM_NAME | Baby Shower | Name used in game descriptions |
| APP_TITLE | Baby Shower Bash | App title shown on screens |
| HOST_PASSWORD | (empty) | Optional host panel password |
