import * as Phaser from "phaser";
import type { MountedGame } from "../components/game/phaser-game-host";
import type { GameBridge, GameWorldSnapshot } from "./bridge";
import { NPCS, findNearbyNpc, type NpcId } from "./npcs";
import {
  PLAYER_START,
  WORLD_HEIGHT,
  WORLD_OBSTACLES,
  WORLD_WIDTH,
  WORLD_ZONES,
  getFacingDirection,
  getMovementVelocity,
  getZoneAt,
  type Direction,
  type MovementInput,
} from "./world";
import { WORLD_INTERACTIONS, findNearbyWorldInteraction, type WorldInteractionId } from "./world-interactions";

type WasdKeys = {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
};

class PeaceVillageScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: WasdKeys;
  private facing: Direction = "down";
  private collisionCount = 0;
  private lastTelemetry = "";
  private interactKey!: Phaser.Input.Keyboard.Key;
  private nearbyNpcId: NpcId | null = null;
  private nearbyWorldId: WorldInteractionId | null = null;
  private interactionLocked = false;
  private worldSnapshot: GameWorldSnapshot = { fragmentCount: 0, puzzleSequence: [], puzzleSolved: false };
  private readonly interactionVisuals = new Map<WorldInteractionId, Phaser.GameObjects.Rectangle>();
  private mobileInput: MovementInput = { up: false, down: false, left: false, right: false };
  private readonly reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  constructor(
    private readonly host: HTMLDivElement,
    private readonly bridge: GameBridge,
  ) {
    super("peace-village");
  }

  create() {
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setRoundPixels(true);

    this.drawWorld();
    this.createPlayerTextures();
    this.createPlayerAnimations();

    const obstacleGroup = this.physics.add.staticGroup();
    for (const obstacle of WORLD_OBSTACLES) {
      const body = this.add.rectangle(obstacle.x, obstacle.y, obstacle.width, obstacle.height, obstacle.color);
      body.setStrokeStyle(3, 0x0a1225, 0.55);
      obstacleGroup.add(body);

      if (obstacle.kind === "building") {
        this.add.rectangle(obstacle.x, obstacle.y - obstacle.height / 2 + 18, obstacle.width + 18, 36, 0x2c1d2f);
        this.add.rectangle(obstacle.x, obstacle.y + obstacle.height / 2 - 38, 38, 76, 0x2a2033);
      } else if (obstacle.kind === "tree") {
        this.add.circle(obstacle.x, obstacle.y - 18, 34, 0x3d9b5f).setStrokeStyle(3, 0x183d2a);
        this.add.rectangle(obstacle.x, obstacle.y + 13, 12, 30, 0x6b4a32);
      } else if (obstacle.kind === "fountain") {
        this.add.ellipse(obstacle.x, obstacle.y, obstacle.width - 22, obstacle.height - 22, 0x7bd6e8, 0.85);
        this.add.circle(obstacle.x, obstacle.y - 10, 26, 0xc7f4ff, 0.9);
      }
    }
    this.createNpcs();
    this.createWorldInteractions();

    this.player = this.physics.add.sprite(PLAYER_START.x, PLAYER_START.y, "player-down-0");
    this.player.setCollideWorldBounds(true);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setSize(18, 18).setOffset(3, 10);
    this.player.setDepth(20);
    this.physics.add.collider(this.player, obstacleGroup, () => {
      this.collisionCount += 1;
    });

    const keyboard = this.input.keyboard;
    if (!keyboard) throw new Error("Keyboard input is unavailable.");
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys("W,A,S,D") as WasdKeys;
    this.interactKey = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.host.dataset.gameReady = "true";
    this.host.dataset.reducedMotion = String(this.reduceMotion);
    this.publishTelemetry(true);
  }

  update() {
    const nearbyNpc = findNearbyNpc(this.player.x, this.player.y);
    const nearbyNpcId = nearbyNpc?.id ?? null;
    if (nearbyNpcId !== this.nearbyNpcId) {
      this.nearbyNpcId = nearbyNpcId;
      this.bridge.onNearbyNpcChange(nearbyNpcId);
    }
    const nearbyWorld = findNearbyWorldInteraction(this.player.x, this.player.y);
    const nearbyWorldId = nearbyWorld?.id ?? null;
    if (nearbyWorldId !== this.nearbyWorldId) {
      this.nearbyWorldId = nearbyWorldId;
      this.bridge.onNearbyWorldInteractionChange(nearbyWorldId);
    }

    if (!this.interactionLocked && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.interact();
    }

    if (this.interactionLocked) {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      this.player.setTexture(`player-${this.facing}-0`);
      this.publishTelemetry();
      return;
    }

    const velocity = getMovementVelocity({
      up: this.cursors.up.isDown || this.wasd.W.isDown || this.mobileInput.up,
      down: this.cursors.down.isDown || this.wasd.S.isDown || this.mobileInput.down,
      left: this.cursors.left.isDown || this.wasd.A.isDown || this.mobileInput.left,
      right: this.cursors.right.isDown || this.wasd.D.isDown || this.mobileInput.right,
    });
    this.player.setVelocity(velocity.x, velocity.y);
    this.facing = getFacingDirection(velocity, this.facing);

    if (velocity.x !== 0 || velocity.y !== 0) this.player.anims.play(`walk-${this.facing}`, true);
    else {
      this.player.anims.stop();
      this.player.setTexture(`player-${this.facing}-0`);
    }
    this.publishTelemetry();
  }

  setPaused(paused: boolean) {
    this.interactionLocked = paused;
    if (paused && this.player) this.player.setVelocity(0, 0);
    this.host.dataset.paused = String(paused);
  }

  interact() {
    if (this.interactionLocked) return;
    if (this.nearbyNpcId) this.bridge.onNpcInteract(this.nearbyNpcId);
    else if (this.nearbyWorldId) this.bridge.onWorldInteract(this.nearbyWorldId);
  }

  syncWorldState(snapshot: GameWorldSnapshot) {
    this.worldSnapshot = snapshot;
    this.host.dataset.fragmentCount = String(snapshot.fragmentCount);
    this.host.dataset.puzzleSolved = String(snapshot.puzzleSolved);
    for (const interaction of WORLD_INTERACTIONS) {
      const visual = this.interactionVisuals.get(interaction.id);
      if (!visual) continue;
      if (interaction.kind === "ending") {
        visual.setFillStyle(snapshot.fragmentCount === 5 ? 0xf5c968 : 0x667085, 1);
      } else {
        visual.setAlpha(snapshot.puzzleSequence.includes(interaction.id) ? 1 : 0.55);
      }
    }
  }

  setMobileInput(input: MovementInput) {
    this.mobileInput = input;
  }

  private publishTelemetry(force = false) {
    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);
    const zone = getZoneAt(x, y)?.id ?? "path";
    const telemetry = `${x}:${y}:${this.facing}:${zone}:${this.collisionCount}`;
    if (!force && telemetry === this.lastTelemetry) return;
    this.lastTelemetry = telemetry;
    this.host.dataset.playerX = String(x);
    this.host.dataset.playerY = String(y);
    this.host.dataset.facing = this.facing;
    this.host.dataset.zone = zone;
    this.host.dataset.collisionCount = String(this.collisionCount);
  }

  private drawWorld() {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x274f3b, 1);
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    for (const zone of WORLD_ZONES) {
      graphics.fillStyle(zone.color, 0.42);
      graphics.fillRect(zone.x, zone.y, zone.width, zone.height);
      this.add.text(zone.x + 20, zone.y + 18, zone.name, {
        color: "#f8fafc",
        fontFamily: "sans-serif",
        fontSize: "22px",
        fontStyle: "bold",
        stroke: "#0d1730",
        strokeThickness: 5,
      }).setDepth(4);
    }

    graphics.fillStyle(0xd5b86c, 1);
    graphics.fillRect(890, 0, 140, WORLD_HEIGHT);
    graphics.fillRect(0, 640, WORLD_WIDTH, 140);
    graphics.fillRect(300, 420, 1320, 76);
    graphics.fillRect(300, 820, 1320, 76);
    graphics.lineStyle(4, 0xead48f, 0.55);
    for (let x = 0; x < WORLD_WIDTH; x += 32) graphics.lineBetween(x, 640, x, 780);
    for (let y = 0; y < WORLD_HEIGHT; y += 32) graphics.lineBetween(890, y, 1030, y);

    this.add.text(960, 530, "평화의 나무\n5개의 조각을 모으세요", {
      align: "center",
      color: "#f5c968",
      fontFamily: "sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
      stroke: "#0d1730",
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(5);
  }

  private createPlayerTextures() {
    const directions: Direction[] = ["down", "up", "left", "right"];
    for (const direction of directions) {
      for (let frame = 0; frame < 2; frame += 1) {
        const graphics = this.add.graphics();
        graphics.fillStyle(0xf5c968, 1);
        graphics.fillRect(5, 2, 14, 10);
        graphics.fillStyle(0x5279ce, 1);
        graphics.fillRect(4, 12, 16, 10);
        graphics.fillStyle(0xf8fafc, 1);
        if (direction === "down") {
          graphics.fillRect(8, 6, 2, 2);
          graphics.fillRect(14, 6, 2, 2);
        } else if (direction === "left") graphics.fillRect(7, 6, 2, 2);
        else if (direction === "right") graphics.fillRect(15, 6, 2, 2);
        graphics.fillStyle(0x0d1730, 1);
        graphics.fillRect(frame === 0 ? 5 : 8, 22, 5, 6);
        graphics.fillRect(frame === 0 ? 14 : 11, 22, 5, 6);
        graphics.generateTexture(`player-${direction}-${frame}`, 24, 28);
        graphics.destroy();
      }
    }
  }

  private createNpcs() {
    for (const npc of NPCS) {
      const shadow = this.add.ellipse(npc.x, npc.y + 18, 34, 12, 0x07101f, 0.35).setDepth(9);
      const body = this.add.rectangle(npc.x, npc.y, 28, 36, npc.color).setStrokeStyle(3, 0x0d1730).setDepth(10);
      const head = this.add.circle(npc.x, npc.y - 25, 13, 0xf1c7a5).setStrokeStyle(2, 0x0d1730).setDepth(10);
      const marker = this.add.text(npc.x, npc.y - 62, "!", {
        color: "#F5C968",
        fontFamily: "monospace",
        fontSize: "24px",
        fontStyle: "bold",
        stroke: "#0D1730",
        strokeThickness: 5,
      }).setOrigin(0.5).setDepth(11);
      this.add.text(npc.x, npc.y + 30, npc.role, {
        color: "#F8FAFC",
        fontFamily: "sans-serif",
        fontSize: "15px",
        fontStyle: "bold",
        stroke: "#0D1730",
        strokeThickness: 4,
      }).setOrigin(0.5, 0).setDepth(11);
      if (!this.reduceMotion) this.tweens.add({ targets: [body, head, marker, shadow], y: "-=3", duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    }
  }

  private createWorldInteractions() {
    const colors: Record<string, number> = { blue: 0x55b8e8, gold: 0xf5c968, green: 0x63d391 };
    for (const interaction of WORLD_INTERACTIONS) {
      if (interaction.kind === "puzzle") {
        const stone = this.add.rectangle(interaction.x, interaction.y, 34, 46, colors[interaction.id], 0.55)
          .setStrokeStyle(3, 0xf8fafc, 0.8).setDepth(8);
        this.interactionVisuals.set(interaction.id, stone);
        this.add.text(interaction.x, interaction.y + 30, interaction.label, {
          color: "#F8FAFC", fontFamily: "sans-serif", fontSize: "13px", fontStyle: "bold", stroke: "#0D1730", strokeThickness: 4,
        }).setOrigin(0.5, 0).setDepth(9);
      } else {
        const altar = this.add.rectangle(interaction.x, interaction.y, 54, 54, 0x667085, 1)
          .setStrokeStyle(4, 0xf8fafc, 0.85).setAngle(45).setDepth(8);
        this.interactionVisuals.set(interaction.id, altar);
        this.add.text(interaction.x, interaction.y + 44, "최종 평화 제단", {
          color: "#F5C968", fontFamily: "sans-serif", fontSize: "14px", fontStyle: "bold", stroke: "#0D1730", strokeThickness: 4,
        }).setOrigin(0.5, 0).setDepth(9);
      }
    }
    this.syncWorldState(this.worldSnapshot);
  }

  private createPlayerAnimations() {
    const directions: Direction[] = ["down", "up", "left", "right"];
    for (const direction of directions) {
      this.anims.create({
        key: `walk-${direction}`,
        frames: [{ key: `player-${direction}-0` }, { key: `player-${direction}-1` }],
        frameRate: 7,
        repeat: -1,
      });
    }
  }
}

export function mountGame(container: HTMLDivElement, bridge: GameBridge): MountedGame {
  const scene = new PeaceVillageScene(container, bridge);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: container,
    width: 960,
    height: 540,
    backgroundColor: "#081126",
    pixelArt: true,
    roundPixels: true,
    audio: { noAudio: true },
    physics: { default: "arcade", arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [scene],
  });
  return {
    destroy() {
      game.destroy(true);
      delete container.dataset.gameReady;
    },
    setPaused(paused) {
      scene.setPaused(paused);
    },
    interact() {
      scene.interact();
    },
    syncWorldState(snapshot) {
      scene.syncWorldState(snapshot);
    },
    setMobileInput(input) {
      scene.setMobileInput(input);
    },
  };
}
