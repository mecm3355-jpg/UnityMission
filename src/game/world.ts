export const WORLD_WIDTH = 1920;
export const WORLD_HEIGHT = 1280;
export const PLAYER_SPEED = 220;
export const PLAYER_START = { x: 960, y: 720 } as const;

export type Direction = "up" | "down" | "left" | "right";
export type ZoneId = "plaza" | "history" | "culture" | "peace" | "cooperation" | "future";

export type WorldZone = {
  id: ZoneId;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
};

export type Obstacle = {
  id: string;
  kind: "building" | "tree" | "fountain" | "fence";
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
};

export const WORLD_ZONES: readonly WorldZone[] = [
  { id: "history", name: "역사 구역", x: 40, y: 40, width: 600, height: 440, color: 0x6d4c41 },
  { id: "culture", name: "문화 구역", x: 1280, y: 40, width: 600, height: 440, color: 0x7b3f72 },
  { id: "plaza", name: "중앙 광장", x: 640, y: 340, width: 640, height: 500, color: 0x587f57 },
  { id: "peace", name: "평화 구역", x: 40, y: 760, width: 600, height: 480, color: 0x365f7d },
  { id: "cooperation", name: "협력 구역", x: 1280, y: 760, width: 600, height: 480, color: 0x3f6b5d },
  { id: "future", name: "미래 구역", x: 640, y: 880, width: 640, height: 360, color: 0x4d4f8c },
] as const;

const TREES: Obstacle[] = [
  [90, 520], [210, 560], [340, 520], [500, 570], [1420, 540], [1570, 570], [1740, 520],
  [690, 100], [820, 120], [1090, 110], [1220, 120], [680, 1160], [1240, 1160],
].map(([x, y], index) => ({
  id: `tree-${index + 1}`,
  kind: "tree",
  x,
  y,
  width: 48,
  height: 48,
  color: 0x2f7d4a,
}));

export const WORLD_OBSTACLES: readonly Obstacle[] = [
  { id: "history-hall", kind: "building", x: 300, y: 220, width: 360, height: 230, color: 0x8d6654 },
  { id: "culture-hall", kind: "building", x: 1620, y: 220, width: 360, height: 230, color: 0x995789 },
  { id: "peace-hall", kind: "building", x: 300, y: 1010, width: 330, height: 210, color: 0x417ca2 },
  { id: "cooperation-lab", kind: "building", x: 1620, y: 1010, width: 330, height: 210, color: 0x4b846f },
  { id: "future-tower", kind: "building", x: 960, y: 1100, width: 360, height: 170, color: 0x686bb0 },
  { id: "peace-fountain", kind: "fountain", x: 960, y: 590, width: 170, height: 110, color: 0x58a6c7 },
  { id: "west-fence", kind: "fence", x: 625, y: 255, width: 22, height: 270, color: 0xb79a69 },
  { id: "east-fence", kind: "fence", x: 1295, y: 255, width: 22, height: 270, color: 0xb79a69 },
  ...TREES,
] as const;

export type MovementInput = { up: boolean; down: boolean; left: boolean; right: boolean };
export type Velocity = { x: number; y: number };

export function getMovementVelocity(input: MovementInput, speed = PLAYER_SPEED): Velocity {
  const horizontal = Number(input.right) - Number(input.left);
  const vertical = Number(input.down) - Number(input.up);
  if (horizontal === 0 && vertical === 0) return { x: 0, y: 0 };
  const magnitude = Math.hypot(horizontal, vertical);
  return { x: (horizontal / magnitude) * speed, y: (vertical / magnitude) * speed };
}

export function getFacingDirection(velocity: Velocity, previous: Direction = "down"): Direction {
  if (velocity.x === 0 && velocity.y === 0) return previous;
  if (Math.abs(velocity.x) > Math.abs(velocity.y)) return velocity.x < 0 ? "left" : "right";
  return velocity.y < 0 ? "up" : "down";
}

export function getZoneAt(x: number, y: number): WorldZone | undefined {
  return WORLD_ZONES.find(
    (zone) => x >= zone.x && x <= zone.x + zone.width && y >= zone.y && y <= zone.y + zone.height,
  );
}

export function getOffscreenIndicatorPlacement(
  target: { x: number; y: number },
  camera: { x: number; y: number; width: number; height: number },
  margin = 58,
): { x: number; y: number; angle: number } | null {
  const screenX = target.x - camera.x;
  const screenY = target.y - camera.y;
  const onScreen = screenX >= margin && screenX <= camera.width - margin
    && screenY >= margin && screenY <= camera.height - margin;
  if (onScreen) return null;
  const centerX = camera.width / 2;
  const centerY = camera.height / 2;
  return {
    x: Math.max(margin, Math.min(camera.width - margin, screenX)),
    y: Math.max(margin, Math.min(camera.height - margin, screenY)),
    angle: Math.atan2(screenY - centerY, screenX - centerX) * (180 / Math.PI),
  };
}

export function pointInsideObstacle(x: number, y: number, padding = 0): boolean {
  return WORLD_OBSTACLES.some(
    (obstacle) =>
      x >= obstacle.x - obstacle.width / 2 - padding &&
      x <= obstacle.x + obstacle.width / 2 + padding &&
      y >= obstacle.y - obstacle.height / 2 - padding &&
      y <= obstacle.y + obstacle.height / 2 + padding,
  );
}
