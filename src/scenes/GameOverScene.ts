import Phaser from "phaser";
import { GAME } from "../config/constants";

interface GameOverData {
  score: number;
  won: boolean;
  city: string;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOver");
  }

  create(data: GameOverData) {
    this.cameras.main.setBackgroundColor("#0b1020");
    const cx = GAME.width / 2;

    const best = Number(localStorage.getItem("flamingo_best") || 0);
    if (data.score > best) localStorage.setItem("flamingo_best", String(data.score));
    const newBest = Math.max(best, data.score);

    const title = data.won ? "ПЕРЕМОГА!" : "ЗБИТО";
    const color = data.won ? "#33cc66" : "#ff5555";
    this.add.text(cx, 140, title, { fontSize: "56px", color, fontStyle: "bold" }).setOrigin(0.5);

    const sub = data.won
      ? "Усі міста пройдено. Фламінго долетів."
      : `Останнє місце: ${data.city}`;
    this.add.text(cx, 210, sub, { fontSize: "18px", color: "#cccccc" }).setOrigin(0.5);

    this.add.text(cx, 280, `Відстань: ${data.score} м`, { fontSize: "28px", color: "#ffd24a" }).setOrigin(0.5);
    this.add.text(cx, 320, `Рекорд: ${newBest} м`, { fontSize: "18px", color: "#55ddff" }).setOrigin(0.5);

    const btn = this.add
      .text(cx, 410, "↻  ЩЕ РАЗ", { fontSize: "30px", color: "#000", backgroundColor: "#ffd24a", padding: { x: 22, y: 10 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on("pointerover", () => btn.setStyle({ backgroundColor: "#fff" }));
    btn.on("pointerout", () => btn.setStyle({ backgroundColor: "#ffd24a" }));

    const restart = () => this.scene.start("Game");
    btn.on("pointerdown", restart);
    this.input.keyboard!.once("keydown-SPACE", restart);
    this.input.keyboard!.once("keydown-ENTER", restart);

    const menu = this.add
      .text(cx, 470, "У меню", { fontSize: "16px", color: "#aaaaaa" })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    menu.on("pointerdown", () => this.scene.start("Boot"));
  }
}
