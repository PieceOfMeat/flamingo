import Phaser from "phaser";
import { GAME, DEPTH } from "../config/constants";

// The Flamingo missile. Placeholder = a labelled rectangle with a physics body.
// Confined to the left third of the screen; moves on both axes via keys/mouse/touch.
export class Player {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  body: Phaser.Physics.Arcade.Body;
  invulnerable = false;
  boostMs = 0; // remaining fuel-boost time

  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd: { up: Phaser.Input.Keyboard.Key; down: Phaser.Input.Keyboard.Key; left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private pointerTarget: { x: number; y: number } | null = null;
  private trailTimer = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const sprite = scene.add.image(0, 0, "flamingo");
    // Scale to 80 px wide; preserve aspect ratio.
    const scale = 100 / sprite.width;
    sprite.setScale(scale);
    const sw = 100;
    const sh = Math.round(sprite.height * scale);

    this.container = scene.add.container(120, GAME.height / 2, [sprite]).setDepth(DEPTH.player);
    scene.physics.add.existing(this.container);
    this.body = this.container.body as Phaser.Physics.Arcade.Body;
    // Hitbox slightly smaller than visual for fair play.
    const hbW = Math.round(sw * 0.55);
    const hbH = Math.round(sh * 0.42);
    this.body.setSize(hbW, hbH);
    this.body.setOffset(-hbW / 2, -hbH / 2);

    const kb = scene.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    scene.input.on("pointermove", (p: Phaser.Input.Pointer) => {
      if (p.isDown) this.pointerTarget = { x: p.worldX, y: p.worldY };
    });
    scene.input.on("pointerup", () => {
      this.pointerTarget = null;
    });
  }

  setInvulnerable(ms: number) {
    this.invulnerable = true;
    this.scene.time.delayedCall(ms, () => (this.invulnerable = false));
  }

  addBoost(ms: number) {
    this.boostMs = Math.max(this.boostMs, 0) + ms;
  }

  update(dt: number) {
    const speed = GAME.playerSpeed;
    let vx = 0, vy = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown || this.wasd.right.isDown) vx = speed;
    if (this.cursors.up.isDown || this.wasd.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown || this.wasd.down.isDown) vy = speed;

    if (vx === 0 && vy === 0 && this.pointerTarget) {
      const dx = this.pointerTarget.x - this.container.x;
      const dy = this.pointerTarget.y - this.container.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 4) {
        vx = (dx / dist) * speed;
        vy = (dy / dist) * speed;
      }
    }

    this.body.setVelocity(vx, vy);

    // Clamp to the left-third zone.
    const xMax = GAME.width * GAME.playerZone.xMaxRatio;
    const yMax = GAME.height - GAME.playerZone.yMargin;
    this.container.x = Phaser.Math.Clamp(this.container.x, GAME.playerZone.xMin, xMax);
    this.container.y = Phaser.Math.Clamp(this.container.y, GAME.playerZone.yMin, yMax);

    // Boost decay + blink while invulnerable.
    if (this.boostMs > 0) this.boostMs -= dt * 1000;
    this.container.setAlpha(this.invulnerable ? (Math.floor(this.scene.time.now / 100) % 2 ? 0.4 : 1) : 1);

    // Exhaust trail — always active, red hearts.
    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.06;
      const heart = this.scene.add
        .text(this.container.x - 32 + Phaser.Math.Between(-4, 4), this.container.y + Phaser.Math.Between(-5, 5), "♥", { fontSize: "12px", color: "#ff2244" })
        .setOrigin(0.5)
        .setDepth(DEPTH.trail);
      this.scene.tweens.add({ targets: heart, alpha: 0, scale: 0.3, x: heart.x - 18, duration: 400, onComplete: () => heart.destroy() });
    }
  }
}
