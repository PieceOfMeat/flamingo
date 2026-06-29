import Phaser from "phaser";
import { COLORS, DEPTH, GAME } from "../config/constants";

export type BonusType = "star";

// Collectible. star = temporary invulnerability.
// Drifts left with the world at a slight bob.
export class Bonus {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  body: Phaser.Physics.Arcade.Body;
  type: BonusType;
  private worldSpeed: number;

  constructor(scene: Phaser.Scene, type: BonusType, worldSpeed: number) {
    this.scene = scene;
    this.type = type;
    this.worldSpeed = worldSpeed;

    const star = scene.add.star(0, 0, 5, 7, 15, 0xffe600).setStrokeStyle(2, 0xcc8800);

    const y = Phaser.Math.Between(60, GAME.height - 120);
    this.container = scene.add.container(GAME.width + 40, y, [star]).setDepth(DEPTH.bonus);
    scene.physics.add.existing(this.container);
    this.body = this.container.body as Phaser.Physics.Arcade.Body;
    this.body.setSize(18, 18);
    this.body.setOffset(-9, -9);

    scene.tweens.add({ targets: this.container, y: y - 14, duration: 900, yoyo: true, repeat: -1, ease: "Sine.inOut" });
  }

  update(_dt: number) {
    this.body.setVelocityX(-this.worldSpeed);
  }

  isOffscreen(): boolean {
    return this.container.x < -80;
  }

  destroy() {
    this.container.destroy();
  }
}
