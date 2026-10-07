/**
 * playerStorage.js
 * Player Authentication, Game Progress Persistence, Leaderboards, and Contest Counter
 * for JVāN Haute Streetwear Labs
 */

const STORAGE_PLAYERS_KEY = 'jvan_player_logins';
const STORAGE_ACTIVE_PLAYER_KEY = 'jvan_active_player';
const STORAGE_LEADERBOARD_DEVIL_KEY = 'jvan_leaderboard_devil';
const STORAGE_LEADERBOARD_RPG_KEY = 'jvan_leaderboard_rpg';
const STORAGE_CONTEST_KEY = 'jvan_contest_entries';

// Realistic fashion-forward initial seed players for rich atelier atmosphere
const DEFAULT_SEED_PLAYERS = [
  {
    playerId: 'PLR-KAI77',
    alias: 'KAI // TOKYO',
    contactType: 'instagram',
    contactValue: '@kai.tokyo_archive',
    firstLoginAt: '2026-10-01T14:22:00.000Z',
    lastActiveAt: '2026-10-06T18:40:00.000Z',
    lastGamePlayed: 'runway_devil',
    gamesPlayed: ['runway_devil', 'rpg'],
    highestLevelDevil: 8,
    totalAttemptsDevil: 24,
    highestFloorRpg: 5,
    highestScoreRpg: 2840,
    rpgSwatches: 19
  },
  {
    playerId: 'PLR-VAL92',
    alias: 'VALENTINA.STUDIO',
    contactType: 'email',
    contactValue: 'val@atelier-milan.it',
    firstLoginAt: '2026-10-02T09:15:00.000Z',
    lastActiveAt: '2026-10-06T16:10:00.000Z',
    lastGamePlayed: 'rpg',
    gamesPlayed: ['rpg'],
    highestLevelDevil: 3,
    totalAttemptsDevil: 7,
    highestFloorRpg: 7,
    highestScoreRpg: 4120,
    rpgSwatches: 31
  },
  {
    playerId: 'PLR-CYB44',
    alias: 'CYBER_TAILOR',
    contactType: 'instagram',
    contactValue: '@cybertailor.raw',
    firstLoginAt: '2026-10-03T20:05:00.000Z',
    lastActiveAt: '2026-10-06T21:30:00.000Z',
    lastGamePlayed: 'runway_devil',
    gamesPlayed: ['runway_devil'],
    highestLevelDevil: 11,
    totalAttemptsDevil: 42,
    highestFloorRpg: 2,
    highestScoreRpg: 850,
    rpgSwatches: 6
  },
  {
    playerId: 'PLR-OPI19',
    alias: 'OPIUM_REBEL',
    contactType: 'email',
    contactValue: 'opium.rebel@darkcouture.co',
    firstLoginAt: '2026-10-04T11:45:00.000Z',
    lastActiveAt: '2026-10-06T19:55:00.000Z',
    lastGamePlayed: 'runway_devil',
    gamesPlayed: ['runway_devil', 'rpg'],
    highestLevelDevil: 6,
    totalAttemptsDevil: 18,
    highestFloorRpg: 4,
    highestScoreRpg: 1960,
    rpgSwatches: 14
  },
  {
    playerId: 'PLR-MON07',
    alias: 'MONOCHROME_07',
    contactType: 'instagram',
    contactValue: '@mono.chrome_lab',
    firstLoginAt: '2026-10-05T13:10:00.000Z',
    lastActiveAt: '2026-10-06T22:15:00.000Z',
    lastGamePlayed: 'rpg',
    gamesPlayed: ['rpg'],
    highestLevelDevil: 2,
    totalAttemptsDevil: 5,
    highestFloorRpg: 6,
    highestScoreRpg: 3450,
    rpgSwatches: 24
  }
];

// Initial seeded contest submissions if localStorage is empty
const DEFAULT_SEED_SUBMISSIONS = [
  {
    submissionId: 'JVN-SS26-8821-4921',
    contactType: 'instagram',
    contactValue: '@hyper_silk_paris',
    email: '',
    instagram: '@hyper_silk_paris',
    isVerified: true,
    files: [
      { name: 'hyper_silk_tee_front.png', size: '2.40 MB', dimensions: '3000 × 3000 px' },
      { name: 'hyper_silk_hoodie_back.png', size: '3.10 MB', dimensions: '3200 × 3200 px' }
    ],
    previewImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%230c0d12"/><circle cx="150" cy="150" r="80" stroke="%23dfba73" stroke-width="2" fill="none"/><text x="150" y="155" fill="%23dfba73" font-size="14" font-family="monospace" text-anchor="middle">SS26 HYPER SILK</text></svg>',
    submittedAt: '2026-10-05T16:45:00.000Z'
  },
  {
    submissionId: 'JVN-SS26-4419-7812',
    contactType: 'email',
    contactValue: 'alex.design@avantgarde.de',
    email: 'alex.design@avantgarde.de',
    instagram: '',
    isVerified: true,
    files: [
      { name: 'avant_drape_graphic.png', size: '1.85 MB', dimensions: '2800 × 2800 px' }
    ],
    previewImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%230c0d12"/><polygon points="150,50 250,230 50,230" stroke="%23dfba73" stroke-width="2" fill="none"/><text x="150" y="160" fill="%23dfba73" font-size="14" font-family="monospace" text-anchor="middle">AVANT DRAPE</text></svg>',
    submittedAt: '2026-10-06T11:20:00.000Z'
  },
  {
    submissionId: 'JVN-SS26-3190-6641',
    contactType: 'instagram',
    contactValue: '@distressed_couture',
    email: '',
    instagram: '@distressed_couture',
    isVerified: true,
    files: [
      { name: 'distressed_stitch_logo.png', size: '2.10 MB', dimensions: '2400 × 2400 px' },
      { name: 'backprint_embroidery.png', size: '2.90 MB', dimensions: '3000 × 3000 px' }
    ],
    previewImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300"><rect width="300" height="300" fill="%230c0d12"/><line x1="60" y1="60" x2="240" y2="240" stroke="%23dfba73" stroke-width="3"/><line x1="240" y1="60" x2="60" y2="240" stroke="%23dfba73" stroke-width="3"/><text x="150" y="155" fill="%23ffffff" font-size="13" font-family="monospace" text-anchor="middle">DISTRESSED STITCH</text></svg>',
    submittedAt: '2026-10-06T20:10:00.000Z'
  }
];

// =============================================================================
// PLAYER AUTH & LOGINS
// =============================================================================

/**
 * Returns array of all registered players
 */
export const getAllPlayers = () => {
  try {
    const raw = localStorage.getItem(STORAGE_PLAYERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_PLAYERS_KEY, JSON.stringify(DEFAULT_SEED_PLAYERS));
      return [...DEFAULT_SEED_PLAYERS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_SEED_PLAYERS];
  } catch (err) {
    console.error("Error reading players:", err);
    return [...DEFAULT_SEED_PLAYERS];
  }
};

/**
 * Returns currently logged-in player object, or null
 */
export const getActivePlayer = () => {
  try {
    const rawActive = localStorage.getItem(STORAGE_ACTIVE_PLAYER_KEY);
    if (!rawActive) return null;
    const active = JSON.parse(rawActive);
    // Refresh with latest data from full list
    const players = getAllPlayers();
    const found = players.find(p => p.playerId === active.playerId);
    return found || active;
  } catch (_) {
    return null;
  }
};

/**
 * Authenticates or registers a player, saves session, returns player object
 */
export const loginPlayer = ({ alias, contactType, contactValue, game }) => {
  const cleanAlias = (alias || '').trim().toUpperCase();
  const cleanContact = (contactValue || '').trim();
  const players = getAllPlayers();

  // Check if player with this alias or contact already exists
  let player = players.find(
    p => p.alias.toUpperCase() === cleanAlias || (cleanContact && p.contactValue.toLowerCase() === cleanContact.toLowerCase())
  );

  const now = new Date().toISOString();

  if (player) {
    // Update existing player record
    player.lastActiveAt = now;
    if (game) {
      player.lastGamePlayed = game;
      if (!player.gamesPlayed.includes(game)) player.gamesPlayed.push(game);
    }
    if (cleanContact && !player.contactValue) {
      player.contactType = contactType;
      player.contactValue = cleanContact;
    }
  } else {
    // Create new player
    const pid = `PLR-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    player = {
      playerId: pid,
      alias: cleanAlias,
      contactType: contactType || 'instagram',
      contactValue: cleanContact,
      firstLoginAt: now,
      lastActiveAt: now,
      lastGamePlayed: game || 'general',
      gamesPlayed: game ? [game] : ['runway_devil'],
      highestLevelDevil: 1,
      totalAttemptsDevil: 0,
      highestFloorRpg: 1,
      highestScoreRpg: 0,
      rpgSwatches: 0
    };
    players.unshift(player);
  }

  // Persist
  localStorage.setItem(STORAGE_PLAYERS_KEY, JSON.stringify(players));
  localStorage.setItem(STORAGE_ACTIVE_PLAYER_KEY, JSON.stringify(player));

  return player;
};

/**
 * Clears current player session (logout)
 */
export const logoutPlayer = () => {
  try {
    localStorage.removeItem(STORAGE_ACTIVE_PLAYER_KEY);
    return true;
  } catch (_) {
    return false;
  }
};

/**
 * Updates player progress in storage and synchronizes leaderboards
 */
export const updatePlayerProgress = (playerId, updateData) => {
  if (!playerId) return null;
  const players = getAllPlayers();
  const player = players.find(p => p.playerId === playerId);
  if (!player) return null;

  // Merge updates
  if (updateData.highestLevelDevil !== undefined) {
    player.highestLevelDevil = Math.max(player.highestLevelDevil || 1, updateData.highestLevelDevil);
  }
  if (updateData.totalAttemptsDevil !== undefined) {
    player.totalAttemptsDevil = (player.totalAttemptsDevil || 0) + updateData.totalAttemptsDevil;
  }
  if (updateData.highestFloorRpg !== undefined) {
    player.highestFloorRpg = Math.max(player.highestFloorRpg || 1, updateData.highestFloorRpg);
  }
  if (updateData.highestScoreRpg !== undefined) {
    player.highestScoreRpg = Math.max(player.highestScoreRpg || 0, updateData.highestScoreRpg);
  }
  if (updateData.rpgSwatches !== undefined) {
    player.rpgSwatches = Math.max(player.rpgSwatches || 0, updateData.rpgSwatches);
  }
  if (updateData.lastGamePlayed) {
    player.lastGamePlayed = updateData.lastGamePlayed;
    if (!player.gamesPlayed.includes(updateData.lastGamePlayed)) {
      player.gamesPlayed.push(updateData.lastGamePlayed);
    }
  }

  player.lastActiveAt = new Date().toISOString();

  // Save back
  localStorage.setItem(STORAGE_PLAYERS_KEY, JSON.stringify(players));
  const active = getActivePlayer();
  if (active && active.playerId === playerId) {
    localStorage.setItem(STORAGE_ACTIVE_PLAYER_KEY, JSON.stringify(player));
  }

  return player;
};

/**
 * Deletes a player account (Admin only)
 */
export const deletePlayer = (playerId) => {
  const players = getAllPlayers().filter(p => p.playerId !== playerId);
  localStorage.setItem(STORAGE_PLAYERS_KEY, JSON.stringify(players));
  const active = getActivePlayer();
  if (active && active.playerId === playerId) {
    localStorage.removeItem(STORAGE_ACTIVE_PLAYER_KEY);
  }
  return players;
};

/**
 * Clears all player logins (Admin only)
 */
export const clearAllPlayers = () => {
  localStorage.setItem(STORAGE_PLAYERS_KEY, JSON.stringify([]));
  localStorage.removeItem(STORAGE_ACTIVE_PLAYER_KEY);
  return [];
};

// =============================================================================
// LEADERBOARDS
// =============================================================================

/**
 * Returns sorted leaderboard for a given game ('runway_devil' or 'rpg')
 */
export const getLeaderboard = (gameType) => {
  const players = getAllPlayers();

  if (gameType === 'runway_devil') {
    // Sort by highest level (descending), then lowest attempts (ascending)
    return players
      .filter(p => (p.highestLevelDevil || 1) > 0)
      .map(p => ({
        playerId: p.playerId,
        alias: p.alias,
        contactValue: p.contactValue,
        stage: p.highestLevelDevil || 1,
        attempts: p.totalAttemptsDevil || 0,
        lastActiveAt: p.lastActiveAt
      }))
      .sort((a, b) => {
        if (b.stage !== a.stage) return b.stage - a.stage;
        return a.attempts - b.attempts;
      });
  } else {
    // RPG: Sort by highest score (descending), then floor (descending)
    return players
      .filter(p => (p.highestScoreRpg || 0) > 0 || (p.highestFloorRpg || 1) > 0)
      .map(p => ({
        playerId: p.playerId,
        alias: p.alias,
        contactValue: p.contactValue,
        floor: p.highestFloorRpg || 1,
        score: p.highestScoreRpg || 0,
        swatches: p.rpgSwatches || 0,
        lastActiveAt: p.lastActiveAt
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.floor - a.floor;
      });
  }
};

// =============================================================================
// CONTEST SUBMISSIONS & LIVE COUNTER
// =============================================================================

/**
 * Returns all contest submission records
 */
export const getContestSubmissions = () => {
  try {
    const raw = localStorage.getItem(STORAGE_CONTEST_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_CONTEST_KEY, JSON.stringify(DEFAULT_SEED_SUBMISSIONS));
      return [...DEFAULT_SEED_SUBMISSIONS];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : [...DEFAULT_SEED_SUBMISSIONS];
  } catch (err) {
    console.error("Error reading submissions:", err);
    return [...DEFAULT_SEED_SUBMISSIONS];
  }
};

/**
 * Returns total count of contest submissions (strictly anonymized count for public counter)
 */
export const getContestSubmissionsCount = () => {
  return getContestSubmissions().length;
};

/**
 * Deletes a contest submission by ID
 */
export const deleteContestSubmission = (submissionId) => {
  const current = getContestSubmissions();
  const updated = current.filter(s => s.submissionId !== submissionId);
  localStorage.setItem(STORAGE_CONTEST_KEY, JSON.stringify(updated));
  return updated;
};

