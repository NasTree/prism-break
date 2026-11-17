// Keyboard + mouse input. The paddle follows the mouse when it moves, and the
// arrow keys (or A/D) steer it; Space or a click launches the ball, fires the
// laser and confirms screens. P pauses, M mutes, R restarts from an end screen.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;

const KEY_LEFT = new Set(['ArrowLeft', 'a', 'A']);
const KEY_RIGHT = new Set(['ArrowRight', 'd', 'D']);
const KEY_CONFIRM = new Set([' ', 'Enter']);
const KEY_PAUSE = new Set(['p', 'P', 'Escape']);
const KEY_MUTE = new Set(['m', 'M']);
const KEY_RESTART = new Set(['r', 'R']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  /** Mouse x in logical field coordinates, or null when the mouse never moved. */
  let mouseX = null;
  let mouseMoved = false;

  function toFieldX(clientX) {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    return (clientX - rect.left) * scale;
  }

  window.addEventListener('keydown', (event) => {
    if (KEY_CONFIRM.has(event.key)) {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (KEY_PAUSE.has(event.key)) {
      actions |= ACTION_PAUSE;
      event.preventDefault();
    } else if (KEY_MUTE.has(event.key)) {
      actions |= ACTION_MUTE;
    } else if (KEY_RESTART.has(event.key)) {
      actions |= ACTION_RESTART;
    } else if (KEY_LEFT.has(event.key) || KEY_RIGHT.has(event.key)) {
      event.preventDefault();
    }
    keys.add(event.key);
  });
  window.addEventListener('keyup', (event) => keys.delete(event.key));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointermove', (event) => {
    mouseX = toFieldX(event.clientX);
    mouseMoved = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouseX = toFieldX(event.clientX);
    mouseMoved = true;
    actions |= ACTION_CONFIRM;
  });

  return {
    /** -1, 0 or 1 from the held arrow/A/D keys. */
    direction() {
      let direction = 0;
      for (const key of keys) {
        if (KEY_LEFT.has(key)) direction -= 1;
        else if (KEY_RIGHT.has(key)) direction += 1;
      }
      return direction;
    },
    /** The mouse position when it has moved since the last read, else null. */
    takeMouse() {
      if (!mouseMoved) return null;
      mouseMoved = false;
      return mouseX;
    },
    /** Actions queued since the last read, then cleared. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
