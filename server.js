const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const QRCode = require('qrcode');
const path = require('path');
const { networkInterfaces } = require('os');

// Load .env if present (no dotenv dependency needed — just read process.env)
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const MOM_NAME = process.env.MOM_NAME || 'Mai & Binh';
const APP_TITLE = process.env.APP_TITLE || 'Cafe bebe';
const HOST_PASSWORD = process.env.HOST_PASSWORD || '';

// Feature flags
const FEATURES = {
  requireNameEntry: true,
  showCorrectAnswerOnTV: false,
  allowLateSubmissions: false,
  testMode: NODE_ENV !== 'production'
};

// ── In-Memory Game State ──────────────────────────────────────────────
function createInitialState() {
  return {
    games: {
      belly: {
        id: 'belly',
        title: 'Guess the Belly Size',
        emoji: '\u2615',
        description: `How big is Mai's belly? Take your best guess!`,
        status: 'waiting',
        correctAnswer: null,
        entries: [],
        winner: null,
        tiedEntries: [],
        prize: ''
      },
      poop: {
        id: 'poop',
        title: 'Name That Poop',
        emoji: '\ud83c\udf6b',
        description: 'Which candy bar was melted in the diaper?',
        status: 'waiting',
        correctAnswer: null,
        entries: [],
        winner: null,
        tiedEntries: [],
        prize: ''
      },
      ivf: {
        id: 'ivf',
        title: 'IVF Needle Count',
        emoji: '\ud83d\udc89',
        description: "How many needles did Mai endure to bring this little bean to life? Take your best guess!",
        status: 'waiting',
        correctAnswer: null,
        entries: [],
        winner: null,
        tiedEntries: [],
        prize: ''
      }
    },
    priceIsRight: {
      active: false,
      status: 'idle',       // idle | lobby | round-active | round-reveal | finished
      currentRound: 0,
      rounds: [],
      players: [],           // all player names (original case)
      advancingPlayers: [],  // lowercase names allowed to play current round
      eliminatedPlayers: [], // cumulative lowercase eliminated names
      winner: null,          // { name, guess, diff }
      prize: ''
    }
  };
}

let state = createInitialState();
let entryCounter = 0;

// ── Express App ───────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── WebSocket Server ──────────────────────────────────────────────────
const wss = new WebSocketServer({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  // Send current state immediately on connect
  ws.send(JSON.stringify({ type: 'state', data: state }));

  ws.on('close', () => clients.delete(ws));
  ws.on('error', () => clients.delete(ws));
});

function broadcast() {
  const msg = JSON.stringify({ type: 'state', data: state });
  for (const ws of clients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

// ── Helper: get base URL ──────────────────────────────────────────────
function getBaseURL(req) {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

// ── API: Config ───────────────────────────────────────────────────────
app.get('/api/config', (req, res) => {
  res.json({ features: FEATURES, momName: MOM_NAME, appTitle: APP_TITLE });
});

// ── API: QR Codes ─────────────────────────────────────────────────────
app.get('/api/qr/:gameId', async (req, res) => {
  const { gameId } = req.params;
  if (!state.games[gameId] && gameId !== 'priceisright') return res.status(404).json({ error: 'Game not found' });

  const base = getBaseURL(req);
  const url = `${base}/play/${gameId}`;
  try {
    const qr = await QRCode.toDataURL(url, {
      width: 256,
      margin: 2,
      color: { dark: '#1c0a2e', light: '#fffbf500' }
    });
    res.json({ qr, url });
  } catch (err) {
    res.status(500).json({ error: 'QR generation failed' });
  }
});

// ── API: Guest Submit Entry ───────────────────────────────────────────
app.post('/api/entry/:gameId', (req, res) => {
  const { gameId } = req.params;
  const game = state.games[gameId];
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.status !== 'active' && !FEATURES.allowLateSubmissions) {
    return res.status(400).json({ error: 'Game is not accepting answers right now' });
  }

  const { name, answer, unit } = req.body;
  if (!name || !answer) return res.status(400).json({ error: 'Name and answer are required' });

  const trimmedName = name.trim();
  const trimmedAnswer = String(answer).trim();

  // Duplicate name handling: update existing entry
  const existing = game.entries.find(e => e.name.toLowerCase() === trimmedName.toLowerCase());
  if (existing) {
    existing.answer = trimmedAnswer;
    existing.updatedAt = Date.now();
    broadcast();
    return res.json({ success: true, updated: true, entry: existing });
  }

  const entry = {
    id: ++entryCounter,
    name: trimmedName,
    answer: trimmedAnswer,
    timestamp: Date.now()
  };
  game.entries.push(entry);
  broadcast();
  res.json({ success: true, entry });
});

// ── API: Host Setup Game ──────────────────────────────────────────────
app.post('/api/host/setup/:gameId', (req, res) => {
  const { gameId } = req.params;
  const game = state.games[gameId];
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const { correctAnswer, prize } = req.body;
  if (!correctAnswer) return res.status(400).json({ error: 'Correct answer is required' });

  game.correctAnswer = String(correctAnswer).trim();
  game.prize = prize || '';
  game.status = 'active';
  game.winner = null;
  broadcast();
  res.json({ success: true, game });
});

// ── API: Host Reveal Winner ───────────────────────────────────────────
app.post('/api/host/reveal/:gameId', (req, res) => {
  const { gameId } = req.params;
  const game = state.games[gameId];
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.status !== 'active') return res.status(400).json({ error: 'Game is not active' });
  if (game.entries.length === 0) return res.status(400).json({ error: 'No entries to judge' });

  game.status = 'reveal';
  const result = calculateWinner(game);
  game.winner = result.winner;
  game.tiedEntries = result.tiedEntries || [];
  broadcast();
  res.json({ success: true, winner: game.winner, tiedEntries: game.tiedEntries });
});

// ── API: Host Set Tiebreaker Winner ───────────────────────────────────
app.post('/api/host/tiebreak/:gameId', (req, res) => {
  const { gameId } = req.params;
  const game = state.games[gameId];
  if (!game) return res.status(404).json({ error: 'Game not found' });
  if (game.status !== 'reveal') return res.status(400).json({ error: 'Game is not in reveal state' });

  const { winnerId } = req.body;
  const winner = game.entries.find(e => e.id === winnerId);
  if (!winner) return res.status(404).json({ error: 'Entry not found' });

  game.winner = winner;
  game.tiedEntries = [];
  broadcast();
  res.json({ success: true, winner });
});

// ── API: Host Reset Game ──────────────────────────────────────────────
app.post('/api/host/reset/:gameId', (req, res) => {
  const { gameId } = req.params;
  const game = state.games[gameId];
  if (!game) return res.status(404).json({ error: 'Game not found' });

  game.status = 'waiting';
  game.correctAnswer = null;
  game.entries = [];
  game.winner = null;
  game.tiedEntries = [];
  game.prize = '';
  broadcast();
  res.json({ success: true });
});

// ── API: Host Reset ALL Games ─────────────────────────────────────────
app.post('/api/host/reset-all', (req, res) => {
  state = createInitialState();
  broadcast();
  res.json({ success: true });
});

// ── API: Delete Single Entry ──────────────────────────────────────────
app.delete('/api/host/entry/:gameId/:entryId', (req, res) => {
  const { gameId, entryId } = req.params;
  const game = state.games[gameId];
  if (!game) return res.status(404).json({ error: 'Game not found' });

  const idx = game.entries.findIndex(e => e.id === parseInt(entryId));
  if (idx === -1) return res.status(404).json({ error: 'Entry not found' });

  game.entries.splice(idx, 1);
  broadcast();
  res.json({ success: true });
});

// ── API: Delete ALL Entries for a Game ────────────────────────────────
app.delete('/api/host/entries/:gameId', (req, res) => {
  const { gameId } = req.params;
  const game = state.games[gameId];
  if (!game) return res.status(404).json({ error: 'Game not found' });

  game.entries = [];
  broadcast();
  res.json({ success: true });
});

// ── Price is Right: API ────────────────────────────────────────────────

// Start the game
app.post('/api/host/pir/start', (req, res) => {
  const pir = state.priceIsRight;
  const { prize } = req.body;
  pir.active = true;
  pir.status = 'lobby';
  pir.currentRound = 0;
  pir.rounds = [];
  pir.players = [];
  pir.advancingPlayers = [];
  pir.eliminatedPlayers = [];
  pir.winner = null;
  pir.prize = prize || '';
  broadcast();
  res.json({ success: true });
});

// Set up and start a round
app.post('/api/host/pir/set-round', (req, res) => {
  const pir = state.priceIsRight;
  if (!pir.active) return res.status(400).json({ error: 'Game not active' });
  if (pir.status !== 'lobby' && pir.status !== 'round-reveal') {
    return res.status(400).json({ error: 'Cannot start a new round right now' });
  }

  const { productName, correctPrice } = req.body;
  if (!productName || correctPrice === undefined) {
    return res.status(400).json({ error: 'Product name and correct price are required' });
  }

  pir.currentRound++;
  pir.rounds.push({
    roundNumber: pir.currentRound,
    productName: productName.trim(),
    correctPrice: parseFloat(correctPrice),
    entries: [],
    results: [],
    advancingNames: [],
    eliminatedNames: []
  });
  pir.status = 'round-active';
  broadcast();
  res.json({ success: true, round: pir.currentRound });
});

// Guest submits a price guess
app.post('/api/pir/entry', (req, res) => {
  const pir = state.priceIsRight;
  if (!pir.active || pir.status !== 'round-active') {
    return res.status(400).json({ error: 'Not accepting guesses right now' });
  }

  const { name, guess } = req.body;
  if (!name || guess === undefined) return res.status(400).json({ error: 'Name and guess are required' });

  const trimmedName = name.trim();
  const nameLower = trimmedName.toLowerCase();
  const parsedGuess = parseFloat(guess);
  if (isNaN(parsedGuess)) return res.status(400).json({ error: 'Guess must be a number' });

  // Round 2+: check if player is eligible
  if (pir.currentRound > 1 && !pir.advancingPlayers.includes(nameLower)) {
    return res.status(403).json({ error: 'You did not advance to this round' });
  }

  const round = pir.rounds[pir.currentRound - 1];

  // Duplicate name: update existing guess
  const existing = round.entries.find(e => e.name.toLowerCase() === nameLower);
  if (existing) {
    existing.guess = parsedGuess;
    existing.timestamp = Date.now();
    broadcast();
    return res.json({ success: true, updated: true });
  }

  // New entry
  round.entries.push({
    id: ++entryCounter,
    name: trimmedName,
    guess: parsedGuess,
    timestamp: Date.now()
  });

  // Track player in round 1
  if (pir.currentRound === 1 && !pir.players.find(p => p.toLowerCase() === nameLower)) {
    pir.players.push(trimmedName);
  }

  broadcast();
  res.json({ success: true });
});

// End current round — calculate advancement
app.post('/api/host/pir/end-round', (req, res) => {
  const pir = state.priceIsRight;
  if (!pir.active || pir.status !== 'round-active') {
    return res.status(400).json({ error: 'No active round to end' });
  }

  const round = pir.rounds[pir.currentRound - 1];
  if (round.entries.length === 0) {
    return res.status(400).json({ error: 'No guesses submitted yet' });
  }

  // Sort entries by closeness to correct price
  // Tiebreak: under beats over, then earlier timestamp
  const correct = round.correctPrice;
  round.results = [...round.entries].sort((a, b) => {
    const diffA = Math.abs(a.guess - correct);
    const diffB = Math.abs(b.guess - correct);
    if (diffA !== diffB) return diffA - diffB;
    // Tiebreak: prefer under (not over)
    const overA = a.guess > correct ? 1 : 0;
    const overB = b.guess > correct ? 1 : 0;
    if (overA !== overB) return overA - overB;
    // Tiebreak: earlier timestamp
    return a.timestamp - b.timestamp;
  });

  // Add diff to each result
  round.results.forEach(r => { r.diff = Math.abs(r.guess - correct); });

  // Calculate how many advance
  let advanceCount;
  if (pir.currentRound === 1) {
    advanceCount = Math.min(5, Math.max(2, Math.ceil(round.entries.length * 0.2)));
    // If very few players, just advance them all to keep it fun
    if (round.entries.length <= 5) advanceCount = Math.min(round.entries.length, 5);
    if (round.entries.length <= 2) advanceCount = round.entries.length;
  } else if (pir.currentRound === 2) {
    advanceCount = Math.min(2, round.entries.length);
  } else {
    advanceCount = 1; // Final round — one winner
  }

  // Determine who advances
  const advancing = round.results.slice(0, advanceCount);
  const eliminated = round.results.slice(advanceCount);

  round.advancingNames = advancing.map(e => e.name.toLowerCase());
  round.eliminatedNames = eliminated.map(e => e.name.toLowerCase());

  pir.advancingPlayers = [...round.advancingNames];
  pir.eliminatedPlayers = [...new Set([...pir.eliminatedPlayers, ...round.eliminatedNames])];

  // If final round, set winner
  if (pir.currentRound === 3 || (pir.currentRound >= 2 && advanceCount <= 1)) {
    pir.winner = advancing[0] ? {
      name: advancing[0].name,
      guess: advancing[0].guess,
      diff: advancing[0].diff
    } : null;
    pir.status = 'finished';
  } else {
    pir.status = 'round-reveal';
  }

  broadcast();
  res.json({ success: true, results: round.results, advancingNames: round.advancingNames });
});

// End the Price is Right game entirely — return to normal TV
app.post('/api/host/pir/end', (req, res) => {
  const pir = state.priceIsRight;
  pir.active = false;
  pir.status = 'idle';
  pir.currentRound = 0;
  pir.rounds = [];
  pir.players = [];
  pir.advancingPlayers = [];
  pir.eliminatedPlayers = [];
  pir.winner = null;
  pir.prize = '';
  broadcast();
  res.json({ success: true });
});

// ── Page Routes ───────────────────────────────────────────────────────
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'tv.html')));
app.get('/host', (req, res) => res.sendFile(path.join(__dirname, 'public', 'host.html')));
app.get('/play/:gameId', (req, res) => res.sendFile(path.join(__dirname, 'public', 'play.html')));

// ── Winner Calculation ────────────────────────────────────────────────
// Returns { winner, tiedEntries }
// If there's a tie, winner is null and tiedEntries has the tied group.
// The TV screen runs a random name picker to break the tie live.
function calculateWinner(game) {
  if (game.id === 'belly' || game.id === 'ivf') {
    const correct = parseFloat(game.correctAnswer);
    if (isNaN(correct)) return { winner: game.entries[0] || null, tiedEntries: [] };

    let smallestDiff = Infinity;

    // Find the smallest difference
    for (const entry of game.entries) {
      const guess = parseFloat(entry.answer);
      if (isNaN(guess)) continue;
      const diff = Math.abs(guess - correct);
      if (diff < smallestDiff) smallestDiff = diff;
    }

    // Collect all entries that share the smallest difference
    const tied = game.entries.filter(e => {
      const guess = parseFloat(e.answer);
      if (isNaN(guess)) return false;
      return Math.abs(guess - correct) === smallestDiff;
    });

    if (tied.length === 1) return { winner: tied[0], tiedEntries: [] };
    if (tied.length > 1) return { winner: null, tiedEntries: tied };
    return { winner: game.entries[0] || null, tiedEntries: [] };
  }

  if (game.id === 'poop') {
    const correct = game.correctAnswer.toLowerCase().trim();

    // First pass: exact matches
    const exactMatches = game.entries.filter(e => e.answer.toLowerCase().trim() === correct);
    if (exactMatches.length === 1) return { winner: exactMatches[0], tiedEntries: [] };
    if (exactMatches.length > 1) return { winner: null, tiedEntries: exactMatches };

    // Second pass: substring matches
    const subMatches = game.entries.filter(e => {
      const guess = e.answer.toLowerCase().trim();
      return correct.includes(guess) || guess.includes(correct);
    });
    if (subMatches.length === 1) return { winner: subMatches[0], tiedEntries: [] };
    if (subMatches.length > 1) return { winner: null, tiedEntries: subMatches };

    // No match — first entry by default
    return { winner: game.entries[0] || null, tiedEntries: [] };
  }

  return { winner: null, tiedEntries: [] };
}

// ── Local Network IP Detection ────────────────────────────────────────
function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return 'localhost';
}

// ── Start Server ──────────────────────────────────────────────────────
server.listen(PORT, () => {
  const localIP = getLocalIP();
  console.log('\n\u2728 Baby Shower Bash is running!\n');
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Network:  http://${localIP}:${PORT}`);
  console.log('');
  console.log(`   \ud83d\udcfa TV Screen:   http://localhost:${PORT}/`);
  console.log(`   \ud83c\udfae Host Panel:  http://localhost:${PORT}/host`);
  console.log(`   \ud83d\udcf1 Belly Game:  http://localhost:${PORT}/play/belly`);
  console.log(`   \ud83d\udcf1 Poop Game:   http://localhost:${PORT}/play/poop`);
  console.log(`   \ud83d\udcf1 Price Right: http://localhost:${PORT}/play/priceisright`);
  console.log('');
  console.log(`   \ud83d\udce1 Share with phones on WiFi: http://${localIP}:${PORT}`);
  console.log('');
});
