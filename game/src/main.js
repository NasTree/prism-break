// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play, paused,
// game over and victory.
//
// ?seed=N fixes the level layouts and ball serves. ?shot=start|play|end (with
// &seed=N) stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, PADDLE, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createWorld, EVENT_LEVEL_CLEAR, EVENT_LIFE_LOST, EVENT_OVER, EVENT_SERVED, EVENT_VICTORY } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_VICTORY } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, false);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let pendingLevelClear = false;
  let pendingVictory = false;
  /** A launch/laser press queued for the next simulation step. */
  let pendingConfirm = false;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    world.reset();
    accumulator = 0;
    pendingLevelClear = false;
    pendingVictory = false;
    screen = SCREEN_PLAY;
    announce(`Playing. Level 1, ${world.state.levelName}. ${world.state.lives} lives.`);
  }

  function endGame(victory) {
    if (victory) {
      screen = SCREEN_VICTORY;
      audio.victory();
      announce(`You win! Score ${world.state.score}. Best ${best}.`);
    } else {
      screen = SCREEN_OVER;
      audio.lose();
      announce(`Game over. Score ${world.state.score}. Best ${best}.`);
    }
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) {
      startGame();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_VICTORY)) {
      startGame();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    } else if (actions & ACTION_CONFIRM && screen === SCREEN_PLAY) {
      // Kept for the next simulation step: launching the ball or firing the laser.
      pendingConfirm = true;
    }
  }

  /** Sound the events the world reports, and the paddle bounce it does not. */
  function soundEvents(events, prevVy) {
    if (events & EVENT_LIFE_LOST) {
      audio.lose();
      announce(world.state.lives === 1 ? 'Ball lost. 1 life left.' : `Ball lost. ${world.state.lives} lives left.`);
    }
    if (events & EVENT_LEVEL_CLEAR) {
      audio.levelClear();
      announce(`Level ${world.state.levelIndex + 1} clear.`);
      pendingLevelClear = true;
    }
    if (events & EVENT_VICTORY) {
      pendingVictory = true;
    }
    if (events & EVENT_SERVED) audio.paddle();
    if (events & 32) audio.brick(world.state.lastHitRow);
    if (events & 64) audio.prism();
    if (events & 128) audio.sealed();
    if (events & 256) audio.laser();
    // Paddle bounce: a ball that was falling and now rises near the paddle.
    for (let i = 0; i < world.state.balls.length; i += 1) {
      const ball = world.state.balls[i];
      if (prevVy[i] !== undefined && prevVy[i] > 0 && ball.vy < 0 && ball.y > PADDLE.y - 48) {
        audio.paddle();
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      world.step(STEP, { direction: 0, mouseX: null, confirm: false }, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const prevVy = world.state.balls.map((ball) => ball.vy);
    const mouseX = input.takeMouse();
    const confirm = pendingConfirm;
    pendingConfirm = false;
    const events = world.step(STEP, { direction: input.direction(), mouseX, confirm }, false);
    soundEvents(events, prevVy);
    if (pendingLevelClear && world.state.bannerTimer <= 0) {
      pendingLevelClear = false;
      const result = world.nextLevel();
      if (result === EVENT_VICTORY) pendingVictory = true;
      else announce(`Level ${world.state.levelIndex + 1}, ${world.state.levelName}.`);
    }
    if (pendingVictory && world.state.bannerTimer <= 0) {
      pendingVictory = false;
      endGame(true);
    }
    if (events & EVENT_OVER) endGame(false);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, audio.isMuted());
  }

  // Leaving the tab pauses a running game rather than letting the ball fall unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Prism Break. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
