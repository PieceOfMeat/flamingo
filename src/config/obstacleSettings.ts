// Per-type motion parameters and per-level tuning.
// All gameplay numbers live here — nothing to hunt in entity code.

export interface ObstacleMotionCfg {
  /**
   * Base flight speed in px/s.
   * Used as total speed for homing/horizontal types (paaRocket, churchDome, leninStatue).
   * Ignored for parabolic types (oilCap, tankTurret) which use flightTime instead.
   */
  speed: number;
  /**
   * Fixed flight duration in seconds for parabolic types.
   * vx and vy_initial are derived from target position and this value.
   * Divided by levelCfg.speedMul so higher levels fly faster.
   * 0 for non-parabolic types.
   */
  flightTime: number;
  /**
   * Simulated downward gravity in px/s² for parabolic types (oilCap, tankTurret).
   * 0 for homing types.
   */
  gravity: number;
  /** Spin speed range in rad/s. Only for oilCap. */
  spinMin?: number;
  spinMax?: number;
  /**
   * true  → guided: aimed at player at spawn + mid-flight turn-rate steering.
   * false → parabolic: aimed at player position at fire time, then pure physics arc.
   */
  homing: boolean;
  /**
   * Turn-rate multiplier applied on top of the per-level turnRateRad.
   * leninStatue > churchDome so Lenin is the "smartest" homing type.
   * Ignored for parabolic types and paaRocket (which uses paaRocketTurnRateRad).
   */
  homingMul: number;
}

export interface LevelGroundSettings {
  /** Multiplier on base speed for all types. */
  speedMul: number;
  /**
   * Random angle spread (degrees) from aimed direction at spawn.
   * Used for churchDome and leninStatue. Lower = more accurate initial aim.
   */
  aimSpreadDeg: number;
  /**
   * Mid-flight turn rate (rad/s) for guided missiles (churchDome, leninStatue).
   * Scaled by each type's homingMul.
   */
  turnRateRad: number;
  /**
   * Separate, much weaker turn rate for paaRocket.
   * Level 0 = 0 (perfectly straight horizontal shot); grows slowly per level.
   */
  paaRocketTurnRateRad: number;
}

// ─── Per-type base config ───────────────────────────────────────────────────
//
// Speed ranking (base, before speedMul):
//   leninStatue (340) > churchDome (290) > tankTurret (265) > paaRocket (235) ≈ oilCap (215)
//
export const OBSTACLE_MOTION: Record<string, ObstacleMotionCfg> = {
  // Parabolic artillery — fire-and-forget arc aimed at player position at shot time.
  // flightTime (÷ speedMul) determines arc duration; speed is unused for these.
  oilCap:      { speed: 0, flightTime: 3.0, gravity: 110, spinMin: 4, spinMax: 8, homing: false, homingMul: 0 },
  tankTurret:  { speed: 0, flightTime: 2.2, gravity: 150, homing: false, homingMul: 0 },
  // Guided missiles — steer toward player throughout flight. flightTime unused.
  paaRocket:   { speed: 235, flightTime: 0, gravity: 0, homing: true, homingMul: 0 },
  churchDome:  { speed: 240, flightTime: 0, gravity: 0, homing: true, homingMul: 0.8 },
  leninStatue: { speed: 200, flightTime: 0, gravity: 0, homing: true, homingMul: 0.8 },
};

// ─── Per-level tuning (index matches LEVELS[]) ──────────────────────────────
export const LEVEL_GROUND_SETTINGS: LevelGroundSettings[] = [
  // 0 Муходоєво – paaRocket flies straight, no homing
  { speedMul: 1.0,  aimSpreadDeg: 34, turnRateRad: 0,    paaRocketTurnRateRad: 0    },
  // 1 Большоє Бухалово – paaRocket barely curves
  { speedMul: 1.1,  aimSpreadDeg: 28, turnRateRad: 0,    paaRocketTurnRateRad: 0.1  },
  // 2 Срамні Уди – churchDome enters; paaRocket has noticeable curve
  { speedMul: 1.2,  aimSpreadDeg: 22, turnRateRad: 0.8,  paaRocketTurnRateRad: 0.2  },
  // 3 Срамні Уди – tankTurret enters
  { speedMul: 1.2,  aimSpreadDeg: 22, turnRateRad: 1.0,  paaRocketTurnRateRad: 0.2  },
  // 4 Розчленінград – leninStatue enters
  { speedMul: 1.25, aimSpreadDeg: 22, turnRateRad: 1.1,  paaRocketTurnRateRad: 0.25 },
  // 5 Єлабуга – final level
  { speedMul: 1.3,  aimSpreadDeg: 18, turnRateRad: 1.3,  paaRocketTurnRateRad: 0.3  },
];
