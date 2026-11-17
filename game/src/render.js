// Prism Break — the canvas renderer. One logical field (1280x720) scaled to the
// window; every screen is drawn from the world state, nothing is an image.
import { FIELD, HUES, LEVELS, PALETTE, PADDLE, POWERUPS } from './config.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;
export const SCREEN_VICTORY = 4;

const POWERUP_STYLE = {
  wide: { label: 'W', color: '#37e6ff', name: 'WIDE' },
  multi: { label: 'M', color: '#c07bff', name: 'MULTI' },
  slow: { label: 'S', color: '#ffc93c', name: 'SLOW' },
  laser: { label: 'L', color: '#ff5c7a', name: 'LASER' },
  life: { label: '+', color: '#4dff9d', name: '+1 LIFE' },
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    offsetX = (canvas.width - FIELD.width * scale) / 2;
    offsetY = (canvas.height - FIELD.height * scale) / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  function drawBackground(state) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, PALETTE.backdrop2);
    g.addColorStop(1, PALETTE.backdrop);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Stars, twinkling.
    for (const star of state.stars) {
      const alpha = 0.35 + 0.65 * Math.abs(Math.sin(state.time * star.speed + star.phase));
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = '#cdd6ff';
      ctx.fillRect(star.x, star.y, star.r, star.r);
    }
    ctx.globalAlpha = 1;
    // Faint grid.
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    for (let x = 0; x <= FIELD.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, FIELD.height);
      ctx.stroke();
    }
    for (let y = 0; y <= FIELD.height; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(FIELD.width, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawBrick(brick) {
    if (!brick.alive) return;
    const { x, y, w, h } = brick;
    ctx.save();
    if (brick.type === 'prism') {
      ctx.shadowColor = brick.color;
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#141a2e';
      roundRect(ctx, x, y, w, h, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = brick.color;
      ctx.lineWidth = 2.5;
      roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 5);
      ctx.stroke();
      // Prism triangle.
      ctx.fillStyle = brick.color;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + 5);
      ctx.lineTo(x + w - 12, y + h - 6);
      ctx.lineTo(x + 12, y + h - 6);
      ctx.closePath();
      ctx.globalAlpha = 0.9;
      ctx.fill();
      ctx.restore();
      return;
    }
    if (brick.type === 'sealed') {
      ctx.shadowColor = brick.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#1a1430';
      roundRect(ctx, x, y, w, h, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = brick.color;
      ctx.lineWidth = 2;
      roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 5);
      ctx.stroke();
      // Diamond seal.
      ctx.fillStyle = brick.color;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y + 5);
      ctx.lineTo(x + w / 2 + 8, y + h / 2);
      ctx.lineTo(x + w / 2, y + h - 5);
      ctx.lineTo(x + w / 2 - 8, y + h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#0b0e1a';
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    // Normal / armored.
    const base = brick.type === 'armored' ? PALETTE.armored : brick.color;
    const dark = brick.type === 'armored' ? PALETTE.armoredDark : brick.color;
    ctx.fillStyle = base;
    roundRect(ctx, x, y, w, h, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    roundRect(ctx, x, y, w, 7, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    roundRect(ctx, x, y + h - 6, w, 6, 6);
    ctx.fill();
    if (brick.type === 'armored') {
      ctx.fillStyle = '#2c3550';
      for (const [rx, ry] of [[10, 7], [w - 10, 7], [10, h - 7], [w - 10, h - 7]]) {
        ctx.beginPath();
        ctx.arc(x + rx, y + ry, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (brick.hp === 1) {
        ctx.strokeStyle = '#20263c';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + 14, y + 4);
        ctx.lineTo(x + w / 2, y + h / 2);
        ctx.lineTo(x + w - 16, y + h - 5);
        ctx.stroke();
      }
    }
    if (brick.flash > 0) {
      ctx.globalAlpha = Math.min(0.85, brick.flash * 3);
      ctx.fillStyle = '#ffffff';
      roundRect(ctx, x, y, w, h, 6);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawPaddle(state, laserOn) {
    const p = state.paddle;
    ctx.save();
    ctx.shadowColor = '#aebaff';
    ctx.shadowBlur = 16;
    const grad = ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.5, '#dfe6ff');
    grad.addColorStop(1, '#9fb0ff');
    ctx.fillStyle = grad;
    roundRect(ctx, p.x, PADDLE.y, p.width, PADDLE.height, 8);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(ctx, p.x + 6, PADDLE.y + 2, p.width - 12, 4, 2);
    ctx.fill();
    if (laserOn) {
      ctx.fillStyle = '#ff5c7a';
      roundRect(ctx, p.x - 4, PADDLE.y - 10, 8, 12, 3);
      ctx.fill();
      roundRect(ctx, p.x + p.width - 4, PADDLE.y - 10, 8, 12, 3);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBall(ball) {
    const hue = HUES[ball.hue];
    // Trail from velocity.
    const speed = Math.hypot(ball.vx, ball.vy) || 1;
    const nx = ball.vx / speed;
    const ny = ball.vy / speed;
    for (let i = 3; i >= 1; i -= 1) {
      ctx.globalAlpha = 0.12 * (4 - i);
      ctx.fillStyle = hue.main;
      ctx.beginPath();
      ctx.arc(ball.x - nx * i * 9, ball.y - ny * i * 9, ball.radius * (1 - i * 0.18), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.shadowColor = hue.glow;
    ctx.shadowBlur = 22;
    ctx.fillStyle = hue.main;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = hue.light;
    ctx.beginPath();
    ctx.arc(ball.x - 2.5, ball.y - 2.5, ball.radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPowerups(state) {
    for (const drop of state.powerups) {
      const style = POWERUP_STYLE[drop.type];
      ctx.save();
      ctx.shadowColor = style.color;
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#141a2e';
      roundRect(ctx, drop.x - 15, drop.y - 13, 30, 26, 13);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 2;
      roundRect(ctx, drop.x - 15, drop.y - 13, 30, 26, 13);
      ctx.stroke();
      ctx.fillStyle = style.color;
      ctx.font = 'bold 16px ' + 'system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.label, drop.x, drop.y + 1);
      ctx.restore();
    }
  }

  function drawBolts(state) {
    ctx.save();
    ctx.strokeStyle = '#ffe9a8';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#ffc93c';
    ctx.shadowBlur = 10;
    for (const bolt of state.bolts) {
      ctx.beginPath();
      ctx.moveTo(bolt.x, bolt.y);
      ctx.lineTo(bolt.x, bolt.y + 16);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawPopups(state) {
    ctx.save();
    ctx.font = 'bold 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const p of state.popups) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.restore();
  }

  function drawHud(state, best, muted) {
    ctx.save();
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, FIELD.width, 58);
    ctx.fillStyle = PALETTE.panelEdge;
    ctx.fillRect(0, 58, FIELD.width, 2);
    ctx.textBaseline = 'middle';
    // Score.
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE ${state.score}`, 24, 30);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText(`BEST ${best}`, 24, 48);
    // Level + bricks left.
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 19px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`LEVEL ${state.levelIndex + 1} · ${state.levelName.toUpperCase()}`, FIELD.width / 2, 24);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`${state.breakableLeft} bricks left`, FIELD.width / 2, 46);
    // Lives as hearts.
    ctx.textAlign = 'right';
    ctx.font = '20px system-ui, sans-serif';
    let hearts = '';
    for (let i = 0; i < Math.max(0, state.lives); i += 1) hearts += '♥';
    ctx.fillStyle = PALETTE.danger;
    ctx.fillText(hearts, FIELD.width - 24, 24);
    // Combo, only once it actually multiplies the score.
    const mult = 1 + Math.floor(state.combo / 8);
    if (mult >= 2) {
      ctx.fillStyle = '#ffc93c';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`COMBO x${Math.min(5, mult)}`, FIELD.width - 24, 48);
    }
    // Ball hue, bottom-left where nothing else lives.
    const hue = HUES[state.balls[0] ? state.balls[0].hue : 0];
    ctx.fillStyle = hue.main;
    ctx.beginPath();
    ctx.arc(33, 700, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`BALL ${hue.name.toUpperCase()}`, 48, 701);
    // Mute state, bottom-right.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(muted ? 'MUTED (M)' : 'SOUND ON (M)', FIELD.width - 24, 701);
    ctx.restore();
  }

  function overlay(alpha) {
    ctx.fillStyle = `rgba(6, 8, 18, ${alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function centerText(text, y, size, color, weight = 'bold') {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, FIELD.width / 2, y);
  }

  function drawTitle(state, best) {
    overlay(0.62);
    // Title with glow.
    ctx.save();
    ctx.shadowColor = '#37e6ff';
    ctx.shadowBlur = 34;
    centerText('PRISM BREAK', 190, 84, '#f2f4ff');
    ctx.restore();
    centerText('bend the light · break the seal · clear all eight levels', 252, 22, '#9aa3c7', 'normal');
    // How to play panel.
    ctx.fillStyle = 'rgba(23, 28, 51, 0.92)';
    roundRect(ctx, 340, 300, 600, 210, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    roundRect(ctx, 340, 300, 600, 210, 14);
    ctx.stroke();
    const lines = [
      ['MOUSE / ← →', 'move the paddle'],
      ['CLICK / SPACE', 'launch the ball · fire the laser'],
      ['PRISM ◆', 'bends your ball to its colour'],
      ['SEALED ◆', 'only breaks to a ball of its own colour'],
      ['P', 'pause ·  M mute ·  R restart'],
    ];
    ctx.textBaseline = 'middle';
    lines.forEach(([key, value], i) => {
      const y = 336 + i * 34;
      ctx.fillStyle = '#ffc93c';
      ctx.font = 'bold 17px system-ui, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(key, 590, y);
      ctx.fillStyle = PALETTE.text;
      ctx.font = '17px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(value, 610, y);
    });
    centerText(best > 0 ? `BEST  ${best}` : 'no best score yet — be the first', 548, 19, '#9aa3c7', 'normal');
    ctx.save();
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(state.time * 3);
    centerText('CLICK OR PRESS SPACE TO START', 600, 26, '#37e6ff');
    ctx.restore();
  }

  function drawOver(state, best, victory) {
    overlay(0.72);
    if (victory) {
      ctx.save();
      ctx.shadowColor = '#ffc93c';
      ctx.shadowBlur = 30;
      centerText('YOU WIN!', 240, 76, '#ffc93c');
      ctx.restore();
      centerText('every seal broken · every level clear', 310, 22, '#9aa3c7', 'normal');
    } else {
      ctx.save();
      ctx.shadowColor = '#ff5c7a';
      ctx.shadowBlur = 30;
      centerText('GAME OVER', 240, 76, '#ff5c7a');
      ctx.restore();
      centerText(`the light fades on level ${state.levelIndex + 1} · ${state.levelName}`, 310, 22, '#9aa3c7', 'normal');
    }
    centerText(`SCORE  ${state.score}`, 400, 34, '#f2f4ff');
    centerText(best > 0 ? `BEST  ${best}` : '', 448, 20, '#9aa3c7', 'normal');
    ctx.save();
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(state.time * 3);
    centerText('PRESS R OR CLICK TO PLAY AGAIN', 520, 24, '#37e6ff');
    ctx.restore();
  }

  function drawPaused() {
    overlay(0.6);
    centerText('PAUSED', 320, 56, '#f2f4ff');
    centerText('P or click to keep playing', 380, 20, '#9aa3c7', 'normal');
  }

  function drawBanner(state) {
    if (!state.banner || state.bannerTimer <= 0) return;
    const alpha = Math.min(1, state.bannerTimer);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = '#ffc93c';
    ctx.shadowBlur = 26;
    centerText(state.banner.text, 300, 54, '#ffc93c');
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = alpha;
    centerText(state.banner.sub, 352, 24, '#f2f4ff', 'normal');
    ctx.restore();
  }

  function drawServeHint(state) {
    if (!state.balls.some((ball) => ball.served)) return;
    ctx.save();
    ctx.globalAlpha = 0.65 + 0.35 * Math.sin(state.time * 3);
    centerText('CLICK OR PRESS SPACE TO LAUNCH', 620, 20, '#9aa3c7', 'normal');
    ctx.restore();
  }

  function draw(state, screen, best, muted) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.backdrop;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    // Screen shake.
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake, (Math.random() - 0.5) * state.shake);
    }
    drawBackground(state);
    for (const brick of state.bricks) drawBrick(brick);
    drawPowerups(state);
    drawBolts(state);
    drawPaddle(state, state.laserTimer > 0);
    for (const ball of state.balls) drawBall(ball);
    drawParticles(state);
    drawPopups(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
      drawHud(state, best, muted);
      drawBanner(state);
      drawServeHint(state);
    }
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused();
    else if (screen === SCREEN_OVER) drawOver(state, best, false);
    else if (screen === SCREEN_VICTORY) drawOver(state, best, true);
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.5, state.flash * 0.5)})`;
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    }
  }

  return { draw };
}
