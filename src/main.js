
import * as THREE from "three";

// ========================================
// 1. 기본 설정
// ========================================

const container = document.getElementById("game-container");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);
scene.fog = new THREE.Fog(0x111111, 10, 48);

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);

camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

container.appendChild(renderer.domElement);

const clock = new THREE.Clock();


// ========================================
// 2. 미니맵 설정
// ========================================

const minimap = document.getElementById("minimap");
const minimapCtx = minimap.getContext("2d");

const MINI_CELL = 14;


// ========================================
// 3. 게임 설정
// ========================================

const CELL = 4;

const MAG = 12;
const RELOAD_TIME = 1.5;

const MOVE_SPEED = 5;
const TURN_SPEED = 2.2;

const PLAYER_RADIUS = 0.35;

const MAP = [
    "11111111111",
    "10000000001",
    "10111011001",
    "10001000001",
    "11101011101",
    "10000010001",
    "10111010001",
    "10001000001",
    "10101110101",
    "10000000001",
    "11111111111"
];

const MAP_HEIGHT = MAP.length;
const MAP_WIDTH = MAP[0].length;

const enemies = [];
const walls = [];
const enemyMeshes = [];

let running = false;
let gameEnded = false;
let paused = false;

let reloadTimer = 0;

const keys = {};

const raycaster = new THREE.Raycaster();


// ========================================
// 4. 플레이어 설정
// ========================================

const player = {
    x: -16,
    z: -16,
    y: 1.6,

    yaw: Math.PI,

    hp: 100,

    ammo: MAG,
    reserve: 60,

    reloading: false,
    shotCooldown: 0,

    alive: true
};

camera.position.set(
    player.x,
    player.y,
    player.z
);

camera.rotation.y = player.yaw;
camera.rotation.x = 0;


// ========================================
// 5. 조명
// ========================================

const ambientLight = new THREE.AmbientLight(
    0xffffff,
    0.35
);

scene.add(ambientLight);

const mainLight = new THREE.PointLight(
    0xffd19a,
    1.5,
    35
);

mainLight.position.set(0, 7, 0);
scene.add(mainLight);

const playerLight = new THREE.PointLight(
    0xffd6a0,
    0.8,
    14
);

playerLight.position.set(0, 1.5, 0);
camera.add(playerLight);
scene.add(camera);


// ========================================
// 6. 바닥과 천장
// ========================================

const floorGeometry = new THREE.PlaneGeometry(
    MAP_WIDTH * CELL,
    MAP_HEIGHT * CELL
);

const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x383838,
    roughness: 1
});

const floor = new THREE.Mesh(
    floorGeometry,
    floorMaterial
);

floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;

scene.add(floor);


const ceilingGeometry = new THREE.PlaneGeometry(
    MAP_WIDTH * CELL,
    MAP_HEIGHT * CELL
);

const ceilingMaterial = new THREE.MeshStandardMaterial({
    color: 0x202020,
    side: THREE.DoubleSide
});

const ceiling = new THREE.Mesh(
    ceilingGeometry,
    ceilingMaterial
);

ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = 4;

scene.add(ceiling);


// ========================================
// 7. 던전 벽 생성
// ========================================

const wallGeometry = new THREE.BoxGeometry(
    CELL,
    4,
    CELL
);

const wallMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x55505a }),
    new THREE.MeshStandardMaterial({ color: 0x62594e }),
    new THREE.MeshStandardMaterial({ color: 0x494949 })
];

function gridToWorld(col, row) {

    return {
        x: (col - (MAP_WIDTH - 1) / 2) * CELL,
        z: (row - (MAP_HEIGHT - 1) / 2) * CELL
    };
}

function createWalls() {

    for (let row = 0; row < MAP_HEIGHT; row++) {

        for (let col = 0; col < MAP_WIDTH; col++) {

            if (MAP[row][col] !== "1") {
                continue;
            }

            const position = gridToWorld(col, row);

            const material = wallMaterials[
                (row + col) % wallMaterials.length
            ];

            const wall = new THREE.Mesh(
                wallGeometry,
                material
            );

            wall.position.set(
                position.x,
                2,
                position.z
            );

            wall.castShadow = true;
            wall.receiveShadow = true;

            scene.add(wall);
            walls.push(wall);
        }
    }
}

createWalls();


// ========================================
// 8. 충돌 검사
// ========================================

function isWall(x, z) {

    const col = Math.floor(
        x / CELL + MAP_WIDTH / 2
    );

    const row = Math.floor(
        z / CELL + MAP_HEIGHT / 2
    );

    if (
        row < 0 ||
        row >= MAP_HEIGHT ||
        col < 0 ||
        col >= MAP_WIDTH
    ) {
        return true;
    }

    return MAP[row][col] === "1";
}

function canMoveTo(x, z) {

    const r = PLAYER_RADIUS;

    return (
        !isWall(x - r, z - r) &&
        !isWall(x + r, z - r) &&
        !isWall(x - r, z + r) &&
        !isWall(x + r, z + r)
    );
}


// ========================================
// 9. 적 생성
// ========================================

const enemyPositions = [
    { x: -8, z: -16 },
    { x: 12, z: -16 },
    { x: 12, z: -8 },
    { x: -12, z: 0 },
    { x: 12, z: 8 }
];

function createEnemy(x, z) {

    const group = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0xff2929,
        emissive: 0x8b0000,
        emissiveIntensity: 0.7,
        roughness: 0.5
    });

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 1.55, 0.8),
        bodyMaterial
    );

    body.position.y = 1.0;
    body.castShadow = true;

    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xff7777,
        emissive: 0x550000,
        emissiveIntensity: 0.5
    });

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 16, 16),
        headMaterial
    );

    head.position.y = 2.05;
    head.castShadow = true;

    const eyeMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00
    });

    const leftEye = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 10, 10),
        eyeMaterial
    );

    const rightEye = leftEye.clone();

    leftEye.position.set(-0.16, 2.1, -0.37);
    rightEye.position.set(0.16, 2.1, -0.37);

    group.add(body, head, leftEye, rightEye);

    const enemyLight = new THREE.PointLight(
        0xff2222,
        1.5,
        5
    );

    enemyLight.position.y = 2;
    group.add(enemyLight);

    const healthCanvas = document.createElement("canvas");

    healthCanvas.width = 128;
    healthCanvas.height = 20;

    const healthCtx = healthCanvas.getContext("2d");

    const healthTexture = new THREE.CanvasTexture(
        healthCanvas
    );

    const healthMaterial = new THREE.SpriteMaterial({
        map: healthTexture,
        transparent: true,
        depthTest: false
    });

    const healthBar = new THREE.Sprite(healthMaterial);

    healthBar.position.y = 2.8;
    healthBar.scale.set(1.4, 0.22, 1);

    healthBar.visible = false;

    group.add(healthBar);

    group.position.set(x, 0, z);

    scene.add(group);

    const enemy = {
        group,
        body,
        head,

        hp: 100,
        maxHp: 100,

        speed: 1.4,
        attackCooldown: 0,

        alive: true,

        healthCanvas,
        healthCtx,
        healthTexture,
        healthBar
    };

    body.userData.enemy = enemy;
    head.userData.enemy = enemy;

    enemies.push(enemy);

    enemyMeshes.push(body, head);
}

enemyPositions.forEach(position => {
    createEnemy(position.x, position.z);
});


// ========================================
// 10. 적 체력 게이지
// ========================================

function updateEnemyHealthBar(enemy) {

    const ctx = enemy.healthCtx;

    const width = enemy.healthCanvas.width;
    const height = enemy.healthCanvas.height;

    const ratio = Math.max(
        0,
        enemy.hp / enemy.maxHp
    );

    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#222222";

    ctx.fillRect(
        0,
        0,
        width,
        height
    );

    if (ratio > 0.6) {

        ctx.fillStyle = "#35ed62";

    } else if (ratio > 0.3) {

        ctx.fillStyle = "#ffd447";

    } else {

        ctx.fillStyle = "#ff3030";

    }

    ctx.fillRect(
        2,
        2,
        (width - 4) * ratio,
        height - 4
    );

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;

    ctx.strokeRect(
        1,
        1,
        width - 2,
        height - 2
    );

    enemy.healthTexture.needsUpdate = true;

    enemy.healthBar.visible = true;
}


// ========================================
// 11. 적 생성 실행
// ========================================

enemyPositions.forEach(position => {
    // 이미 생성했으므로 여기서는 추가 생성하지 않음
});


// ========================================
// 12. 출구 생성
// ========================================

const exitPosition = gridToWorld(9, 9);

const exitGroup = new THREE.Group();

const exitFrame = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 3, 0.3),
    new THREE.MeshStandardMaterial({
        color: 0x66502a
    })
);

exitFrame.position.y = 1.5;

const exitLight = new THREE.Mesh(
    new THREE.PlaneGeometry(1.8, 2.5),
    new THREE.MeshBasicMaterial({
        color: 0x00ccff,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide
    })
);

exitLight.position.set(0, 1.5, 0.2);

exitGroup.add(exitFrame, exitLight);

exitGroup.position.set(
    exitPosition.x,
    0,
    exitPosition.z
);

scene.add(exitGroup);


// ========================================
// 13. 무기 모델
// ========================================

const weapon = new THREE.Group();

const weaponBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.22, 0.8),
    new THREE.MeshStandardMaterial({
        color: 0x292929,
        metalness: 0.6,
        roughness: 0.4
    })
);

weaponBody.position.set(0, 0, -0.3);

const weaponHandle = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.35, 0.2),
    new THREE.MeshStandardMaterial({
        color: 0x555555
    })
);

weaponHandle.position.set(0, -0.23, -0.1);

weapon.add(weaponBody, weaponHandle);

weapon.position.set(0.35, -0.3, -0.65);

camera.add(weapon);


// ========================================
// 14. HUD 업데이트
// ========================================

const healthElement = document.getElementById("health");
const ammoElement = document.getElementById("ammo");
const enemyCountElement = document.getElementById("enemy-count");
const messageElement = document.getElementById("message");

function updateHUD() {

    healthElement.textContent = player.hp;

    ammoElement.textContent =
        `${player.ammo} / ${player.reserve}`;

    enemyCountElement.textContent =
        enemies.filter(enemy => enemy.alive).length;
}

function showMessage(text, duration = 1.2) {

    messageElement.textContent = text;
    messageElement.style.opacity = "1";

    window.clearTimeout(showMessage.timeout);

    showMessage.timeout = window.setTimeout(() => {
        messageElement.style.opacity = "0";
    }, duration * 1000);
}

updateHUD();


// ========================================
// 15. 미니맵 업데이트
// ========================================

function updateMinimap() {

    const ctx = minimapCtx;
    const size = minimap.width;

    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = "#101010";
    ctx.fillRect(0, 0, size, size);

    const mapSize = MAP_WIDTH * MINI_CELL;

    const offsetX = (size - mapSize) / 2;
    const offsetY = (size - mapSize) / 2;

    for (let row = 0; row < MAP_HEIGHT; row++) {

        for (let col = 0; col < MAP_WIDTH; col++) {

            const x = offsetX + col * MINI_CELL;
            const y = offsetY + row * MINI_CELL;

            if (MAP[row][col] === "1") {
                ctx.fillStyle = "#77716a";
            } else {
                ctx.fillStyle = "#252525";
            }

            ctx.fillRect(
                x,
                y,
                MINI_CELL - 1,
                MINI_CELL - 1
            );
        }
    }

    // 출구
    ctx.fillStyle = "#00eaff";

    ctx.fillRect(
        offsetX + 9 * MINI_CELL + 3,
        offsetY + 9 * MINI_CELL + 3,
        8,
        8
    );

    // 적 위치
    for (const enemy of enemies) {

        if (!enemy.alive) continue;

        const col =
            enemy.group.position.x / CELL +
            (MAP_WIDTH - 1) / 2;

        const row =
            enemy.group.position.z / CELL +
            (MAP_HEIGHT - 1) / 2;

        const x = offsetX + (col + 0.5) * MINI_CELL;
        const y = offsetY + (row + 0.5) * MINI_CELL;

        ctx.fillStyle = "#ff3030";

        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // 플레이어 위치
    const playerCol =
        player.x / CELL +
        (MAP_WIDTH - 1) / 2;

    const playerRow =
        player.z / CELL +
        (MAP_HEIGHT - 1) / 2;

    const playerX =
        offsetX + (playerCol + 0.5) * MINI_CELL;

    const playerY =
        offsetY + (playerRow + 0.5) * MINI_CELL;

    ctx.save();

    ctx.translate(playerX, playerY);
    ctx.rotate(player.yaw);

    ctx.fillStyle = "#35ff72";

    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(-5, 5);
    ctx.lineTo(5, 5);
    ctx.closePath();

    ctx.fill();

    ctx.restore();

    ctx.strokeStyle = "#c99a4a";
    ctx.lineWidth = 2;

    ctx.strokeRect(
        0,
        0,
        size,
        size
    );
}


// ========================================
// 16. 시점 회전
// ========================================

function look(dt) {

    if (keys.arrowleft) {
        player.yaw += TURN_SPEED * dt;
    }

    if (keys.arrowright) {
        player.yaw -= TURN_SPEED * dt;
    }

    camera.rotation.y = player.yaw;
    camera.rotation.x = 0;
}


// ========================================
// 17. 플레이어 이동
// ========================================

function movePlayer(dt) {

    let forwardAmount = 0;
    let sideAmount = 0;

    if (keys.w) forwardAmount += 1;
    if (keys.s) forwardAmount -= 1;

    if (keys.d) sideAmount += 1;
    if (keys.a) sideAmount -= 1;

    if (
        forwardAmount === 0 &&
        sideAmount === 0
    ) {
        return;
    }

    const forward = new THREE.Vector3(
        -Math.sin(player.yaw),
        0,
        -Math.cos(player.yaw)
    );

    const right = new THREE.Vector3(
        Math.cos(player.yaw),
        0,
        -Math.sin(player.yaw)
    );

    const movement = new THREE.Vector3();

    movement.addScaledVector(
        forward,
        forwardAmount
    );

    movement.addScaledVector(
        right,
        sideAmount
    );

    movement.normalize();
    movement.multiplyScalar(MOVE_SPEED * dt);

    const nextX = player.x + movement.x;
    const nextZ = player.z + movement.z;

    if (canMoveTo(nextX, player.z)) {
        player.x = nextX;
    }

    if (canMoveTo(player.x, nextZ)) {
        player.z = nextZ;
    }

    camera.position.set(
        player.x,
        player.y,
        player.z
    );
}


// ========================================
// 18. 적 AI
// ========================================

function updateEnemies(dt) {

    for (const enemy of enemies) {

        if (!enemy.alive) continue;

        enemy.attackCooldown -= dt;

        const dx =
            player.x - enemy.group.position.x;

        const dz =
            player.z - enemy.group.position.z;

        const distance = Math.sqrt(
            dx * dx + dz * dz
        );

        // 플레이어 바라보기
        enemy.group.rotation.y = Math.atan2(dx, dz);

        // 플레이어 추적
        if (
            distance > 1.5 &&
            distance < 18
        ) {

            const moveX =
                (dx / distance) * enemy.speed * dt;

            const moveZ =
                (dz / distance) * enemy.speed * dt;

            const nextX =
                enemy.group.position.x + moveX;

            const nextZ =
                enemy.group.position.z + moveZ;

            if (!isWall(nextX, enemy.group.position.z)) {
                enemy.group.position.x = nextX;
            }

            if (!isWall(enemy.group.position.x, nextZ)) {
                enemy.group.position.z = nextZ;
            }
        }

        // 플레이어 공격
        if (
            distance < 1.6 &&
            enemy.attackCooldown <= 0
        ) {

            player.hp -= 10;

            enemy.attackCooldown = 1.2;

            showMessage("YOU ARE UNDER ATTACK!");

            updateHUD();

            if (player.hp <= 0) {

                player.hp = 0;
                player.alive = false;

                updateHUD();

                endGame(false);

                return;
            }
        }
    }
}


// ========================================
// 19. 총 발사
// ========================================

function shoot() {

    if (!running || paused || gameEnded) return;

    if (player.reloading) {
        showMessage("RELOADING!");
        return;
    }

    if (player.shotCooldown > 0) return;

    if (player.ammo <= 0) {
        showMessage("OUT OF AMMO!");
        return;
    }

    // 총알 1발 사용
    player.ammo--;
    player.shotCooldown = 0.25;

    // 무기 반동
    weapon.position.z = -0.5;

    window.setTimeout(() => {
        weapon.position.z = -0.65;
    }, 80);

    // 적과 카메라의 월드 좌표를 최신 상태로 갱신
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);

    // 화면 정중앙 방향으로 발사
    raycaster.setFromCamera(
        new THREE.Vector2(0, 0),
        camera
    );

    const ray = raycaster.ray;

    // 가장 가까운 벽까지의 거리
    const wallHits = raycaster.intersectObjects(
        walls,
        false
    );

    const nearestWallDistance = wallHits.length > 0
        ? wallHits[0].distance
        : Infinity;

    let hitEnemy = null;
    let nearestEnemyDistance = Infinity;

    // 적 전체를 감싸는 구형 적중 판정
    for (const enemy of enemies) {

        if (!enemy.alive) continue;

        const enemyCenter = enemy.group.localToWorld(
            new THREE.Vector3(0, 1.3, 0)
        );

        const hitSphere = new THREE.Sphere(
            enemyCenter,
            1.05
        );

        const hitPoint = ray.intersectSphere(
            hitSphere,
            new THREE.Vector3()
        );

        if (!hitPoint) continue;

        const hitDistance = ray.origin.distanceTo(hitPoint);

        // 벽이 적보다 앞에 있으면 적중하지 않음
        if (hitDistance >= nearestWallDistance) continue;

        // 가장 가까운 적 선택
        if (hitDistance < nearestEnemyDistance) {
            nearestEnemyDistance = hitDistance;
            hitEnemy = enemy;
        }
    }

    if (hitEnemy) {

        // 적 한 명당 총알 1발로 처치
        hitEnemy.hp = 0;
        hitEnemy.alive = false;

        scene.remove(hitEnemy.group);

        const bodyIndex = enemyMeshes.indexOf(hitEnemy.body);
        const headIndex = enemyMeshes.indexOf(hitEnemy.head);

        if (bodyIndex !== -1) {
            enemyMeshes.splice(bodyIndex, 1);
        }

        if (headIndex !== -1) {
            enemyMeshes.splice(headIndex, 1);
        }

        showMessage("ENEMY ELIMINATED!");

    } else {

        showMessage("SHOT!");
    }

    updateHUD();

    const remainingEnemies = enemies.filter(
        enemy => enemy.alive
    ).length;

    if (remainingEnemies === 0) {
        showMessage("ALL ENEMIES DEFEATED!");
    }
}


// ========================================
// 20. 재장전
// ========================================

function reload() {

    if (!running || paused || gameEnded) return;

    if (player.reloading) return;

    if (player.ammo >= MAG) {
        showMessage("MAGAZINE FULL!");
        return;
    }

    if (player.reserve <= 0) {
        showMessage("NO RESERVE AMMO!");
        return;
    }

    player.reloading = true;

    reloadTimer = RELOAD_TIME;

    showMessage("RELOADING...");
}

function updateReload(dt) {

    if (!player.reloading) return;

    reloadTimer -= dt;

    if (reloadTimer <= 0) {

        const needed = MAG - player.ammo;

        const amount = Math.min(
            needed,
            player.reserve
        );

        player.ammo += amount;
        player.reserve -= amount;

        player.reloading = false;

        showMessage("RELOADED!");

        updateHUD();
    }
}


// ========================================
// 21. 게임 승리 / 패배
// ========================================

const overlay = document.getElementById("overlay");

const menuTitle = document.getElementById("menu-title");
const menuDescription = document.getElementById("menu-description");

const startButton = document.getElementById("start-button");
const resumeButton = document.getElementById("resume-button");
const restartButton = document.getElementById("restart-button");

function endGame(victory) {

    running = false;
    paused = false;
    gameEnded = true;

    overlay.classList.remove("hidden");

    menuTitle.textContent = victory
        ? "VICTORY!"
        : "Died";

    menuDescription.textContent = victory
        ? "YOU ESCAPED THE DUNGEON."
        : "YOU WERE DEFEATED. TRY AGAIN!";

    startButton.classList.add("hidden");
    resumeButton.classList.add("hidden");
    restartButton.textContent = "다시 시작하기";
    restartButton.classList.remove("hidden");
}


// ========================================
// 22. 출구 도착 검사
// ========================================

function checkExit() {

    const dx = player.x - exitPosition.x;
    const dz = player.z - exitPosition.z;

    const distance = Math.sqrt(
        dx * dx + dz * dz
    );

    if (distance < 2.2) {

        const remaining = enemies.filter(
            enemy => enemy.alive
        ).length;

        if (remaining === 0) {

            endGame(true);

        } else {

            showMessage("DEFEAT ALL ENEMIES FIRST!");
        }
    }
}


// ========================================
// 23. 키보드 입력
// ========================================

window.addEventListener("keydown", event => {

    const key = event.key.toLowerCase();

    keys[key] = true;

    if (
        key.startsWith("arrow") ||
        key === " "
    ) {
        event.preventDefault();
    }

    // ESC: 일시정지
    if (key === "escape" && running) {
        pauseGame();
    }

    // R: 재장전 (키를 처음 눌렀을 때만 실행)
    if (key === "r" && running && !event.repeat) {
        reload();
    }

    // Space: 총 발사
    if (
        key === " " &&
        running &&
        !event.repeat
    ) {
        shoot();
    }
});

window.addEventListener("keyup", event => {

    keys[event.key.toLowerCase()] = false;
});

window.addEventListener("blur", () => {

    Object.keys(keys).forEach(key => {
        keys[key] = false;
    });
});


// ========================================
// 24. 마우스 발사 기능 제거
// ========================================

window.addEventListener("contextmenu", event => {
    event.preventDefault();
});


// ========================================
// 25. 게임 시작
// ========================================

function startGame() {

    running = true;
    paused = false;
    gameEnded = false;

    overlay.classList.add("hidden");

    startButton.classList.add("hidden");
    resumeButton.classList.add("hidden");
    restartButton.classList.add("hidden");

    clock.getDelta();

    showMessage("FIND THE EXIT!");
}

startButton.addEventListener(
    "click",
    startGame
);


// ========================================
// 26. 일시정지
// ========================================

function pauseGame() {

    if (!running || gameEnded) return;

    running = false;
    paused = true;

    overlay.classList.remove("hidden");

    menuTitle.textContent = "PAUSED";
    menuDescription.textContent = "GAME IS PAUSED";

    startButton.classList.add("hidden");
    restartButton.classList.add("hidden");
    resumeButton.classList.remove("hidden");
}

function resumeGame() {

    if (!paused || gameEnded) return;

    running = true;
    paused = false;

    overlay.classList.add("hidden");

    clock.getDelta();
}

resumeButton.addEventListener(
    "click",
    resumeGame
);


// ========================================
// 27. 게임 재시작
// ========================================

function restartGame() {

    window.location.reload();
}

restartButton.addEventListener(
    "click",
    restartGame
);


// ========================================
// 28. 게임 업데이트
// ========================================

function update(dt) {

    if (!running || gameEnded) return;

    player.shotCooldown = Math.max(
        0,
        player.shotCooldown - dt
    );

    look(dt);

    movePlayer(dt);

    updateEnemies(dt);

    updateReload(dt);

    checkExit();
}


// ========================================
// 29. 화면 크기 변경
// ========================================

window.addEventListener("resize", () => {

    camera.aspect =
        window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, 2)
    );
});


// ========================================
// 30. 메인 게임 루프
// ========================================

function animate() {

    requestAnimationFrame(animate);

    const dt = Math.min(
        clock.getDelta(),
        0.05
    );

    update(dt);

    // 미니맵 실시간 갱신
    updateMinimap();

    renderer.render(scene, camera);
}

animate();
