// Prism Break — every tuning number, colour and level in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const PADDLE = {
  width: 120,
  height: 16,
  y: 668,
  speed: 760,
  wideWidth: 180,
  wideSeconds: 12,
};

export const BALL = {
  radius: 9,
  baseSpeed: 520,
  maxSpeed: 880,
  speedPerLevel: 26,
  /** Speed gain per paddle hit, multiplicative, capped by maxSpeed. */
  hitGain: 1.006,
  serveOffsetY: -24,
};

/** Brick grid: 10 columns x 6 rows. */
export const GRID = {
  cols: 10,
  rows: 6,
  brickW: 100,
  brickH: 26,
  gapX: 10,
  gapY: 10,
  x0: 95,
  y0: 92,
};

export const LIVES = 3;
export const MAX_BALLS = 4;

/** The three light hues. Ball hue 0/1/2 = cyan/gold/violet. */
export const HUES = [
  { name: 'cyan', main: '#37e6ff', dark: '#0e7d99', glow: '#37e6ff', light: '#b8f6ff' },
  { name: 'gold', main: '#ffc93c', dark: '#9a7410', glow: '#ffc93c', light: '#ffe9a8' },
  { name: 'violet', main: '#c07bff', dark: '#6d2fb0', glow: '#c07bff', light: '#e6ccff' },
];

export const SCORES = {
  brick: 50,
  armored: 80,
  sealed: 150,
  powerup: 25,
  levelClearBase: 250,
  lifeBonus: 100,
};

/** Combo: every 8 unbroken bricks in a row raises the multiplier by 1, up to x5. */
export const COMBO = { perLevel: 8, max: 5 };

export const POWERUPS = {
  /** Chance a broken normal/armored brick drops a capsule. */
  dropChance: 0.16,
  lifeChance: 0.02,
  fallSpeed: 210,
  wideSeconds: 12,
  slowSeconds: 10,
  slowFactor: 0.7,
  laserSeconds: 9,
  laserShots: 14,
  laserCooldown: 0.22,
  boltSpeed: 900,
};

export const LEVELS = [
  {
    name: 'First Light',
    rows: [
      '..........',
      '.nnnnnnnn.',
      '.nnnnnnnn.',
      '...1......',
      '..........',
      '..........',
    ],
  },
  {
    name: 'Spectrum',
    rows: [
      '..nnnnnn..',
      '.nnnnnnnn.',
      '.n1nnnn2n.',
      '.nnnnnnnn.',
      '..nnnnnn..',
      '..........',
    ],
  },
  {
    name: 'Prism Gate',
    rows: [
      '.nnnnnnnn.',
      '.n4nnnn5n.',
      '.nn1nn2nn.',
      '.n6nnnn4n.',
      '.nnnnnnnn.',
      '..........',
    ],
  },
  {
    name: 'Double Rainbow',
    rows: [
      'nnnnnnnnnn',
      'n1nnnnnn2n',
      'n4nannnn5n',
      'nannnnnnan',
      'n3nnnnnn1n',
      'n6nnnnnn4n',
    ],
  },
  {
    name: 'Lattice',
    rows: [
      'nanananana',
      'an1nanan2a',
      'nanananana',
      'ana4na5ana',
      'nanananana',
      'an3nanan1a',
    ],
  },
  {
    name: 'Aurora',
    rows: [
      'nnnnnnnnnn',
      'n14n25n36n',
      'nnnnnnnnnn',
      'nanannnnan',
      'n45n56n64n',
      'nnnnnnnnnn',
    ],
  },
  {
    name: 'Chromatic Storm',
    rows: [
      'aananaanaa',
      'a14nnnn25a',
      'nnannnnann',
      'a36nnnn14a',
      'nnannnnann',
      'aa5nanna6a',
    ],
  },
  {
    name: 'Whiteout',
    rows: [
      'nnnnnnnnnn',
      'n1a4nn5a2n',
      'nnnnnnnnnn',
      'an6nn3n4na',
      'nnnnnnnnnn',
      'n2a5nn6a1n',
    ],
  },
];

/** Row colours for normal bricks (visual only, by row index). */
export const ROW_COLORS = ['#37e6ff', '#4dff9d', '#ffc93c', '#ff9d5c', '#c07bff', '#ff6b9d'];

export const PALETTE = {
  backdrop: '#0b0e1a',
  backdrop2: '#12162a',
  grid: '#1a2040',
  panel: '#171c33',
  panelEdge: '#2a3160',
  text: '#f2f4ff',
  muted: '#9aa3c7',
  dim: '#5d678f',
  paddle: '#eef2ff',
  armored: '#8d97b8',
  armoredDark: '#4a5478',
  sealedRing: '#ffffff',
  danger: '#ff5c7a',
  gold: '#ffc93c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'prism-break.best';
