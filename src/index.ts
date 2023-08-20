import { initKeys, KEY_A, KEY_D, KEY_DOWN, KEY_LEFT, KEY_RIGHT, KEY_S, KEY_UP, KEY_W, keys, updateKeys } from "./keys";
import { initMouse, mouse, updateMouse } from "./mouse";
import { music } from "./music";
import { zzfx, zzfxP } from "./zzfx";

const DEBUG = process.env.NODE_ENV !== "production";
const debug = DEBUG ? console.log : () => {};

const WIDTH = 480;
const HEIGHT = 270;
const CENTER_X = WIDTH / 2;
const CENTER_Y = HEIGHT / 2;

const ENTITY_TYPE_PLAYER = 0;
const ENTITY_TYPE_BULLET = 1;
const ENTITY_TYPE_SNAKE = 2;
const ENTITY_TYPE_SPIDER = 3;
const ENTITY_TYPE_GEM = 6;

const PLAYER_SPEED = 1;
const BULLET_SPEED = 2;
const SPIDER_SPEED = 0.5;

const MAX_ENTITIES = 2000;

type EntityId = number;

const canvas = document.querySelector("#c") as HTMLCanvasElement;
const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

const image = new Image();
image.src = "i.png";

const entityIdFreeList = [] as number[];
const entities = [] as EntityId[];
let nextFreeEntityId = 0;
const entityData = {
  entityType: new Uint8Array(MAX_ENTITIES),
  x: new Float32Array(MAX_ENTITIES),
  y: new Float32Array(MAX_ENTITIES),
  dx: new Float32Array(MAX_ENTITIES),
  dy: new Float32Array(MAX_ENTITIES),
  health: new Int32Array(MAX_ENTITIES),
  cooldown: new Int32Array(MAX_ENTITIES),
} as const;

const player: EntityId = createEntity(ENTITY_TYPE_PLAYER, CENTER_X, CENTER_Y);

const startTime = Date.now();

let time = 0;
let score = 0;
let musicStarted = false;
// let threshold = 0;

initKeys(canvas);
initMouse(canvas);

function createEntity(_entityType: number, _x: number, _y: number, _dx = 0, _dy = 0, _health = 100): EntityId {
  let entityId: EntityId;
  if (entityIdFreeList.length === 0) {
    if (nextFreeEntityId === MAX_ENTITIES) {
      DEBUG && debug("EXCEEDED MAX ENTITIES");
      return -1;
    }
    entityId = nextFreeEntityId++;
  } else {
    entityId = entityIdFreeList.pop()!;
  }

  const { entityType, x, y, dx, dy, health, cooldown } = entityData;
  entityType[entityId] = _entityType;
  x[entityId] = _x;
  y[entityId] = _y;
  dx[entityId] = _dx;
  dy[entityId] = _dy;
  health[entityId] = _health;
  cooldown[entityId] = 0;

  entities.push(entityId);

  return entityId;
}

// function randomEnemy(): void {
//   const entityType = Math.random() < 0.5 ? ENTITY_TYPE_SNAKE : ENTITY_TYPE_SPIDER;
//   const theta = Math.random() * Math.PI * 2;
//   const x = CENTER_X + Math.cos(theta) * CENTER_X * 1.5;
//   const y = CENTER_Y + Math.sin(theta) * CENTER_X * 1.5;
//   createEntity(entityType, x, y);
// }

function gameLoop(): void {
  if (entityData.health[player] > 0) {
    time = (Date.now() - startTime) / 1000;

    // At t=0, randomness = 0.01
    // At t=60, randomness = 0.1
    // threshold = 0.01 + time * 0.001;
    // if (Math.random() < threshold) {
    //   randomEnemy();
    // }

    updateKeys();
    updateMouse();
    handleInput();
    runSystems();
    collisionDetection();
  }
}

function handleInput(): void {
  const { x, y } = entityData;
  if (!musicStarted && mouse.buttons[0].down) {
    musicStarted = true;
    zzfxP(...music).loop = true;
  }
  if (keys[KEY_UP].down || keys[KEY_W].down) {
    y[player] -= PLAYER_SPEED;
  }
  if (keys[KEY_LEFT].down || keys[KEY_A].down) {
    x[player] -= PLAYER_SPEED;
  }
  if (keys[KEY_DOWN].down || keys[KEY_S].down) {
    y[player] += PLAYER_SPEED;
  }
  if (keys[KEY_RIGHT].down || keys[KEY_D].down) {
    x[player] += PLAYER_SPEED;
  }
  if (mouse.buttons[0].down) {
    const targetX = (mouse.x / canvas.offsetWidth) * WIDTH;
    const targetY = (mouse.y / canvas.offsetHeight) * HEIGHT;
    shoot(player, targetX, targetY, true);
  }
}

function shoot(shooter: EntityId, targetX: number, targetY: number, sound = false): void {
  const { cooldown, x, y } = entityData;
  if (cooldown[shooter] <= 0) {
    const dist = Math.hypot(targetX - x[shooter], targetY - y[shooter]);
    createEntity(
      ENTITY_TYPE_BULLET,
      x[shooter],
      y[shooter],
      ((targetX - x[shooter]) / dist) * BULLET_SPEED,
      ((targetY - y[shooter]) / dist) * BULLET_SPEED,
      100,
    );
    cooldown[shooter] = 10;
    if (sound) {
      /* eslint-disable-next-line no-sparse-arrays */
      zzfx(...[, , 90, , 0.01, 0.03, 4, , , , , , , 9, 50, 0.2, , 0.2, 0.01]);
    }
  }
}

function runSystems(): void {
  const { x, y, dx, dy, cooldown, entityType, health } = entityData;

  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i];
    x[entity] += dx[entity];
    y[entity] += dy[entity];
    if (cooldown[entity] > 0) cooldown[entity]--;

    switch (entityType[entity]) {
      case ENTITY_TYPE_SNAKE:
      case ENTITY_TYPE_SPIDER:
        attackAi(entity);
        break;
      case ENTITY_TYPE_BULLET:
        health[entity] -= 0.5;
        break;
      default:
    }

    if (health[entity] <= 0) {
      // Clear out dead entities
      entities.splice(i, 1);
      entityIdFreeList.push(entity);
    }
  }

  // sort free list... intuition is that you can keep reusing indices in order which should lead to better caching
  // this is not proven though...
  entityIdFreeList.sort((a: number, b: number) => b - a);
}

function attackAi(e: EntityId): void {
  const { x, y } = entityData;
  const dx = x[player] - x[e];
  const dy = y[player] - y[e];
  const dist = Math.hypot(dx, dy);
  x[e] += (dx / dist) * SPIDER_SPEED;
  y[e] += (dy / dist) * SPIDER_SPEED;
}

function collisionDetection(): void {
  const { entityType, health } = entityData;
  for (const entity of entities) {
    for (const other of entities) {
      if (entity !== other && distance(entity, other) < 8) {
        if (
          entityType[entity] === ENTITY_TYPE_BULLET &&
          (entityType[other] === ENTITY_TYPE_SNAKE || entityType[other] === ENTITY_TYPE_SPIDER)
        ) {
          health[entity] = 0; // Kill the bullet
          entityType[other] = ENTITY_TYPE_GEM; // Turn the bullet into a gem
          /* eslint-disable-next-line no-sparse-arrays */
          zzfx(...[0.4, , 368, 0.01, 0.1, 0.3, 4, 0.31, , , , , , 1.7, , 0.4, , 0.46, 0.1]);
        }
        if (
          entity === player &&
          (entityType[other] === ENTITY_TYPE_SNAKE || entityType[other] === ENTITY_TYPE_SPIDER)
        ) {
          health[entity] -= 10; // Hurt the player
          health[other] = 0; // Remove the enemy
          if (health[player] <= 0) {
            // Game over
            /* eslint-disable-next-line no-sparse-arrays */
            zzfx(...[2.89, , 752, 0.04, 0.4, 0.44, 1, 1.39, 1, , , , 0.15, 1.3, 19, 0.9, 0.32, 0.39, 0.15, 0.31]);
          } else {
            // Just a flesh wound

            /* eslint-disable-next-line no-sparse-arrays */
            zzfx(...[2, , 433, 0.01, 0.06, 0.11, 1, 2.79, 7.7, -8.6, , , , 1.7, , 0.4, , 0.54, 0.05]);
          }
        }
        if (entity === player && entityType[other] === ENTITY_TYPE_GEM) {
          score += 100;
          health[other] = 0;
          /* eslint-disable-next-line no-sparse-arrays */
          zzfx(...[, , 1267, 0.01, 0.09, 0.15, , 1.95, , , 412, 0.06, , , , , , 0.45, 0.02]);
        }
      }
    }
  }
}

function render(): void {
  const { entityType, health, x, y } = entityData;

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const entity of entities) {
    ctx.drawImage(image, entityType[entity] * 8, 8, 8, 8, x[entity] | 0, y[entity] | 0, 8, 8);
  }

  drawString("HEALTH  " + health[player], 4, 5);
  drawString("SCORE   " + score, 4, 15);
  drawString("TIME    " + (time | 0), 4, 25);

  drawString("ARROW KEYS OR WASD TO MOVE", 4, 250);
  drawString("LEFT CLICK TO SHOOT", 4, 260);
}

function drawString(str: string, x: number, y: number): void {
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);
    const charIndex = charCode < 65 ? charCode - 48 : charCode - 55;
    ctx.drawImage(image, charIndex * 6, 0, 6, 6, x, y, 6, 6);
    x += 6;
  }
}

const distance = (a: EntityId, b: EntityId): number => {
  const { x, y } = entityData;
  return Math.hypot(x[a] - x[b], y[a] - y[b]);
};

function renderWithGameUpdate(): void {
  gameLoop();
  render();
  requestAnimationFrame(renderWithGameUpdate);
}

setInterval(() => {
  console.log(`Entities: ${entities}`);
  console.log(`Free list: ${entityIdFreeList}`);
}, 2000);

requestAnimationFrame(renderWithGameUpdate);
