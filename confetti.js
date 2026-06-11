/* Tiny dependency-free confetti burst. Call Confetti.burst(x, y) in viewport px. */
const Confetti = (() => {
  const COLORS = ['#8b7cf6', '#f6a57c', '#5ed39a', '#f6c177', '#ef7a85', '#7cc8f6'];
  let canvas, ctx, parts = [], raf = null;

  function init() {
    canvas = document.getElementById('confettiCanvas');
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function burst(x, y, n = 26) {
    if (!canvas) init();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 3 + Math.random() * 5.5;
      parts.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 3,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        size: 4 + Math.random() * 5,
        color: COLORS[(Math.random() * COLORS.length) | 0],
        life: 1,
        decay: 0.012 + Math.random() * 0.012,
      });
    }
    if (!raf) tick();
  }

  function tick() {
    raf = requestAnimationFrame(tick);
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    parts = parts.filter(p => p.life > 0);
    if (!parts.length) {
      cancelAnimationFrame(raf);
      raf = null;
      return;
    }
    for (const p of parts) {
      p.vy += 0.18;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= p.decay;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      ctx.restore();
    }
  }

  return { burst };
})();
