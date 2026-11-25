import * as Phaser from "phaser";
import type { MountedGame } from "../components/game/phaser-game-host";
import type { GameBridge, GameWorldSnapshot } from "./bridge";
import { NPCS, findNearbyNpc, type NpcId, type NpcQuestState } from "./npcs";
import {
  PLAYER_START,
  WORLD_HEIGHT,
  WORLD_OBSTACLES,
  WORLD_WIDTH,
  WORLD_ZONES,
  getFacingDirection,
  getMovementVelocity,
  getOffscreenIndicatorPlacement,
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
  private lastStepAt = 0;
  private lastZone: string | null = null;
  private interactKey!: Phaser.Input.Keyboard.Key;
  private nearbyNpcId: NpcId | null = null;
  private nearbyWorldId: WorldInteractionId | null = null;
  private interactionLocked = false;
  private worldSnapshot: GameWorldSnapshot = { fragmentCount: 0 };
  private readonly interactionVisuals = new Map<WorldInteractionId, Phaser.GameObjects.Rectangle>();
  private readonly npcRings = new Map<NpcId, Phaser.GameObjects.Ellipse>();
  private readonly npcMarkers = new Map<NpcId, Phaser.GameObjects.Text>();
  private readonly npcQuestStates = new Map<NpcId, NpcQuestState>();
  private readonly npcEyes = new Map<NpcId, readonly [Phaser.GameObjects.Rectangle, Phaser.GameObjects.Rectangle]>();
  private readonly npcEmotions = new Map<NpcId, Phaser.GameObjects.Text>();
  private questArrow!: Phaser.GameObjects.Text;
  private questTarget: GameWorldSnapshot["questTarget"] = null;
  private mobileInput: MovementInput = { up: false, down: false, left: false, right: false };
  private readonly reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

  constructor(
    private readonly host: HTMLDivElement,
    private readonly bridge: GameBridge,
  ) {
    super("peace-village");
  }

  preload() {
    this.load.image("peace-meadow", "/game-assets/peace-meadow-v1.png");
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
      const body = this.add.rectangle(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 0x000000, 0);
      obstacleGroup.add(body);
      this.drawObstacle(obstacle);
    }
    this.createNpcs();
    this.questArrow = this.add.text(0, 0, "➤", {
      color: "#F9D873",
      fontFamily: "monospace",
      fontSize: "34px",
      fontStyle: "bold",
      stroke: "#07101F",
      strokeThickness: 7,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(10000).setVisible(false);
    this.createWorldInteractions();

    this.player = this.physics.add.sprite(PLAYER_START.x, PLAYER_START.y, "player-down-0");
    this.player.setCollideWorldBounds(true);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setSize(18, 16).setOffset(5, 18);
    this.player.setDepth(this.player.y + 30);
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
    this.host.dataset.visualTheme = "pixel-polished-v1";
    this.host.dataset.reducedMotion = String(this.reduceMotion);
    this.host.dataset.playerAnimationFrames = "6";
    this.publishTelemetry(true);
  }

  update() {
    const nearbyNpc = findNearbyNpc(this.player.x, this.player.y);
    const nearbyNpcId = nearbyNpc?.id ?? null;
    if (nearbyNpcId !== this.nearbyNpcId) {
      if (this.nearbyNpcId) this.setNpcHighlight(this.nearbyNpcId, false);
      this.nearbyNpcId = nearbyNpcId;
      if (nearbyNpcId) this.setNpcHighlight(nearbyNpcId, true);
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
      this.updateQuestDirection();
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
    this.player.setDepth(this.player.y + 30);

    if (velocity.x !== 0 || velocity.y !== 0) this.player.anims.play(`walk-${this.facing}`, true);
    else {
      this.player.anims.stop();
      this.player.setTexture(`player-${this.facing}-0`);
    }
    if ((velocity.x !== 0 || velocity.y !== 0) && this.time.now - this.lastStepAt >= 320) {
      this.lastStepAt = this.time.now;
      this.bridge.onPlayerStep?.();
    }
    this.publishTelemetry();
    this.updateQuestDirection();
  }

  setPaused(paused: boolean) {
    this.interactionLocked = paused;
    if (paused && this.player) this.player.setVelocity(0, 0);
    this.host.dataset.paused = String(paused);
  }

  interact() {
    if (this.interactionLocked) return;
    if (this.nearbyNpcId) {
      const npc = NPCS.find((item) => item.id === this.nearbyNpcId);
      if (npc) {
        this.facing = getFacingDirection({ x: npc.x - this.player.x, y: npc.y - this.player.y }, this.facing);
        this.player.anims.stop();
        this.player.setTexture(`player-${this.facing}-0`);
        this.setNpcGaze(this.nearbyNpcId, this.player.x, this.player.y);
        this.host.dataset.dialogueFacing = `${this.facing}:${this.nearbyNpcId}`;
      }
      this.bridge.onNpcInteract(this.nearbyNpcId);
    }
    else if (this.nearbyWorldId) this.bridge.onWorldInteract(this.nearbyWorldId);
  }

  syncWorldState(snapshot: GameWorldSnapshot) {
    this.worldSnapshot = snapshot;
    this.questTarget = snapshot.questTarget ?? null;
    this.host.dataset.fragmentCount = String(snapshot.fragmentCount);
    for (const interaction of WORLD_INTERACTIONS) {
      const visual = this.interactionVisuals.get(interaction.id);
      if (!visual) continue;
      visual.setFillStyle(snapshot.fragmentCount === 5 ? 0xf5c968 : 0x667085, 1);
    }
    NPCS.forEach((npc, index) => {
      const marker = this.npcMarkers.get(npc.id);
      if (!marker) return;
      const fallbackState: NpcQuestState = index < snapshot.fragmentCount
        ? "completed"
        : index === snapshot.fragmentCount ? "available" : "locked";
      const state = snapshot.npcQuestStates?.[npc.id] ?? fallbackState;
      this.npcQuestStates.set(npc.id, state);
      marker.setText(state === "completed" ? "✓" : state === "available" ? "!" : "·");
      marker.setColor(state === "completed" ? "#86E7AF" : state === "available" ? "#F9D873" : "#8B95A7");
      marker.setAlpha(snapshot.nextNpcId === npc.id ? 1 : state === "locked" ? 0.55 : 0.85);
      const emotion = this.npcEmotions.get(npc.id);
      emotion?.setText(state === "completed" ? "★" : state === "available" ? "♪" : "…");
      emotion?.setColor(state === "completed" ? "#86E7AF" : state === "available" ? "#F9D873" : "#8B95A7");
      this.setNpcHighlight(npc.id, npc.id === this.nearbyNpcId);
    });
    this.host.dataset.npcEmotionStates = NPCS.map((npc) => `${npc.id}:${this.npcQuestStates.get(npc.id)}`).join(",");
    this.updateQuestDirection();
  }

  setMobileInput(input: MovementInput) {
    this.mobileInput = input;
  }

  private publishTelemetry(force = false) {
    const x = Math.round(this.player.x);
    const y = Math.round(this.player.y);
    const zone = getZoneAt(x, y)?.id ?? "path";
    if (zone !== this.lastZone) {
      this.lastZone = zone;
      this.bridge.onZoneChange?.(zone);
    }
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
    this.add.tileSprite(0, 0, WORLD_WIDTH, WORLD_HEIGHT, "peace-meadow")
      .setOrigin(0)
      .setTileScale(0.42)
      .setTint(0xa5c99b)
      .setDepth(-20);

    const graphics = this.add.graphics().setDepth(-10);
    graphics.fillStyle(0x081d22, 0.24);
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    for (const zone of WORLD_ZONES) {
      graphics.fillStyle(zone.color, 0.24);
      graphics.fillRect(zone.x, zone.y, zone.width, zone.height);
      graphics.lineStyle(4, 0xf9d873, 0.22);
      graphics.strokeRect(zone.x + 5, zone.y + 5, zone.width - 10, zone.height - 10);
      this.drawZoneBanner(zone.x + 24, zone.y + 22, zone.name, zone.color);
    }

    this.drawRoad(graphics, 890, 0, 140, WORLD_HEIGHT, true);
    this.drawRoad(graphics, 0, 640, WORLD_WIDTH, 140, false);
    this.drawRoad(graphics, 300, 420, 1320, 76, false);
    this.drawRoad(graphics, 300, 820, 1320, 76, false);
    this.drawVillageDetails();

    this.add.text(1080, 772, "평화의 나무  ·  5개의 조각을 모으세요", {
      align: "center",
      color: "#fff2b2",
      fontFamily: "monospace",
      fontSize: "15px",
      fontStyle: "bold",
      backgroundColor: "#10273d",
      padding: { x: 10, y: 6 },
      stroke: "#07101f",
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(780);
  }

  private drawRoad(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number, vertical: boolean) {
    graphics.fillStyle(0x503d2b, 0.65);
    graphics.fillRect(x - 7, y - 7, width + 14, height + 14);
    graphics.fillStyle(0xc9a75b, 1);
    graphics.fillRect(x, y, width, height);
    graphics.fillStyle(0xe5ca7d, 0.75);
    graphics.fillRect(x + 7, y + 7, width - 14, height - 14);
    graphics.lineStyle(3, 0x9a743b, 0.45);
    if (vertical) {
      for (let offset = y + 20; offset < y + height; offset += 34) graphics.lineBetween(x, offset, x + width, offset);
    } else {
      for (let offset = x + 20; offset < x + width; offset += 40) graphics.lineBetween(offset, y, offset, y + height);
    }
  }

  private drawZoneBanner(x: number, y: number, name: string, color: number) {
    this.add.rectangle(x + 68, y + 15, 136, 30, 0x07101f, 0.82).setStrokeStyle(2, 0xf9d873, 0.7).setDepth(3);
    this.add.rectangle(x + 5, y + 15, 8, 40, color).setStrokeStyle(2, 0xf9d873, 0.8).setDepth(4);
    this.add.text(x + 18, y + 4, name, {
      color: "#fff7cf", fontFamily: "monospace", fontSize: "16px", fontStyle: "bold",
    }).setDepth(4);
  }

  private drawVillageDetails() {
    const flowerColors = [0xf9d873, 0xf3a7c5, 0x8edbc4, 0xa8c7ff];
    for (let index = 0; index < 56; index += 1) {
      const x = 70 + ((index * 137) % 1770);
      const y = 90 + ((index * 211) % 1090);
      if ((x > 850 && x < 1070) || (y > 600 && y < 920)) continue;
      const color = flowerColors[index % flowerColors.length];
      this.add.rectangle(x, y, 4, 4, color, 0.9).setDepth(1);
      this.add.rectangle(x, y + 5, 2, 6, 0x245d3d, 0.9).setDepth(1);
    }
    const lamps = [[760, 585], [1160, 585], [760, 795], [1160, 795]];
    for (const [x, y] of lamps) {
      this.add.ellipse(x, y + 18, 28, 10, 0x07101f, 0.25).setDepth(y - 1);
      this.add.rectangle(x, y, 8, 42, 0x2b3148).setStrokeStyle(2, 0x07101f).setDepth(y);
      const glow = this.add.circle(x, y - 22, 12, 0xf9d873, 0.22).setDepth(y + 1);
      this.add.rectangle(x, y - 22, 12, 16, 0xffe89b).setStrokeStyle(3, 0x493f35).setDepth(y + 2);
      if (!this.reduceMotion) this.tweens.add({ targets: glow, alpha: 0.5, scale: 1.25, duration: 1100, yoyo: true, repeat: -1 });
    }
    const benches = [[785, 535], [1135, 535], [785, 850], [1135, 850]];
    for (const [x, y] of benches) {
      this.add.rectangle(x, y + 7, 56, 12, 0x8e5f36).setStrokeStyle(3, 0x3e2b24).setDepth(y);
      this.add.rectangle(x - 21, y + 19, 6, 20, 0x3e2b24).setDepth(y);
      this.add.rectangle(x + 21, y + 19, 6, 20, 0x3e2b24).setDepth(y);
    }
  }

  private drawObstacle(obstacle: (typeof WORLD_OBSTACLES)[number]) {
    const baseDepth = Math.round(obstacle.y + obstacle.height / 2);
    if (obstacle.kind === "building") {
      this.add.ellipse(obstacle.x, obstacle.y + obstacle.height / 2 + 12, obstacle.width + 30, 38, 0x07101f, 0.34).setDepth(baseDepth - 8);
      this.add.rectangle(obstacle.x, obstacle.y + 18, obstacle.width, obstacle.height - 36, obstacle.color)
        .setStrokeStyle(6, 0x263044).setDepth(baseDepth - 7);
      this.add.triangle(obstacle.x, obstacle.y - obstacle.height / 2 - 42, -obstacle.width / 2 - 22, 76, obstacle.width / 2 + 22, 76, 0, -16, 0x4b2940)
        .setStrokeStyle(7, 0x201c30).setDepth(baseDepth - 5);
      for (let windowX = obstacle.x - obstacle.width / 2 + 55; windowX <= obstacle.x + obstacle.width / 2 - 55; windowX += 82) {
        this.add.rectangle(windowX, obstacle.y + 7, 32, 42, 0x9fe4ef).setStrokeStyle(6, 0x263044).setDepth(baseDepth - 4);
        this.add.rectangle(windowX, obstacle.y + 7, 3, 34, 0xeafcff, 0.65).setDepth(baseDepth - 3);
      }
      this.add.rectangle(obstacle.x, obstacle.y + obstacle.height / 2 - 42, 46, 84, 0x563d38).setStrokeStyle(6, 0x201c30).setDepth(baseDepth - 2);
      this.add.circle(obstacle.x + 13, obstacle.y + obstacle.height / 2 - 42, 3, 0xf9d873).setDepth(baseDepth - 1);
      return;
    }
    if (obstacle.kind === "tree") {
      this.add.ellipse(obstacle.x, obstacle.y + 25, 62, 24, 0x07101f, 0.28).setDepth(baseDepth - 5);
      this.add.rectangle(obstacle.x, obstacle.y + 6, 14, 46, 0x6f4930).setStrokeStyle(3, 0x342a24).setDepth(baseDepth - 4);
      this.add.circle(obstacle.x - 20, obstacle.y - 22, 27, 0x1f7047).setStrokeStyle(4, 0x11442f).setDepth(baseDepth + 1);
      this.add.circle(obstacle.x + 19, obstacle.y - 24, 29, 0x2b8a50).setStrokeStyle(4, 0x11442f).setDepth(baseDepth + 1);
      this.add.circle(obstacle.x, obstacle.y - 45, 32, 0x3b9d55).setStrokeStyle(4, 0x11442f).setDepth(baseDepth + 2);
      this.add.rectangle(obstacle.x - 8, obstacle.y - 55, 8, 8, 0x84c96a).setDepth(baseDepth + 3);
      return;
    }
    if (obstacle.kind === "fountain") {
      this.add.ellipse(obstacle.x, obstacle.y + 9, obstacle.width + 24, obstacle.height + 30, 0x263044).setDepth(baseDepth - 6);
      this.add.ellipse(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 0xc5b47b).setStrokeStyle(7, 0x594d3f).setDepth(baseDepth - 5);
      const water = this.add.ellipse(obstacle.x, obstacle.y - 4, obstacle.width - 24, obstacle.height - 28, 0x4fb9d1, 0.95).setDepth(baseDepth - 4);
      this.add.rectangle(obstacle.x, obstacle.y - 25, 24, 58, 0x917e60).setStrokeStyle(4, 0x51473c).setDepth(baseDepth - 3);
      const spray = this.add.ellipse(obstacle.x, obstacle.y - 55, 20, 48, 0xb8f2f2, 0.85).setDepth(baseDepth - 2);
      if (!this.reduceMotion) this.tweens.add({ targets: [water, spray], scaleX: 1.04, alpha: 0.7, duration: 900, yoyo: true, repeat: -1 });
      return;
    }
    this.add.rectangle(obstacle.x, obstacle.y, obstacle.width, obstacle.height, 0x654b32).setStrokeStyle(3, 0x2e2723).setDepth(baseDepth);
    for (let y = obstacle.y - obstacle.height / 2 + 18; y < obstacle.y + obstacle.height / 2; y += 42) {
      this.add.rectangle(obstacle.x, y, 34, 8, 0xb98d50).setStrokeStyle(2, 0x4a3828).setDepth(baseDepth + 1);
    }
  }

  private createPlayerTextures() {
    const directions: Direction[] = ["down", "up", "left", "right"];
    const strides = [0, -2, -1, 0, 1, 2] as const;
    for (const direction of directions) {
      for (let frame = 0; frame < strides.length; frame += 1) {
        const graphics = this.add.graphics();
        const step = strides[frame];
        const bob = frame === 1 || frame === 4 ? -1 : 0;
        graphics.fillStyle(0x07101f, 0.3);
        graphics.fillEllipse(4, 28, 22, 7);
        graphics.fillStyle(0x553326, 1);
        graphics.fillRect(6, 2 + bob, 16, 5);
        graphics.fillStyle(0xf2c7a6, 1);
        graphics.fillRect(7, 6 + bob, 14, 10);
        graphics.fillStyle(0xe7b94f, 1);
        graphics.fillRect(5, 5 + bob, 18, 4);
        graphics.fillStyle(0x3d68b2, 1);
        graphics.fillRect(5, 16 + bob, 18, 11);
        graphics.fillStyle(0xf3d06b, 1);
        graphics.fillRect(5, 16 + bob, 18, 3);
        graphics.fillStyle(0xc8584f, 1);
        graphics.fillRect(direction === "left" ? 18 : 3, 18 + bob + Math.sign(step), 4, 9);
        graphics.fillStyle(0xf2c7a6, 1);
        graphics.fillRect(direction === "right" ? 18 : 3, 18 + bob - Math.sign(step), 4, 7);
        graphics.fillStyle(0xf8fafc, 1);
        if (direction === "down") {
          graphics.fillRect(10, 10 + bob, 2, 2);
          graphics.fillRect(17, 10 + bob, 2, 2);
        } else if (direction === "left") graphics.fillRect(8, 10 + bob, 2, 2);
        else if (direction === "right") graphics.fillRect(19, 10 + bob, 2, 2);
        graphics.fillStyle(0x18243c, 1);
        graphics.fillRect(6 + step, 27 + bob, 6, 8);
        graphics.fillRect(16 - step, 27 + bob, 6, 8);
        graphics.generateTexture(`player-${direction}-${frame}`, 28, 36);
        graphics.destroy();
      }
    }
  }

  private createNpcs() {
    for (const npc of NPCS) {
      const depth = npc.y + 40;
      const ring = this.add.ellipse(npc.x, npc.y + 12, 62, 32, 0xf9d873, 0).setStrokeStyle(4, 0xf9d873, 0).setDepth(depth - 4);
      const shadow = this.add.ellipse(npc.x, npc.y + 20, 42, 14, 0x07101f, 0.38).setDepth(depth - 3);
      const cape = this.add.rectangle(npc.x - 13, npc.y, 8, 34, 0x213451).setStrokeStyle(2, 0x07101f).setDepth(depth - 2);
      const body = this.add.rectangle(npc.x, npc.y, 30, 38, npc.color).setStrokeStyle(4, 0x0d1730).setDepth(depth - 1);
      this.add.rectangle(npc.x, npc.y - 7, 26, 5, 0xf9d873, 0.75).setDepth(depth);
      const head = this.add.rectangle(npc.x, npc.y - 28, 22, 20, 0xf1c7a5).setStrokeStyle(3, 0x0d1730).setDepth(depth);
      const leftEye = this.add.rectangle(npc.x - 4, npc.y - 29, 2, 3, 0x172033).setDepth(depth + 1);
      const rightEye = this.add.rectangle(npc.x + 4, npc.y - 29, 2, 3, 0x172033).setDepth(depth + 1);
      this.add.rectangle(npc.x, npc.y - 38, 25, 7, 0x45302a).setDepth(depth + 1);
      const emotion = this.add.text(npc.x + 27, npc.y - 49, "♪", {
        color: "#F9D873",
        fontFamily: "monospace",
        fontSize: "16px",
        fontStyle: "bold",
        stroke: "#07101F",
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(depth + 2);
      const marker = this.add.text(npc.x, npc.y - 72, "!", {
        color: "#F9D873",
        fontFamily: "monospace",
        fontSize: "22px",
        fontStyle: "bold",
        stroke: "#0D1730",
        strokeThickness: 6,
      }).setOrigin(0.5).setDepth(depth + 2);
      this.add.text(npc.x, npc.y + 33, npc.role, {
        color: "#FFF7CF",
        backgroundColor: "#07101fcc",
        padding: { x: 7, y: 4 },
        fontFamily: "monospace",
        fontSize: "14px",
        fontStyle: "bold",
        stroke: "#0D1730",
        strokeThickness: 2,
      }).setOrigin(0.5, 0).setDepth(depth + 2);
      this.npcRings.set(npc.id, ring);
      this.npcMarkers.set(npc.id, marker);
      this.npcEyes.set(npc.id, [leftEye, rightEye]);
      this.npcEmotions.set(npc.id, emotion);
      if (!this.reduceMotion) {
        this.tweens.add({ targets: [body, head, cape, leftEye, rightEye, marker, emotion, shadow], y: "-=2", duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        this.tweens.add({ targets: emotion, scale: 1.18, duration: 650, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      }
    }
  }

  private setNpcGaze(id: NpcId, playerX: number, playerY: number) {
    const npc = NPCS.find((item) => item.id === id);
    const eyes = this.npcEyes.get(id);
    if (!npc || !eyes) return;
    const xOffset = Phaser.Math.Clamp((playerX - npc.x) / 40, -2, 2);
    const yOffset = Phaser.Math.Clamp((playerY - npc.y) / 70, -1, 1);
    eyes[0].setPosition(npc.x - 4 + xOffset, npc.y - 29 + yOffset);
    eyes[1].setPosition(npc.x + 4 + xOffset, npc.y - 29 + yOffset);
  }

  private setNpcHighlight(id: NpcId, active: boolean) {
    const ring = this.npcRings.get(id);
    if (!ring) return;
    const state = this.npcQuestStates.get(id) ?? "locked";
    const color = state === "completed" ? 0x63d391 : state === "available" ? 0xf9d873 : 0x728096;
    ring.setFillStyle(color, active ? 0.16 : state === "available" ? 0.05 : 0);
    ring.setStrokeStyle(4, color, active ? 1 : state === "available" ? 0.5 : 0.22);
  }

  private updateQuestDirection() {
    if (!this.questArrow || !this.questTarget || !this.cameras.main) return;
    const camera = this.cameras.main;
    const placement = getOffscreenIndicatorPlacement(
      this.questTarget,
      { x: camera.worldView.x, y: camera.worldView.y, width: camera.width, height: camera.height },
    );
    if (!placement) {
      this.questArrow.setVisible(false);
      return;
    }
    this.questArrow.setPosition(placement.x, placement.y).setAngle(placement.angle).setVisible(true);
    this.questArrow.setData("targetLabel", this.questTarget.label);
  }

  private createWorldInteractions() {
    for (const interaction of WORLD_INTERACTIONS) {
      this.add.circle(interaction.x, interaction.y - 8, 54, 0x214f35, 0.9).setStrokeStyle(5, 0x102f28).setDepth(interaction.y - 4);
      this.add.circle(interaction.x - 33, interaction.y - 24, 30, 0x2d7142, 0.95).setStrokeStyle(4, 0x102f28).setDepth(interaction.y - 3);
      this.add.circle(interaction.x + 34, interaction.y - 21, 32, 0x3a8a4d, 0.95).setStrokeStyle(4, 0x102f28).setDepth(interaction.y - 3);
      this.add.rectangle(interaction.x, interaction.y + 35, 18, 68, 0x76503a).setStrokeStyle(4, 0x382d29).setDepth(interaction.y - 2);
      const altar = this.add.rectangle(interaction.x, interaction.y, 54, 54, 0x667085, 1)
        .setStrokeStyle(5, 0xffefb0, 0.9).setAngle(45).setDepth(interaction.y + 1);
      this.interactionVisuals.set(interaction.id, altar);
      if (!this.reduceMotion) this.tweens.add({ targets: altar, angle: 405, duration: 12000, repeat: -1 });
    }
    this.syncWorldState(this.worldSnapshot);
  }

  private createPlayerAnimations() {
    const directions: Direction[] = ["down", "up", "left", "right"];
    for (const direction of directions) {
      this.anims.create({
        key: `walk-${direction}`,
        frames: Array.from({ length: 6 }, (_, frame) => ({ key: `player-${direction}-${frame}` })),
        frameRate: 11,
        repeat: -1,
      });
    }
  }
}

export function mountGame(container: HTMLDivElement, bridge: GameBridge): MountedGame {
  const scene = new PeaceVillageScene(container, bridge);
  const mobileViewport = window.matchMedia("(max-width: 767px)").matches;
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
    scale: { mode: mobileViewport ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
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
