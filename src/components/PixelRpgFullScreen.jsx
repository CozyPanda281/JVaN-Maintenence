import React, { useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { soundEngine } from '../audio/soundEngine';
import { getActivePlayer, updatePlayerProgress } from '../utils/playerStorage';

export const PixelRpgFullScreen = ({ isOpen, onClose, onOpenLeaderboard }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  const [activePlayer, setActivePlayer] = useState(null);
  const [level, setLevel] = useState(1);
  const [evidenceLeft, setEvidenceLeft] = useState(3);
  const [totalEvidence, setTotalEvidence] = useState(3);
  const [doorOpen, setDoorOpen] = useState(false);
  const [soundMuted, setSoundMuted] = useState(soundEngine.isMuted);

  // Mutable Game Engine state
  const engineRef = useRef({
    level: 1,
    tileSize: 36,
    cols: 32,
    rows: 18,
    canvasW: 1152,
    canvasH: 648,
    dpr: window.devicePixelRatio || 1,

    // Player State (No lives feature - infinite retries)
    player: {
      x: 72,
      y: 72,
      w: 24,
      h: 24,
      speed: 4.2,
      vx: 0,
      vy: 0,
      dir: 'down',
      animFrame: 0,
      animTimer: 0,
      invulnerable: 0
    },

    // Map & Entities
    walls: [],
    evidence: [],
    drones: [],
    lasers: [],
    door: { x: 0, y: 0, w: 36, h: 36, open: false },
    particles: [],
    shockwaves: [],
    ambientDust: [],
    vortexAngle: 0,

    // Radar / Minimap
    showRadar: true,

    // Inputs
    keys: { up: false, down: false, left: false, right: false },
    animId: null
  });

  // Calculate dimensions to fill the whole screen dynamically
  const calculateGridDimensions = () => {
    const screenW = window.innerWidth;
    const hudHeight = 54; // Pinned sleek top HUD
    const screenH = Math.max(300, window.innerHeight - hudHeight);

    // Responsive tile size: compact on mobile, spacious on desktop
    const tileSize = screenW < 640 ? 28 : (screenW < 1024 ? 32 : 36);
    const cols = Math.max(14, Math.floor(screenW / tileSize));
    const rows = Math.max(10, Math.floor(screenH / tileSize));

    return {
      tileSize,
      cols,
      rows,
      canvasW: cols * tileSize,
      canvasH: rows * tileSize,
      dpr: window.devicePixelRatio || 1
    };
  };

  // Procedural spacious arena floor generator
  const generateLevel = (lvl) => {
    const engine = engineRef.current;
    engine.level = lvl;
    setLevel(lvl);

    const dims = calculateGridDimensions();
    engine.tileSize = dims.tileSize;
    engine.cols = dims.cols;
    engine.rows = dims.rows;
    engine.canvasW = dims.canvasW;
    engine.canvasH = dims.canvasH;
    engine.dpr = dims.dpr;

    const ts = engine.tileSize;
    const cols = engine.cols;
    const rows = engine.rows;

    // 1. Outer perimeter security walls (sealing the full screen edges)
    const walls = [];
    const wallCoordSet = new Set();
    const addWall = (c, r) => {
      const key = `${c},${r}`;
      if (!wallCoordSet.has(key)) {
        wallCoordSet.add(key);
        walls.push({ x: c * ts, y: r * ts, c, r });
      }
    };

    for (let c = 0; c < cols; c++) {
      addWall(c, 0);
      addWall(c, rows - 1);
    }
    for (let r = 1; r < rows - 1; r++) {
      addWall(0, r);
      addWall(cols - 1, r);
    }

    // 2. Architectural interior sectors & corridors (creates an expansive, spacious vault)
    // Vertical sector dividers with wide doorways
    const numDividers = cols > 30 ? 2 : (cols > 20 ? 1 : 0);
    for (let d = 1; d <= numDividers; d++) {
      const divCol = Math.floor((cols / (numDividers + 1)) * d);
      for (let r = 2; r < rows - 2; r++) {
        // Leave generous 3-tile doorways in each sector wall for open flow
        const isDoorway = (r >= 4 && r <= 6) || (r >= rows - 7 && r <= rows - 5) || (r === Math.floor(rows / 2));
        if (!isDoorway) {
          addWall(divCol, r);
        }
      }
    }

    // Horizontal architectural partitions in middle
    if (rows > 18) {
      const midRow = Math.floor(rows / 2);
      for (let c = 3; c < cols - 3; c++) {
        // Staggered doorways so rooms feel like an authentic high-end vault gallery
        const isDoorway = c % 6 === 0 || c % 6 === 1 || (c >= cols / 2 - 2 && c <= cols / 2 + 2);
        if (!isDoorway) {
          addWall(c, midRow);
        }
      }
    }

    // 3. Architectural pillars / display pedestals in open sectors
    const pillarStepX = cols > 35 ? 7 : 5;
    const pillarStepY = rows > 20 ? 5 : 4;
    for (let c = 4; c < cols - 4; c += pillarStepX) {
      for (let r = 3; r < rows - 3; r += pillarStepY) {
        // Keep spawn (2, 2) and exit (cols - 3, rows - 3) zones completely unobstructed
        if (c <= 4 && r <= 4) continue;
        if (c >= cols - 5 && r >= rows - 5) continue;
        addWall(c, r);
      }
    }

    engine.walls = walls;

    // 4. Player Spawn (Sector 1: Top-Left Foyer at tile 2, 2)
    engine.player.x = ts * 2.5;
    engine.player.y = ts * 2.5;
    engine.player.vx = 0;
    engine.player.vy = 0;
    engine.player.invulnerable = 90; // 1.5s spawn grace shield

    // 5. Exit Vault Door (Sector 3: Bottom-Right at tile cols - 3, rows - 3)
    const doorC = cols - 3;
    const doorR = rows - 3;
    engine.door = {
      x: doorC * ts,
      y: doorR * ts,
      w: ts,
      h: ts,
      open: false
    };
    setDoorOpen(false);

    // 6. Evidence Items (Scaled with level, distributed across different sectors)
    const evCount = Math.min(7, 3 + Math.floor(lvl * 0.5));
    const evidence = [];
    const usedTiles = new Set();
    usedTiles.add('2,2');
    usedTiles.add('2,3');
    usedTiles.add('3,2');
    usedTiles.add(`${doorC},${doorR}`);

    wallCoordSet.forEach(k => usedTiles.add(k));

    for (let i = 0; i < evCount; i++) {
      let ec, er, key;
      let tries = 0;
      do {
        ec = 2 + Math.floor(Math.random() * (cols - 4));
        er = 2 + Math.floor(Math.random() * (rows - 4));
        key = `${ec},${er}`;
        tries++;
      } while (usedTiles.has(key) && tries < 150);

      usedTiles.add(key);
      evidence.push({
        id: i + 1,
        x: ec * ts + (ts - 20) / 2,
        y: er * ts + (ts - 20) / 2,
        w: 20,
        h: 20,
        collected: false,
        bobTimer: Math.random() * Math.PI * 2
      });
    }
    engine.evidence = evidence;
    setTotalEvidence(evCount);
    setEvidenceLeft(evCount);

    // 7. Timed Laser Barriers (Level 2+)
    const lasers = [];
    if (lvl >= 2) {
      const laserCount = Math.min(8, 2 + Math.floor(lvl * 0.7));
      for (let l = 0; l < laserCount; l++) {
        const isHoriz = Math.random() > 0.5;
        let lc = 4 + Math.floor(Math.random() * (cols - 8));
        let lr = 3 + Math.floor(Math.random() * (rows - 6));
        
        // Avoid immediate spawn area
        if (lc < 6 && lr < 6) {
          lc += 6;
          lr += 4;
        }

        const spanTiles = 3;
        lasers.push({
          x: lc * ts,
          y: lr * ts,
          w: isHoriz ? ts * spanTiles : 6,
          h: isHoriz ? 6 : ts * spanTiles,
          active: true,
          timer: Math.floor(Math.random() * 120),
          cycle: 140
        });
      }
    }
    engine.lasers = lasers;

    // 8. Patrolling Guard Drones (Level 3+)
    const drones = [];
    if (lvl >= 3) {
      const droneCount = Math.min(6, 1 + Math.floor((lvl - 2) * 0.6));
      for (let d = 0; d < droneCount; d++) {
        const isHoriz = d % 2 === 0;
        const startC = 5 + Math.floor((cols - 10) * ((d + 1) / (droneCount + 1)));
        const startR = 3 + Math.floor((rows - 6) * ((d + 0.5) / (droneCount + 0.5)));
        const speed = 2.0 + Math.min(1.8, lvl * 0.12);

        drones.push({
          x: startC * ts,
          y: startR * ts,
          w: 24,
          h: 24,
          isHoriz,
          speed,
          dir: 1,
          minX: Math.max(2 * ts, (startC - 6) * ts),
          maxX: Math.min((cols - 3) * ts, (startC + 6) * ts),
          minY: Math.max(2 * ts, (startR - 5) * ts),
          maxY: Math.min((rows - 3) * ts, (startR + 5) * ts)
        });
      }
    }
    engine.drones = drones;
    engine.shockwaves = [];
    if (!engine.ambientDust || engine.ambientDust.length === 0) {
      engine.ambientDust = [];
      for (let i = 0; i < 30; i++) {
        engine.ambientDust.push({
          x: Math.random() * engine.canvasW,
          y: Math.random() * engine.canvasH,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -Math.random() * 0.35 - 0.1,
          size: Math.random() * 2.2 + 0.8,
          alpha: Math.random() * 0.4 + 0.2,
          pulse: Math.random() * Math.PI * 2
        });
      }
    }

    // 9. Resize Canvas Element to exact screen dimensions
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = engine.canvasW * engine.dpr;
      canvas.height = engine.canvasH * engine.dpr;
      canvas.style.width = `${engine.canvasW}px`;
      canvas.style.height = `${engine.canvasH}px`;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      ctx.scale(engine.dpr, engine.dpr);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    soundEngine.init();
    soundEngine.playGameStart();

    const active = getActivePlayer();
    setActivePlayer(active);

    // Attempt browser native fullscreen if available
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (_) {}

    generateLevel(1);

    // Keyboard handlers
    const onKeyDown = (e) => {
      const k = engineRef.current.keys;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') { e.preventDefault(); k.up = true; }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') { e.preventDefault(); k.down = true; }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { e.preventDefault(); k.left = true; }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { e.preventDefault(); k.right = true; }
      if (e.code === 'Escape') handleExit();
    };

    const onKeyUp = (e) => {
      const k = engineRef.current.keys;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') k.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') k.down = false;
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') k.left = false;
      if (e.code === 'ArrowRight' || e.code === 'KeyD') k.right = false;
    };

    // Window resize handler to keep full-screen canvas responsive
    let resizeTimer = null;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (isOpen) {
          generateLevel(engineRef.current.level);
        }
      }, 150);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', handleResize);

    // Main game loop
    const loop = () => {
      updateGame();
      renderGame();
      engineRef.current.animId = requestAnimationFrame(loop);
    };

    engineRef.current.animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
      if (engineRef.current.animId) cancelAnimationFrame(engineRef.current.animId);
      try {
        if (document.exitFullscreen && document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (_) {}
    };
  }, [isOpen]);

  const handleExit = () => {
    soundEngine.init();
    soundEngine.playModalClose();
    try {
      if (document.exitFullscreen && document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (_) {}
    onClose();
  };

  const handleToggleSound = () => {
    soundEngine.init();
    const muted = soundEngine.toggleMute();
    setSoundMuted(muted);
    if (!muted) soundEngine.playClick();
  };

  const handleRestartFloor = () => {
    soundEngine.init();
    soundEngine.playClick();
    generateLevel(engineRef.current.level);
  };

  const updateGame = () => {
    const engine = engineRef.current;
    const p = engine.player;
    const k = engine.keys;

    // Movement calculation
    let dx = 0;
    let dy = 0;
    if (k.up) dy -= 1;
    if (k.down) dy += 1;
    if (k.left) dx -= 1;
    if (k.right) dx += 1;

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    if (dx !== 0 || dy !== 0) {
      soundEngine.playFootstep();
      p.animTimer++;
      if (p.animTimer > 6) {
        p.animFrame = (p.animFrame + 1) % 4;
        p.animTimer = 0;
        // Subtle dust footstep particles (Champagne gold silk dust)
        if (Math.random() > 0.4) {
          engine.particles.push({
            x: p.x + (Math.random() * 8 - 4),
            y: p.y + p.h / 2,
            vx: -dx * 0.5 + (Math.random() * 0.4 - 0.2),
            vy: -dy * 0.5 + (Math.random() * 0.4 - 0.2),
            size: 2.5,
            color: 'rgba(223, 186, 115, 0.4)',
            life: 0.5
          });
        }
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        p.dir = dx > 0 ? 'right' : 'left';
      } else {
        p.dir = dy > 0 ? 'down' : 'up';
      }
    } else {
      p.animFrame = 0;
    }

    const nextX = p.x + dx * p.speed;
    const nextY = p.y + dy * p.speed;

    // Sliding collision check
    const canMoveX = !checkWallCollision(nextX, p.y, p.w, p.h, engine.walls, engine.tileSize);
    if (canMoveX) p.x = nextX;

    const canMoveY = !checkWallCollision(p.x, nextY, p.w, p.h, engine.walls, engine.tileSize);
    if (canMoveY) p.y = nextY;

    if (p.invulnerable > 0) p.invulnerable--;

    // Laser updates & collision
    engine.lasers.forEach(laser => {
      laser.timer = (laser.timer + 1) % laser.cycle;
      laser.active = laser.timer < laser.cycle * 0.58;

      if (laser.active && p.invulnerable === 0) {
        if (checkOverlap(p.x, p.y, p.w, p.h, laser.x, laser.y, laser.w, laser.h)) {
          handleHazardRespawn(engine);
        }
      }
    });

    // Drone patrols & collision
    engine.drones.forEach(drone => {
      if (drone.isHoriz) {
        drone.x += drone.speed * drone.dir;
        if (drone.x >= drone.maxX) drone.dir = -1;
        if (drone.x <= drone.minX) drone.dir = 1;
      } else {
        drone.y += drone.speed * drone.dir;
        if (drone.y >= drone.maxY) drone.dir = -1;
        if (drone.y <= drone.minY) drone.dir = 1;
      }

      if (p.invulnerable === 0) {
        if (checkOverlap(p.x, p.y, p.w, p.h, drone.x, drone.y, drone.w, drone.h)) {
          handleHazardRespawn(engine);
        }
      }
    });

    // Evidence collection (Bespoke Fabric Swatches)
    let remaining = 0;
    engine.evidence.forEach(item => {
      if (!item.collected) {
        item.bobTimer = (item.bobTimer || 0) + 0.08;
        if (checkOverlap(p.x, p.y, p.w, p.h, item.x, item.y, item.w, item.h)) {
          item.collected = true;
          soundEngine.playClue();
          spawnBurst(item.x + item.w / 2, item.y + item.h / 2, '#dfba73', 20);
          engine.shockwaves.push({
            x: item.x + item.w / 2,
            y: item.y + item.h / 2,
            r: 4,
            maxR: 32,
            alpha: 0.9,
            color: '#dfba73'
          });

          // Persist progress to active player
          const active = getActivePlayer();
          if (active) {
            updatePlayerProgress(active.playerId, {
              rpgSwatches: (active.rpgSwatches || 0) + 1,
              highestScoreRpg: (active.highestScoreRpg || 0) + 150,
              lastGamePlayed: 'rpg'
            });
          }
        } else {
          remaining++;
        }
      }
    });

    setEvidenceLeft(remaining);

    // Exit Door Unlock
    if (remaining === 0 && !engine.door.open) {
      engine.door.open = true;
      setDoorOpen(true);
      soundEngine.playDoorUnlock();
      spawnBurst(engine.door.x + engine.door.w / 2, engine.door.y + engine.door.h / 2, '#dfba73', 28);
      engine.shockwaves.push({
        x: engine.door.x + engine.door.w / 2,
        y: engine.door.y + engine.door.h / 2,
        r: 6,
        maxR: 45,
        alpha: 0.95,
        color: '#dfba73'
      });
    }

    // Level Exit Transition
    if (engine.door.open) {
      if (checkOverlap(p.x, p.y, p.w, p.h, engine.door.x, engine.door.y, engine.door.w, engine.door.h)) {
        handleLevelComplete(engine);
      }
    }

    // Update Ambient Floating Dust
    if (engine.ambientDust) {
      engine.ambientDust.forEach(dust => {
        dust.x += dust.vx;
        dust.y += dust.vy;
        dust.pulse += 0.03;
        if (dust.y < -10) dust.y = engine.canvasH + 10;
        if (dust.x < -10) dust.x = engine.canvasW + 10;
        if (dust.x > engine.canvasW + 10) dust.x = -10;
      });
    }

    // Update Shockwaves
    if (engine.shockwaves) {
      for (let i = engine.shockwaves.length - 1; i >= 0; i--) {
        const sw = engine.shockwaves[i];
        sw.r += (sw.maxR - sw.r) * 0.15;
        sw.alpha -= 0.04;
        if (sw.alpha <= 0) engine.shockwaves.splice(i, 1);
      }
    }

    // Update Vortex Angle
    engine.vortexAngle = (engine.vortexAngle || 0) + 0.025;

    // Particles simulation
    for (let i = engine.particles.length - 1; i >= 0; i--) {
      const part = engine.particles[i];
      part.x += part.vx;
      part.y += part.vy;
      part.life -= 0.035;
      if (part.life <= 0) engine.particles.splice(i, 1);
    }
  };

  const checkWallCollision = (px, py, pw, ph, walls, ts) => {
    const halfW = pw / 2;
    const halfH = ph / 2;
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (checkOverlap(px - halfW, py - halfH, pw, ph, w.x, w.y, ts, ts)) {
        return true;
      }
    }
    return false;
  };

  const checkOverlap = (x1, y1, w1, h1, x2, y2, w2, h2) => {
    return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
  };

  // Hazard Respawn (No lives lost! Infinite retries with spawn grace period)
  const handleHazardRespawn = (engine) => {
    soundEngine.playHazard();
    spawnBurst(engine.player.x, engine.player.y, '#ef4444', 20);
    engine.player.x = engine.tileSize * 2.5;
    engine.player.y = engine.tileSize * 2.5;
    engine.player.invulnerable = 120; // 2s invulnerability
  };

  const handleLevelComplete = (engine) => {
    soundEngine.playLevelUp();
    try {
      confetti({
        particleCount: 75,
        spread: 70,
        origin: { y: 0.5 },
        colors: ['#dfba73', '#c5a059', '#ffffff', '#f5f2eb']
      });
    } catch (_) {}

    const nextFloor = engine.level + 1;
    const active = getActivePlayer();
    if (active) {
      updatePlayerProgress(active.playerId, {
        highestFloorRpg: nextFloor,
        highestScoreRpg: (active.highestScoreRpg || 0) + 500,
        lastGamePlayed: 'rpg'
      });
    }

    generateLevel(nextFloor);
  };

  const spawnBurst = (x, y, color, count = 14) => {
    const engine = engineRef.current;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const spd = Math.random() * 3.5 + 1.2;
      engine.particles.push({
        x,
        y,
        vx: Math.cos(angle) * spd,
        vy: Math.sin(angle) * spd,
        size: Math.random() * 4 + 2,
        color,
        life: 1.0
      });
    }
  };

  // Full Screen 2D Canvas Renderer
  const renderGame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const engine = engineRef.current;
    const ts = engine.tileSize;
    const p = engine.player;

    // 1. Floor background (Deep obsidian velvet runway grid)
    ctx.fillStyle = '#06070a';
    ctx.fillRect(0, 0, engine.canvasW, engine.canvasH);

    // Floor architectural grid texture
    for (let c = 0; c < engine.cols; c++) {
      for (let r = 0; r < engine.rows; r++) {
        if ((c + r) % 2 === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.014)';
          ctx.fillRect(c * ts, r * ts, ts, ts);
        }
      }
    }

    // Subtle technical floor crosshairs in champagne gold
    ctx.fillStyle = 'rgba(223, 186, 115, 0.08)';
    for (let c = 4; c < engine.cols; c += 8) {
      for (let r = 4; r < engine.rows; r += 6) {
        ctx.fillRect(c * ts - 2, r * ts - 1, 5, 2);
        ctx.fillRect(c * ts - 1, r * ts - 2, 2, 5);
      }
    }

    // 2. Render Ambient Floating Dust Motes
    if (engine.ambientDust) {
      engine.ambientDust.forEach(dust => {
        ctx.save();
        const curAlpha = dust.alpha * (0.6 + 0.4 * Math.sin(dust.pulse));
        ctx.fillStyle = `rgba(223, 186, 115, ${curAlpha})`;
        ctx.beginPath();
        ctx.arc(dust.x, dust.y, dust.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    // 3. High-fashion architectural walls / monoliths
    engine.walls.forEach(w => {
      // Main dark obsidian body
      ctx.fillStyle = '#12141d';
      ctx.fillRect(w.x, w.y, ts, ts);

      // Top bevel highlight
      ctx.fillStyle = '#222533';
      ctx.fillRect(w.x, w.y, ts, 3);

      // Bottom shadow
      ctx.fillStyle = '#07080b';
      ctx.fillRect(w.x, w.y + ts - 3, ts, 3);

      // Perimeter border stroke
      ctx.strokeStyle = '#1e2230';
      ctx.lineWidth = 1;
      ctx.strokeRect(w.x, w.y, ts, ts);

      // Champagne gold metallic accent bolt
      ctx.fillStyle = 'rgba(223, 186, 115, 0.35)';
      ctx.fillRect(w.x + 3, w.y + 3, 2, 2);
    });

    // 4. Timed Security Lasers (Infrared energy beams)
    engine.lasers.forEach(laser => {
      if (laser.active) {
        ctx.save();
        ctx.fillStyle = '#f43f5e';
        ctx.shadowColor = '#f43f5e';
        ctx.shadowBlur = 12;
        ctx.fillRect(laser.x, laser.y, laser.w, laser.h);

        // Core bright beam
        ctx.fillStyle = '#fff1f2';
        if (laser.w > laser.h) {
          ctx.fillRect(laser.x, laser.y + laser.h / 2 - 1, laser.w, 2);
        } else {
          ctx.fillRect(laser.x + laser.w / 2 - 1, laser.y, 2, laser.h);
        }
        ctx.restore();
      } else {
        // Warning idle glow before activation
        ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
        ctx.fillRect(laser.x, laser.y, laser.w, laser.h);
      }
    });

    // 5. Exit Vault Door
    const d = engine.door;
    ctx.save();
    if (d.open) {
      // Unlocked radiant golden gate
      ctx.fillStyle = '#0c0d13';
      ctx.strokeStyle = '#dfba73';
      ctx.lineWidth = 2;
      ctx.fillRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
      ctx.strokeRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);

      // Rotating celestial aura rings
      ctx.save();
      ctx.translate(d.x + d.w / 2, d.y + d.h / 2);
      ctx.rotate(engine.vortexAngle || 0);
      ctx.strokeStyle = 'rgba(223, 186, 115, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, d.w * 0.65, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Glowing interior arch
      ctx.fillStyle = 'rgba(223, 186, 115, 0.35)';
      ctx.beginPath();
      ctx.arc(d.x + d.w / 2, d.y + 12, 8, Math.PI, 0);
      ctx.lineTo(d.x + d.w / 2 + 8, d.y + d.h - 4);
      ctx.lineTo(d.x + d.w / 2 - 8, d.y + d.h - 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#dfba73';
      ctx.font = `bold ${Math.floor(ts * 0.28)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('VAULT OPEN', d.x + ts / 2, d.y + ts / 2 + 4);
    } else {
      // Locked bronze vault status
      ctx.fillStyle = '#12141a';
      ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
      ctx.fillRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);

      ctx.fillStyle = '#f43f5e';
      ctx.font = `bold ${Math.floor(ts * 0.26)}px monospace`;
      ctx.textAlign = 'center';
      ctx.fillText('SEALED', d.x + ts / 2, d.y + ts / 2 + 4);
    }
    ctx.restore();

    // 6. Bespoke Fabric Swatches (Luxury textile bolts / rolls with star glints)
    engine.evidence.forEach(item => {
      if (!item.collected) {
        ctx.save();
        const bobOffset = Math.sin(item.bobTimer || 0) * 3;
        const iy = item.y + bobOffset;

        // Ambient luxury champagne glow halo
        ctx.fillStyle = 'rgba(223, 186, 115, 0.22)';
        ctx.beginPath();
        ctx.arc(item.x + item.w / 2, iy + item.h / 2, 14, 0, Math.PI * 2);
        ctx.fill();

        // Rolled textile swatch bolt in champagne gold
        ctx.fillStyle = '#dfba73';
        ctx.fillRect(item.x + 3, iy + 4, 14, 12);

        // Diagonal textile weave stripes
        ctx.fillStyle = '#c5a059';
        ctx.fillRect(item.x + 6, iy + 4, 3, 12);
        ctx.fillRect(item.x + 12, iy + 4, 3, 12);

        // Tailor scissors icon glint
        ctx.fillStyle = '#f5f2eb';
        ctx.fillRect(item.x + 8, iy + 2, 4, 4);

        // Shimmering 4-point star glint
        const glintScale = 0.5 + 0.5 * Math.sin((item.bobTimer || 0) * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(item.x + 15, iy + 2, 2 * glintScale, 2 * glintScale);

        ctx.restore();
      }
    });

    // 7. Security Drones with dynamic patrol spotlights
    engine.drones.forEach(dr => {
      ctx.save();

      // Drone forward warning scan field
      const scanRad = 48;
      const grad = ctx.createRadialGradient(
        dr.x + dr.w / 2, dr.y + dr.h / 2, 4,
        dr.x + dr.w / 2, dr.y + dr.h / 2, scanRad
      );
      grad.addColorStop(0, 'rgba(244, 63, 94, 0.38)');
      grad.addColorStop(1, 'rgba(244, 63, 94, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(dr.x + dr.w / 2, dr.y + dr.h / 2, scanRad, 0, Math.PI * 2);
      ctx.fill();

      // Sleek drone chassis in dark obsidian with rose glow
      ctx.fillStyle = '#161822';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dr.x + dr.w / 2, dr.y + dr.h / 2, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Inner optic eye
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(dr.x + dr.w / 2 - 2, dr.y + dr.h / 2 - 2, 4, 4);

      ctx.restore();
    });

    // 8. Detective Player Sprite
    ctx.save();

    // Soft drop shadow beneath feet
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + p.h / 2, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Invulnerability flashing shield
    if (p.invulnerable > 0) {
      if (Math.floor(p.invulnerable / 5) % 2 === 0) {
        ctx.globalAlpha = 0.45;
      }
      ctx.strokeStyle = '#dfba73';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.translate(p.x, p.y);

    // Streetwear trench / hoodie body
    ctx.fillStyle = '#13151f';
    ctx.fillRect(-p.w / 2, -p.h / 2 + 5, p.w, p.h - 5);

    // Signature JVāN Champagne Gold Chest Monogram
    ctx.fillStyle = '#dfba73';
    ctx.fillRect(-p.w / 4, -p.h / 2 + 6, p.w / 2, 3);

    // Beanie / Cap
    ctx.fillStyle = '#222533';
    ctx.fillRect(-p.w / 2 + 2, -p.h / 2, p.w - 4, 7);

    // Directional Cyber Visor Glow in Champagne Gold
    ctx.fillStyle = '#dfba73';
    ctx.shadowColor = '#dfba73';
    ctx.shadowBlur = 8;
    if (p.dir === 'down') {
      ctx.fillRect(-5, -p.h / 2 + 4, 10, 3);
    } else if (p.dir === 'left') {
      ctx.fillRect(-8, -p.h / 2 + 4, 6, 3);
    } else if (p.dir === 'right') {
      ctx.fillRect(2, -p.h / 2 + 4, 6, 3);
    } else {
      ctx.fillRect(-4, -p.h / 2 + 2, 8, 2);
    }
    ctx.shadowBlur = 0;

    // Streetwear sneakers (animated walk cycle)
    ctx.fillStyle = '#f5f2eb';
    const legOffset = (p.animFrame % 2 === 0 ? 3 : -3);
    ctx.fillRect(-p.w / 3 + legOffset, p.h / 2 - 2, 4, 4);
    ctx.fillRect(p.w / 6 - legOffset, p.h / 2 - 2, 4, 4);

    ctx.restore();

    // 9. Render Shockwaves (Swatch pickup and vault unlock rings)
    if (engine.shockwaves) {
      engine.shockwaves.forEach(sw => {
        ctx.save();
        ctx.strokeStyle = sw.color;
        ctx.globalAlpha = Math.max(0, sw.alpha);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(sw.x, sw.y, sw.r * 1.3, sw.r * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });
    }

    // 10. Particle Bursts
    engine.particles.forEach(pt => {
      ctx.save();
      ctx.fillStyle = pt.color;
      ctx.globalAlpha = Math.max(0, pt.life);
      ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
      ctx.restore();
    });

    // 11. Dynamic Atmospheric Spotlight Vignette (Centers on Detective for high-fashion runway intimacy)
    ctx.save();
    const spotGrad = ctx.createRadialGradient(
      p.x, p.y, 45,
      p.x, p.y, Math.max(300, engine.canvasW * 0.45)
    );
    spotGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    spotGrad.addColorStop(0.65, 'rgba(6, 7, 10, 0.45)');
    spotGrad.addColorStop(1, 'rgba(4, 5, 8, 0.92)');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 0, engine.canvasW, engine.canvasH);
    ctx.restore();

    // 12. Tactical Minimap Radar (Top-Right of large arena)
    renderRadar(ctx, engine);
  };

  // Tactical Minimap Radar Widget for navigating the expansive room
  const renderRadar = (ctx, engine) => {
    const radarW = 110;
    const radarH = 70;
    const radarX = engine.canvasW - radarW - 16;
    const radarY = 16;

    ctx.save();
    // Glassmorphism radar backdrop
    ctx.fillStyle = 'rgba(12, 14, 20, 0.88)';
    ctx.fillRect(radarX, radarY, radarW, radarH);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = 1;
    ctx.strokeRect(radarX, radarY, radarW, radarH);

    ctx.fillStyle = '#dfba73';
    ctx.font = '7px monospace';
    ctx.fillText('ATELIER // RUNWAY MAP', radarX + 6, radarY + 10);

    const scaleX = (radarW - 12) / engine.canvasW;
    const scaleY = (radarH - 18) / engine.canvasH;
    const originX = radarX + 6;
    const originY = radarY + 14;

    // Evidence blips (Champagne Gold)
    engine.evidence.forEach(item => {
      if (!item.collected) {
        ctx.fillStyle = '#dfba73';
        ctx.fillRect(originX + item.x * scaleX, originY + item.y * scaleY, 2.5, 2.5);
      }
    });

    // Drone blips (Rose/Crimson)
    engine.drones.forEach(drone => {
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(originX + drone.x * scaleX, originY + drone.y * scaleY, 2.5, 2.5);
    });

    // Exit Door blip (Gold or Rose)
    ctx.fillStyle = engine.door.open ? '#dfba73' : '#f43f5e';
    ctx.fillRect(originX + engine.door.x * scaleX, originY + engine.door.y * scaleY, 3.5, 3.5);

    // Detective blip (Warm Ivory)
    ctx.fillStyle = '#f5f2eb';
    ctx.fillRect(originX + engine.player.x * scaleX - 1.5, originY + engine.player.y * scaleY - 1.5, 4, 4);

    ctx.restore();
  };

  const handleTouchDir = (dir, isDown) => {
    engineRef.current.keys[dir] = isDown;
  };

  if (!isOpen) return null;

  return (
    <div className="fullscreen-game-backdrop" ref={containerRef}>
      {/* Sleek Floating Top HUD Bar */}
      <header className="fullscreen-hud-bar">
        <div className="hud-left-meta">
          <span className="game-brand-pill">JVāN ATELIER</span>
          {activePlayer && (
            <span className="hud-player-pill" title={`Logged in as ${activePlayer.alias} (${activePlayer.contactValue})`}>
              👤 {activePlayer.alias}
            </span>
          )}
          <span className="case-level-pill">COLLECTION #{level}</span>
        </div>

        <div className="hud-center-status">
          <div className="evidence-progress-wrap">
            <span className="hud-metric-label">SWATCHES:</span>
            <span className="hud-metric-val">{totalEvidence - evidenceLeft} / {totalEvidence}</span>
            <div className="mini-progress-bar">
              <div 
                className="mini-progress-fill" 
                style={{ width: `${((totalEvidence - evidenceLeft) / totalEvidence) * 100}%` }}
              />
            </div>
          </div>

          <span className={`door-pill ${doorOpen ? 'unlocked' : 'locked'}`}>
            {doorOpen ? '✓ RUNWAY VAULT OPEN' : 'RECOVER ALL FABRIC SWATCHES'}
          </span>
        </div>

        <div className="hud-right-actions">
          <button 
            className="hud-action-btn hud-leaderboard-btn" 
            onClick={() => {
              soundEngine.playClick();
              if (onOpenLeaderboard) onOpenLeaderboard('rpg');
            }} 
            onMouseEnter={() => soundEngine.playHover()}
            title="View Global Leaderboard"
          >
            🏆 LEADERBOARD
          </button>
          <button 
            className="hud-action-btn" 
            onClick={handleToggleSound} 
            onMouseEnter={() => soundEngine.playHover()}
            title={soundMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {soundMuted ? '🔇' : '🔊'}
          </button>
          <button 
            className="hud-action-btn" 
            onClick={handleRestartFloor} 
            onMouseEnter={() => soundEngine.playHover()}
            title="Regenerate Floor"
          >
            ↺ RESET
          </button>
          <button 
            className="exit-fullscreen-btn" 
            onClick={handleExit} 
            onMouseEnter={() => soundEngine.playHover()}
            title="Exit Full Screen"
          >
            ✕ EXIT GAME
          </button>
        </div>
      </header>

      {/* Full-Screen Canvas Stage */}
      <div className="fullscreen-canvas-wrapper">
        <canvas ref={canvasRef} />
      </div>

      {/* Mobile Virtual D-Pad (Touch Devices) */}
      <div className="fullscreen-mobile-dpad">
        <div className="dpad-cluster">
          <button
            className="dpad-btn up"
            onTouchStart={(e) => { e.preventDefault(); soundEngine.playFootstep(); handleTouchDir('up', true); }}
            onTouchEnd={() => handleTouchDir('up', false)}
            onMouseDown={() => { soundEngine.playFootstep(); handleTouchDir('up', true); }}
            onMouseUp={() => handleTouchDir('up', false)}
          >
            ▲
          </button>
          <div className="dpad-row-mid">
            <button
              className="dpad-btn left"
              onTouchStart={(e) => { e.preventDefault(); soundEngine.playFootstep(); handleTouchDir('left', true); }}
              onTouchEnd={() => handleTouchDir('left', false)}
              onMouseDown={() => { soundEngine.playFootstep(); handleTouchDir('left', true); }}
              onMouseUp={() => handleTouchDir('left', false)}
            >
              ◀
            </button>
            <button
              className="dpad-btn down"
              onTouchStart={(e) => { e.preventDefault(); soundEngine.playFootstep(); handleTouchDir('down', true); }}
              onTouchEnd={() => handleTouchDir('down', false)}
              onMouseDown={() => { soundEngine.playFootstep(); handleTouchDir('down', true); }}
              onMouseUp={() => handleTouchDir('down', false)}
            >
              ▼
            </button>
            <button
              className="dpad-btn right"
              onTouchStart={(e) => { e.preventDefault(); soundEngine.playFootstep(); handleTouchDir('right', true); }}
              onTouchEnd={() => handleTouchDir('right', false)}
              onMouseDown={() => { soundEngine.playFootstep(); handleTouchDir('right', true); }}
              onMouseUp={() => handleTouchDir('right', false)}
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Controls Floating Footer Hint */}
      <div className="fullscreen-footer-hint">
        <span>WASD / ARROW KEYS TO EXPLORE // RADAR ON TOP-RIGHT // ESC TO EXIT FULL SCREEN</span>
      </div>
    </div>
  );
};
