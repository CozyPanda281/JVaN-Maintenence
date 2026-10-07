import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { soundEngine } from '../audio/soundEngine';
import { getActivePlayer, updatePlayerProgress } from '../utils/playerStorage';

/**
 * RunwayDevilFullScreen - Precision Platformer with Deceptive "Level Devil" Tricks
 * Features:
 * - Unpredictable, comedic, and deceptive trap mechanics that remain certified solvable
 * - Slower, subtler, and 100% hidden moving parts (identical textures to solid platforms)
 * - Minimal hooded streetwear runner with dynamic trailing fabric physics & ghost trails
 * - Atmospheric dark luxury aesthetic with radial spotlight, ambient floating dust motes
 * - Landing shockwaves, jump puffs, death ribbon dissolve, and rotating door vortex
 * - Curated deceptive stages 1-10 + infinite procedural generator with randomized deceptions
 * - Desktop keyboard controls & responsive mobile touch controls
 */
export const RunwayDevilFullScreen = ({ isOpen, onClose, onOpenLeaderboard }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [activePlayer, setActivePlayer] = useState(null);
  const [level, setLevel] = useState(1);
  const [attempts, setAttempts] = useState(1);
  const [soundMuted, setSoundMuted] = useState(soundEngine.isMuted);
  const [stageName, setStageName] = useState('STAGE 01: THE INNOCENT SPRINT');

  // Mutable Platformer Game Engine State
  const engineRef = useRef({
    level: 1,
    attempts: 1,
    tileSize: 38,
    cols: 28,
    rows: 16,
    canvasW: 1064,
    canvasH: 608,
    gravity: 0.56,
    invertedGravity: false,

    // Screen Shake FX
    screenShake: 0,

    // Player state
    player: {
      x: 100,
      y: 300,
      w: 22,
      h: 30,
      vx: 0,
      vy: 0,
      speed: 4.5,
      jumpForce: -10.6,
      grounded: false,
      coyoteTimer: 0,
      jumpBuffer: 0,
      facing: 'right',
      scaleX: 1,
      scaleY: 1,
      idleTimer: 0,
      // Dynamic trailing fabric points (5-point silk cloak physics)
      capeTrail: [
        { x: 100, y: 300 },
        { x: 96, y: 302 },
        { x: 92, y: 305 },
        { x: 86, y: 309 },
        { x: 80, y: 314 }
      ],
      isDead: false,
      respawnTimer: 0
    },

    spawnPoint: { x: 100, y: 300 },

    // Level map & interactive entities
    platforms: [],
    hazards: [],       // Fixed or hidden popup spikes
    tricks: [],        // Deceptive reactive triggers
    door: {
      x: 900,
      y: 400,
      w: 32,
      h: 46,
      targetX: 900,
      targetY: 400,
      evaded: false,
      escaping: false,
      isMimic: false,
      dissolved: false
    },
    mimicDoor: null,

    // FX Systems
    particles: [],
    ambientDust: [],
    ghostTrails: [],
    shockwaves: [],
    dissolveParticles: [],
    doorVortexAngle: 0,

    // Inputs
    keys: { left: false, right: false, jump: false, jumpHeld: false },
    animId: null
  });

  // Calculate full-screen grid dimensions dynamically
  const calculateGrid = () => {
    const screenW = window.innerWidth;
    const hudHeight = 54;
    const screenH = Math.max(320, window.innerHeight - hudHeight);

    // Responsive tile sizing
    const tileSize = screenW < 640 ? 30 : (screenW < 1024 ? 34 : 38);
    const cols = Math.max(22, Math.floor(screenW / tileSize));
    const rows = Math.max(13, Math.floor(screenH / tileSize));

    return {
      tileSize,
      cols,
      rows,
      canvasW: cols * tileSize,
      canvasH: rows * tileSize
    };
  };

  // Helper to create platform block (ALL platforms share IDENTICAL visual styling to keep traps hidden)
  const makePlatform = (c, r, w = 1, h = 1, type = 'solid', opts = {}) => {
    const ts = engineRef.current.tileSize;
    return {
      id: `${c}_${r}_${Math.random()}`,
      col: c,
      row: r,
      x: c * ts,
      y: r * ts,
      w: w * ts,
      h: h * ts,
      type, // 'solid' | 'collapsing' | 'shifting' | 'rising' | 'sinking' | 'falling_weight' | 'mirage'
      vy: 0,
      vx: 0,
      origX: c * ts,
      origY: r * ts,
      targetX: opts.targetX !== undefined ? opts.targetX : c * ts,
      targetY: opts.targetY !== undefined ? opts.targetY : r * ts,
      shiftDist: opts.shiftDist || 0,
      shiftSpeed: opts.shiftSpeed || 1.1,
      triggered: false,
      triggerDelay: opts.triggerDelay !== undefined ? opts.triggerDelay : 16,
      shakeTimer: 0,
      visible: type !== 'mirage',
      revealed: type !== 'mirage',
      ...opts
    };
  };

  // Helper to create spike hazard (Popup spikes are completely flush & hidden until triggered)
  const makeSpike = (c, r, direction = 'up', type = 'fixed', opts = {}) => {
    const ts = engineRef.current.tileSize;
    return {
      id: `spike_${c}_${r}_${Math.random()}`,
      col: c,
      row: r,
      x: c * ts + 4,
      y: r * ts,
      w: ts - 8,
      h: ts,
      direction,
      type, // 'fixed' | 'popup'
      active: type === 'fixed',
      popped: type === 'fixed',
      popProgress: type === 'fixed' ? 1 : 0,
      triggerDist: opts.triggerDist || 1.8,
      popSpeed: opts.popSpeed || 0.08,
      shake: 0,
      ...opts
    };
  };

  // Initialize Ambient Golden Floating Dust Particles
  const initAmbientDust = (w, h) => {
    const dust = [];
    for (let i = 0; i < 30; i++) {
      dust.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -Math.random() * 0.4 - 0.1,
        size: Math.random() * 2.2 + 0.8,
        alpha: Math.random() * 0.5 + 0.2,
        pulse: Math.random() * Math.PI * 2
      });
    }
    return dust;
  };

  // =========================================================================
  // LEVEL GENERATION (CURATED LEVELS 1-10 + INFINITE PROCEDURAL ENGINE)
  // All traps are subtly placed, visually seamless, and mathematically solvable!
  // =========================================================================
  const buildLevel = (lvl) => {
    const engine = engineRef.current;
    engine.level = lvl;
    setLevel(lvl);

    const dims = calculateGrid();
    engine.tileSize = dims.tileSize;
    engine.cols = dims.cols;
    engine.rows = dims.rows;
    engine.canvasW = dims.canvasW;
    engine.canvasH = dims.canvasH;

    const ts = engine.tileSize;
    const cols = engine.cols;
    const rows = engine.rows;
    const groundRow = rows - 3;

    engine.platforms = [];
    engine.hazards = [];
    engine.tricks = [];
    engine.particles = [];
    engine.ghostTrails = [];
    engine.shockwaves = [];
    engine.dissolveParticles = [];
    engine.mimicDoor = null;
    engine.invertedGravity = false;
    engine.screenShake = 0;

    if (engine.ambientDust.length === 0) {
      engine.ambientDust = initAmbientDust(dims.canvasW, dims.canvasH);
    }

    // Default spawn (left runway)
    engine.spawnPoint = { x: 2.5 * ts, y: (groundRow - 1.2) * ts };
    engine.player.x = engine.spawnPoint.x;
    engine.player.y = engine.spawnPoint.y;
    engine.player.vx = 0;
    engine.player.vy = 0;
    engine.player.grounded = true;
    engine.player.isDead = false;

    // Outer boundary walls (Left, Right, Ceiling)
    engine.platforms.push({ x: -20, y: 0, w: 20, h: rows * ts, type: 'wall', visible: false });
    engine.platforms.push({ x: cols * ts, y: 0, w: 20, h: rows * ts, type: 'wall', visible: false });
    engine.platforms.push({ x: 0, y: -20, w: cols * ts, h: 20, type: 'wall', visible: false });

    // Setup curated and procedural level layouts
    if (lvl === 1) {
      setStageName('STAGE 01: THE INNOCENT SPRINT');
      // Looks like an effortless run to the door.
      // But at col 7-8, the tiles sink gently after stepping on them!
      // If the player jumps, the landing block gently glides 1.2 tiles to the right.
      engine.platforms.push(makePlatform(0, groundRow, 7, 3));
      // Subtle sinking trap tiles
      engine.platforms.push(makePlatform(7, groundRow, 2, 3, 'sinking', { shiftDist: 2.2 * ts, shiftSpeed: 1.2 }));
      // Landing runway that shifts right subtly on approach
      const destination = makePlatform(11, groundRow, cols - 11, 3, 'shifting', {
        shiftDist: 1.2 * ts,
        shiftSpeed: 0.8
      });
      engine.platforms.push(destination);

      const doorX = (cols - 4) * ts;
      const doorY = (groundRow - 1.25) * ts;
      engine.door = {
        origX: doorX,
        origY: doorY,
        x: doorX,
        y: doorY,
        w: 32,
        h: 46,
        targetX: doorX,
        targetY: doorY,
        evaded: false,
        escaping: false
      };
    } else if (lvl === 2) {
      setStageName('STAGE 02: THE SHY PORTAL');
      // Stepping stones across small gaps.
      // The exit door rests on the stone at col 11.
      // When approached (crossing col 9), it slides away smoothly and hops onto a pedestal!
      engine.platforms.push(makePlatform(0, groundRow, 5, 3));
      engine.platforms.push(makePlatform(6, groundRow, 3, 3));
      engine.platforms.push(makePlatform(10, groundRow, 4, 3)); // Where door initially sits

      // Dynamically generate stepping stones all the way across to the final pedestal (certified solvable)
      let stepCol = 15;
      while (stepCol < cols - 8) {
        engine.platforms.push(makePlatform(stepCol, groundRow, 3, 3));
        stepCol += 4; // 3 width + 1 tile gap = 100% solvable jump
      }

      // Approach steps leading up to the elevated pedestal
      engine.platforms.push(makePlatform(cols - 8, groundRow - 1, 2.5, 2)); // Step 1: 1 tile higher
      engine.platforms.push(makePlatform(cols - 5, groundRow - 2, 5, 5));   // Pedestal: 2 tiles higher

      const initialDoorX = 11.5 * ts;
      const initialDoorY = (groundRow - 1.25) * ts;
      engine.door = {
        origX: initialDoorX,
        origY: initialDoorY,
        x: initialDoorX,
        y: initialDoorY,
        w: 32,
        h: 46,
        targetX: (cols - 3.5) * ts,
        targetY: (groundRow - 3.25) * ts, // Elevates cleanly onto pedestal!
        evaded: false,
        escaping: false,
        triggerCol: 9
      };
    } else if (lvl === 3) {
      setStageName('STAGE 03: CONCEALED NEEDLES');
      // Clean runway with pop-up needles that are completely flush until approached.
      engine.platforms.push(makePlatform(0, groundRow, cols, 3));
      // Pop-up spikes concealed flush inside the floor
      engine.hazards.push(makeSpike(9, groundRow - 1, 'up', 'popup', { triggerDist: 2.2, popSpeed: 0.08 }));
      engine.hazards.push(makeSpike(10, groundRow - 1, 'up', 'popup', { triggerDist: 2.2, popSpeed: 0.08 }));

      // High stepping ledge allowing player to bypass the second set (height 2 tiles = 76px, well within player's 100px jump)
      engine.platforms.push(makePlatform(13, groundRow - 2, 3, 1));
      engine.hazards.push(makeSpike(18, groundRow - 1, 'up', 'popup', { triggerDist: 2.0, popSpeed: 0.08 }));

      const doorX = (cols - 4) * ts;
      const doorY = (groundRow - 1.25) * ts;
      engine.door = {
        origX: doorX,
        origY: doorY,
        x: doorX,
        y: doorY,
        w: 32,
        h: 46,
        targetX: doorX,
        targetY: doorY,
        evaded: false,
        escaping: false
      };
    } else if (lvl === 4) {
      setStageName('STAGE 04: THE ELEVATOR TRICK');
      // Tall barrier that requires stepping on an elevating block.
      // Overhead spikes threaten the player if they don't hop off the elevator quickly!
      engine.platforms.push(makePlatform(0, groundRow, 7, 3));
      // Elevating block
      const elevator = makePlatform(8, groundRow, 2.5, 1, 'rising', {
        targetY: (groundRow - 3) * ts,
        shiftSpeed: 1.1
      });
      engine.platforms.push(elevator);

      // Ceiling spikes directly above the elevator
      engine.hazards.push(makeSpike(8, 2, 'down', 'fixed'));
      engine.hazards.push(makeSpike(9, 2, 'down', 'fixed'));

      // Destination barrier & runway
      engine.platforms.push(makePlatform(12, groundRow - 2.5, 2, 5));
      engine.platforms.push(makePlatform(14, groundRow, cols - 14, 3));

      const doorX = (cols - 4) * ts;
      const doorY = (groundRow - 1.25) * ts;
      engine.door = {
        origX: doorX,
        origY: doorY,
        x: doorX,
        y: doorY,
        w: 32,
        h: 46,
        targetX: doorX,
        targetY: doorY,
        evaded: false,
        escaping: false
      };
    } else if (lvl === 5) {
      setStageName('STAGE 05: SINKING ARCHIPELAGO');
      // Stepping stones over a chasm, each sinking gently when stepped on!
      engine.platforms.push(makePlatform(0, groundRow, 4, 3));

      let stepCol = 5;
      while (stepCol < cols - 8) {
        engine.platforms.push(makePlatform(stepCol, groundRow - 1, 2, 1, 'sinking', {
          shiftDist: 2.6 * ts,
          shiftSpeed: 1.05
        }));
        stepCol += 3.5; // 2 width + 1.5 tile gap = 100% solvable
      }

      engine.platforms.push(makePlatform(cols - 7, groundRow, 7, 3));

      const doorX = (cols - 4) * ts;
      const doorY = (groundRow - 1.25) * ts;
      engine.door = {
        origX: doorX,
        origY: doorY,
        x: doorX,
        y: doorY,
        w: 32,
        h: 46,
        targetX: doorX,
        targetY: doorY,
        evaded: false,
        escaping: false
      };
    } else if (lvl === 6) {
      setStageName('STAGE 06: THE DESCENDING BEAM');
      // Full runway where an overhead ceiling beam descends near the end,
      // serving as the essential stepping stone to reach an elevated door platform!
      engine.platforms.push(makePlatform(0, groundRow, cols, 3));

      // Elevated door platform at end of runway
      engine.platforms.push(makePlatform(cols - 5, groundRow - 2.5, 5, 4));

      // Descending beam stepping stone placed right in front of the elevated platform
      const beam = makePlatform(cols - 8.5, 1, 2.5, 2, 'falling_weight', {
        targetY: (groundRow - 1.5) * ts,
        triggerCol: cols - 13,
        shiftSpeed: 1.1
      });
      engine.platforms.push(beam);

      const doorX = (cols - 3) * ts;
      const doorY = (groundRow - 3.75) * ts;
      engine.door = {
        origX: doorX,
        origY: doorY,
        x: doorX,
        y: doorY,
        w: 32,
        h: 46,
        targetX: doorX,
        targetY: doorY,
        evaded: false,
        escaping: false
      };
    } else if (lvl === 7) {
      setStageName('STAGE 07: THE GHOST RUNWAY');
      // Wide abyss where invisible mirage steps materialize underfoot as you run!
      engine.platforms.push(makePlatform(0, groundRow, 5, 3));
      // Mirage stepping blocks
      engine.platforms.push(makePlatform(6, groundRow, 2, 1, 'mirage'));
      engine.platforms.push(makePlatform(9, groundRow - 1, 2, 1, 'mirage'));
      engine.platforms.push(makePlatform(12, groundRow - 2, 2, 1, 'mirage'));
      // The last one sinks gently after reveal!
      engine.platforms.push(makePlatform(15, groundRow - 1, 2, 1, 'sinking', { shiftDist: 2 * ts }));

      engine.platforms.push(makePlatform(18, groundRow, Math.max(8, cols - 18), 3));

      const doorX = (cols - 4) * ts;
      const doorY = (groundRow - 1.25) * ts;
      engine.door = {
        origX: doorX,
        origY: doorY,
        x: doorX,
        y: doorY,
        w: 32,
        h: 46,
        targetX: doorX,
        targetY: doorY,
        evaded: false,
        escaping: false
      };
    } else if (lvl === 8) {
      setStageName('STAGE 08: THE MIMIC DOOR');
      // Two identical doors!
      // The first door is a deceptive mimic that dissolves into golden smoke.
      // The real door powers up right behind it!
      engine.platforms.push(makePlatform(0, groundRow, cols, 3));

      // Mimic Fake Door at col 12
      engine.mimicDoor = {
        x: 12 * ts,
        y: (groundRow - 1.25) * ts,
        w: 32,
        h: 46,
        dissolved: false
      };

      // Real Door at end of runway
      const doorX = (cols - 4) * ts;
      const doorY = (groundRow - 1.25) * ts;
      engine.door = {
        origX: doorX,
        origY: doorY,
        x: doorX,
        y: doorY,
        w: 32,
        h: 46,
        targetX: doorX,
        targetY: doorY,
        evaded: false,
        escaping: false
      };
    } else if (lvl === 9) {
      setStageName('STAGE 09: GRAVITY FLIP');
      // Runway with gravity inversion mirror gate
      engine.platforms.push(makePlatform(0, groundRow, 8, 3));
      // Ceiling runway for inverted gravity - starts at col 6 for safe landing overhead
      engine.platforms.push(makePlatform(6, 2, cols - 6, 2));

      // Gravity Inversion Gate
      engine.tricks.push({
        type: 'gravity_gate',
        x: 7.5 * ts,
        y: (groundRow - 2.5) * ts,
        w: 24,
        h: 70
      });

      // Ceiling door
      const doorX = (cols - 4) * ts;
      const doorY = 4 * ts;
      engine.door = {
        origX: doorX,
        origY: doorY,
        x: doorX,
        y: doorY,
        w: 32,
        h: 46,
        targetX: doorX,
        targetY: doorY,
        evaded: false,
        escaping: false
      };
    } else if (lvl === 10) {
      setStageName('STAGE 10: RUNWAY DEVIL GAUNTLET');
      // Symphony of subtle deceptions:
      // Sinking floor -> shifting stepping stone -> flush pop-up spikes -> fleeing door!
      engine.platforms.push(makePlatform(0, groundRow, 5, 3));
      engine.platforms.push(makePlatform(5, groundRow, 2, 3, 'sinking', { shiftDist: 2.2 * ts, shiftSpeed: 1.1 }));
      const shift = makePlatform(8.5, groundRow - 1.5, 3, 1, 'shifting', { shiftDist: 1.5 * ts, shiftSpeed: 0.85 });
      engine.platforms.push(shift);
      engine.platforms.push(makePlatform(13, groundRow, cols - 13, 3));
      engine.hazards.push(makeSpike(17, groundRow - 1, 'up', 'popup', { triggerDist: 2.0, popSpeed: 0.08 }));

      const initialDoorX = 19 * ts;
      const initialDoorY = (groundRow - 1.25) * ts;
      engine.door = {
        origX: initialDoorX,
        origY: initialDoorY,
        x: initialDoorX,
        y: initialDoorY,
        w: 32,
        h: 46,
        targetX: (cols - 4) * ts,
        targetY: (groundRow - 1.25) * ts,
        evaded: false,
        escaping: false,
        triggerCol: 15
      };
    } else {
      // =====================================================================
      // INFINITE PROCEDURAL ENGINE (LEVELS 11+)
      // Certified Solvable with Randomized Deceptive Micro-Variations
      // =====================================================================
      setStageName(`STAGE ${lvl}: PROCEDURAL GAUNTLET #${lvl}`);

      let currCol = 0;
      engine.platforms.push(makePlatform(currCol, groundRow, 5, 3));
      currCol += 5;

      const chunkTargetCol = cols - 8;

      while (currCol < chunkTargetCol) {
        const remaining = chunkTargetCol - currCol;
        if (remaining < 3) break;

        // Certified solvable jump gap (1.5 to 2.5 tiles max)
        const gap = Math.min(2.5, 1.5 + Math.random());
        const chunkType = Math.floor(Math.random() * 5);
        const jitter = (Math.random() * 0.4 - 0.2);

        if (chunkType === 0) {
          // Sinking Stepping Stone
          currCol += 1;
          engine.platforms.push(makePlatform(currCol, groundRow - 1, 2, 1, 'sinking', {
            shiftDist: (2.2 + jitter) * ts,
            shiftSpeed: 1.1
          }));
          currCol += 2 + gap;
          engine.platforms.push(makePlatform(currCol, groundRow, 4, 3));
          currCol += 4;
        } else if (chunkType === 1) {
          // Flush Hidden Spike Runway
          engine.platforms.push(makePlatform(currCol, groundRow, 5, 3));
          engine.hazards.push(makeSpike(currCol + 2, groundRow - 1, 'up', 'popup', {
            triggerDist: 1.8 + jitter,
            popSpeed: 0.08
          }));
          currCol += 5;
        } else if (chunkType === 2) {
          // Slower Shifting Ledge (reachable 1.5 height)
          currCol += gap;
          const shifting = makePlatform(currCol, groundRow - 1.5, 3, 1, 'shifting', {
            shiftDist: (Math.random() > 0.5 ? 1.5 : -1.2) * ts,
            shiftSpeed: 0.85
          });
          engine.platforms.push(shifting);
          currCol += 3 + gap;
          engine.platforms.push(makePlatform(currCol, groundRow, 4, 3));
          currCol += 4;
        } else if (chunkType === 3) {
          // Descending Beam / Weight
          const weight = makePlatform(currCol + 1, 2, 2, 2, 'falling_weight', {
            targetY: (groundRow - 1.5) * ts,
            triggerCol: currCol,
            shiftSpeed: 1.05
          });
          engine.platforms.push(weight);
          engine.platforms.push(makePlatform(currCol, groundRow, 5, 3));
          currCol += 5;
        } else {
          // Mirage Step
          currCol += 1;
          engine.platforms.push(makePlatform(currCol, groundRow - 1, 2, 1, 'mirage'));
          currCol += 2 + gap;
          engine.platforms.push(makePlatform(currCol, groundRow, 4, 3));
          currCol += 4;
        }
      }

      // Seamless bridge to final destination runway (guarantees zero impossible gaps)
      if (currCol < cols - 7) {
        engine.platforms.push(makePlatform(currCol, groundRow, (cols - 7) - currCol + 1, 3));
      }
      engine.platforms.push(makePlatform(cols - 7, groundRow, 7, 3));

      // 50% probability on higher levels: door evades smoothly once
      const doorEvades = lvl % 2 === 0;
      const finalDoorX = (cols - 4) * ts;
      const finalDoorY = (groundRow - 1.25) * ts;
      engine.door = {
        origX: doorEvades ? (cols - 6) * ts : finalDoorX,
        origY: finalDoorY,
        x: doorEvades ? (cols - 6) * ts : finalDoorX,
        y: finalDoorY,
        w: 32,
        h: 46,
        targetX: finalDoorX,
        targetY: finalDoorY,
        evaded: !doorEvades,
        escaping: false,
        triggerCol: cols - 8
      };
    }
  };

  // Fluid Death Dissolve & Instant Respawn Animation
  const killPlayer = () => {
    const engine = engineRef.current;
    if (engine.player.isDead) return;

    engine.player.isDead = true;
    engine.attempts += 1;
    setAttempts(engine.attempts);
    soundEngine.playPlayerPoof();

    // Persist attempts to active player
    const active = getActivePlayer();
    if (active) {
      updatePlayerProgress(active.playerId, {
        totalAttemptsDevil: 1,
        lastGamePlayed: 'runway_devil'
      });
    }

    // Trigger subtle screen shake
    engine.screenShake = 6;

    // Spawn 16 swirling silk ribbon particles that drift towards the spawn point
    const p = engine.player;
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const spd = Math.random() * 3 + 1.5;
      engine.dissolveParticles.push({
        x: p.x + p.w / 2,
        y: p.y + p.h / 2,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd - 2,
        targetX: engine.spawnPoint.x + p.w / 2,
        targetY: engine.spawnPoint.y + p.h / 2,
        alpha: 1,
        size: Math.random() * 3.5 + 2,
        color: i % 2 === 0 ? '#dfba73' : '#f43f5e',
        progress: 0
      });
    }

    // Re-condense at spawn after ~260ms of fluid ribbon flight
    setTimeout(() => {
      engine.player.x = engine.spawnPoint.x;
      engine.player.y = engine.spawnPoint.y;
      engine.player.vx = 0;
      engine.player.vy = 0;
      engine.player.grounded = true;
      engine.player.isDead = false;
      engine.invertedGravity = false;

      // Spawn re-materialize shockwave ring
      engine.shockwaves.push({
        x: engine.spawnPoint.x + engine.player.w / 2,
        y: engine.spawnPoint.y + engine.player.h,
        r: 4,
        maxR: 28,
        alpha: 0.9,
        color: '#dfba73'
      });

      // Reset level tricks smoothly
      engine.platforms.forEach(plat => {
        plat.x = plat.origX;
        plat.y = plat.origY;
        plat.vy = 0;
        plat.vx = 0;
        plat.triggered = false;
        plat.shakeTimer = 0;
        if (plat.type === 'mirage') {
          plat.visible = false;
          plat.revealed = false;
        }
      });
      engine.hazards.forEach(h => {
        if (h.type === 'popup') {
          h.active = false;
          h.popped = false;
          h.popProgress = 0;
        }
      });
      if (engine.mimicDoor) {
        engine.mimicDoor.dissolved = false;
      }
      if (engine.door.origX !== undefined) {
        engine.door.x = engine.door.origX;
        engine.door.y = engine.door.origY;
        engine.door.evaded = false;
        engine.door.escaping = false;
      }
    }, 260);
  };

  // =========================================================================
  // MAIN GAME LOOP & PHYSICS UPDATE
  // =========================================================================
  useEffect(() => {
    if (!isOpen) return;
    soundEngine.init();

    const active = getActivePlayer();
    setActivePlayer(active);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const engine = engineRef.current;

    buildLevel(1);

    // Keyboard handlers
    const handleKeyDown = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') engine.keys.left = true;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') engine.keys.right = true;
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        if (!engine.keys.jumpHeld) {
          engine.player.jumpBuffer = 6;
          engine.keys.jump = true;
          engine.keys.jumpHeld = true;
        }
      }
      if (e.code === 'KeyR') killPlayer();
      if (e.code === 'Escape' || e.key === 'Escape') onClose();
    };

    const handleKeyUp = (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') engine.keys.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') engine.keys.right = false;
      if (e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'Space') {
        engine.keys.jump = false;
        engine.keys.jumpHeld = false;
        if (!engine.invertedGravity && engine.player.vy < -3) {
          engine.player.vy = -3;
        } else if (engine.invertedGravity && engine.player.vy > 3) {
          engine.player.vy = 3;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Window resize
    const handleResize = () => {
      const dims = calculateGrid();
      engine.tileSize = dims.tileSize;
      engine.cols = dims.cols;
      engine.rows = dims.rows;
      engine.canvasW = dims.canvasW;
      engine.canvasH = dims.canvasH;
      canvas.width = dims.canvasW;
      canvas.height = dims.canvasH;
      engine.ambientDust = initAmbientDust(dims.canvasW, dims.canvasH);
      buildLevel(engine.level);
    };
    window.addEventListener('resize', handleResize);
    canvas.width = engine.canvasW;
    canvas.height = engine.canvasH;

    // --- 60FPS GAME LOOP ---
    const updateAndRender = () => {
      const p = engine.player;
      const grav = engine.invertedGravity ? -engine.gravity : engine.gravity;

      // Update screen shake decay
      if (engine.screenShake > 0) {
        engine.screenShake *= 0.88;
        if (engine.screenShake < 0.2) engine.screenShake = 0;
      }

      // Update Door Vortex rotation angle
      engine.doorVortexAngle += 0.025;

      if (!p.isDead) {
        p.idleTimer += 1;

        // 1. Horizontal Movement
        if (engine.keys.left) {
          p.vx = -p.speed;
          p.facing = 'left';
          p.idleTimer = 0;
        } else if (engine.keys.right) {
          p.vx = p.speed;
          p.facing = 'right';
          p.idleTimer = 0;
        } else {
          p.vx *= 0.72;
          if (Math.abs(p.vx) < 0.2) p.vx = 0;
        }

        // Record ghost trail afterimage when dashing or falling
        if ((Math.abs(p.vx) > 2.5 || Math.abs(p.vy) > 3) && Math.random() > 0.4) {
          engine.ghostTrails.push({
            x: p.x,
            y: p.y,
            facing: p.facing,
            scaleX: p.scaleX,
            scaleY: p.scaleY,
            alpha: 0.45
          });
        }

        // 2. Vertical Movement & Gravity
        p.vy += grav;
        if (Math.abs(p.vy) > 14) p.vy = Math.sign(p.vy) * 14;

        // Coyote Time & Jump Buffering
        if (p.grounded) {
          p.coyoteTimer = 6;
        } else if (p.coyoteTimer > 0) {
          p.coyoteTimer -= 1;
        }

        if (p.jumpBuffer > 0) {
          p.jumpBuffer -= 1;
          if (p.coyoteTimer > 0) {
            p.vy = engine.invertedGravity ? -p.jumpForce : p.jumpForce;
            p.grounded = false;
            p.coyoteTimer = 0;
            p.jumpBuffer = 0;
            p.scaleX = 0.8;
            p.scaleY = 1.3;
            soundEngine.playJump();

            // Spawn Jump Launch Dust Shockwave
            engine.shockwaves.push({
              x: p.x + p.w / 2,
              y: engine.invertedGravity ? p.y : p.y + p.h,
              r: 2,
              maxR: 18,
              alpha: 0.8,
              color: 'rgba(223, 186, 115, 0.6)'
            });
          }
        }

        p.x += p.vx;
        p.y += p.vy;

        // 3. Platform Collisions
        p.grounded = false;
        engine.platforms.forEach(plat => {
          if (!plat.visible && plat.type === 'mirage') {
            // Check if player approaches mirage block (generous detection margin)
            const detectMargin = engine.tileSize * 1.4;
            if (
              p.x + p.w > plat.x - detectMargin && p.x < plat.x + plat.w + detectMargin &&
              p.y + p.h > plat.y - detectMargin && p.y < plat.y + plat.h + detectMargin
            ) {
              plat.visible = true;
              plat.revealed = true;
              soundEngine.playClue();
              engine.shockwaves.push({
                x: plat.x + plat.w / 2,
                y: plat.y + plat.h / 2,
                r: 4,
                maxR: plat.w * 0.7,
                alpha: 0.8,
                color: '#dfba73'
              });
            }
            if (!plat.visible) return;
          }

          // AABB Collision Resolution
          if (
            p.x + p.w > plat.x &&
            p.x < plat.x + plat.w &&
            p.y + p.h > plat.y &&
            p.y < plat.y + plat.h
          ) {
            const prevY = p.y - p.vy;
            const prevX = p.x - p.vx;

            // Landing on top (normal gravity)
            if (!engine.invertedGravity && prevY + p.h <= plat.y + 6) {
              p.y = plat.y - p.h;
              if (p.vy > 4) {
                p.scaleX = 1.25;
                p.scaleY = 0.75;
                soundEngine.playLand();
                // Landing shockwave
                engine.shockwaves.push({
                  x: p.x + p.w / 2,
                  y: plat.y,
                  r: 3,
                  maxR: 22,
                  alpha: 0.7,
                  color: 'rgba(223, 186, 115, 0.5)'
                });
              }
              p.vy = 0;
              p.grounded = true;

              // Trigger subtle platform traps
              if ((plat.type === 'collapsing' || plat.type === 'sinking' || plat.type === 'rising' || plat.type === 'shifting') && !plat.triggered) {
                plat.triggered = true;
                soundEngine.playTrollTrigger();
              }
            }
            // Landing on ceiling (inverted gravity)
            else if (engine.invertedGravity && prevY >= plat.y + plat.h - 6) {
              p.y = plat.y + plat.h;
              p.vy = 0;
              p.grounded = true;
            }
            // Hitting ceiling / bottom of platform
            else if (!engine.invertedGravity && prevY >= plat.y + plat.h - 6) {
              p.y = plat.y + plat.h;
              p.vy = 0;
            }
            // Side collisions
            else if (prevX + p.w <= plat.x + 4) {
              p.x = plat.x - p.w;
              p.vx = 0;
            } else if (prevX >= plat.x + plat.w - 4) {
              p.x = plat.x + plat.w;
              p.vx = 0;
            }
          }
        });

        // 4. Update Subtle Platform Movement & Traps (Slower & smoother!)
        engine.platforms.forEach(plat => {
          // Subtle shake phase before movement
          if (plat.triggered && plat.shakeTimer < plat.triggerDelay) {
            plat.shakeTimer += 1;
            // Emit subtle dust mote from seams
            if (plat.shakeTimer % 4 === 0) {
              engine.particles.push({
                x: plat.x + Math.random() * plat.w,
                y: plat.y,
                vx: (Math.random() - 0.5) * 0.8,
                vy: -Math.random() * 0.8,
                size: 2,
                color: 'rgba(223, 186, 115, 0.35)',
                life: 15
              });
            }
          }

          // Active Sinking Platform (Slower, graceful glide!)
          if (plat.type === 'sinking' && plat.triggered && plat.shakeTimer >= plat.triggerDelay) {
            plat.vy = Math.min(3.2, plat.vy + 0.15);
            plat.y += plat.vy;
          }

          // Active Rising Elevator (Smooth ascent with passenger carry!)
          if (plat.type === 'rising' && plat.triggered && plat.shakeTimer >= plat.triggerDelay) {
            if (plat.y > plat.targetY) {
              const prevPlatY = plat.y;
              plat.y -= plat.shiftSpeed || 1.1;
              const deltaY = plat.y - prevPlatY;
              // If player is standing on this elevator, carry them up smoothly
              if (p.grounded && !engine.invertedGravity && Math.abs((p.y + p.h) - prevPlatY) < 6 && (p.x + p.w > plat.x && p.x < plat.x + plat.w)) {
                p.y += deltaY;
              }
            }
          }

          // Active Shifting Platform (Gentle ease with passenger carry!)
          if (plat.type === 'shifting' && plat.triggered && plat.shakeTimer >= plat.triggerDelay) {
            const targetX = plat.origX + (plat.shiftDist || 80);
            const prevPlatX = plat.x;
            plat.x += (targetX - plat.x) * 0.045; // Gentle ease!
            const deltaX = plat.x - prevPlatX;
            // If player is standing on this platform, carry them along smoothly
            if (p.grounded && !engine.invertedGravity && Math.abs((p.y + p.h) - plat.y) < 6 && (p.x + p.w > plat.x && p.x < plat.x + plat.w)) {
              p.x += deltaX;
            }
          }

          // Active Falling Weight / Descending Beam
          if (plat.type === 'falling_weight') {
            const triggerCol = plat.triggerCol || plat.col;
            if (!plat.triggered && p.x >= (triggerCol - 1) * engine.tileSize) {
              plat.triggered = true;
              soundEngine.playTrollTrigger();
            }
            if (plat.triggered && plat.shakeTimer >= plat.triggerDelay && plat.y < plat.targetY) {
              plat.vy = Math.min(4.0, plat.vy + 0.18);
              plat.y += plat.vy;
              if (plat.y >= plat.targetY) {
                plat.y = plat.targetY;
                plat.vy = 0;
                engine.screenShake = 4;
                soundEngine.playLand();
              }
            }
          }
        });

        // 5. Update Pop-up Spikes (Slower, deliberate mechanical emergence)
        engine.hazards.forEach(h => {
          if (h.type === 'popup') {
            const dist = Math.abs((p.x + p.w / 2) - (h.x + h.w / 2));
            if (!h.active && dist < engine.tileSize * h.triggerDist) {
              h.active = true;
              soundEngine.playSpikePop();
            }
            if (h.active && h.popProgress < 1) {
              h.popProgress += h.popSpeed;
              if (h.popProgress >= 1) {
                h.popProgress = 1;
                h.popped = true;
              }
            }
          }
        });

        // 6. Evading Exit Door (Smooth cartoon glide!)
        const door = engine.door;
        if (door.triggerCol && !door.evaded) {
          const triggerX = door.triggerCol * engine.tileSize;
          if (p.x >= triggerX) {
            door.evaded = true;
            door.escaping = true;
            soundEngine.playDoorEscape();
          }
        }
        if (door.escaping) {
          door.x += (door.targetX - door.x) * 0.055;
          door.y += (door.targetY - door.y) * 0.055;
          if (Math.abs(door.x - door.targetX) < 1.5 && Math.abs(door.y - door.targetY) < 1.5) {
            door.x = door.targetX;
            door.y = door.targetY;
            door.escaping = false;
          }
        }

        // 7. Mimic Door Dissolve Trick
        if (engine.mimicDoor && !engine.mimicDoor.dissolved) {
          const md = engine.mimicDoor;
          const dist = Math.abs((p.x + p.w / 2) - (md.x + md.w / 2));
          if (dist < engine.tileSize * 2.2) {
            engine.mimicDoor.dissolved = true;
            soundEngine.playTrollTrigger();
            // Burst of golden particles
            for (let i = 0; i < 20; i++) {
              engine.particles.push({
                x: md.x + Math.random() * md.w,
                y: md.y + Math.random() * md.h,
                vx: (Math.random() - 0.5) * 3,
                vy: -Math.random() * 3,
                size: Math.random() * 3 + 1,
                color: '#dfba73',
                life: 30
              });
            }
          }
        }

        // 8. Gravity Inversion Gates
        engine.tricks.forEach(t => {
          if (t.type === 'gravity_gate') {
            if (
              p.x + p.w > t.x && p.x < t.x + t.w &&
              p.y + p.h > t.y && p.y < t.y + t.h
            ) {
              if (!engine.invertedGravity) {
                engine.invertedGravity = true;
                soundEngine.playClue();
                engine.screenShake = 3;
              }
            }
          }
        });

        // 9. Hazard Collisions
        engine.hazards.forEach(h => {
          if (h.type === 'popup' && h.popProgress < 0.35) return;
          const spikeH = h.type === 'popup' ? h.h * h.popProgress : h.h;
          const spikeY = h.direction === 'up' ? h.y + (h.h - spikeH) : h.y;

          if (
            p.x + p.w > h.x + 5 && p.x < h.x + h.w - 5 &&
            p.y + p.h > spikeY + 6 && p.y < spikeY + spikeH
          ) {
            killPlayer();
          }
        });

        // Pit death
        if (p.y > engine.canvasH + 60 || p.y < -120) {
          killPlayer();
        }

        // 10. Door Reach / Level Clear
        if (
          p.x + p.w > door.x && p.x < door.x + door.w &&
          p.y + p.h > door.y && p.y < door.y + door.h
        ) {
          soundEngine.playStageClear();
          try {
            confetti({
              particleCount: 60,
              spread: 65,
              origin: { y: 0.6 },
              colors: ['#dfba73', '#ffffff', '#c5a059', '#f5f2eb']
            });
          } catch (_) {}

          const nextLvl = engine.level + 1;
          const active = getActivePlayer();
          if (active) {
            updatePlayerProgress(active.playerId, {
              highestLevelDevil: nextLvl,
              lastGamePlayed: 'runway_devil'
            });
          }

          buildLevel(nextLvl);
        }

        // 11. Update Trailing Silk Cloak / Scarf (5-point cloth chain)
        const cape = p.capeTrail;
        const targetCapeX = p.facing === 'right' ? p.x + 4 : p.x + p.w - 4;
        const targetCapeY = p.y + 10;
        cape[0] = { x: targetCapeX, y: targetCapeY };

        for (let i = 1; i < cape.length; i++) {
          const lead = cape[i - 1];
          const curr = cape[i];
          const lagX = p.facing === 'right' ? -4.5 : 4.5;
          const targetX = lead.x + lagX;
          const targetY = lead.y + (engine.invertedGravity ? -3.5 : 3.5) + Math.sin(Date.now() * 0.008 + i) * 2.5;
          curr.x += (targetX - curr.x) * 0.35;
          curr.y += (targetY - curr.y) * 0.35;
        }

        p.scaleX += (1 - p.scaleX) * 0.15;
        p.scaleY += (1 - p.scaleY) * 0.15;
      }

      // Update ambient floating dust motes
      engine.ambientDust.forEach(dust => {
        dust.x += dust.vx;
        dust.y += dust.vy;
        dust.pulse += 0.03;
        if (dust.y < -10) dust.y = engine.canvasH + 10;
        if (dust.x < -10) dust.x = engine.canvasW + 10;
        if (dust.x > engine.canvasW + 10) dust.x = -10;
      });

      // Update ghost trails
      for (let i = engine.ghostTrails.length - 1; i >= 0; i--) {
        const gt = engine.ghostTrails[i];
        gt.alpha -= 0.035;
        if (gt.alpha <= 0) engine.ghostTrails.splice(i, 1);
      }

      // Update shockwaves
      for (let i = engine.shockwaves.length - 1; i >= 0; i--) {
        const sw = engine.shockwaves[i];
        sw.r += (sw.maxR - sw.r) * 0.16;
        sw.alpha -= 0.045;
        if (sw.alpha <= 0) engine.shockwaves.splice(i, 1);
      }

      // Update death dissolve particles
      for (let i = engine.dissolveParticles.length - 1; i >= 0; i--) {
        const dp = engine.dissolveParticles[i];
        dp.progress += 0.035;
        dp.x += (dp.targetX - dp.x) * 0.1 + dp.vx * 0.5;
        dp.y += (dp.targetY - dp.y) * 0.1 + dp.vy * 0.5;
        dp.alpha = Math.max(0, 1 - dp.progress);
        if (dp.progress >= 1) engine.dissolveParticles.splice(i, 1);
      }

      // Update standard particles
      for (let i = engine.particles.length - 1; i >= 0; i--) {
        const pt = engine.particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life -= 1;
        if (pt.life <= 0) engine.particles.splice(i, 1);
      }

      // =====================================================================
      // RENDER CANVAS SCENE (HAUTE EDITORIAL STREETWEAR VISUALS)
      // =====================================================================
      ctx.save();
      ctx.clearRect(0, 0, engine.canvasW, engine.canvasH);

      // Apply screen shake offset
      if (engine.screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * engine.screenShake;
        const shakeY = (Math.random() - 0.5) * engine.screenShake;
        ctx.translate(shakeX, shakeY);
      }

      // 1. Deep Obsidian Runway Background
      ctx.fillStyle = '#07080b';
      ctx.fillRect(0, 0, engine.canvasW, engine.canvasH);

      // Subtle architectural light pillars in background
      for (let c = 3; c < engine.cols; c += 6) {
        const colX = c * engine.tileSize;
        const pillarGrad = ctx.createLinearGradient(colX, 0, colX + engine.tileSize * 2, 0);
        pillarGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        pillarGrad.addColorStop(0.5, 'rgba(223, 186, 115, 0.015)');
        pillarGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = pillarGrad;
        ctx.fillRect(colX, 0, engine.tileSize * 2, engine.canvasH);
      }

      // Subtle runway grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.018)';
      ctx.lineWidth = 1;
      for (let x = 0; x < engine.canvasW; x += engine.tileSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0); ctx.lineTo(x, engine.canvasH);
        ctx.stroke();
      }
      for (let y = 0; y < engine.canvasH; y += engine.tileSize) {
        ctx.beginPath();
        ctx.moveTo(0, y); ctx.lineTo(engine.canvasW, y);
        ctx.stroke();
      }

      // 2. Render Ambient Floating Dust Motes
      engine.ambientDust.forEach(dust => {
        ctx.save();
        const curAlpha = dust.alpha * (0.6 + 0.4 * Math.sin(dust.pulse));
        ctx.fillStyle = `rgba(223, 186, 115, ${curAlpha})`;
        ctx.beginPath();
        ctx.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 3. Render Gravity Inversion Gate
      engine.tricks.forEach(t => {
        if (t.type === 'gravity_gate') {
          ctx.save();
          ctx.fillStyle = 'rgba(223, 186, 115, 0.12)';
          ctx.strokeStyle = '#dfba73';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(t.x, t.y, t.w, t.h);
          ctx.fillRect(t.x, t.y, t.w, t.h);
          ctx.restore();
        }
      });

      // 4. Render Platforms (ALL platforms use 100% IDENTICAL styling so traps are hidden!)
      engine.platforms.forEach(plat => {
        if (!plat.visible || plat.type === 'wall') return;

        ctx.save();
        let drawX = plat.x;
        let drawY = plat.y;

        // Subtle micro-wobble during trigger delay
        if (plat.triggered && plat.shakeTimer < plat.triggerDelay) {
          drawX += Math.sin(plat.shakeTimer * 1.5) * 1.2;
        }

        // Platform Main Dark Obsidian Body
        ctx.fillStyle = '#13151f';
        ctx.fillRect(drawX, drawY, plat.w, plat.h);

        // Platform Bottom Bevel Shadow
        ctx.fillStyle = '#08090d';
        ctx.fillRect(drawX, drawY + plat.h - 4, plat.w, 4);

        // Subtle Perimeter Border Stroke
        ctx.strokeStyle = '#222533';
        ctx.lineWidth = 1;
        ctx.strokeRect(drawX, drawY, plat.w, plat.h);

        // Luxury Top Champagne Gold Chamfer Hairline (IDENTICAL on all platforms)
        ctx.strokeStyle = 'rgba(223, 186, 115, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(drawX, drawY);
        ctx.lineTo(drawX + plat.w, drawY);
        ctx.stroke();

        ctx.restore();
      });

      // 5. Render Hazards (Spikes)
      engine.hazards.forEach(h => {
        const spikeH = h.type === 'popup' ? h.h * h.popProgress : h.h;
        if (spikeH <= 1.5) return;

        ctx.save();
        ctx.fillStyle = '#181216';
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.2;

        const count = 3;
        const toothW = h.w / count;
        const baseY = h.direction === 'up' ? h.y + h.h : h.y;
        const tipY = h.direction === 'up' ? baseY - spikeH : baseY + spikeH;

        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          const startX = h.x + i * toothW;
          const midX = startX + toothW / 2;
          const endX = startX + toothW;
          ctx.moveTo(startX, baseY);
          ctx.lineTo(midX, tipY);
          ctx.lineTo(endX, baseY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Delicate glowing red/rose tip
        ctx.fillStyle = '#f43f5e';
        for (let i = 0; i < count; i++) {
          const midX = h.x + i * toothW + toothW / 2;
          ctx.beginPath();
          ctx.arc(midX, tipY, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // 6. Render Mimic Fake Door (If active)
      if (engine.mimicDoor && !engine.mimicDoor.dissolved) {
        const md = engine.mimicDoor;
        ctx.save();
        ctx.fillStyle = '#0e1017';
        ctx.strokeStyle = 'rgba(223, 186, 115, 0.7)';
        ctx.lineWidth = 2;
        ctx.fillRect(md.x, md.y, md.w, md.h);
        ctx.strokeRect(md.x, md.y, md.w, md.h);
        // Faint mysterious glyph
        ctx.fillStyle = 'rgba(223, 186, 115, 0.3)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', md.x + md.w / 2, md.y + md.h / 2 + 3);
        ctx.restore();
      }

      // 7. Render Golden Exit Door (Runway Vault) with Rotating Celestial Aura
      const door = engine.door;
      ctx.save();
      // Door Body
      ctx.fillStyle = '#0c0d13';
      ctx.strokeStyle = '#dfba73';
      ctx.lineWidth = 2;
      ctx.fillRect(door.x, door.y, door.w, door.h);
      ctx.strokeRect(door.x, door.y, door.w, door.h);

      // Glowing Interior Radiant Arch
      ctx.fillStyle = 'rgba(223, 186, 115, 0.32)';
      ctx.beginPath();
      ctx.arc(door.x + door.w / 2, door.y + 14, 10, Math.PI, 0);
      ctx.lineTo(door.x + door.w / 2 + 10, door.y + door.h - 4);
      ctx.lineTo(door.x + door.w / 2 - 10, door.y + door.h - 4);
      ctx.closePath();
      ctx.fill();

      // Rotating Aura Beams
      const cx = door.x + door.w / 2;
      const cy = door.y + door.h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(engine.doorVortexAngle);
      ctx.strokeStyle = 'rgba(223, 186, 115, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Monogram JVāN tag atop the door
      ctx.fillStyle = '#dfba73';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('JVāN', cx, door.y - 6);

      ctx.restore();

      // 8. Render Shockwaves (Landing & Jump rings)
      engine.shockwaves.forEach(sw => {
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(sw.x, sw.y, sw.r * 1.4, sw.r * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // 9. Render Ghost Trails (Motion blur silhouettes)
      engine.ghostTrails.forEach(gt => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, gt.alpha * 0.4);
        ctx.fillStyle = '#dfba73';
        ctx.translate(gt.x + 11, gt.y + 15);
        ctx.scale(gt.scaleX, gt.scaleY);
        ctx.fillRect(-11, -15, 22, 30);
        ctx.restore();
      });

      // 10. Render Minimalist Hooded Streetwear Character & Dynamic Cape
      if (!p.isDead) {
        ctx.save();

        // Dynamic Trailing Fabric Cape
        const cape = p.capeTrail;
        if (cape && cape.length >= 2) {
          ctx.beginPath();
          ctx.moveTo(cape[0].x, cape[0].y);
          for (let i = 1; i < cape.length; i++) {
            ctx.lineTo(cape[i].x, cape[i].y);
          }
          ctx.strokeStyle = '#181920';
          ctx.lineWidth = 7;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();

          // Delicate champagne gold tailor hem along the cloak edge
          ctx.strokeStyle = '#c5a059';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }

        // Apply Squash & Stretch Transform
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
        if (engine.invertedGravity) ctx.scale(1, -1);
        ctx.scale(p.scaleX, p.scaleY);

        // Idle vertical breathing bob
        const breatheBob = p.grounded && p.vx === 0 ? Math.sin(p.idleTimer * 0.08) * 0.8 : 0;

        // Streetwear Oversized Hood Silhouette (Dark Obsidian)
        ctx.fillStyle = '#0f1016';
        ctx.fillRect(-p.w / 2, -p.h / 2 + 5 + breatheBob, p.w, p.h - 5);

        // Cowl / Hood Peak
        ctx.beginPath();
        ctx.moveTo(-p.w / 2 - 1, -p.h / 2 + 8 + breatheBob);
        ctx.lineTo(0, -p.h / 2 - 2 + breatheBob);
        ctx.lineTo(p.w / 2 + 1, -p.h / 2 + 8 + breatheBob);
        ctx.closePath();
        ctx.fillStyle = '#161822';
        ctx.fill();

        // Glowing Haute Visor Slit (Warm Champagne Gold)
        ctx.fillStyle = '#dfba73';
        ctx.shadowColor = '#dfba73';
        ctx.shadowBlur = 8;
        const eyeOffset = p.facing === 'right' ? 3 : -5;
        ctx.fillRect(eyeOffset, -p.h / 2 + 7 + breatheBob, 7, 3);
        ctx.shadowBlur = 0;

        // Streetwear Sneaker Accents
        ctx.fillStyle = '#262838';
        const walkBob = p.grounded && p.vx !== 0 ? Math.sin(Date.now() * 0.02) * 2 : 0;
        ctx.fillRect(-p.w / 2 + 2, p.h / 2 - 4 + walkBob, 7, 4);
        ctx.fillRect(p.w / 2 - 9, p.h / 2 - 4 - walkBob, 7, 4);

        ctx.restore();
      }

      // 11. Render Death Dissolve Ribbons
      engine.dissolveParticles.forEach(dp => {
        ctx.save();
        ctx.globalAlpha = dp.alpha;
        ctx.fillStyle = dp.color;
        ctx.beginPath();
        ctx.arc(dp.x, dp.y, dp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 12. Render Standard Particles
      engine.particles.forEach(pt => {
        ctx.save();
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
        ctx.restore();
      });

      // 13. Atmospheric Spotlight Vignette (Centers on player to give high-fashion runway intimacy)
      if (!p.isDead) {
        ctx.save();
        const spotGrad = ctx.createRadialGradient(
          p.x + p.w / 2, p.y + p.h / 2, 50,
          p.x + p.w / 2, p.y + p.h / 2, Math.max(340, engine.canvasW * 0.48)
        );
        spotGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        spotGrad.addColorStop(0.65, 'rgba(6, 7, 10, 0.45)');
        spotGrad.addColorStop(1, 'rgba(4, 5, 8, 0.92)');
        ctx.fillStyle = spotGrad;
        ctx.fillRect(0, 0, engine.canvasW, engine.canvasH);
        ctx.restore();
      }

      ctx.restore(); // Restore screen shake transform

      engine.animId = requestAnimationFrame(updateAndRender);
    };

    engine.animId = requestAnimationFrame(updateAndRender);

    return () => {
      cancelAnimationFrame(engine.animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  // Touch handlers for mobile devices
  const handleTouchStart = (action) => {
    const engine = engineRef.current;
    if (action === 'left') {
      engine.keys.left = true;
      engine.keys.right = false;
    }
    if (action === 'right') {
      engine.keys.right = true;
      engine.keys.left = false;
    }
    if (action === 'jump') {
      engine.player.jumpBuffer = 6;
      engine.keys.jump = true;
      engine.keys.jumpHeld = true;
    }
  };

  const handleTouchEnd = (action) => {
    const engine = engineRef.current;
    if (action === 'left') engine.keys.left = false;
    if (action === 'right') engine.keys.right = false;
    if (action === 'jump') {
      engine.keys.jump = false;
      engine.keys.jumpHeld = false;
      if (engine.player.vy < -3) engine.player.vy = -3;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fullscreen-game-backdrop runway-devil-modal" ref={containerRef} role="dialog" aria-label="Runway Devil Platformer">
      {/* Top Haute Couture HUD */}
      <header className="fullscreen-hud-bar">
        <div className="hud-left-meta">
          <span className="game-brand-pill">RUNWAY DEVIL</span>
          {activePlayer && (
            <span className="hud-player-pill" title={`Logged in as ${activePlayer.alias} (${activePlayer.contactValue})`}>
              👤 {activePlayer.alias}
            </span>
          )}
          <span className="devil-level-pill">STAGE #{level}</span>
          <span className="attempt-pill">ATTEMPT #{attempts}</span>
        </div>

        <div className="hud-center-status">
          <span className="devil-trap-warning">⚡ {stageName}</span>
        </div>

        <div className="hud-right-actions">
          <button 
            className="hud-action-btn hud-leaderboard-btn"
            onClick={() => {
              soundEngine.playClick();
              if (onOpenLeaderboard) onOpenLeaderboard('runway_devil');
            }}
            title="View Global Leaderboard"
          >
            🏆 LEADERBOARD
          </button>

          <button 
            className="hud-action-btn"
            onClick={() => {
              const nextMuted = soundEngine.toggleMute();
              setSoundMuted(nextMuted);
            }}
            title="Toggle Audio"
          >
            {soundMuted ? '🔇 MUTED' : '🔊 SFX ON'}
          </button>

          <button
            className="hud-action-btn"
            onClick={() => killPlayer()}
            title="Restart Stage (R)"
          >
            ↺ RESET (R)
          </button>

          <button 
            className="exit-fullscreen-btn" 
            onClick={onClose}
            title="Exit Game (ESC)"
          >
            EXIT FULLSCREEN ✕
          </button>
        </div>
      </header>

      {/* Main Full-Screen Game Canvas */}
      <div className="fullscreen-canvas-wrapper platformer-wrapper">
        <canvas ref={canvasRef} />
      </div>

      {/* Mobile Touch Controls */}
      <div className="platformer-mobile-controls">
        <div className="touch-dpad-left">
          <button 
            className="touch-ctrl-btn"
            onTouchStart={() => handleTouchStart('left')}
            onTouchEnd={() => handleTouchEnd('left')}
            onMouseDown={() => handleTouchStart('left')}
            onMouseUp={() => handleTouchEnd('left')}
          >
            ◀
          </button>
          <button 
            className="touch-ctrl-btn"
            onTouchStart={() => handleTouchStart('right')}
            onTouchEnd={() => handleTouchEnd('right')}
            onMouseDown={() => handleTouchStart('right')}
            onMouseUp={() => handleTouchEnd('right')}
          >
            ▶
          </button>
        </div>

        <div className="touch-jump-right">
          <button 
            className="touch-jump-btn"
            onTouchStart={() => handleTouchStart('jump')}
            onTouchEnd={() => handleTouchEnd('jump')}
            onMouseDown={() => handleTouchStart('jump')}
            onMouseUp={() => handleTouchEnd('jump')}
          >
            JUMP ▲
          </button>
        </div>
      </div>

      {/* Footer Desktop Controls Hint */}
      <div className="fullscreen-footer-hint">
        <span>RUN: <strong>A / D</strong> OR <strong>← / →</strong> • JUMP: <strong>SPACE / W / ↑</strong> • RESTART STAGE: <strong>R</strong> • EXIT: <strong>ESC</strong></span>
      </div>
    </div>
  );
};
