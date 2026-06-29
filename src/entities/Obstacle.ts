import Phaser from "phaser";
import { COLORS, DEPTH, GAME } from "../config/constants";
import type { ObstacleType } from "../config/levels";
import { OBSTACLE_MOTION, LEVEL_GROUND_SETTINGS } from "../config/obstacleSettings";

// One interceptor. Placeholder = labelled rectangle.
//
// oilCap / tankTurret  → parabolic arc aimed at player at fire time.
//                         A static launcher rectangle sits on the ground at the
//                         spawn x and scrolls left with the world until off-screen.
//
// paaRocket            → spawns off-screen right, flies horizontally; gains slight
//                         homing on higher levels.
//
// churchDome / leninStatue → guided missiles with full turn-rate homing.
export class Obstacle {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  body: Phaser.Physics.Arcade.Body;
  type: ObstacleType;
  private vx = 0;
  private vy = 0;
  private gravityY = 0;
  private turnRateRad = 0;
  private spin = 0;
  private rect: Phaser.GameObjects.Rectangle;
  /** Static ground launcher for artillery types; scrolls with world, then self-destructs. */
  private launcher: Phaser.GameObjects.Container | null = null;
  /** Dome sprite for churchDome type — rotated to match flight direction. */
  private domeSprite: Phaser.GameObjects.Image | null = null;
  private domeH = 0;
  /** Lid sprite for oilCap type — spins in flight. */
  private lidSprite: Phaser.GameObjects.Image | null = null;
  /** Turret sprite for tankTurret type — spins in flight. */
  private turretSprite: Phaser.GameObjects.Image | null = null;
  /** Monument sprite for leninStatue — top pixel points in direction of flight. */
  private monumentSprite: Phaser.GameObjects.Image | null = null;
  private monumentH = 0;
  /** Seconds before homing kicks in (churchDome flies straight up first). */
  private homingDelay = 0;
  /** Seconds until ground-launcher fires; -1 means already in flight. */
  private fireDelay = -1;
  private _storedWorldSpeed = 0;
  private _storedLevelIndex = 0;
  private _storedPlayerX = 0;
  private _storedPlayerY = 0;

  constructor(
    scene: Phaser.Scene,
    type: ObstacleType,
    worldSpeed: number,
    levelIndex: number,
    playerX: number,
    playerY: number,
  ) {
    this.scene = scene;
    this.type = type;

    const cfg = OBSTACLE_CFG[type];
    const spawn = this.computeSpawn(type);

    // Ground-launched types with separate launcher sprites.
    // leninStatue has no separate base — the monument itself scrolls in.
    if (type !== "paaRocket" && type !== "leninStatue") {
      this.launcher = this.buildLauncher(type as "oilCap" | "tankTurret" | "churchDome", spawn.x);
    }

    this.rect = scene.add.rectangle(0, 0, cfg.w, cfg.h, cfg.color).setStrokeStyle(2, 0x111111);

    let visual: Phaser.GameObjects.GameObject[];
    if (type === "paaRocket") {
      const sprite = scene.add.image(0, 0, "rocket");
      sprite.setScale(cfg.w / sprite.width);
      this.rect.setVisible(false);
      visual = [this.rect, sprite];
    } else if (type === "oilCap") {
      const sprite = scene.add.image(0, -cfg.h / 2 + 10, "oil_lid");
      sprite.setScale(cfg.w / sprite.width);
      this.rect.setVisible(false);
      this.lidSprite = sprite;
      visual = [this.rect, sprite];
    } else if (type === "churchDome") {
      const sprite = scene.add.image(-13, -cfg.h / 2, "church_dome");
      sprite.setScale(cfg.h / sprite.height);
      // Default origin (0.5, 0.5); positioned so bottom sits at container y=0 (launcher top).
      // Offset -20px left so it aligns with the church_base sprite before firing.
      this.rect.setVisible(false);
      this.domeSprite = sprite;
      this.domeH = cfg.h;
      visual = [this.rect, sprite];
    } else if (type === "tankTurret") {
      const sprite = scene.add.image(0, -cfg.h / 2 + 10, "tank_turret");
      sprite.setScale(cfg.w / sprite.width);
      this.rect.setVisible(false);
      this.turretSprite = sprite;
      visual = [this.rect, sprite];
    } else if (type === "leninStatue") {
      const sprite = scene.add.image(0, cfg.h / 2, "monument");
      // Scale 1.5× cfg.h; bottom sits at local y = cfg.h = ground level.
      sprite.setScale((cfg.h * 1.5) / sprite.height);
      this.rect.setVisible(false);
      this.monumentSprite = sprite;
      this.monumentH = cfg.h * 1.5;
      visual = [this.rect, sprite];
    } else {
      const label = scene.add
        .text(0, 0, cfg.label, { fontSize: "9px", color: "#fff", fontStyle: "bold" })
        .setOrigin(0.5);
      visual = [this.rect, label];
    }

    this.container = scene.add
      .container(spawn.x, spawn.y, visual)
      .setDepth(DEPTH.interceptor);
    scene.physics.add.existing(this.container);
    this.body = this.container.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(cfg.w, cfg.h);
    // oilCap/churchDome: sprite bottom at y=0, body covers y=-cfg.h to 0.
    // leninStatue: sprite centre at y=cfg.h/2 (bottom at ground), body offset = 0.
    const yOff = (type === "oilCap" || type === "churchDome" || type === "tankTurret") ? -cfg.h
               : type === "leninStatue" ? 0
               : -cfg.h / 2;
    this.body.setOffset(-cfg.w / 2, yOff);

    if (type === "paaRocket") {
      this.initMotion(type, worldSpeed, levelIndex, playerX, playerY);
    } else {
      // Hide projectile until the launcher has scrolled into view and fires
      // (oilCap and churchDome stay visible — they sit on their base before launch).
      if (type !== "churchDome" && type !== "oilCap" && type !== "leninStatue" && type !== "tankTurret") this.container.setAlpha(0);
      this.body.setVelocity(0, 0);
      this.fireDelay = 1.1;
      this._storedWorldSpeed = worldSpeed;
      this._storedLevelIndex = levelIndex;
      this._storedPlayerX = playerX;
      this._storedPlayerY = playerY;
    }
  }

  private computeSpawn(type: ObstacleType): { x: number; y: number } {
    switch (type) {
      // Horizontal missiles enter from off-screen right at a random height.
      case "paaRocket":
        return { x: GAME.width + 60, y: Phaser.Math.Between(60, GAME.height - 110) };
      // All ground-launched types: launcher appears at right screen edge and scrolls in.
      default: {
        const lh = LAUNCHER_CFG[type as "oilCap" | "tankTurret" | "churchDome" | "leninStatue"].h;
        const lw = LAUNCHER_CFG[type as "oilCap" | "tankTurret" | "churchDome" | "leninStatue"].w;
        // Spawn so the launcher's left edge is exactly at the right screen edge.
        const x = GAME.width + lw / 2;
        return { x, y: GAME.height - lh };
      }
    }
  }

  private buildLauncher(type: "oilCap" | "tankTurret" | "churchDome", x: number): Phaser.GameObjects.Container {
    const lc = LAUNCHER_CFG[type];

    if (type === "churchDome") {
      const sprite = this.scene.add.image(0, 0, "church_base");
      sprite.setScale(lc.h / sprite.height);
      return this.scene.add
        .container(x, GAME.height - lc.h / 2, [sprite])
        .setDepth(DEPTH.interceptor - 1);
    }

    if (type === "oilCap") {
      const sprite = this.scene.add.image(0, 0, "oil_reservoir");
      sprite.setDisplaySize(lc.w + 8, lc.h);
      return this.scene.add
        .container(x, GAME.height - lc.h / 2, [sprite])
        .setDepth(DEPTH.interceptor - 1);
    }

    if (type === "tankTurret") {
      const sprite = this.scene.add.image(0, 0, "tank");
      sprite.setScale(lc.w / sprite.width);
      return this.scene.add
        .container(x, GAME.height - lc.h / 2, [sprite])
        .setDepth(DEPTH.interceptor - 1);
    }

    const body = this.scene.add
      .rectangle(0, 0, lc.w, lc.h, lc.color)
      .setStrokeStyle(2, 0x111111);
    const label = this.scene.add
      .text(0, 0, lc.label, { fontSize: "8px", color: "#fff", fontStyle: "bold" })
      .setOrigin(0.5);
    return this.scene.add
      .container(x, GAME.height - lc.h / 2, [body, label])
      .setDepth(DEPTH.interceptor - 1);
  }

  private initMotion(
    type: ObstacleType,
    worldSpeed: number,
    levelIndex: number,
    playerX: number,
    playerY: number,
  ) {
    const motionCfg = OBSTACLE_MOTION[type];
    const levelCfg =
      LEVEL_GROUND_SETTINGS[levelIndex] ??
      LEVEL_GROUND_SETTINGS[LEVEL_GROUND_SETTINGS.length - 1];
    const speed = motionCfg.speed * levelCfg.speedMul;
    const dx = playerX - this.container.x;
    const dy = playerY - this.container.y;

    // Note: oilCap spin/smoke and tankTurret flash are triggered at fire time in update()
    // (when called from constructor for paaRocket, these don't apply).

    if (type === "paaRocket") {
      // Straight horizontal shot; small turn rate on higher levels.
      this.vx = -speed;
      this.vy = 0;
      this.turnRateRad = levelCfg.paaRocketTurnRateRad;

    } else if (!motionCfg.homing) {
      // Parabolic: fixed flight duration (scaled by level) so the arc is always
      // visible and predictable regardless of spawn distance.
      // T = flightTime / speedMul → higher levels fly faster.
      const T = motionCfg.flightTime / levelCfg.speedMul;
      this.vx = dx / T;
      this.gravityY = motionCfg.gravity;
      this.vy = dy / T - 0.5 * this.gravityY * T;

    } else if (type === "leninStatue") {
      // Launches straight up (scrolling with the world so it looks vertical).
      // Homing activates after a short delay.
      this.vx = -worldSpeed;
      this.vy = -speed;
      this.turnRateRad = levelCfg.turnRateRad * motionCfg.homingMul;
      this.homingDelay = 0.35;

    } else {
      // Guided missile: aim at player with spread, steer mid-flight.
      const baseAngle = Math.atan2(dy, dx);
      const spreadRad = Phaser.Math.DegToRad(levelCfg.aimSpreadDeg);
      const angle = baseAngle + Phaser.Math.FloatBetween(-spreadRad, spreadRad);
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.turnRateRad = levelCfg.turnRateRad * motionCfg.homingMul;
    }
  }

  private flashExplosion() {
    const boom = this.scene.add
      .rectangle(this.container.x, this.container.y + 20, 50, 30, 0xff7722)
      .setDepth(DEPTH.interceptor);
    this.scene.tweens.add({
      targets: boom,
      alpha: 0,
      scale: 2,
      duration: 400,
      onComplete: () => boom.destroy(),
    });
  }

  private spawnSmoke() {
    const timer = this.scene.time.addEvent({
      delay: 80,
      loop: true,
      callback: () => {
        if (!this.container.active) { timer.destroy(); return; }
        const puff = this.scene.add
          .rectangle(this.container.x, this.container.y + 12, 10, 10, 0x222222, 0.7)
          .setDepth(DEPTH.interceptor - 1);
        this.scene.tweens.add({
          targets: puff,
          alpha: 0,
          scale: 1.6,
          duration: 500,
          onComplete: () => puff.destroy(),
        });
      },
    });
  }

  private spawnDomeExhaust() {
    const timer = this.scene.time.addEvent({
      delay: 60,
      loop: true,
      callback: () => {
        if (!this.container.active) { timer.destroy(); return; }
        const spd = Math.hypot(this.vx, this.vy);
        if (spd === 0) return;
        // Back of dome = dome centre + half-height in direction opposite to flight.
        const bx = this.container.x - (this.vx / spd) * (this.domeH / 2);
        const by = (this.container.y - this.domeH / 2) - (this.vy / spd) * (this.domeH / 2);
        const puff = this.scene.add
          .rectangle(bx, by, 8, 8, 0xffd700, 0.85)
          .setDepth(DEPTH.interceptor - 1);
        this.scene.tweens.add({
          targets: puff,
          alpha: 0,
          scale: 1.8,
          duration: 420,
          onComplete: () => puff.destroy(),
        });
      },
    });
  }

  private spawnTurretSmoke() {
    const timer = this.scene.time.addEvent({
      delay: 75,
      loop: true,
      callback: () => {
        if (!this.container.active) { timer.destroy(); return; }
        const puff = this.scene.add
          .rectangle(this.container.x, this.container.y, 9, 9, 0x111111, 0.8)
          .setDepth(DEPTH.interceptor - 1);
        this.scene.tweens.add({
          targets: puff,
          alpha: 0,
          scale: 1.7,
          duration: 450,
          onComplete: () => puff.destroy(),
        });
      },
    });
  }

  private spawnMonumentExhaust() {
    const timer = this.scene.time.addEvent({
      delay: 65,
      loop: true,
      callback: () => {
        if (!this.container.active) { timer.destroy(); return; }
        const spd = Math.hypot(this.vx, this.vy);
        if (spd === 0) return;
        // Back of monument = centre offset by half-height in direction opposite to flight.
        const cx = this.container.x;
        const cy = this.container.y + this.monumentH / 2;
        const bx = cx - (this.vx / spd) * (this.monumentH / 2);
        const by = cy - (this.vy / spd) * (this.monumentH / 2);
        const puff = this.scene.add
          .rectangle(bx, by, 8, 8, 0x888888, 0.75)
          .setDepth(DEPTH.interceptor - 1);
        this.scene.tweens.add({
          targets: puff,
          alpha: 0,
          scale: 1.8,
          duration: 440,
          onComplete: () => puff.destroy(),
        });
      },
    });
  }

  update(dt: number, playerX: number, playerY: number, worldSpeed: number) {
    // Scroll the ground launcher with the world.
    if (this.launcher) {
      this.launcher.x -= worldSpeed * dt;
      if (this.launcher.x < -120) {
        this.launcher.destroy();
        this.launcher = null;
      }
    }

    // Pre-fire phase: scroll projectile with the world until fire delay expires.
    if (this.fireDelay >= 0) {
      // Keep projectile parked at the top of the launcher.
      if (this.launcher) {
        this.container.x = this.launcher.x;
        // container y is already set at spawn time (launcher top)
      } else {
        this.container.x -= worldSpeed * dt;
      }
      this.fireDelay -= dt;
      if (this.fireDelay < 0) {
        // Fire! Compute trajectory from current launcher position toward player.
        this.container.setAlpha(1);
        this.initMotion(
          this.type,
          this._storedWorldSpeed,
          this._storedLevelIndex,
          playerX,
          playerY,
        );
        this.body.setVelocity(this.vx, this.vy);
        if (this.type === "oilCap") {
          this.spin = Phaser.Math.FloatBetween(4, 8);
          this.spawnSmoke();
        }
        if (this.type === "tankTurret") {
          this.spin = Phaser.Math.FloatBetween(4, 8);
          this.flashExplosion();
          this.spawnTurretSmoke();
        }
        if (this.type === "leninStatue") this.spawnMonumentExhaust();
        if (this.type === "churchDome" && this.domeSprite) {
          this.domeSprite.x = 0; // centre on trajectory
          this.spawnDomeExhaust();
        }
      }
      return;
    }

    if (this.turnRateRad > 0) {
      if (this.homingDelay > 0) {
        this.homingDelay -= dt;
      } else {
        const speed = Math.hypot(this.vx, this.vy);
        if (speed > 0) {
          const cur = Math.atan2(this.vy, this.vx);
          const tgt = Math.atan2(playerY - this.container.y, playerX - this.container.x);
          const diff = Phaser.Math.Angle.Wrap(tgt - cur);
          const turn = Phaser.Math.Clamp(diff, -this.turnRateRad * dt, this.turnRateRad * dt);
          const na = cur + turn;
          this.vx = Math.cos(na) * speed;
          this.vy = Math.sin(na) * speed;
        }
      }
    }

    if (this.gravityY > 0) this.vy += this.gravityY * dt;

    this.body.setVelocity(this.vx, this.vy);
    if (this.spin && this.lidSprite) this.lidSprite.rotation += this.spin * dt;
    if (this.spin && this.turretSprite) this.turretSprite.rotation += this.spin * dt;
    // Rotate dome / monument so top pixel points in the direction of flight.
    if (this.domeSprite && (this.vx !== 0 || this.vy !== 0)) {
      this.domeSprite.rotation = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    }
    if (this.monumentSprite && (this.vx !== 0 || this.vy !== 0)) {
      this.monumentSprite.rotation = Math.atan2(this.vy, this.vx) + Math.PI / 2;
    }
  }

  isOffscreen(): boolean {
    // During pre-fire, containers legitimately sit just off-screen right — don't cull them.
    if (this.fireDelay >= 0) return this.container.x < -120;
    // paaRocket enters from the right at GAME.width+60, so use a wide right margin
    // and only cull it once it exits the left side or top/bottom.
    const rightBound = this.type === "paaRocket" ? GAME.width + 120 : GAME.width + 10;
    return (
      this.container.x < -10 ||
      this.container.x > rightBound ||
      this.container.y < -10 ||
      this.container.y > GAME.height + 10
    );
  }

  destroy() {
    this.launcher?.destroy();
    this.launcher = null;
    this.container.destroy();
  }
}

// ── Visual configs ────────────────────────────────────────────────────────────

interface ObstacleCfg { w: number; h: number; color: number; label: string }
interface LauncherCfg  { w: number; h: number; color: number; label: string }

const OBSTACLE_CFG: Record<ObstacleType, ObstacleCfg> = {
  oilCap:      { w: 40, h: 24, color: COLORS.oilCap,      label: "КРИШКА" },
  churchDome:  { w: 34, h: 40, color: COLORS.churchDome,  label: "КУПОЛ"  },
  leninStatue: { w: 28, h: 48, color: COLORS.leninStatue, label: "ЛЕНІН"  },
  tankTurret:  { w: 46, h: 26, color: COLORS.tankTurret,  label: "БАШТА"  },
  paaRocket:   { w: 48, h: 14, color: COLORS.paaRocket,   label: "ППО"    },
};

const LAUNCHER_CFG: Record<"oilCap" | "tankTurret" | "churchDome" | "leninStatue", LauncherCfg> = {
  oilCap:      { w: 36, h: 32, color: 0x1a1a1a, label: "ЦИСТЕРНА" },
  tankTurret:  { w: 54, h: 24, color: 0x4a4030, label: "ТАНК"     },
  churchDome:  { w: 44, h: 58, color: 0xc8b89a, label: "ЦЕРКВА"   },
  leninStatue: { w: 32, h: 48, color: 0x8a8a8a, label: "ПОСТАМЕНТ"},
};
