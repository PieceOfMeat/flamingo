import Phaser from "phaser";
import { GAME, DEPTH } from "../config/constants";
import { LEVELS, type LevelDef } from "../config/levels";
import { Player } from "../entities/Player";
import { Obstacle } from "../entities/Obstacle";
import { Bonus } from "../entities/Bonus";
import { Parallax } from "../entities/Parallax";
import { RoadSign } from "../entities/RoadSign";
import flamingoUrl from "../assets/flamingo.png";
import city1Url from "../assets/city_parallax_1.png";
import rocketUrl from "../assets/rocket.png";
import churchBaseUrl from "../assets/church_base.png";
import churchDomeUrl from "../assets/church_dome.png";
import oilReservoirUrl from "../assets/oil_reservoir.png";
import oilLidUrl from "../assets/oil_lid.png";
import monumentUrl from "../assets/monument.png";
import tankUrl from "../assets/tank.png";
import tankTurretUrl from "../assets/tank_turret.png";

type Phase = "intro" | "play" | "outro";

export class GameScene extends Phaser.Scene {
  private player!: Player;
  private parallax!: Parallax;

  private obstacles: Obstacle[] = [];
  private bonuses: Bonus[] = [];
  private signs: RoadSign[] = [];

  private levelIndex = 0;
  private level!: LevelDef;
  private phase: Phase = "intro";
  private phaseTimer = 0;
  private spawnTimer = 0;
  private bonusTimer = 0;

  private distance = 0; // world px scrolled
  private worldSpeed = GAME.baseScrollSpeed;

  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private lives = 3;
  private lifeIcons: Phaser.GameObjects.Image[] = [];

  constructor() {
    super("Game");
  }

  preload() {
    this.load.image("flamingo", flamingoUrl);
    this.load.image("city1", city1Url);
    this.load.image("rocket", rocketUrl);
    this.load.image("church_base", churchBaseUrl);
    this.load.image("church_dome", churchDomeUrl);
    this.load.image("oil_reservoir", oilReservoirUrl);
    this.load.image("oil_lid", oilLidUrl);
    this.load.image("monument", monumentUrl);
    this.load.image("tank", tankUrl);
    this.load.image("tank_turret", tankTurretUrl);
  }

  create() {
    this.cameras.main.setBackgroundColor("#08111f");
    this.parallax = new Parallax(this, "city1");
    this.player = new Player(this);

    this.scoreText = this.add.text(GAME.width - 16, 14, "", { fontSize: "20px", color: "#fff", fontStyle: "bold" }).setOrigin(1, 0).setDepth(DEPTH.hud);
    this.levelText = this.add.text(16, 14, "", { fontSize: "16px", color: "#fff" }).setDepth(DEPTH.hud);

    // Reset per-run state (scene can be restarted).
    this.obstacles = [];
    this.bonuses = [];
    this.signs = [];
    this.distance = 0;
    this.levelIndex = 0;
    this.lives = 3;

    // Life icons — small flamingo sprites top-right, just left of score.
    this.lifeIcons = [];
    for (let i = 0; i < 3; i++) {
      const icon = this.add.image(GAME.width - 160 - i * 28, 18, "flamingo")
        .setScale(22 / this.textures.get("flamingo").getSourceImage().width)
        .setOrigin(1, 0)
        .setDepth(DEPTH.hud);
      this.lifeIcons.push(icon);
    }

    this.startLevel(GAME.startLevel);
  }

  private startLevel(idx: number) {
    this.levelIndex = idx;
    this.level = LEVELS[idx];
    this.worldSpeed = GAME.baseScrollSpeed * this.level.speedMul;
    this.phase = "intro";
    this.phaseTimer = 2.2;
    this.spawnTimer = 1.2;
    this.bonusTimer = Phaser.Math.FloatBetween(8, 14);



    this.signs.push(new RoadSign(this, this.level.city, false, this.worldSpeed));
    this.levelText.setText(`Рівень ${idx + 1}/${LEVELS.length}: ${this.level.city}`);
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;

    this.parallax.update(dt, this.worldSpeed);
    this.player.update(dt);

    // World scroll -> distance/score (boost speeds it up).
    const effectiveSpeed = this.worldSpeed * (this.player.boostMs > 0 ? 1.5 : 1);
    this.distance += effectiveSpeed * dt;
    this.scoreText.setText(`${Math.floor(this.distance * GAME.scorePerPixel)} м`);

    this.updateEntities(dt);
    this.updatePhase(dt);
    this.checkCollisions();
  }

  private updateEntities(dt: number) {
    const px = this.player.container.x;
    const py = this.player.container.y;
    for (const o of this.obstacles) o.update(dt, px, py, this.worldSpeed);
    this.obstacles = this.obstacles.filter((o) => {
      if (o.isOffscreen()) { o.destroy(); return false; }
      return true;
    });

    for (const b of this.bonuses) b.update(dt);
    this.bonuses = this.bonuses.filter((b) => {
      if (b.isOffscreen()) { b.destroy(); return false; }
      return true;
    });

    for (const s of this.signs) s.update(dt);
    this.signs = this.signs.filter((s) => !s.done);
  }

  private updatePhase(dt: number) {
    this.phaseTimer -= dt;

    if (this.phase === "intro") {
      if (this.phaseTimer <= 0) {
        this.phase = "play";
        this.phaseTimer = this.level.durationMs / 1000;
      }
      return;
    }

    if (this.phase === "play") {
      // Spawn obstacles.
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnObstacle();
        this.spawnTimer = Phaser.Math.FloatBetween(this.level.spawnInterval[0], this.level.spawnInterval[1]);
      }
      // Spawn bonuses.
      this.bonusTimer -= dt;
      if (this.bonusTimer <= 0) {
        this.spawnBonus();
        this.bonusTimer = Phaser.Math.FloatBetween(8, 14);
      }
      // End of level -> show crossed-out sign.
      if (this.phaseTimer <= 0) {
        this.phase = "outro";
        this.phaseTimer = 2.4;
        this.signs.push(new RoadSign(this, this.level.city, true, this.worldSpeed));
      }
      return;
    }

    if (this.phase === "outro") {
      if (this.phaseTimer <= 0) {
        const next = this.levelIndex + 1;
        if (next < LEVELS.length) this.startLevel(next);
        else this.win();
      }
    }
  }

  private spawnObstacle() {
    let type = Phaser.Utils.Array.GetRandom(this.level.obstacles);
    // Only one oil-cap lid may be in flight at a time.
    if (type === "oilCap" && this.obstacles.some((o) => o.type === "oilCap")) {
      const others = this.level.obstacles.filter((t) => t !== "oilCap");
      if (others.length === 0) return;
      type = Phaser.Utils.Array.GetRandom(others);
    }
    this.obstacles.push(
      new Obstacle(
        this, type, this.worldSpeed, this.levelIndex,
        this.player.container.x, this.player.container.y,
      ),
    );
  }

  private spawnBonus() {
    this.bonuses.push(new Bonus(this, "star", this.worldSpeed));
  }

  private checkCollisions() {
    const pb = this.player.body;

    // Obstacles -> lose a life (unless invulnerable).
    for (const o of this.obstacles) {
      if (this.overlap(pb, o.body)) {
        if (!this.player.invulnerable) {
          this.lives--;
          const icon = this.lifeIcons[this.lives];
          if (icon) icon.setVisible(false);
          if (this.lives <= 0) { this.gameOver(); return; }
          this.player.setInvulnerable(2500);
        }
      }
    }

    // Bonuses -> collect.
    for (const b of this.bonuses) {
      if (this.overlap(pb, b.body)) {
        this.player.setInvulnerable(4000);
        b.destroy();
        this.bonuses = this.bonuses.filter((x) => x !== b);
      }
    }
  }

  private overlap(a: Phaser.Physics.Arcade.Body, b: Phaser.Physics.Arcade.Body): boolean {
    return Phaser.Geom.Intersects.RectangleToRectangle(
      new Phaser.Geom.Rectangle(a.x, a.y, a.width, a.height),
      new Phaser.Geom.Rectangle(b.x, b.y, b.width, b.height)
    );
  }

  private finalScore(): number {
    return Math.floor(this.distance * GAME.scorePerPixel);
  }

  private gameOver() {
    this.scene.start("GameOver", { score: this.finalScore(), won: false, city: this.level.city });
  }

  private win() {
    this.scene.start("GameOver", { score: this.finalScore(), won: true, city: this.level.city });
  }
}
