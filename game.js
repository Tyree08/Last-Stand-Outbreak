
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";

const root = document.getElementById("game-root");
const menu = document.getElementById("menu");
const hud = document.getElementById("hud");
const pauseScreen = document.getElementById("pause-screen");
const endScreen = document.getElementById("end-screen");
const $ = (id) => document.getElementById(id);

let scene, camera, renderer, clock;
let player, playerBody, playerHead, ground;
let zombies = [], supplies = [], obstacles = [];
let keys = {};

let running = false;
let paused = false;
let ended = false;

let health = 100;
let stamina = 100;
let score = 0;
let collected = 0;

let difficulty = "normal";
let character = "soldier";

let yaw = 0;
let pitch = -0.16;
let playerSpeed = 4.2;

let pulseCooldown = 0;
let damageCooldown = 0;
let elapsed = 0;

const requiredSupplies = 5;
const worldBounds = 37;

let extraction;

const difficultySettings = {
  easy: {
    zombieSpeed: 1.45,
    damage: 7,
    count: 4
  },

  normal: {
    zombieSpeed: 1.9,
    damage: 10,
    count: 6
  },

  hard: {
    zombieSpeed: 2.35,
    damage: 13,
    count: 8
  },

  nightmare: {
    zombieSpeed: 2.8,
    damage: 17,
    count: 10
  }
};

// ------------------------------------
// MATERIALS AND OBJECT CREATION
// ------------------------------------

function makeMaterial(color, roughness = 0.9) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness
  });
}

function addBox(parent, x, y, z, sx, sy, sz, material) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(sx, sy, sz),
    material
  );

  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  parent.add(mesh);

  return mesh;
}

// ------------------------------------
// CREATE THE CITY ENVIRONMENT
// ------------------------------------

function createWorld() {
  scene = new THREE.Scene();

  scene.background = new THREE.Color(0x11191a);

  scene.fog = new THREE.FogExp2(
    0x11191a,
    0.018
  );

  camera = new THREE.PerspectiveCamera(
    66,
    innerWidth / innerHeight,
    0.1,
    180
  );

  renderer = new THREE.WebGLRenderer({
    antialias: true
  });

  renderer.setPixelRatio(
    Math.min(devicePixelRatio, 1.7)
  );

  renderer.setSize(
    innerWidth,
    innerHeight
  );

  renderer.shadowMap.enabled = true;

  renderer.shadowMap.type =
    THREE.PCFSoftShadowMap;

  renderer.outputColorSpace =
    THREE.SRGBColorSpace;

  root.querySelector("canvas")?.remove();

  root.prepend(renderer.domElement);

  // Lighting

  scene.add(
    new THREE.HemisphereLight(
      0xaebbb5,
      0x202522,
      1.15
    )
  );

  const moon = new THREE.DirectionalLight(
    0xd7e0d9,
    2.0
  );

  moon.position.set(-16, 28, 12);
  moon.castShadow = true;

  moon.shadow.mapSize.set(1024, 1024);

  scene.add(moon);

  // Ground

  const groundMat = makeMaterial(0x303936);

  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    groundMat
  );

  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;

  scene.add(ground);

  // Main road

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(13, 100),
    makeMaterial(0x202827)
  );

  road.rotation.x = -Math.PI / 2;
  road.position.y = 0.015;

  scene.add(road);

  // Road markings

  const lineMat = makeMaterial(0x8b8060);

  for (let z = -42; z <= 42; z += 8) {
    addBox(
      scene,
      0,
      0.035,
      z,
      0.16,
      0.025,
      3.2,
      lineMat
    );
  }

  // Buildings

  const buildingMat = [
    0x333b39,
    0x424743,
    0x293331,
    0x4a4940
  ].map(c => makeMaterial(c));

  for (let i = 0; i < 24; i++) {
    const side = i % 2 === 0 ? -1 : 1;

    const z =
      -38 +
      Math.floor(i / 2) * 6.5 +
      Math.random() * 2;

    const x = side * (11 + Math.random() * 7);

    const w = 4 + Math.random() * 5;
    const h = 5 + Math.random() * 11;
    const d = 4 + Math.random() * 5;

    const building = addBox(
      scene,
      x,
      h / 2,
      z,
      w,
      h,
      d,
      buildingMat[i % buildingMat.length]
    );

    building.userData.isObstacle = true;

    obstacles.push({
      x,
      z,
      radius: Math.max(w, d) * 0.48
    });

    // Windows

    const windowMat =
      new THREE.MeshStandardMaterial({
        color: 0x9a916c,
        emissive: 0x40351e,
        emissiveIntensity: 0.28
      });

    for (let wy = 1.8; wy < h - 1; wy += 2.6) {
      for (
        let wx = -w / 2 + 0.8;
        wx < w / 2 - 0.3;
        wx += 1.5
      ) {
        const win = new THREE.Mesh(
          new THREE.PlaneGeometry(0.65, 0.9),
          windowMat
        );

        win.position.set(
          x + wx,
          wy,
          z + d / 2 + 0.02
        );

        scene.add(win);
      }
    }
  }

  // Street lamps

  for (let z = -30; z <= 30; z += 15) {
    for (const side of [-1, 1]) {
      const x = side * 8.5;

      addBox(
        scene,
        x,
        2.4,
        z,
        0.18,
        4.8,
        0.18,
        makeMaterial(0x161c1b)
      );

      const lamp = new THREE.PointLight(
        0xb7b18c,
        0.65,
        10
      );

      lamp.position.set(x, 4.5, z);

      scene.add(lamp);
    }
  }

  // Abandoned cars

  for (let i = 0; i < 5; i++) {
    const z = -25 + i * 12;
    const x = i % 2 ? 6.4 : -6.4;

    const car = addBox(
      scene,
      x,
      0.7,
      z,
      2.5,
      1.25,
      4.2,
      makeMaterial(0x343e43)
    );

    car.rotation.y =
      (Math.random() - 0.5) * 0.15;

    addBox(
      scene,
      x,
      1.35,
      z,
      1.8,
      0.7,
      2.0,
      makeMaterial(0x1d292c)
    );

    obstacles.push({
      x,
      z,
      radius: 1.6
    });
  }
}

// ------------------------------------
// CREATE THE PLAYER
// ------------------------------------

function createPlayer() {
  player = new THREE.Group();

  playerBody = new THREE.Mesh(
    new THREE.CapsuleGeometry(
      0.42,
      0.9,
      4,
      8
    ),
    makeMaterial(
      character === "soldier"
        ? 0x46574c
        : 0x6d6251
    )
  );

  playerBody.position.y = 1.05;
  playerBody.castShadow = true;

  player.add(playerBody);

  playerHead = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.28,
      14,
      12
    ),
    makeMaterial(0xb18b70)
  );

  playerHead.position.y = 1.85;
  playerHead.castShadow = true;

  player.add(playerHead);

  addBox(
    player,
    0,
    1.05,
    0.42,
    0.52,
    0.68,
    0.28,
    makeMaterial(
      character === "soldier"
        ? 0x293b31
        : 0x544a3c
    )
  );

  player.position.set(0, 0, 31);

  scene.add(player);
}

// ------------------------------------
// CREATE INFECTED ENEMIES
// ------------------------------------

function createZombie(x, z) {
  const group = new THREE.Group();

  const skin = makeMaterial(0x667267);
  const dark = makeMaterial(0x353d38);

  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(
      0.42,
      0.75,
      3,
      7
    ),
    dark
  );

  torso.position.y = 1.05;
  torso.castShadow = true;

  group.add(torso);

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(
      0.29,
      12,
      10
    ),
    skin
  );

  head.position.y = 1.78;
  head.castShadow = true;

  group.add(head);

  const armGeo = new THREE.CapsuleGeometry(
    0.13,
    0.65,
    3,
    6
  );

  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      armGeo,
      skin
    );

    arm.position.set(
      side * 0.48,
      1.05,
      -0.05
    );

    arm.rotation.z = side * -0.25;

    group.add(arm);
  }

  group.position.set(x, 0, z);

  group.userData = {
    speed:
      difficultySettings[difficulty].zombieSpeed *
      (0.82 + Math.random() * 0.35),

    stunned: 0,
    wander: Math.random() * 6
  };

  scene.add(group);

  zombies.push(group);
}

// ------------------------------------
// CREATE SUPPLY CASES
// ------------------------------------

function createSupply(x, z) {
  const group = new THREE.Group();

  const crate = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.7, 0.8),
    makeMaterial(0x8b7049)
  );

  crate.position.y = 0.4;
  crate.castShadow = true;

  group.add(crate);

  const cross = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.72, 0.06),
    makeMaterial(0xc8c7b2)
  );

  cross.position.set(0, 0.78, 0);

  group.add(cross);

  const cross2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.48, 0.12, 0.06),
    makeMaterial(0xc8c7b2)
  );

  cross2.position.set(0, 0.78, 0);

  group.add(cross2);

  group.position.set(x, 0, z);

  group.userData.type = "supply";

  scene.add(group);

  supplies.push(group);
}

// ------------------------------------
// CREATE EXTRACTION POINT
// ------------------------------------

function makeExtraction() {
  extraction = new THREE.Group();

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(
      2.1,
      0.12,
      8,
      36
    ),
    new THREE.MeshStandardMaterial({
      color: 0x72b98a,
      emissive: 0x235c37,
      emissiveIntensity: 1.1
    })
  );

  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.15;

  extraction.add(ring);

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(
      1.8,
      1.8,
      4,
      24,
      1,
      true
    ),
    new THREE.MeshBasicMaterial({
      color: 0x4da879,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide
    })
  );

  beam.position.y = 2;

  extraction.add(beam);

  extraction.position.set(0, 0, -34);
  extraction.visible = false;

  scene.add(extraction);
}

// ------------------------------------
// RESET AND START GAME
// ------------------------------------

function resetGame() {
  zombies.forEach(z => scene?.remove(z));
  supplies.forEach(s => scene?.remove(s));

  zombies = [];
  supplies = [];
  obstacles = [];

  extraction = null;

  health = character === "soldier" ? 110 : 100;
  stamina = 100;
  score = 0;
  collected = 0;

  elapsed = 0;
  yaw = 0;
  pitch = -0.16;

  pulseCooldown = 0;
  damageCooldown = 0;

  $("objective").textContent =
    "Collect 5 supply cases";

  $("status-message").textContent =
    "Find supplies. Avoid the infected.";

  createWorld();
  createPlayer();

  const count =
    difficultySettings[difficulty].count;

  for (let i = 0; i < count; i++) {
    const angle =
      (i / count) * Math.PI * 2;

    createZombie(
      Math.cos(angle) * (13 + Math.random() * 8),
      Math.sin(angle) * (13 + Math.random() * 8)
    );
  }

  const positions = [
    [-15, 22],
    [14, 17],
    [-17, -5],
    [16, -13],
    [0, -28],
    [5, 4],
    [-9, -20]
  ];

  positions.forEach(([x, z]) => {
    createSupply(x, z);
  });

  updateHUD();

  clock = new THREE.Clock();

  running = true;
  paused = false;
  ended = false;

  menu.classList.add("hidden");
  pauseScreen.classList.add("hidden");
  endScreen.classList.add("hidden");

  hud.classList.remove("hidden");

  renderer.domElement.addEventListener(
    "click",
    requestLock
  );

  makeExtraction();

  animate();
}

// ------------------------------------
// MOUSE AND KEYBOARD CONTROLS
// ------------------------------------

function requestLock() {
  if (
    running &&
    !paused &&
    !ended &&
    document.pointerLockElement !== renderer.domElement
  ) {
    renderer.domElement.requestPointerLock?.();
  }
}

document.addEventListener(
  "pointerlockchange",
  () => {
    if (
      document.pointerLockElement !== renderer?.domElement &&
      running &&
      !paused &&
      !ended
    ) {
      // Mouse control is released.
    }
  }
);

document.addEventListener(
  "mousemove",
  (event) => {
    if (
      document.pointerLockElement === renderer?.domElement &&
      running &&
      !paused
    ) {
      yaw -= event.movementX * 0.0025;

      pitch = THREE.MathUtils.clamp(
        pitch - event.movementY * 0.0018,
        -0.65,
        0.25
      );
    }
  }
);

document.addEventListener(
  "keydown",
  (event) => {
    keys[event.code] = true;

    if (
      event.code === "Escape" &&
      running &&
      !ended
    ) {
      if (!paused) {
        pauseGame();
      } else {
        resumeGame();
      }
    }

    if (
      event.code === "KeyE" &&
      running &&
      !paused
    ) {
      collectNearby();
    }
  }
);

document.addEventListener(
  "keyup",
  (event) => {
    keys[event.code] = false;
  }
);

document.addEventListener(
  "mousedown",
  (event) => {
    if (
      event.button === 0 &&
      running &&
      !paused &&
      !ended
    ) {
      usePulse();
    }
  }
);

// ------------------------------------
// DEFENSIVE PLAYER PULSE
// ------------------------------------

function usePulse() {
  if (pulseCooldown > 0) return;

  pulseCooldown = 2.6;

  let affected = 0;

  for (const z of zombies) {
    const distance =
      z.position.distanceTo(player.position);

    if (distance < 8) {
      const away = z.position
        .clone()
        .sub(player.position)
        .setY(0)
        .normalize();

      z.position.add(
        away.multiplyScalar(3.8)
      );

      z.userData.stunned = 1.1;

      affected++;
    }
  }

  if (affected) {
    score += affected * 15;

    $("status-message").textContent =
      "Pulse emitted — infected pushed back!";
  } else {
    $("status-message").textContent =
      "Pulse emitted — no infected nearby.";
  }

  updateHUD();
}

// ------------------------------------
// COLLECT SUPPLIES
// ------------------------------------

function collectNearby() {
  let nearest = null;
  let best = 2.5;

  for (const item of supplies) {
    const d =
      item.position.distanceTo(player.position);

    if (d < best) {
      best = d;
      nearest = item;
    }
  }

  if (!nearest) return;

  scene.remove(nearest);

  supplies = supplies.filter(
    s => s !== nearest
  );

  collected++;

  score += 100;

  if (character === "doctor") {
    health = Math.min(100, health + 12);
  }

  $("status-message").textContent =
    character === "doctor"
      ? "Medical supplies found. Health restored."
      : "Supply case secured.";

  $("objective").textContent =
    `Collect ${requiredSupplies} supply cases`;

  updateHUD();

  if (collected >= requiredSupplies) {
    $("objective").textContent =
      "Reach the extraction point";

    $("status-message").textContent =
      "All supplies found. Reach the green extraction marker!";

    extraction.visible = true;
  }
}

// ------------------------------------
// UPDATE HUD
// ------------------------------------

function updateHUD() {
  const maxHealth =
    character === "soldier" ? 110 : 100;

  $("health-value").textContent =
    Math.max(0, Math.ceil(health));

  $("stamina-value").textContent =
    Math.ceil(stamina);

  $("health-fill").style.width =
    `${Math.max(0, health / maxHealth * 100)}%`;

  $("stamina-fill").style.width =
    `${Math.max(0, stamina)}%`;

  $("supply-count").textContent =
    `${collected} / ${requiredSupplies}`;

  $("score-value").textContent = score;
}

// ------------------------------------
// PAUSE AND RESUME
// ------------------------------------

function pauseGame() {
  paused = true;

  pauseScreen.classList.remove("hidden");

  document.exitPointerLock?.();
}

function resumeGame() {
  paused = false;

  pauseScreen.classList.add("hidden");
}

// ------------------------------------
// MISSION RESULTS
// ------------------------------------

function finishGame(won) {
  ended = true;
  running = false;

  document.exitPointerLock?.();

  hud.classList.add("hidden");

  $("end-eyebrow").textContent =
    won
      ? "CITY DISTRICT — COMPLETE"
      : "SIGNAL LOST";

  $("end-title").textContent =
    won
      ? "YOU SURVIVED"
      : "MISSION FAILED";

  $("end-message").textContent =
    won
      ? "You secured the supplies and reached extraction. The fight for the city is not over."
      : "The infected overwhelmed your position. Regroup and try again.";

  $("final-score").textContent =
    score + (won ? 250 : 0);

  endScreen.classList.remove("hidden");
}

// ------------------------------------
// PLAYER MOVEMENT
// ------------------------------------

function updatePlayer(dt) {
  const forward = new THREE.Vector3(
    -Math.sin(yaw),
    0,
    -Math.cos(yaw)
  );

  const right = new THREE.Vector3(
    Math.cos(yaw),
    0,
    -Math.sin(yaw)
  );

  const direction = new THREE.Vector3();

  if (keys.KeyW || keys.ArrowUp) {
    direction.add(forward);
  }

  if (keys.KeyS || keys.ArrowDown) {
    direction.sub(forward);
  }

  if (keys.KeyD || keys.ArrowRight) {
    direction.add(right);
  }

  if (keys.KeyA || keys.ArrowLeft) {
    direction.sub(right);
  }

  if (direction.lengthSq() > 0) {
    direction.normalize();
  }

  const sprinting =
    (keys.ShiftLeft || keys.ShiftRight) &&
    stamina > 1 &&
    direction.lengthSq() > 0;

  const speed =
    playerSpeed * (sprinting ? 1.65 : 1);

  if (sprinting) {
    stamina = Math.max(
      0,
      stamina - 30 * dt
    );
  } else {
    stamina = Math.min(
      100,
      stamina + 18 * dt
    );
  }

  player.position.addScaledVector(
    direction,
    speed * dt
  );

  player.position.x = THREE.MathUtils.clamp(
    player.position.x,
    -worldBounds,
    worldBounds
  );

  player.position.z = THREE.MathUtils.clamp(
    player.position.z,
    -worldBounds,
    worldBounds
  );

  player.rotation.y = yaw;

  // Jumping

  if (
    keys.Space &&
    player.position.y <= 0.001
  ) {
    player.userData.jump = 5.4;
  }

  if (
    player.userData.jump > 0 ||
    player.position.y > 0
  ) {
    player.userData.jump -= 13 * dt;

    player.position.y = Math.max(
      0,
      player.position.y +
      player.userData.jump * dt
    );

    if (player.position.y === 0) {
      player.userData.jump = 0;
    }
  }
}

// ------------------------------------
// ZOMBIE AI
// ------------------------------------

function updateZombies(dt) {
  const settings =
    difficultySettings[difficulty];

  for (const z of zombies) {
    if (z.userData.stunned > 0) {
      z.userData.stunned -= dt;
      continue;
    }

    const toPlayer =
      player.position.clone().sub(z.position);

    toPlayer.y = 0;

    const distance = toPlayer.length();

    if (distance > 0.001) {
      toPlayer.normalize();

      z.position.addScaledVector(
        toPlayer,
        z.userData.speed * dt
      );

      z.rotation.y = Math.atan2(
        toPlayer.x,
        toPlayer.z
      );
    }

    z.position.x = THREE.MathUtils.clamp(
      z.position.x,
      -worldBounds,
      worldBounds
    );

    z.position.z = THREE.MathUtils.clamp(
      z.position.z,
      -worldBounds,
      worldBounds
    );

    // Player takes damage when an infected gets close.

    if (
      distance < 1.35 &&
      damageCooldown <= 0
    ) {
      health -=
        settings.damage *
        (character === "soldier" ? 0.82 : 1);

      damageCooldown = 0.9;

      $("status-message").textContent =
        "An infected has reached you — create distance!";

      updateHUD();

      if (health <= 0) {
        finishGame(false);
      }
    }
  }
}

// ------------------------------------
// THIRD-PERSON CAMERA
// ------------------------------------

function updateCamera() {
  const target = player.position
    .clone()
    .add(new THREE.Vector3(0, 1.45, 0));

  const distance = 7.5;

  const horizontal =
    Math.cos(pitch) * distance;

  camera.position.set(
    target.x + Math.sin(yaw) * horizontal,
    target.y + 2.3 + Math.sin(-pitch) * distance,
    target.z + Math.cos(yaw) * horizontal
  );

  camera.lookAt(target);
}

// ------------------------------------
// EXTRACTION CHECK
// ------------------------------------

function updateExtraction() {
  if (
    !extraction?.visible ||
    collected < requiredSupplies
  ) {
    return;
  }

  if (
    player.position.distanceTo(
      extraction.position
    ) < 3.2
  ) {
    finishGame(true);
  }
}

// ------------------------------------
// MAIN GAME LOOP
// ------------------------------------

function animate() {
  if (!running) return;

  requestAnimationFrame(animate);

  if (paused || ended) return;

  const dt = Math.min(
    clock.getDelta(),
    0.04
  );

  elapsed += dt;

  pulseCooldown = Math.max(
    0,
    pulseCooldown - dt
  );

  damageCooldown = Math.max(
    0,
    damageCooldown - dt
  );

  updatePlayer(dt);

  updateZombies(dt);

  if (ended) return;

  updateCamera();

  updateExtraction();

  if (ended) return;

  if (extraction?.visible) {
    extraction.rotation.y += dt * 0.5;
  }

  supplies.forEach((s, i) => {
    s.rotation.y += dt * 0.55;

    s.position.y =
      Math.sin(elapsed * 2 + i) * 0.08;
  });

  renderer.render(scene, camera);

  const nearSupply = supplies.some(
    s =>
      s.position.distanceTo(player.position) < 2.5
  );

  $("interaction-hint").textContent =
    nearSupply
      ? "PRESS E TO COLLECT SUPPLIES"
      : pulseCooldown > 0
        ? `PULSE RECHARGING: ${pulseCooldown.toFixed(1)}s`
        : "CLICK TO EMIT A DEFENSIVE PULSE";
}

// ------------------------------------
// SCREEN RESIZING
// ------------------------------------

function onResize() {
  if (!camera || !renderer) return;

  camera.aspect =
    innerWidth / innerHeight;

  camera.updateProjectionMatrix();

  renderer.setSize(
    innerWidth,
    innerHeight
  );
}

window.addEventListener(
  "resize",
  onResize
);

// ------------------------------------
// MENU BUTTONS
// ------------------------------------

$("start-button").addEventListener(
  "click",
  () => {
    character = $("character").value;
    difficulty = $("difficulty").value;

    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
    }

    resetGame();
  }
);

$("resume-button").addEventListener(
  "click",
  resumeGame
);

$("restart-button").addEventListener(
  "click",
  () => {
    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
    }

    resetGame();
  }
);

$("menu-button").addEventListener(
  "click",
  () => {
    running = false;
    paused = false;
    ended = false;

    document.exitPointerLock?.();

    hud.classList.add("hidden");
    pauseScreen.classList.add("hidden");

    menu.classList.remove("hidden");
  }
);

$("play-again-button").addEventListener(
  "click",
  () => {
    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
    }

    resetGame();
  }
);

$("end-menu-button").addEventListener(
  "click",
  () => {
    ended = false;

    hud.classList.add("hidden");
    endScreen.classList.add("hidden");

    menu.classList.remove("hidden");
  }
);
