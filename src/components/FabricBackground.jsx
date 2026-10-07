import React, { useEffect, useRef } from 'react';

/**
 * FabricBackground - High-Fashion Animated Draped Luxury Textile Simulation
 * Procedurally simulates undulating haute couture silk/velvet folds, 
 * woven textile twill micro-texture, dynamic luster highlights, 
 * atmospheric studio lighting sweeps, and interactive cursor wind drafts.
 */
export const FabricBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId = null;

    let width = 0;
    let height = 0;
    let dpr = 1;

    // Generate offscreen seamless twill weave micro-pattern
    let weavePattern = null;
    const createWeavePattern = () => {
      const pCanvas = document.createElement('canvas');
      const size = 16;
      pCanvas.width = size;
      pCanvas.height = size;
      const pCtx = pCanvas.getContext('2d');

      // Dark weave base
      pCtx.fillStyle = 'rgba(8, 9, 13, 0.9)';
      pCtx.fillRect(0, 0, size, size);

      // Warp threads (vertical)
      pCtx.strokeStyle = 'rgba(223, 186, 115, 0.05)';
      pCtx.lineWidth = 1;
      pCtx.beginPath();
      pCtx.moveTo(4, 0); pCtx.lineTo(4, size);
      pCtx.moveTo(12, 0); pCtx.lineTo(12, size);
      pCtx.stroke();

      // Weft threads (horizontal)
      pCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
      pCtx.beginPath();
      pCtx.moveTo(0, 4); pCtx.lineTo(size, 4);
      pCtx.moveTo(0, 12); pCtx.lineTo(size, 12);
      pCtx.stroke();

      // Diagonal twill rib highlights (2x2 twill pattern)
      pCtx.fillStyle = 'rgba(223, 186, 115, 0.08)';
      pCtx.fillRect(3, 3, 3, 3);
      pCtx.fillRect(11, 11, 3, 3);

      // Micro thread shadow interlock
      pCtx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      pCtx.fillRect(3, 11, 3, 3);
      pCtx.fillRect(11, 3, 3, 3);

      return ctx.createPattern(pCanvas, 'repeat');
    };

    const handleResize = () => {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      weavePattern = createWeavePattern();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Floating delicate silk lint / thread fibers
    const fibers = [];
    const fiberCount = Math.min(30, Math.floor(width / 45));
    for (let i = 0; i < fiberCount; i++) {
      fibers.push({
        x: Math.random() * width,
        y: Math.random() * height,
        length: Math.random() * 20 + 8,
        angle: Math.random() * Math.PI * 2,
        speedX: (Math.random() - 0.5) * 0.35,
        speedY: Math.random() * 0.3 + 0.1,
        rotSpeed: (Math.random() - 0.5) * 0.015,
        opacity: Math.random() * 0.25 + 0.06,
        color: i % 3 === 0 ? 'rgba(223, 186, 115, ' : 'rgba(225, 230, 245, '
      });
    }

    // Interactive mouse wind physics
    let mouse = { x: width / 2, y: height / 2, targetX: width / 2, targetY: height / 2 };
    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    let time = 0;

    const render = () => {
      time += 0.007;

      // Soft mouse inertia
      mouse.x += (mouse.targetX - mouse.x) * 0.035;
      mouse.y += (mouse.targetY - mouse.y) * 0.035;

      // Clear with base rich obsidian charcoal
      ctx.fillStyle = '#08090d';
      ctx.fillRect(0, 0, width, height);

      // --- PROCEDURAL DRAPED FABRIC FLUTES (VERTICAL HANGING PLEATS) ---
      // Number of vertical fabric columns
      const foldSpacing = 110;
      const numFolds = Math.ceil(width / foldSpacing) + 2;

      // Wandering atelier ambient key light
      const keyLightX = width * 0.5 + Math.sin(time * 0.45) * (width * 0.32);
      const keyLightY = height * 0.35 + Math.cos(time * 0.3) * (height * 0.22);

      for (let i = -1; i <= numFolds; i++) {
        const baseX = i * foldSpacing;
        const foldWidth = foldSpacing * 1.55;

        ctx.save();

        // Sample points along the vertical height of this drape
        const points = [];
        const segments = 28;
        const stepY = (height + 120) / segments;

        for (let s = 0; s <= segments; s++) {
          const y = -60 + s * stepY;

          // Multi-harmonic cloth wave physics
          const wave1 = Math.sin(y * 0.0028 + time * 1.1 + i * 0.85) * 44;
          const wave2 = Math.cos(y * 0.0055 - time * 0.8 + i * 1.35) * 20;
          const wave3 = Math.sin(y * 0.01 + time * 1.8 + i * 0.5) * 6;

          // Interactive cursor wind draft (cloth pushes away gently)
          const mDist = Math.hypot(baseX - mouse.x, y - mouse.y);
          const mForce = Math.max(0, 1 - mDist / 380);
          const mDraft = Math.sin(mDist * 0.025 - time * 3) * (mForce * 32);

          const cx = baseX + wave1 + wave2 + wave3 + mDraft;
          points.push({ x: cx, y });
        }

        // Draw the full fold body strip
        ctx.beginPath();
        // Left shadow boundary
        for (let s = 0; s <= segments; s++) {
          const pt = points[s];
          const lx = pt.x - foldWidth * 0.5;
          if (s === 0) ctx.moveTo(lx, pt.y);
          else ctx.lineTo(lx, pt.y);
        }
        // Right shadow boundary (in reverse)
        for (let s = segments; s >= 0; s--) {
          const pt = points[s];
          const rx = pt.x + foldWidth * 0.5;
          ctx.lineTo(rx, pt.y);
        }
        ctx.closePath();

        // Compute lighting gradient across this fold's cross section
        const avgX = points[Math.floor(segments / 2)].x;
        const lightDist = Math.hypot(avgX - keyLightX, (height * 0.4) - keyLightY);
        const lightFactor = Math.max(0.2, 1 - lightDist / (width * 0.8));

        const foldGrad = ctx.createLinearGradient(
          avgX - foldWidth * 0.5, 0,
          avgX + foldWidth * 0.5, 0
        );

        // Dark obsidian valley shadow
        foldGrad.addColorStop(0, 'rgba(4, 5, 8, 0.95)');
        // Soft matte flank
        foldGrad.addColorStop(0.25, 'rgba(16, 18, 25, 0.7)');
        // Crest ridge highlight (silk sheen)
        const sheenGold = 0.12 * lightFactor;
        foldGrad.addColorStop(0.5, `rgba(223, 186, 115, ${sheenGold + 0.08})`);
        // Opposite flank
        foldGrad.addColorStop(0.75, 'rgba(14, 15, 22, 0.65)');
        // Deep crease shadow
        foldGrad.addColorStop(1, 'rgba(3, 4, 6, 0.98)');

        ctx.fillStyle = foldGrad;
        ctx.fill();

        // Glistening specular ridge line along crest of the fold
        ctx.beginPath();
        for (let s = 0; s <= segments; s++) {
          const pt = points[s];
          if (s === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.strokeStyle = `rgba(235, 215, 175, ${0.14 * lightFactor + 0.08})`;
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.restore();
      }

      // --- DIAGONAL BILLOWING SILK SWAGS (LARGE ORGANIC CROSS-FOLDS) ---
      // Renders sweeping diagonal cloth ripples cascading across the screen
      const diagFolds = 5;
      for (let d = 0; d < diagFolds; d++) {
        ctx.save();
        const depth = (d + 1) / diagFolds;
        const diagSpeed = time * (0.6 + d * 0.15);

        ctx.beginPath();
        ctx.moveTo(0, height);

        const segs = 35;
        const stepX = width / segs;
        for (let s = 0; s <= segs; s++) {
          const x = s * stepX;
          const diagWave1 = Math.sin(x * 0.002 + diagSpeed + d * 1.5) * (50 * depth);
          const diagWave2 = Math.cos(x * 0.004 - diagSpeed * 0.7 + d) * (26 * depth);
          const baseY = height * (0.2 + d * 0.16) + (x * 0.18); // Gentle diagonal angle

          const y = baseY + diagWave1 + diagWave2;
          if (s === 0) ctx.lineTo(x, y);
          else ctx.lineTo(x, y);
        }

        ctx.lineTo(width, height);
        ctx.closePath();

        const swagGrad = ctx.createLinearGradient(0, 0, width, height);
        const alpha = 0.08 + d * 0.035;

        if (d % 2 === 0) {
          // Warm champagne silk luster
          swagGrad.addColorStop(0, `rgba(223, 186, 115, ${alpha * 0.6})`);
          swagGrad.addColorStop(0.5, `rgba(18, 19, 27, ${alpha * 1.3})`);
          swagGrad.addColorStop(1, `rgba(8, 9, 13, ${alpha * 2})`);
        } else {
          // Cool graphite / dark velvet
          swagGrad.addColorStop(0, `rgba(30, 32, 42, ${alpha})`);
          swagGrad.addColorStop(0.6, `rgba(180, 190, 210, ${alpha * 0.4})`);
          swagGrad.addColorStop(1, `rgba(6, 7, 10, ${alpha * 1.8})`);
        }

        ctx.fillStyle = swagGrad;
        ctx.fill();

        // Edge crest specular sheen
        ctx.strokeStyle = `rgba(223, 186, 115, ${0.07 + d * 0.02})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
      }

      // --- WOVEN TWILL TEXTILE MICRO-PATTERN OVERLAY ---
      if (weavePattern) {
        ctx.save();
        ctx.fillStyle = weavePattern;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }

      // --- FLOATING TEXTILE WEFT FIBERS / SILK LINT ---
      fibers.forEach(f => {
        f.x += f.speedX;
        f.y += f.speedY;
        f.angle += f.rotSpeed;

        if (f.y > height + 20) {
          f.y = -20;
          f.x = Math.random() * width;
        }
        if (f.x < -20) f.x = width + 20;
        if (f.x > width + 20) f.x = -20;

        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.angle);
        ctx.strokeStyle = `${f.color}${f.opacity})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-f.length / 2, 0);
        ctx.quadraticCurveTo(0, Math.sin(time + f.x * 0.01) * 3, f.length / 2, 0);
        ctx.stroke();
        ctx.restore();
      });

      // --- RUNWAY VIGNETTE (DARK LUXURY FOCUS) ---
      const vignette = ctx.createRadialGradient(
        width / 2, height * 0.45, Math.min(width, height) * 0.28,
        width / 2, height * 0.45, Math.max(width, height) * 0.78
      );
      vignette.addColorStop(0, 'rgba(8, 9, 13, 0.12)');
      vignette.addColorStop(0.6, 'rgba(7, 8, 11, 0.52)');
      vignette.addColorStop(1, 'rgba(5, 5, 8, 0.88)');

      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div className="fashion-bg-wrapper" aria-hidden="true">
      {/* High-Performance Procedural Cloth Simulation Canvas */}
      <canvas ref={canvasRef} className="fashion-canvas-backdrop" />

      {/* Tactile Textile Twill & Atmosphere Overlay */}
      <div className="fashion-weave-overlay" />
    </div>
  );
};
