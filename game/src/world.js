// Prism Break — the simulation. Fixed 1/60 s steps, a seeded world, no rendering
// here. A ball has a light hue (0 cyan, 1 gold, 2 violet). Prism bricks are solid
// lenses: they never break, they bend the ball to their hue. Sealed bricks only
// break to a ball of their own hue. Everything else breaks to any ball.
import {
  BALL,
  COMBO,
  FIELD,
  GRID,
  HUES,
  LEVELS,
  LIVES,
  MAX_BALLS,
  PADDLE,
  POWERUPS,
  ROW_COLORS,
  SCORES,
} from './config.js';
import { pick } from './random.js';

export const EVENT_NONE = 0;
export const EVENT_LIFE_LOST = 1;
export const EVENT_OVER = 2;
export const EVENT_LEVEL_CLEAR = 4;
export const EVENT_VICTORY = 8;
export const EVENT_SERVED = 16;

const TAU = Math.PI * 2;

function hueColor(hue) {
  return HUES[hue].main;
}

export function createWorld(random) {
  const state = {
    levelIndex: 0,
    levelName: LEVELS[0].name,
    bricks: [],
    balls: [],
    paddle: { x: FIELD.width / 2 - PADDLE.width / 2, width: PADDLE.width, wideTimer: 0 },
    powerups: [],
    bolts: [],
    particles: [],
    popups: [],
    stars: [],
    score: 0,
    combo: 0,
    lives: LIVES,
    shake: 0,
    flash: 0,
    banner: null,
    bannerTimer: 0,
    lastHitRow: 0,
    slowTimer: 0,
    laserTimer: 0,
    laserShots: 0,
    laserCooldown: 0,
    serveTimer: 0,
    time: 0,
    breakableLeft: 0,
  };

  for (let i = 0; i < 70; i += 1) {
    state.stars.push({
      x: random() * FIELD.width,
      y: random() * FIELD.height,
      r: 0.6 + random() * 1.6,
      phase: random() * TAU,
      speed: 0.4 + random() * 1.2,
    });
  }

  function buildLevel(index) {
    const def = LEVELS[index];
    state.levelIndex = index;
    state.levelName = def.name;
    state.bricks = [];
    state.powerups = [];
    state.bolts = [];
    state.breakableLeft = 0;
    for (let row = 0; row < GRID.rows; row += 1) {
      const line = def.rows[row] ?? '';
      for (let col = 0; col < GRID.cols; col += 1) {
        const ch = line[col] ?? '.';
        if (ch === '.') continue;
        const x = GRID.x0 + col * (GRID.brickW + GRID.gapX);
        const y = GRID.y0 + row * (GRID.brickH + GRID.gapY);
        if (ch === 'n') {
          state.bricks.push({ x, y, w: GRID.brickW, h: GRID.brickH, type: 'normal', hue: row % 3, hp: 1, maxHp: 1, row, col, alive: true, flash: 0, color: ROW_COLORS[row % ROW_COLORS.length] });
          state.breakableLeft += 1;
        } else if (ch === 'a') {
          state.bricks.push({ x, y, w: GRID.brickW, h: GRID.brickH, type: 'armored', hue: 0, hp: 2, maxHp: 2, row, col, alive: true, flash: 0, color: '#8d97b8' });
          state.breakableLeft += 1;
        } else if (ch === '1' || ch === '2' || ch === '3') {
          const hue = Number(ch) - 1;
          state.bricks.push({ x, y, w: GRID.brickW, h: GRID.brickH, type: 'prism', hue, hp: Infinity, maxHp: Infinity, row, col, alive: true, flash: 0, color: hueColor(hue) });
        } else if (ch === '4' || ch === '5' || ch === '6') {
          const hue = Number(ch) - 4;
          state.bricks.push({ x, y, w: GRID.brickW, h: GRID.brickH, type: 'sealed', hue, hp: 1, maxHp: 1, row, col, alive: true, flash: 0, color: hueColor(hue) });
          state.breakableLeft += 1;
        }
      }
    }
  }

  function serveBall() {
    const speed = ballSpeed();
    const angle = (random() * 0.5 - 0.25) * (Math.PI / 3);
    state.balls = [{
      x: state.paddle.x + state.paddle.width / 2,
      y: PADDLE.y + BALL.serveOffsetY,
      vx: Math.sin(angle) * speed,
      vy: -Math.cos(angle) * speed,
      hue: 0,
      radius: BALL.radius,
      served: true,
    }];
    state.serveTimer = 0;
  }

  function ballSpeed() {
    const base = BALL.baseSpeed + state.levelIndex * BALL.speedPerLevel;
    return state.slowTimer > 0 ? base * POWERUPS.slowFactor : base;
  }

  function multiplier() {
    return Math.min(COMBO.max, 1 + Math.floor(state.combo / COMBO.perLevel));
  }

  function addScore(base, x, y, color) {
    const points = base * multiplier();
    state.score += points;
    state.popups.push({ x, y, text: `+${points}`, life: 0.9, maxLife: 0.9, color });
    return points;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = random() * TAU;
      const v = speed * (0.3 + random() * 0.7);
      state.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - 60,
        life: 0.5 + random() * 0.5,
        maxLife: 1,
        color,
        size: 2 + random() * 3.5,
      });
    }
    if (state.particles.length > 400) state.particles.splice(0, state.particles.length - 400);
  }

  function maybeDrop(x, y) {
    if (random() >= POWERUPS.dropChance) return;
    let type;
    if (random() < POWERUPS.lifeChance) type = 'life';
    else type = pick(random, ['wide', 'multi', 'slow', 'laser', 'wide', 'multi']);
    state.powerups.push({ x, y, vy: POWERUPS.fallSpeed, type, sway: random() * TAU });
  }

  /** Apply a hit to a brick; returns 'break' | 'crack' | 'sealed' | 'prism' | 'none'. */
  function hitBrick(brick, ball) {
    if (!brick.alive) return 'none';
    if (brick.type === 'prism') {
      ball.hue = brick.hue;
      brick.flash = 0.25;
      burst(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color, 8, 160);
      return 'prism';
    }
    if (brick.type === 'sealed' && ball !== null && ball.hue !== brick.hue) {
      brick.flash = 0.3;
      return 'sealed';
    }
    brick.hp -= 1;
    brick.flash = 0.2;
    state.lastHitRow = brick.row;
    if (brick.hp > 0) return 'crack';
    brick.alive = false;
    state.breakableLeft -= 1;
    const cx = brick.x + brick.w / 2;
    const cy = brick.y + brick.h / 2;
    burst(cx, cy, brick.color, brick.type === 'armored' ? 16 : 12, 260);
    state.combo += 1;
    if (brick.type === 'normal') {
      addScore(SCORES.brick, cx, cy, brick.color);
      maybeDrop(cx, cy);
    } else if (brick.type === 'armored') {
      addScore(SCORES.armored, cx, cy, '#cdd5ec');
      maybeDrop(cx, cy);
    } else {
      addScore(SCORES.sealed, cx, cy, brick.color);
    }
    return 'break';
  }

  function applyPowerup(type) {
    if (type === 'wide') {
      state.paddle.width = PADDLE.wideWidth;
      state.paddle.wideTimer = POWERUPS.wideSeconds;
    } else if (type === 'multi') {
      const copies = [];
      for (const ball of state.balls) {
        if (state.balls.length + copies.length >= MAX_BALLS) break;
        copies.push({ ...ball, vx: -ball.vx, vy: ball.vy, served: false });
      }
      state.balls.push(...copies);
    } else if (type === 'slow') {
      if (state.slowTimer <= 0) {
        for (const ball of state.balls) {
          ball.vx *= POWERUPS.slowFactor;
          ball.vy *= POWERUPS.slowFactor;
        }
      }
      state.slowTimer = POWERUPS.slowSeconds;
    } else if (type === 'laser') {
      state.laserTimer = POWERUPS.laserSeconds;
      state.laserShots = POWERUPS.laserShots;
    } else if (type === 'life') {
      state.lives = Math.min(5, state.lives + 1);
    }
    state.score += SCORES.powerup * multiplier();
  }

  function fireLaser() {
    if (state.laserTimer <= 0 || state.laserShots <= 0 || state.laserCooldown > 0) return false;
    state.laserCooldown = POWERUPS.laserCooldown;
    state.laserShots -= 1;
    const cx = state.paddle.x + state.paddle.width / 2;
    state.bolts.push({ x: cx - 14, y: PADDLE.y - 6 });
    state.bolts.push({ x: cx + 14, y: PADDLE.y - 6 });
    return true;
  }

  function bounceBallOffBrick(ball, brick) {
    // Circle vs rectangle: reflect along the axis of least penetration.
    const cx = Math.max(brick.x, Math.min(ball.x, brick.x + brick.w));
    const cy = Math.max(brick.y, Math.min(ball.y, brick.y + brick.h));
    let nx = ball.x - cx;
    let ny = ball.y - cy;
    const dist = Math.hypot(nx, ny);
    if (dist === 0) {
      // Centre inside the brick: bounce off the side it came from.
      if (Math.abs(ball.vx) > Math.abs(ball.vy)) {
        ball.vx = -ball.vx;
        ball.x += ball.vx > 0 ? 1 : -1;
      } else {
        ball.vy = -ball.vy;
        ball.y += ball.vy > 0 ? 1 : -1;
      }
      return;
    }
    nx /= dist;
    ny /= dist;
    const dot = ball.vx * nx + ball.vy * ny;
    if (dot < 0) {
      ball.vx -= 2 * dot * nx;
      ball.vy -= 2 * dot * ny;
    }
    // Never let the ball go nearly horizontal: it stalls the game.
    const speed = Math.hypot(ball.vx, ball.vy);
    if (Math.abs(ball.vy) < 0.28 * speed) {
      ball.vy = (ball.vy < 0 ? -1 : 1) * 0.28 * speed;
      const keep = Math.sqrt(Math.max(0, speed * speed - ball.vy * ball.vy));
      ball.vx = (ball.vx < 0 ? -1 : 1) * keep;
    }
    ball.x += nx * 1.5;
    ball.y += ny * 1.5;
  }

  function stepBalls(dt) {
    let events = EVENT_NONE;
    for (const ball of state.balls) {
      if (ball.served) {
        ball.x = state.paddle.x + state.paddle.width / 2;
        ball.y = PADDLE.y + BALL.serveOffsetY;
        continue;
      }
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      // Walls.
      if (ball.x < ball.radius) {
        ball.x = ball.radius;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x > FIELD.width - ball.radius) {
        ball.x = FIELD.width - ball.radius;
        ball.vx = -Math.abs(ball.vx);
      }
      if (ball.y < ball.radius) {
        ball.y = ball.radius;
        ball.vy = Math.abs(ball.vy);
      }
      // Paddle.
      if (ball.vy > 0
        && ball.y + ball.radius >= PADDLE.y
        && ball.y - ball.radius <= PADDLE.y + PADDLE.height
        && ball.x >= state.paddle.x - ball.radius
        && ball.x <= state.paddle.x + state.paddle.width + ball.radius) {
        const offset = Math.max(-1, Math.min(1, (ball.x - (state.paddle.x + state.paddle.width / 2)) / (state.paddle.width / 2)));
        const speed = Math.min(Math.hypot(ball.vx, ball.vy) * BALL.hitGain, BALL.maxSpeed);
        const angle = offset * (Math.PI / 3);
        ball.vx = Math.sin(angle) * speed;
        ball.vy = -Math.cos(angle) * speed;
        ball.y = PADDLE.y - ball.radius - 0.5;
        burst(ball.x, PADDLE.y, '#eef2ff', 5, 120);
      }
      // Bricks: one hit per ball per step.
      for (const brick of state.bricks) {
        if (!brick.alive) continue;
        if (ball.x + ball.radius < brick.x || ball.x - ball.radius > brick.x + brick.w
          || ball.y + ball.radius < brick.y || ball.y - ball.radius > brick.y + brick.h) continue;
        const result = hitBrick(brick, ball);
        if (result !== 'none') {
          bounceBallOffBrick(ball, brick);
          if (result === 'break' || result === 'crack') events |= 32; // hit sound
          else if (result === 'prism') events |= 64;
          else if (result === 'sealed') events |= 128;
        }
        break;
      }
    }
    return events;
  }

  function stepBolts(dt) {
    let events = EVENT_NONE;
    for (const bolt of state.bolts) {
      bolt.y -= POWERUPS.boltSpeed * dt;
      for (const brick of state.bricks) {
        if (!brick.alive) continue;
        if (bolt.x < brick.x || bolt.x > brick.x + brick.w || bolt.y < brick.y || bolt.y > brick.y + brick.h) continue;
        if (brick.type === 'prism') {
          brick.flash = 0.25;
          burst(bolt.x, bolt.y, brick.color, 6, 140);
          bolt.y = -999;
          events |= 64;
          break;
        }
        const result = hitBrick(brick, null);
        bolt.y = -999;
        if (result === 'break' || result === 'crack') events |= 32;
        break;
      }
    }
    state.bolts = state.bolts.filter((bolt) => bolt.y > -10);
    return events;
  }

  function stepPowerups(dt) {
    for (const drop of state.powerups) {
      drop.sway += dt * 3;
      drop.y += drop.vy * dt;
      drop.x += Math.sin(drop.sway) * 24 * dt;
      if (drop.y >= PADDLE.y && drop.y <= PADDLE.y + PADDLE.height + 8
        && drop.x >= state.paddle.x - 8 && drop.x <= state.paddle.x + state.paddle.width + 8) {
        applyPowerup(drop.type);
        drop.y = FIELD.height + 999;
        burst(drop.x, PADDLE.y, '#ffffff', 8, 140);
      }
    }
    state.powerups = state.powerups.filter((drop) => drop.y < FIELD.height + 10);
  }

  function stepParticles(dt) {
    for (const p of state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 320 * dt;
      p.life -= dt;
    }
    state.particles = state.particles.filter((p) => p.life > 0);
    for (const p of state.popups) {
      p.y -= 34 * dt;
      p.life -= dt;
    }
    state.popups = state.popups.filter((p) => p.life > 0);
    for (const brick of state.bricks) {
      if (brick.flash > 0) brick.flash -= dt;
    }
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 26);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt * 1.6);
    if (state.bannerTimer > 0) state.bannerTimer -= dt;
  }

  function reset() {
    state.score = 0;
    state.combo = 0;
    state.lives = LIVES;
    state.slowTimer = 0;
    state.laserTimer = 0;
    state.laserShots = 0;
    state.laserCooldown = 0;
    state.shake = 0;
    state.flash = 0;
    state.banner = null;
    state.bannerTimer = 0;
    state.time = 0;
    state.particles = [];
    state.popups = [];
    state.powerups = [];
    state.bolts = [];
    state.paddle.width = PADDLE.width;
    state.paddle.wideTimer = 0;
    state.paddle.x = FIELD.width / 2 - PADDLE.width / 2;
    buildLevel(0);
    serveBall();
  }

  function nextLevel() {
    state.banner = null;
    state.bannerTimer = 0;
    if (state.levelIndex + 1 >= LEVELS.length) return EVENT_VICTORY;
    buildLevel(state.levelIndex + 1);
    state.paddle.width = PADDLE.width;
    state.paddle.wideTimer = 0;
    state.slowTimer = 0;
    state.laserTimer = 0;
    serveBall();
    return EVENT_LEVEL_CLEAR;
  }

  /**
   * Advance the world one fixed step.
   * `input` is { direction, mouseX, confirm } — mouseX moves the paddle directly.
   * `attract` runs the title-screen demo: balls bounce in an empty field.
   * Returns a bitmask of events for the caller to sound and announce.
   */
  function step(dt, input, attract) {
    state.time += dt;
    stepParticles(dt);
    if (state.laserCooldown > 0) state.laserCooldown -= dt;

    if (attract) {
      if (state.balls.length === 0) {
        for (let i = 0; i < 2; i += 1) {
          state.balls.push({
            x: 200 + random() * 800,
            y: 200 + random() * 300,
            vx: (random() < 0.5 ? -1 : 1) * (260 + random() * 200),
            vy: (random() < 0.5 ? -1 : 1) * (260 + random() * 200),
            hue: i % 3,
            radius: BALL.radius,
            served: false,
          });
        }
      }
      for (const ball of state.balls) {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        if (ball.x < ball.radius || ball.x > FIELD.width - ball.radius) ball.vx = -ball.vx;
        if (ball.y < ball.radius || ball.y > FIELD.height - ball.radius) ball.vy = -ball.vy;
      }
      return EVENT_NONE;
    }

    // Paddle.
    if (input.mouseX !== null && input.mouseX !== undefined) {
      state.paddle.x = Math.max(0, Math.min(FIELD.width - state.paddle.width, input.mouseX - state.paddle.width / 2));
    } else if (input.direction) {
      state.paddle.x = Math.max(0, Math.min(FIELD.width - state.paddle.width, state.paddle.x + input.direction * PADDLE.speed * dt));
    }
    if (state.paddle.wideTimer > 0) {
      state.paddle.wideTimer -= dt;
      if (state.paddle.wideTimer <= 0) state.paddle.width = PADDLE.width;
    }

    // Serve: a fresh ball rides the paddle until launched (or 1.5 s pass).
    const served = state.balls.find((ball) => ball.served);
    if (served) {
      state.serveTimer += dt;
      if (input.confirm || state.serveTimer > 1.5) {
        served.served = false;
        return EVENT_SERVED;
      }
    } else if (input.confirm && state.laserTimer > 0) {
      if (fireLaser()) return 256; // laser sound
    }

    let events = stepBalls(dt);
    events |= stepBolts(dt);
    stepPowerups(dt);

    // Slow timer: restore speed when it ends.
    if (state.slowTimer > 0) {
      state.slowTimer -= dt;
      if (state.slowTimer <= 0) {
        for (const ball of state.balls) {
          ball.vx /= POWERUPS.slowFactor;
          ball.vy /= POWERUPS.slowFactor;
        }
      }
    }
    if (state.laserTimer > 0) state.laserTimer -= dt;

    // Balls lost below the field.
    const alive = state.balls.filter((ball) => ball.y - ball.radius < FIELD.height + 30);
    if (alive.length !== state.balls.length) {
      state.balls = alive;
      if (state.balls.length === 0) {
        state.combo = 0;
        state.lives -= 1;
        state.shake = 12;
        if (state.lives <= 0) return events | EVENT_OVER;
        serveBall();
        return events | EVENT_LIFE_LOST;
      }
    }

    // Level cleared: every breakable brick is gone.
    if (state.breakableLeft <= 0 && state.banner === null) {
      const bonus = SCORES.levelClearBase * (state.levelIndex + 1) + SCORES.lifeBonus * state.lives;
      state.score += bonus;
      state.flash = 0.7;
      if (state.levelIndex + 1 >= LEVELS.length) {
        state.banner = { text: 'ALL LEVELS CLEAR', sub: `Bonus +${bonus}`, timer: 2.4 };
        state.bannerTimer = 2.4;
        return events | EVENT_VICTORY;
      }
      state.banner = { text: `LEVEL ${state.levelIndex + 1} CLEAR`, sub: `Bonus +${bonus}`, timer: 2.2 };
      state.bannerTimer = 2.2;
      return events | EVENT_LEVEL_CLEAR;
    }
    return events;
  }

  reset();

  return {
    state,
    reset,
    step,
    nextLevel,
    multiplier,
    /** Launch a served ball right now (used by the autopilot in screenshots). */
    launch() {
      const served = state.balls.find((ball) => ball.served);
      if (served) served.served = false;
    },
  };
}
