/**
 * JVāN - "THE DROP CATCHER" Mini-Game
 * A high-intensity streetwear arcade mini-game built on HTML5 Canvas.
 */

class DropCatcherGame {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");

    // Game states: 'idle', 'playing', 'paused', 'gameover', 'won'
    this.state = "idle";
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem("jvan_high_score") || "0", 10);
    this.lives = 3;
    this.maxLives = 3;
    this.combo = 0;
    this.multiplier = 1;
    this.unlockedVIP = localStorage.getItem("jvan_vip_unlocked") === "true";
    this.targetScore = (window.BRAND_CONFIG && window.BRAND_CONFIG.vipTargetScore) || 200;

    // Canvas scaling & sizes
    this.width = 480;
    this.height = 640;
    this.dpr = window.devicePixelRatio || 1;

    // Player (The JVāN Tote/Vault)
    this.player = {
      x: this.width / 2,
      y: this.height - 70,
      width: 95,
      height: 48,
      speed: 8,
      targetX: this.width / 2,
      glowIntensity: 0
    };

    // Entities
    this.items = [];
    this.particles = [];
    this.floatingTexts = [];

    // Spawn parameters
    this.spawnTimer = 0;
    this.spawnInterval = 55; // frames between spawns
    this.itemSpeedBase = 3.2;

    // Controls tracking
    this.keys = { left: false, right: false };
    this.touchActive = false;

    // Animation frame handle
    this.animId = null;

    this.initCanvasSize();
    this.bindEvents();
    this.renderInitialScreen();
  }

  initCanvasSize() {
    const container = this.canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // Maintain aspect ratio or adapt dynamically
    const displayWidth = Math.min(rect.width, 520);
    const displayHeight = Math.min(window.innerHeight * 0.65, 640);

    this.width = displayWidth;
    this.height = displayHeight;

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.scale(this.dpr, this.dpr);

    // Adjust player placement
    this.player.y = this.height - 65;
    this.player.x = Math.min(Math.max(this.player.x, this.player.width / 2), this.width - this.player.width / 2);
    this.player.targetX = this.player.x;
  }

  bindEvents() {
    window.addEventListener("resize", () => {
      this.initCanvasSize();
      if (this.state === "idle") this.renderInitialScreen();
    });

    // Keyboard controls
    window.addEventListener("keydown", (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        this.keys.left = true;
      }
      if (e.code === "ArrowRight" || e.code === "KeyD") {
        this.keys.right = true;
      }
      if (e.code === "Space" && (this.state === "idle" || this.state === "gameover")) {
        e.preventDefault();
        this.start();
      }
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") this.keys.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") this.keys.right = false;
    });

    // Mouse movement
    this.canvas.addEventListener("mousemove", (e) => {
      if (this.state !== "playing") return;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      this.player.targetX = Math.max(this.player.width / 2, Math.min(this.width - this.player.width / 2, mouseX));
    });

    // Touch controls
    const handleTouch = (e) => {
      if (this.state === "idle" || this.state === "gameover") {
        e.preventDefault();
        this.start();
        return;
      }
      if (this.state !== "playing") return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      const touchX = touch.clientX - rect.left;
      this.player.targetX = Math.max(this.player.width / 2, Math.min(this.width - this.player.width / 2, touchX));
    };

    this.canvas.addEventListener("touchstart", handleTouch, { passive: false });
    this.canvas.addEventListener("touchmove", handleTouch, { passive: false });

    // On-screen Mobile Button controls (if present in DOM)
    const btnLeft = document.getElementById("game-btn-left");
    const btnRight = document.getElementById("game-btn-right");
    if (btnLeft && btnRight) {
      btnLeft.addEventListener("touchstart", (e) => { e.preventDefault(); this.keys.left = true; }, { passive: false });
      btnLeft.addEventListener("touchend", () => { this.keys.left = false; });
      btnRight.addEventListener("touchstart", (e) => { e.preventDefault(); this.keys.right = true; }, { passive: false });
      btnRight.addEventListener("touchend", () => { this.keys.right = false; });

      btnLeft.addEventListener("mousedown", () => { this.keys.left = true; });
      btnLeft.addEventListener("mouseup", () => { this.keys.left = false; });
      btnRight.addEventListener("mousedown", () => { this.keys.right = true; });
      btnRight.addEventListener("mouseup", () => { this.keys.right = false; });
    }
  }

  start() {
    if (window.soundEngine) window.soundEngine.init();
    this.state = "playing";
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.multiplier = 1;
    this.items = [];
    this.particles = [];
    this.floatingTexts = [];
    this.spawnTimer = 0;
    this.itemSpeedBase = 3.2;

    this.updateHUD();

    if (this.animId) cancelAnimationFrame(this.animId);
    this.lastTime = performance.now();
    this.loop();
  }

  updateHUD() {
    const scoreEl = document.getElementById("hud-score");
    const livesEl = document.getElementById("hud-lives");
    const comboEl = document.getElementById("hud-combo");
    const highscoreEl = document.getElementById("hud-highscore");

    if (scoreEl) scoreEl.textContent = this.score;
    if (highscoreEl) highscoreEl.textContent = this.highScore;
    if (comboEl) {
      comboEl.textContent = `x${this.multiplier}`;
      comboEl.className = this.multiplier > 1 ? "pulse-volt" : "";
    }
    if (livesEl) {
      livesEl.innerHTML = Array(this.lives).fill("🏷️").join(" ");
    }
  }

  spawnItem() {
    // Streetwear items catalog
    const itemTypes = [
      { type: "hoodie", label: "HOODIE", points: 30, color: "#f4f4f5", isHazard: false, weight: 30 },
      { type: "sneaker", label: "RUNNER", points: 50, color: "#d4ff00", isHazard: false, weight: 25 },
      { type: "cap", label: "CAP", points: 20, color: "#a1a1aa", isHazard: false, weight: 25 },
      { type: "mystery", label: "VAULT CRATE", points: 100, color: "#d4ff00", isHazard: false, weight: 10 },
      { type: "soldout", label: "SOLD OUT", points: 0, color: "#ef4444", isHazard: true, weight: 20 }
    ];

    // Weighted random selection
    const totalWeight = itemTypes.reduce((acc, i) => acc + i.weight, 0);
    let rand = Math.random() * totalWeight;
    let chosen = itemTypes[0];
    for (let item of itemTypes) {
      if (rand < item.weight) {
        chosen = item;
        break;
      }
      rand -= item.weight;
    }

    const margin = 40;
    const spawnX = margin + Math.random() * (this.width - margin * 2);
    const speed = this.itemSpeedBase + Math.random() * 1.5 + (this.score / 250);

    this.items.push({
      x: spawnX,
      y: -40,
      width: chosen.type === "mystery" ? 38 : 34,
      height: chosen.type === "mystery" ? 38 : 34,
      rotation: (Math.random() - 0.5) * 0.4,
      rotSpeed: (Math.random() - 0.5) * 0.05,
      speedY: speed,
      ...chosen
    });
  }

  loop() {
    if (this.state !== "playing") return;

    this.update();
    this.render();

    this.animId = requestAnimationFrame(() => this.loop());
  }

  update() {
    // Keyboard movement
    if (this.keys.left) {
      this.player.targetX = Math.max(this.player.width / 2, this.player.x - this.player.speed);
    }
    if (this.keys.right) {
      this.player.targetX = Math.min(this.width - this.player.width / 2, this.player.x + this.player.speed);
    }

    // Smooth lerp to targetX
    this.player.x += (this.player.targetX - this.player.x) * 0.22;

    // Spawn items
    this.spawnTimer++;
    // Progressive difficulty
    const currentInterval = Math.max(30, this.spawnInterval - Math.floor(this.score / 40));
    if (this.spawnTimer >= currentInterval) {
      this.spawnItem();
      this.spawnTimer = 0;
    }

    // Update items
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.y += item.speedY;
      item.rotation += item.rotSpeed;

      // Collision with player tote
      const hitX = Math.abs(item.x - this.player.x) < (this.player.width / 2 + item.width / 2 - 8);
      const hitY = (item.y + item.height / 2 >= this.player.y - this.player.height / 2) &&
                   (item.y - item.height / 2 <= this.player.y + this.player.height / 2);

      if (hitX && hitY) {
        this.handleCatch(item);
        this.items.splice(i, 1);
        continue;
      }

      // Fell off screen
      if (item.y > this.height + 40) {
        if (!item.isHazard) {
          // Missed apparel drops combo
          this.combo = 0;
          this.multiplier = 1;
          this.updateHUD();
        }
        this.items.splice(i, 1);
      }
    }

    // Check VIP unlock milestone
    if (!this.unlockedVIP && this.score >= this.targetScore) {
      this.triggerVIPUnlock();
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.03;
      p.size = Math.max(0, p.size - 0.05);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy;
      ft.life -= 0.025;
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  handleCatch(item) {
    if (item.isHazard) {
      // Hit "SOLD OUT" tag
      this.lives--;
      this.combo = 0;
      this.multiplier = 1;
      this.triggerGlitch();
      this.createGlitchParticles(item.x, item.y);
      this.addFloatingText("SOLD OUT! -1 LIFE", item.x, item.y - 15, "#ef4444");

      if (window.soundEngine) window.soundEngine.playSoldOut();
      this.updateHUD();

      if (this.lives <= 0) {
        this.gameOver();
      }
    } else {
      // Good item caught
      this.combo++;
      if (this.combo >= 8) this.multiplier = 3;
      else if (this.combo >= 4) this.multiplier = 2;
      else this.multiplier = 1;

      const earnedPoints = item.points * this.multiplier;
      this.score += earnedPoints;

      if (this.multiplier > 1 && this.combo % 4 === 0) {
        if (window.soundEngine) window.soundEngine.playCombo();
        this.addFloatingText(`HYPE x${this.multiplier}!`, item.x, item.y - 35, "#d4ff00");
      } else {
        if (window.soundEngine) window.soundEngine.playCatch(this.multiplier);
      }

      this.addFloatingText(`+${earnedPoints}`, item.x, item.y - 15, item.color);
      this.createBurstParticles(item.x, item.y, item.color);

      // Flash glow on tote
      this.player.glowIntensity = 1.0;

      this.updateHUD();
    }
  }

  triggerVIPUnlock() {
    this.unlockedVIP = true;
    localStorage.setItem("jvan_vip_unlocked", "true");
    if (window.soundEngine) window.soundEngine.playUnlock();

    // Spawn celebratory confetti particles
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: this.width / 2 + (Math.random() - 0.5) * 200,
        y: this.height / 3,
        vx: (Math.random() - 0.5) * 8,
        vy: -Math.random() * 6 - 2,
        size: Math.random() * 6 + 2,
        color: ["#d4ff00", "#ffffff", "#38bdf8", "#ec4899"][Math.floor(Math.random() * 4)],
        life: 1.5
      });
    }

    this.addFloatingText("⚡ VIP VAULT CODE UNLOCKED! ⚡", this.width / 2, this.height / 3, "#d4ff00");

    // Display VIP Modal after small delay
    setTimeout(() => {
      if (window.showVIPModal) window.showVIPModal();
    }, 700);
  }

  triggerGlitch() {
    this.canvas.classList.add("glitch-shake");
    setTimeout(() => {
      this.canvas.classList.remove("glitch-shake");
    }, 350);
  }

  createBurstParticles(x, y, color) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: color || "#d4ff00",
        life: 1.0
      });
    }
  }

  createGlitchParticles(x, y) {
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 2,
        color: "#ef4444",
        life: 1.0
      });
    }
  }

  addFloatingText(text, x, y, color = "#fff") {
    this.floatingTexts.push({
      text,
      x,
      y,
      vy: -1.4,
      color,
      life: 1.0
    });
  }

  gameOver() {
    this.state = "gameover";
    if (window.soundEngine) window.soundEngine.playGameOver();

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem("jvan_high_score", this.highScore.toString());
    }

    this.updateHUD();
    this.renderGameOverScreen();
  }

  render() {
    // Clear canvas
    this.ctx.fillStyle = "#0c0d0e";
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Subtle cyberpunk grid background
    this.drawBackgroundGrid();

    // Render items
    for (const item of this.items) {
      this.drawItem(item);
    }

    // Render particles
    for (const p of this.particles) {
      this.ctx.save();
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      this.ctx.restore();
    }

    // Render player (JVāN Tote Bag / Vault)
    this.drawPlayer();

    // Render floating texts
    for (const ft of this.floatingTexts) {
      this.ctx.save();
      this.ctx.font = "bold 13px 'JetBrains Mono', 'Space Mono', monospace";
      this.ctx.fillStyle = ft.color;
      this.ctx.globalAlpha = Math.max(0, ft.life);
      this.ctx.textAlign = "center";
      this.ctx.fillText(ft.text, ft.x, ft.y);
      this.ctx.restore();
    }
  }

  drawBackgroundGrid() {
    this.ctx.save();
    this.ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    this.ctx.lineWidth = 1;

    const gridSize = 40;
    for (let x = 0; x < this.width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.height);
      this.ctx.stroke();
    }

    for (let y = 0; y < this.height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.width, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  drawPlayer() {
    const p = this.player;
    this.ctx.save();
    this.ctx.translate(p.x, p.y);

    // Fade glow intensity
    p.glowIntensity = Math.max(0, p.glowIntensity - 0.04);

    // Glow aura
    if (this.multiplier > 1 || p.glowIntensity > 0) {
      this.ctx.shadowColor = "#d4ff00";
      this.ctx.shadowBlur = 12 * Math.max(p.glowIntensity, this.multiplier * 0.4);
    }

    // Tote Bag Body (Matte black streetwear cargo tote)
    this.ctx.fillStyle = "#18181b";
    this.ctx.strokeStyle = p.glowIntensity > 0 ? "#d4ff00" : "#27272a";
    this.ctx.lineWidth = 2;

    this.roundRect(this.ctx, -p.width / 2, -p.height / 2, p.width, p.height, 4, true, true);

    // Tote handles
    this.ctx.beginPath();
    this.ctx.strokeStyle = "#3f3f46";
    this.ctx.lineWidth = 3;
    this.ctx.moveTo(-p.width / 4, -p.height / 2);
    this.ctx.lineTo(-p.width / 4, -p.height / 2 - 12);
    this.ctx.lineTo(p.width / 4, -p.height / 2 - 12);
    this.ctx.lineTo(p.width / 4, -p.height / 2);
    this.ctx.stroke();

    // Brand label on tote: "JVāN"
    this.ctx.shadowBlur = 0;
    this.ctx.font = "900 13px 'Syne', 'Inter', sans-serif";
    this.ctx.fillStyle = "#fafafa";
    this.ctx.textAlign = "center";
    this.ctx.letterSpacing = "2px";
    const brandName = (window.BRAND_CONFIG && window.BRAND_CONFIG.brandName) || "JVāN";
    this.ctx.fillText(brandName, 0, 4);

    // Subtext label
    this.ctx.font = "700 7px 'JetBrains Mono', monospace";
    this.ctx.fillStyle = "#d4ff00";
    this.ctx.fillText("VAULT BAG", 0, 16);

    // Neon trim corner accents
    this.ctx.fillStyle = "#d4ff00";
    this.ctx.fillRect(-p.width / 2, -p.height / 2, 4, 4);
    this.ctx.fillRect(p.width / 2 - 4, -p.height / 2, 4, 4);

    this.ctx.restore();
  }

  drawItem(item) {
    this.ctx.save();
    this.ctx.translate(item.x, item.y);
    this.ctx.rotate(item.rotation);

    if (item.type === "hoodie") {
      // Streetwear Oversized Hoodie Icon
      this.ctx.fillStyle = "#e4e4e7";
      // Body
      this.roundRect(this.ctx, -14, -6, 28, 22, 3, true, false);
      // Hood
      this.ctx.beginPath();
      this.ctx.arc(0, -9, 8, Math.PI, 0, false);
      this.ctx.fill();
      // Sleeves
      this.ctx.beginPath();
      this.ctx.moveTo(-14, -4);
      this.ctx.lineTo(-21, 6);
      this.ctx.lineTo(-17, 9);
      this.ctx.lineTo(-14, 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.moveTo(14, -4);
      this.ctx.lineTo(21, 6);
      this.ctx.lineTo(17, 9);
      this.ctx.lineTo(14, 2);
      this.ctx.fill();

      // Chest logo
      this.ctx.fillStyle = "#09090b";
      this.ctx.fillRect(-4, -1, 8, 3);

    } else if (item.type === "sneaker") {
      // Chunky Sneaker Silhouette
      this.ctx.fillStyle = "#d4ff00";
      // Sole
      this.ctx.fillRect(-15, 8, 30, 6);
      // Upper
      this.ctx.beginPath();
      this.ctx.moveTo(-15, 8);
      this.ctx.lineTo(-12, -4);
      this.ctx.lineTo(2, -2);
      this.ctx.lineTo(14, 8);
      this.ctx.closePath();
      this.ctx.fill();
      // Ankle collar
      this.ctx.fillStyle = "#18181b";
      this.ctx.fillRect(-10, -7, 10, 4);

    } else if (item.type === "cap") {
      // Washed Streetwear Cap
      this.ctx.fillStyle = "#a1a1aa";
      // Crown
      this.ctx.beginPath();
      this.ctx.arc(0, 0, 11, Math.PI, 0, false);
      this.ctx.fill();
      // Visor / Brim
      this.ctx.fillRect(0, 0, 16, 4);

    } else if (item.type === "mystery") {
      // Golden / Volt Vault Crate
      this.ctx.fillStyle = "#18181b";
      this.ctx.strokeStyle = "#d4ff00";
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(-15, -15, 30, 30);
      this.ctx.fillRect(-15, -15, 30, 30);

      // Warning stripes
      this.ctx.fillStyle = "#d4ff00";
      this.ctx.font = "bold 16px 'JetBrains Mono', monospace";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("?", 0, 0);

    } else if (item.type === "soldout") {
      // Hazard SOLD OUT tag
      this.ctx.fillStyle = "#ef4444";
      this.ctx.strokeStyle = "#ffffff";
      this.ctx.lineWidth = 1.5;
      this.roundRect(this.ctx, -18, -12, 36, 24, 2, true, true);

      this.ctx.fillStyle = "#ffffff";
      this.ctx.font = "900 8px 'Space Mono', monospace";
      this.ctx.textAlign = "center";
      this.ctx.textBaseline = "middle";
      this.ctx.fillText("SOLD OUT", 0, 0);
    }

    this.ctx.restore();
  }

  roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  renderInitialScreen() {
    this.ctx.fillStyle = "#0c0d0e";
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.drawBackgroundGrid();

    this.ctx.save();
    this.ctx.textAlign = "center";

    // Brand headline
    const brandName = (window.BRAND_CONFIG && window.BRAND_CONFIG.brandName) || "JVāN";
    this.ctx.font = "900 24px 'Syne', sans-serif";
    this.ctx.fillStyle = "#fafafa";
    this.ctx.letterSpacing = "4px";
    this.ctx.fillText(brandName + " DROP CATCHER", this.width / 2, this.height * 0.32);

    this.ctx.font = "600 11px 'JetBrains Mono', monospace";
    this.ctx.fillStyle = "#a1a1aa";
    this.ctx.fillText("CATCH HEAT. DODGE SOLD OUT TAGS.", this.width / 2, this.height * 0.38);

    // Reward Target badge
    this.ctx.fillStyle = "rgba(212, 255, 0, 0.08)";
    this.ctx.strokeStyle = "#d4ff00";
    this.ctx.lineWidth = 1;
    this.roundRect(this.ctx, this.width / 2 - 130, this.height * 0.44, 260, 46, 6, true, true);

    this.ctx.fillStyle = "#d4ff00";
    this.ctx.font = "700 11px 'JetBrains Mono', monospace";
    this.ctx.fillText(`⚡ HIT ${this.targetScore} PTS FOR 20% OFF VIP CODE`, this.width / 2, this.height * 0.48);
    this.ctx.fillStyle = "#e4e4e7";
    this.ctx.font = "500 9px 'JetBrains Mono', monospace";
    this.ctx.fillText("REDEEMABLE ONCE SHOPIFY REOPENS", this.width / 2, this.height * 0.52);

    // Call to action button box
    this.ctx.fillStyle = "#d4ff00";
    this.roundRect(this.ctx, this.width / 2 - 90, this.height * 0.62, 180, 44, 4, true, false);

    this.ctx.fillStyle = "#09090b";
    this.ctx.font = "900 13px 'Syne', sans-serif";
    this.ctx.letterSpacing = "2px";
    this.ctx.fillText("START DROP", this.width / 2, this.height * 0.62 + 27);

    // Mobile / Desktop prompt
    this.ctx.font = "500 10px 'JetBrains Mono', monospace";
    this.ctx.fillStyle = "#71717a";
    this.ctx.fillText("SWIPE OR USE ARROW KEYS / A & D", this.width / 2, this.height * 0.76);

    this.ctx.restore();
  }

  renderGameOverScreen() {
    this.ctx.save();
    // Semi-transparent blackout
    this.ctx.fillStyle = "rgba(12, 13, 14, 0.88)";
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.ctx.textAlign = "center";

    this.ctx.font = "900 28px 'Syne', sans-serif";
    this.ctx.fillStyle = "#ef4444";
    this.ctx.letterSpacing = "3px";
    this.ctx.fillText("DROP CLOSED", this.width / 2, this.height * 0.3);

    this.ctx.font = "700 13px 'JetBrains Mono', monospace";
    this.ctx.fillStyle = "#e4e4e7";
    this.ctx.fillText(`FINAL SCORE: ${this.score} PTS`, this.width / 2, this.height * 0.38);

    this.ctx.font = "600 11px 'JetBrains Mono', monospace";
    this.ctx.fillStyle = "#a1a1aa";
    this.ctx.fillText(`BEST SCORE: ${this.highScore} PTS`, this.width / 2, this.height * 0.44);

    if (this.score >= this.targetScore) {
      this.ctx.fillStyle = "#d4ff00";
      this.ctx.font = "700 11px 'JetBrains Mono', monospace";
      this.ctx.fillText("✓ VIP DISCOUNT UNLOCKED!", this.width / 2, this.height * 0.51);
    } else {
      this.ctx.fillStyle = "#71717a";
      this.ctx.font = "500 10px 'JetBrains Mono', monospace";
      this.ctx.fillText(`Need ${this.targetScore - this.score} more pts for VIP code`, this.width / 2, this.height * 0.51);
    }

    // Restart button
    this.ctx.fillStyle = "#d4ff00";
    this.roundRect(this.ctx, this.width / 2 - 80, this.height * 0.6, 160, 42, 4, true, false);

    this.ctx.fillStyle = "#09090b";
    this.ctx.font = "900 12px 'Syne', sans-serif";
    this.ctx.letterSpacing = "2px";
    this.ctx.fillText("RUN IT BACK", this.width / 2, this.height * 0.6 + 26);

    this.ctx.restore();
  }
}

window.DropCatcherGame = DropCatcherGame;
