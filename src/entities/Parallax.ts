import Phaser from "phaser";
import { DEPTH, GAME } from "../config/constants";

interface Tile {
  sprite: Phaser.GameObjects.Image;
  flipped: boolean;
}

// Single city image layer that tiles seamlessly by alternating flipped copies.
// Behind it: a full-screen sky gradient (deep navy top → light blue bottom).
// No ground strip — the city image sits at the very bottom of the screen.
export class Parallax {
  private scene: Phaser.Scene;
  private cityLayer: Tile[] = [];

  constructor(scene: Phaser.Scene, initialCityKey: string) {
    this.scene = scene;

    // Sky gradient: deep navy at top → #afc0d2 at city line → #eaeef7 at bottom.
    const cityH = 170;
    const skyH = GAME.height - cityH;
    const gfx = scene.add.graphics().setDepth(DEPTH.bgFar);
    gfx.fillGradientStyle(0x08111f, 0x08111f, 0xafc0d2, 0xafc0d2, 1);
    gfx.fillRect(0, 0, GAME.width, skyH);
    gfx.fillGradientStyle(0xafc0d2, 0xafc0d2, 0xeaeef7, 0xeaeef7, 1);
    gfx.fillRect(0, skyH, GAME.width, cityH);

    this.cityLayer = this.buildLayer(initialCityKey);
  }

  private buildLayer(key: string): Tile[] {
    const frame = this.scene.textures.get(key).get();
    // Scale the image so it is 170 px tall.
    const scale = 170 / frame.realHeight;
    const tileW = frame.realWidth * scale;
    // Enough tiles to cover the screen plus two off-screen for seamless wrap.
    const count = Math.ceil(GAME.width / tileW) + 2;

    const tiles: Tile[] = [];
    for (let i = 0; i < count; i++) {
      const flipped = i % 2 === 1;
      const sprite = this.scene.add
        .image(i * tileW, GAME.height, key)
        .setOrigin(0, 1)         // anchor: bottom-left corner
        .setScale(scale)
        .setFlipX(flipped)
        .setDepth(DEPTH.bgMid);
      tiles.push({ sprite, flipped });
    }
    return tiles;
  }

  update(dt: number, worldSpeed: number) {
    this.scrollLayer(this.cityLayer, worldSpeed * 0.5 * dt);
  }

  private scrollLayer(tiles: Tile[], dx: number) {
    if (!tiles.length) return;
    const tileW = tiles[0].sprite.displayWidth;

    for (const t of tiles) t.sprite.x -= dx;

    // Find leftmost and rightmost by x position.
    let leftIdx = 0, rightIdx = 0;
    for (let i = 1; i < tiles.length; i++) {
      if (tiles[i].sprite.x < tiles[leftIdx].sprite.x) leftIdx = i;
      if (tiles[i].sprite.x > tiles[rightIdx].sprite.x) rightIdx = i;
    }

    // When the leftmost tile exits the left edge, leap it to after the rightmost
    // and toggle its flip so the straight/flipped pattern continues forever.
    const left = tiles[leftIdx];
    if (left.sprite.x + tileW < 0) {
      left.sprite.x = tiles[rightIdx].sprite.x + tileW;
      left.flipped = !left.flipped;
      left.sprite.setFlipX(left.flipped);
    }
  }

}
