import Phaser from "phaser";
import { GAME, COLORS } from "../config/constants";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    this.cameras.main.setBackgroundColor("#0b1020");
    const cx = GAME.width / 2;

    this.add.text(cx, 140, "ФЛАМІНГО", { fontSize: "64px", color: "#ffd24a", fontStyle: "bold" }).setOrigin(0.5);

    const best = Number(localStorage.getItem("flamingo_best") || 0);
    if (best > 0) {
      this.add.text(cx, 340, `Рекорд: ${best} м`, { fontSize: "18px", color: "#55ddff" }).setOrigin(0.5);
    }

    const btn = this.add
      .text(cx, 420, "▶  СТАРТ", { fontSize: "32px", color: "#000", backgroundColor: "#ffd24a", padding: { x: 24, y: 12 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    btn.on("pointerover", () => btn.setStyle({ backgroundColor: "#fff" }));
    btn.on("pointerout", () => btn.setStyle({ backgroundColor: "#ffd24a" }));

    const start = () => this.scene.start("Game");
    btn.on("pointerdown", start);
    this.input.keyboard!.once("keydown-SPACE", start);
    this.input.keyboard!.once("keydown-ENTER", start);

    void COLORS;
  }
}
