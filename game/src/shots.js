// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh world for a fixed number of steps, steered by an autopilot,
// so the frame is what a short game really looks like and the same seed always
// gives the same frame. The good pilot tracks the ball's predicted landing spot;
// the bad pilot runs away from it, so it loses all three lives.
import { FIELD, PADDLE, STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 26;
const END_LIMIT_SECONDS = 600;

/** Predict the ball's x when it reaches the paddle, with wall bounces folded in. */
function predictedX(ball) {
  if (ball.vy <= 0) return FIELD.width / 2;
  const t = (PADDLE.y - ball.y) / ball.vy;
  const w = FIELD.width;
  let x = ball.x + ball.vx * t;
  x = ((x % (2 * w)) + 2 * w) % (2 * w);
  return x > w ? 2 * w - x : x;
}

function autopilot(state, skill) {
  const ball = state.balls.reduce((lowest, b) => (lowest === null || b.y > lowest.y ? b : lowest), null);
  if (ball === null) return { direction: 0, mouseX: null, confirm: false };
  if (ball.served) return { direction: 0, mouseX: null, confirm: true };
  let target = predictedX(ball);
  if (skill === 0) target = FIELD.width - target;
  const centre = state.paddle.x + state.paddle.width / 2;
  if (target > centre + 10) return { direction: 1, mouseX: null, confirm: false };
  if (target < centre - 10) return { direction: -1, mouseX: null, confirm: false };
  return { direction: 0, mouseX: null, confirm: false };
}

/**
 * Set `world` to the named scene (start, play or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  if (name !== 'play' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { direction: 0, mouseX: null, confirm: false }, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const limit = name === 'end' ? END_LIMIT_SECONDS : PLAY_SECONDS;
  const skill = name === 'end' ? 0 : 1;
  let over = false;
  for (let index = 0; index < limit / STEP; index += 1) {
    const events = world.step(STEP, autopilot(state, skill), false);
    if (state.banner !== null && state.bannerTimer <= 0) world.nextLevel();
    if (events & EVENT_OVER) {
      over = true;
      break;
    }
  }
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: state.score };
}
