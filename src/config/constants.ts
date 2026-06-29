// Global game configuration and tunable constants.
// All gameplay numbers live here so balancing never requires hunting through scene code.

export const GAME = {
  width: 960,
  height: 540,
  // Base world scroll speed in px/s. Increases per level (see LEVELS).
  baseScrollSpeed: 220,
  // Player movement bounds: Flamingo is confined to the left third of the screen.
  playerZone: { xMin: 40, xMaxRatio: 0.67, yMin: 30, yMargin: 30 },
  playerSpeed: 360, // px/s for keyboard movement
  // Distance score: 1 world-px scrolled == this many points.
  scorePerPixel: 0.1,
  // DEBUG: which level index to start from (0 = first level, normal gameplay).
  startLevel: 0,
};

export const COLORS = {
  sky: 0x6a7b9c,
  skyFar: 0x8a9bb5,
  ground: 0x3e4636,
  groundFar: 0x55604a,
  player: 0xffd24a, // Flamingo: yellow-ish boey
  playerTrail: 0x4a90ff,
  // Interceptors
  oilCap: 0x2b2b2b,
  churchDome: 0xd4af37,
  leninStatue: 0x9a9a9a,
  tankTurret: 0x6b5d3e,
  paaRocket: 0xb33030,
  // Bonuses
  fuel: 0x33cc66,
  star: 0x55ddff,
  // Ground gags
  gasQueue: 0x777777,
  sign: 0xeeeeee,
  signText: 0x111111,
  hud: 0xffffff,
};

export const DEPTH = {
  bgFar: 0,
  bgMid: 1,
  ground: 2,
  groundGag: 3,
  interceptor: 5,
  bonus: 6,
  player: 8,
  trail: 7,
  sign: 9,
  hud: 100,
};
