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
// 미니맵 설정
// ========================================

const minimap = document.getElementById("minimap");
const minimapCtx = minimap.getContext("2d");

const MINI_CELL = 14;

function updateMinimap() {

    const ctx = minimapCtx;
    const size = minimap.width;

    ctx.clearRect(0, 0, size, size);

    // 배경
    ctx.fillStyle = "#101010";
    ctx.fillRect(0, 0, size, size);

    const mapSize = MAP_WIDTH * MINI_CELL;

    const offsetX = (size - mapSize) / 2;
    const offsetY = (size - mapSize) / 2;

    // 벽과 통로 표시
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

    // 출구 표시
    ctx.fillStyle = "#00eaff";

    ctx.fillRect(
        offsetX + 9 * MINI_CELL + 3,
        offsetY + 9 * MINI_CELL + 3,
        8,
        8
    );

    // 적 위치 표시
    for (const enemy of enemies) {

        if (!enemy.alive) continue;

        const col = enemy.group.position.x / CELL
            + (MAP_WIDTH - 1) / 2;

        const row = enemy.group.position.z / CELL
            + (MAP_HEIGHT - 1) / 2;

        const x = offsetX + (col + 0.5) * MINI_CELL;
        const y = offsetY + (row + 0.5) * MINI_CELL;

        ctx.fillStyle = "#ff3030";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    // 플레이어 위치
    const playerCol = player.x / CELL
        + (MAP_WIDTH - 1) / 2;

    const playerRow = player.z / CELL
        + (MAP_HEIGHT - 1) / 2;

    const playerX = offsetX + (playerCol + 0.5) * MINI_CELL;
    const playerY = offsetY + (playerRow + 0.5) * MINI_CELL;

    // 플레이어 방향 화살표
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

    // 테두리
    ctx.strokeStyle = "#c99a4a";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);
}


// ========================================
// 2. 게임 설정
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

let elapsedTime = 0;
let reloadTimer = 0;

const keys = {};

const raycaster = new THREE.Raycaster();


// ========================================
// 3. 플레이어 설정
// ========================================

const player = {
    x: -16,
    z: -16,
    y: 1.6,

    // 시작할 때 열린 통로 방향을 바라보게 설정
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
// 4. 조명
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
// 5. 바닥과 천장
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
// 6. 던전 벽 생성
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
// 7. 충돌 검사
// ========================================

function isWall(x, z) {

    const col = Math.floor(x / CELL + MAP_WIDTH / 2);
    const row = Math.floor(z / CELL + MAP_HEIGHT / 2);

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
// 8. 적 생성
// ========================================

const enemyPositions = [
    { x: -4, z: -8 },
    { x: 4, z: -4 },
    { x: 12, z: 0 },
    { x: -8, z: 8 },
    { x: 8, z: 12 }
];

function createEnemy(x, z) {

    const group = new THREE.Group();

    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x9c2929,
        roughness: 0.8
    });

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.9, 1.3, 0.65),
        bodyMaterial
    );

    body.position.y = 0.9;
    body.castShadow = true;

    const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 12, 12),
        new THREE.MeshStandardMaterial({
            color: 0x553333
        })
    );

    head.position.y = 1.75;
    head.castShadow = true;

    const eyeMaterial = new THREE.MeshBasicMaterial({
        color: 0xff2222
    });

    const leftEye = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 8, 8),
        eyeMaterial
    );

    const rightEye = leftEye.clone();

    leftEye.position.set(-0.13, 1.8, -0.31);
    rightEye.position.set(0.13, 1.8, -0.31);

    group.add(body, head, leftEye, rightEye);

    group.position.set(x, 0, z);

    scene.add(group);

    body.userData.enemy = null;
    head.userData.enemy = null;

    const enemy = {
        group,
        body,
        head,

        hp: 100,
        speed: 1.4,

        attackCooldown: 0,
        alive: true
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
// 9. 출구 생성
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
// 10. 무기 모델
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
// 11. HUD 업데이트
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
// 12. 시점 회전
// ========================================

function look(dt) {

    // 왼쪽 화살표: 왼쪽 회전
    if (keys.arrowleft) {
        player.yaw += TURN_SPEED * dt;
    }

    // 오른쪽 화살표: 오른쪽 회전
    if (keys.arrowright) {
        player.yaw -= TURN_SPEED * dt;
    }

    // 위아래 시점 이동은 사용하지 않음
    camera.rotation.y = player.yaw;
    camera.rotation.x = 0;
}


// ========================================
// 13. 플레이어 이동
// ========================================

function movePlayer(dt) {

    let forwardAmount = 0;
    let sideAmount = 0;

    if (keys.w) forwardAmount += 1;
    if (keys.s) forwardAmount -= 1;

    if (keys.d) sideAmount += 1;
    if (keys.a) sideAmount -= 1;

    if (forwardAmount === 0 && sideAmount === 0) {
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

    movement.addScaledVector(forward, forwardAmount);
    movement.addScaledVector(right, sideAmount);

    movement.normalize();
    movement.multiplyScalar(MOVE_SPEED * dt);

    const nextX = player.x + movement.x;
    const nextZ = player.z + movement.z;

    // X축과 Z축을 따로 검사하여 벽에 부딪혀도
    // 가능한 방향으로 이동할 수 있게 함
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
// 14. 적 AI
// ========================================

function updateEnemies(dt) {

    for (const enemy of enemies) {

        if (!enemy.alive) continue;

        enemy.attackCooldown -= dt;

        const dx = player.x - enemy.group.position.x;
        const dz = player.z - enemy.group.position.z;

        const distance = Math.sqrt(dx * dx + dz * dz);

        // 플레이어를 바라보게 설정
        enemy.group.rotation.y = Math.atan2(dx, dz);

        // 가까워지면 플레이어를 추적
        if (distance > 1.5 && distance < 18) {

            const moveX =
                (dx / distance) * enemy.speed * dt;

            const moveZ =
                (dz / distance) * enemy.speed * dt;

            const nextX = enemy.group.position.x + moveX;
            const nextZ = enemy.group.position.z + moveZ;

            if (!isWall(nextX, enemy.group.position.z)) {
                enemy.group.position.x = nextX;
            }

            if (!isWall(enemy.group.position.x, nextZ)) {
                enemy.group.position.z = nextZ;
            }
        }

        // 플레이어에게 가까이 왔을 때 공격
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
                updateHUD();
                endGame(false);
            }
        }
    }
}


// ========================================
// 15. 총 발사
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

    player.ammo--;

    player.shotCooldown = 0.25;

    // 무기 반동
    weapon.position.z = -0.5;

    window.setTimeout(() => {
        weapon.position.z = -0.65;
    }, 80);

    // 카메라 중앙에서 정면으로 발사
    camera.updateMatrixWorld(true);

    raycaster.setFromCamera(
        new THREE.Vector2(0, 0),
        camera
    );

    const enemyHits = raycaster.intersectObjects(
        enemyMeshes,
        false
    );

    const wallHits = raycaster.intersectObjects(
        walls,
        false
    );

    let hitEnemy = null;

    if (enemyHits.length > 0) {

        const firstEnemyHit = enemyHits[0];

        const nearestWall = wallHits.length > 0
            ? wallHits[0].distance
            : Infinity;

        // 벽 뒤에 있는 적은 맞지 않도록 처리
        if (firstEnemyHit.distance < nearestWall) {
            hitEnemy = firstEnemyHit.object.userData.enemy;
        }
    }

    if (hitEnemy && hitEnemy.alive) {

        hitEnemy.hp -= 35;

        showMessage("HIT!");

        if (hitEnemy.hp <= 0) {

            hitEnemy.alive = false;

            scene.remove(hitEnemy.group);

            showMessage("ENEMY ELIMINATED!");

        }

    } else {

        showMessage("SHOT!");

    }

    updateHUD();

    // 모든 적을 처치했는지 확인
    const remaining = enemies.filter(enemy => enemy.alive).length;

    if (remaining === 0) {
        showMessage("ALL ENEMIES DEFEATED!");
    }
}


// ========================================
// 16. 재장전
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
// 17. 게임 승리 / 패배
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
        : "GAME OVER";

    menuDescription.textContent = victory
        ? "YOU ESCAPED THE DUNGEON."
        : "YOU HAVE BEEN DEFEATED.";

    startButton.classList.add("hidden");
    resumeButton.classList.add("hidden");
    restartButton.classList.remove("hidden");
}


// ========================================
// 18. 출구 도착 검사
// ========================================

function checkExit() {

    const dx = player.x - exitPosition.x;
    const dz = player.z - exitPosition.z;

    const distance = Math.sqrt(dx * dx + dz * dz);

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
// 19. 키보드 입력
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

    // R: 재장전
    if (key === "r" && running) {
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
// 20. 마우스 클릭 발사 기능 제거
// ========================================

// 마우스 클릭으로 총이 발사되지 않도록 함
// 발사는 오직 Space 키로만 가능

window.addEventListener("contextmenu", event => {
    event.preventDefault();
});


// ========================================
// 21. 게임 시작
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

startButton.addEventListener("click", startGame);


// ========================================
// 22. 일시정지
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

resumeButton.addEventListener("click", resumeGame);


// ========================================
// 23. 게임 재시작
// ========================================

function restartGame() {

    // 페이지를 새로고침하여 모든 게임 상태 초기화
    window.location.reload();
}

restartButton.addEventListener("click", restartGame);


// ========================================
// 24. 게임 업데이트
// ========================================

function update(dt) {

    if (!running || gameEnded) return;

    elapsedTime += dt;

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
// 25. 화면 크기 변경
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
// 26. 메인 게임 루프
// ========================================

function animate() {

    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);

    update(dt);

    renderer.render(scene, camera);
}

animate();
