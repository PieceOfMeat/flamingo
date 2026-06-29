// Level progression. Each level is ~30 seconds of gameplay, opens with a city
// road-sign and closes with the same sign crossed out. Difficulty and the set
// of active obstacle types grow with the level index.

export type ObstacleType =
  | "oilCap"      // rises from below, spinning, black smoke trail
  | "churchDome"  // detaches and flies up like a rocket
  | "leninStatue" // detaches and flies up like a rocket
  | "tankTurret"  // tank below explodes, turret shoots upward
  | "paaRocket";  // horizontal rocket, right -> left

export interface LevelDef {
  city: string;
  durationMs: number;
  // Multiplier applied to baseScrollSpeed for this level.
  speedMul: number;
  // Seconds between obstacle spawns (smaller = harder). Picked randomly in range.
  spawnInterval: [min: number, max: number];
  // Which obstacle types can appear this level.
  obstacles: ObstacleType[];
}

export const LEVELS: LevelDef[] = [
  {
    city: "Муходоєво",
    durationMs: 20000,
    speedMul: 1.1,
    spawnInterval: [1.45, 2.15],
    obstacles: ["paaRocket"],                                               // air defence only, straight shots
  },
  {
    city: "Верхніє Зади",
    durationMs: 20000,
    speedMul: 1.23,
    spawnInterval: [1.15, 1.8],
    obstacles: ["paaRocket", "oilCap"],                                     // + slow oil caps
  },
  {
    city: "Сисєрть",
    durationMs: 20000,
    speedMul: 1.38,
    spawnInterval: [1.0, 1.6],
    obstacles: ["paaRocket", "oilCap", "churchDome"],                       // + church domes
  },
  {
    city: "Срамниє Уди",
    durationMs: 20000,
    speedMul: 1.38,
    spawnInterval: [1.1, 1.7],
    obstacles: ["paaRocket", "oilCap", "churchDome", "tankTurret"],         // + tank turrets
  },
  {
    city: "Розчленінград",
    durationMs: 20000,
    speedMul: 1.54,
    spawnInterval: [1.0, 1.55],
    obstacles: ["paaRocket", "oilCap", "churchDome", "tankTurret", "leninStatue"], // + Lenin
  },
  {
    city: "Єбалуга",
    durationMs: 20000,
    speedMul: 1.76,
    spawnInterval: [0.9, 1.35],
    obstacles: ["paaRocket", "oilCap", "churchDome", "tankTurret", "leninStatue"], // all types
  },
];
