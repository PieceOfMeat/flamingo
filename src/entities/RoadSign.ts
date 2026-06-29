import Phaser from "phaser";
import { DEPTH, GAME } from "../config/constants";

// City road-sign that scrolls in from the right. `crossed` draws a red strike
// (used at level end). Start sign = clean; end sign = crossed out.
export class RoadSign {
  scene: Phaser.Scene;
  container: Phaser.GameObjects.Container;
  private worldSpeed: number;
  done = false;

  constructor(scene: Phaser.Scene, city: string, crossed: boolean, worldSpeed: number) {
    this.scene = scene;
    this.worldSpeed = worldSpeed;

    const w = Math.max(120, city.length * 12 + 30);
    const post = scene.add.rectangle(0, 60, 8, 120, 0x555555);
    const board = scene.add.rectangle(0, 0, w, 44, 0x1a4faa).setStrokeStyle(3, 0xffffff);
    const txt = scene.add
      .text(0, 0, city, { fontSize: "16px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);

    const parts: Phaser.GameObjects.GameObject[] = [post, board, txt];
    if (crossed) {
      const slash = scene.add.graphics();
      slash.lineStyle(9, 0xcc0000);
      slash.lineBetween(-w / 2, 22, w / 2, -22);
      parts.push(slash);
    }

    // Container origin is at board centre; post bottom = local y+120.
    // Position so post bottom sits at the screen bottom.
    this.container = scene.add.container(GAME.width + w, GAME.height - 120, parts).setDepth(DEPTH.sign);
  }

  update(dt: number) {
    this.container.x -= this.worldSpeed * dt;
    if (this.container.x < -200) {
      this.done = true;
      this.container.destroy();
    }
  }
}
