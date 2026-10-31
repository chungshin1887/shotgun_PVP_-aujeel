
import * as THREE from "three";

// ==========================================
// 1. 게임 설정
// ==========================================

// 맵 편집: 1 = 벽, 0 = 통로
const MAP = [
    "111111111111111",
    "100000000000001",
    "101110010111101",
    "100000010000001",
    "100110000011001",
    "100010110000001",
    "100000000010001",
    "101100011000001",
    "100000000000001",
    "111111111111111"
];

const TILE = 3;
const MAG = 12;

const RELOAD_SECONDS = 1.25;
const SPEED = 5.2;
const TURN = 2.0;
const RADIUS = 0.34;

const SPAWNS = [
    [-15, -9],
    [12, -9],
    [-9, 3],
    [9, 6],
    [0, 10],
    [15, 0]
];

// ==========================================
// 2. 기본 장면 설정
// ==========================================

const $ = s => document.querySelector(s);

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x080c13);
scene.fog = new THREE.Fog(0x080c13, 10, 42);

const camera = new THREE.PerspectiveCamera(
    76,
    innerWidth / innerHeight,
    0.1,
    100
);

camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

renderer.shadowMap.enabled = true;
renderer.outputColorSpace = THREE.SRGBColorSpace;

$("#game").appendChild(renderer.domElement);

// ==========================================
// 3. 조명
// ==========================================

scene.add(
    new THREE.HemisphereLight(
        0x9bbde0,
        0x17121a,
        1.25
    )
);

const sun = new THREE.DirectionalLight(
    0xffdfb0,
    1.35
);

sun.position.set(-8, 15, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);

scene.add(sun);

// ==========================================
// 4. 바닥
// ==========================================

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(45, 30),
    new THREE.MeshStandardMaterial({
        color: 0x30343b,
        roughness: 0.95
    })
);

floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;

scene.add(floor);

// ==========================================
// 5. 벽 생성
// ==========================================

const wallMeshes = [];

const wallMat = new THREE.MeshStandardMaterial({
    color: 0x555d68,
    roughness: 0.88,
    metalness: 0.12
});

function tilePos(x, z) {
    return {
        x: (x - MAP[0].length / 2 + 0.5) * TILE,
        z: (z - MAP.length / 2 + 0.5) * TILE
    };
}

function wallAt(x, z) {
    const gx = Math.floor(
        x / TILE + MAP[0].length / 2
    );

    const gz = Math.floor(
        z / TILE + MAP.length / 2
    );

    return (
        gz < 0 ||
        gz >= MAP.length ||
        gx < 0 ||
        gx >= MAP[0].length ||
        MAP[gz][gx] === "1"
    );
}

for (let z = 0; z < MAP.length; z++) {
    for (let x = 0; x < MAP[z].length; x++) {

        if (MAP[z][x] !== "1") continue;

        const p = tilePos(x, z);

        const wall = new THREE.Mesh(
            new THREE.BoxGeometry(
                TILE,
                3.2,
                TILE
            ),
            wallMat
        );

        wall.position.set(
            p.x,
            1.6,
            p.z
        );

        wall.castShadow = true;
        wall.receiveShadow = true;

        scene.add(wall);
        wallMeshes.push(wall);
    }
}

// 천장
const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(45, 30),
    new THREE.MeshStandardMaterial({
        color: 0x111720,
        side: THREE.DoubleSide
    })
);

ceiling.rotation.x = Math.PI / 2;
ceiling.position.y = 3.2;

scene.add(ceiling);

// ==========================================
// 6. 플레이어
// ==========================================

const player = {
    x: -18,
    z: -10.5,
    y: 1.62,

    yaw: 0,
    pitch: 0,

    hp: 100,

    ammo: MAG,
    reserve: 60,

    reloading: false,
    reloadEnd: 0,

    shotAt: 0,

    alive: true
};

camera.position.set(
    player.x,
    player.y,
    player.z
);

// ==========================================
// 7. 총 모델
// ==========================================

const weapon = new THREE.Group();

function weaponPart(geometry, material, position) {
    const mesh = new THREE.Mesh(
        geometry,
        material
    );

    mesh.position.set(...position);
    weapon.add(mesh);
}

weaponPart(
    new THREE.BoxGeometry(0.18, 0.16, 0.55),
    new THREE.MeshStandardMaterial({
        color: 0x252d38,
        metalness: 0.7
    }),
    [0.34, -0.29, -0.58]
);

const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(
        0.035,
        0.045,
        0.32,
        10
    ),
    new THREE.MeshStandardMaterial({
        color: 0x778694,
        metalness: 0.8
    })
);

barrel.rotation.x = Math.PI / 2;
barrel.position.set(0.34, -0.25, -0.91);

weapon.add(barrel);

weaponPart(
    new THREE.BoxGeometry(0.12, 0.22, 0.14),
    new THREE.MeshStandardMaterial({
        color: 0x111820
    }),
    [0.34, -0.43, -0.48]
);

camera.add(weapon);
scene.add(camera);

// ==========================================
// 8. 적 생성
// ==========================================

const enemies = [];

const enemyGeo = new THREE.IcosahedronGeometry(
    0.62,
    1
);

function spawnEnemy(x, z) {

    if (wallAt(x, z)) return;

    const group = new THREE.Group();

    const core = new THREE.Mesh(
        enemyGeo,
        new THREE.MeshStandardMaterial({
            color: 0xb94d55,
            emissive: 0x3b080d,
            metalness: 0.35
        })
    );

    core.castShadow = true;
    group.add(core);

    const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 8),
        new THREE.MeshBasicMaterial({
            color: 0xffd5a3
        })
    );

    eye.position.set(0, 0.08, -0.55);
    group.add(eye);

    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(
            0.72,
            0.045,
            8,
            24
        ),
        new THREE.MeshStandardMaterial({
            color: 0x8dabbc,
            metalness: 0.8
        })
    );

    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    group.position.set(x, 1.15, z);

    scene.add(group);

    enemies.push({
        mesh: group,
        hp: 3,
        attack: 0,
        alive: true,
        phase: Math.random() * 6
    });
}

SPAWNS.forEach(p => spawnEnemy(...p));

// ==========================================
// 9. HUD
// ==========================================

function hud() {
    $("#hp").textContent = Math.max(
        0,
        Math.ceil(player.hp)
    );

    $("#ammo").textContent =
        `${player.ammo} / ${player.reserve}`;

    $("#left").textContent =
        enemies.filter(e => e.alive).length;
}

hud();

// ==========================================
// 10. 게임 상태
// ==========================================

let running = false;
let ended = false;
let msgTime = 0;

function say(text, duration = 1.5) {
    $("#message").textContent = text;
    $("#message").classList.remove("hidden");

    msgTime = duration;
}

function start() {
    if (running || ended) return;

    running = true;

    $("#start").classList.add("hidden");
    $("#pause").classList.add("hidden");

    $("#hud").classList.remove("hidden");
    $("#crosshair").classList.remove("hidden");

    say("던전을 탐험하세요!", 2);
}

function pause() {
    if (!running) return;

    running = false;

    $("#pause").classList.remove("hidden");
}

function finish(win) {
    if (ended) return;

    ended = true;
    running = false;

    $("#endTitle").textContent = win
        ? "MISSION COMPLETE"
        : "GAME OVER";

    $("#endText").textContent = win
        ? "모든 드론을 정리했습니다. 던전 정복 성공!"
        : "체력이 모두 소진되었습니다. 다시 도전해 보세요.";

    $("#end").classList.remove("hidden");
    $("#crosshair").classList.add("hidden");
}

function restart() {
    location.reload();
}

$("#startBtn").onclick = start;

$("#resumeBtn").onclick = () => {
    if (!ended) {
        running = true;
        $("#pause").classList.add("hidden");
    }
};

$("#restartBtn").onclick = restart;
$("#againBtn").onclick = restart;

// ==========================================
// 11. 키보드 입력
// ==========================================

const keys = {};

window.addEventListener("keydown", event => {

    const key = event.key.toLowerCase();

    keys[key] = true;

    if (
        key.startsWith("arrow") ||
        key === " "
    ) {
        event.preventDefault();
    }

    if (key === "escape" && running) {
        pause();
    }

    if (key === "r" && running) {
        reload();
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

// ==========================================
// 12. 벽 충돌
// ==========================================

function canMove(x, z) {

    return ![
        [x - RADIUS, z - RADIUS],
        [x + RADIUS, z - RADIUS],
        [x - RADIUS, z + RADIUS],
        [x + RADIUS, z + RADIUS]
    ].some(p => wallAt(...p));
}

// ==========================================
// 13. WASD 이동
// ==========================================

function move(dt) {

    let forward =
        (keys.w ? 1 : 0) -
        (keys.s ? 1 : 0);

    let side =
        (keys.d ? 1 : 0) -
        (keys.a ? 1 : 0);

    const length = Math.hypot(
        forward,
        side
    );

    if (length) {

        forward /= length;
        side /= length;

        const dx = (
            Math.sin(player.yaw) * forward +
            Math.cos(player.yaw) * side
        ) * SPEED * dt;

        const dz = (
            -Math.cos(player.yaw) * forward +
            Math.sin(player.yaw) * side
        ) * SPEED * dt;

        if (canMove(player.x + dx, player.z)) {
            player.x += dx;
        }

        if (canMove(player.x, player.z + dz)) {
            player.z += dz;
        }
    }

    camera.position.set(
        player.x,
        player.y,
        player.z
    );
}

// ==========================================
// 14. 방향키 시점 조작
// ==========================================

function look(dt) {

    if (keys.arrowleft) {
        player.yaw += TURN * dt;
    }

    if (keys.arrowright) {
        player.yaw -= TURN * dt;
    }

    if (keys.arrowup) {
        player.pitch += TURN * dt;
    }

    if (keys.arrowdown) {
        player.pitch -= TURN * dt;
    }

    player.pitch = THREE.MathUtils.clamp(
        player.pitch,
        -1.25,
        1.25
    );

    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
}

// ==========================================
// 15. 재장전
// ==========================================

function reload() {

    if (
        player.reloading ||
        player.ammo === MAG ||
        player.reserve <= 0 ||
        !player.alive
    ) {
        return;
    }

    player.reloading = true;

    player.reloadEnd =
        performance.now() / 1000 +
        RELOAD_SECONDS;

    $("#reload").classList.remove("hidden");

    say("재장전 중...", RELOAD_SECONDS);
}

function updateReload(now) {

    if (
        player.reloading &&
        now >= player.reloadEnd
    ) {

        const amount = Math.min(
            MAG - player.ammo,
            player.reserve
        );

        player.ammo += amount;
        player.reserve -= amount;

        player.reloading = false;

        $("#reload").classList.add("hidden");

        say("재장전 완료!", 1);

        hud();
    }
}

// ==========================================
// 16. 총 발사
// ==========================================

const ray = new THREE.Raycaster();

const center = new THREE.Vector2(0, 0);

function shoot() {

    if (
        !running ||
        ended ||
        player.reloading ||
        performance.now() / 1000 < player.shotAt
    ) {
        return;
    }

    if (!player.ammo) {

        say("탄약이 없습니다. R 키로 재장전하세요.");

        player.shotAt =
            performance.now() / 1000 + 0.25;

        return;
    }

    player.ammo--;

    player.shotAt =
        performance.now() / 1000 + 0.22;

    hud();

    ray.setFromCamera(center, camera);

    const live = enemies.filter(e => e.alive);

    const hits = ray.intersectObjects(
        [
            ...live.map(e => e.mesh),
            ...wallMeshes
        ],
        true
    );

    if (!hits.length) return;

    let target = null;

    for (const hit of hits) {

        let object = hit.object;

        while (object) {

            target = live.find(
                enemy => enemy.mesh === object
            );

            if (target) break;

            object = object.parent;
        }

        if (target) break;

        // 벽에 먼저 맞았다면 적은 맞지 않음
        return;
    }

    target.hp--;

    $("#crosshair").style.color = "#ffec9a";

    setTimeout(() => {
        $("#crosshair").style.color = "";
    }, 100);

    if (target.hp <= 0) {

        target.alive = false;

        scene.remove(target.mesh);

        say("드론 제거!", 0.8);

        hud();

        if (enemies.every(e => !e.alive)) {
            finish(true);
        }
    }
}

renderer.domElement.addEventListener(
    "pointerdown",
    event => {
        if (event.button === 0) {
            shoot();
        }
    }
);

window.addEventListener("contextmenu", event => {
    event.preventDefault();
});

// ==========================================
// 17. 적 AI
// ==========================================

function updateEnemies(dt, time) {

    for (const enemy of enemies) {

        if (!enemy.alive) continue;

        const dx =
            player.x - enemy.mesh.position.x;

        const dz =
            player.z - enemy.mesh.position.z;

        const distance = Math.hypot(dx, dz);

        enemy.mesh.position.y =
            1.15 +
            Math.sin(time * 2 + enemy.phase) * 0.12;

        enemy.mesh.rotation.y += dt * 0.8;

        enemy.mesh.children[1].lookAt(camera.position);

        // 플레이어 추적
        if (distance > 1.55 && distance < 18) {

            const step = Math.min(
                1.5 * dt,
                distance - 1.45
            );

            const nx =
                enemy.mesh.position.x +
                dx / distance * step;

            const nz =
                enemy.mesh.position.z +
                dz / distance * step;

            if (!wallAt(nx, enemy.mesh.position.z)) {
                enemy.mesh.position.x = nx;
            }

            if (!wallAt(enemy.mesh.position.x, nz)) {
                enemy.mesh.position.z = nz;
            }
        }

        // 플레이어 공격
        else if (distance <= 1.65) {

            enemy.attack -= dt;

            if (enemy.attack <= 0) {

                enemy.attack = 1.05;

                player.hp -= 8;

                hud();

                $("#damage").style.background =
                    "rgba(255,35,45,.22)";

                setTimeout(() => {
                    $("#damage").style.background = "";
                }, 110);

                say("드론이 가까이 접근했습니다!", 0.7);

                if (player.hp <= 0) {

                    player.hp = 0;
                    player.alive = false;

                    hud();

                    finish(false);

                    return;
                }
            }
        }
    }
}

// ==========================================
// 18. 던전 조명
// ==========================================

for (const [x, z] of [
    [-18, -10],
    [18, -10],
    [-18, 10],
    [18, 10],
    [0, 12]
]) {

    const light = new THREE.PointLight(
        0x69bfff,
        1.1,
        10
    );

    light.position.set(x, 2.5, z);

    scene.add(light);
}

// ==========================================
// 19. 게임 실행 루프
// ==========================================

const clock = new THREE.Clock();

function animate() {

    requestAnimationFrame(animate);

    const dt = Math.min(
        clock.getDelta(),
        0.05
    );

    const time = clock.elapsedTime;

    const now = performance.now() / 1000;

    if (running && !ended) {

        move(dt);
        look(dt);

        updateEnemies(dt, time);
        updateReload(now);

        if (msgTime > 0) {

            msgTime -= dt;

            if (msgTime <= 0) {
                $("#message").classList.add("hidden");
            }
        }
    }

    renderer.render(scene, camera);
}

animate();

// ==========================================
// 20. 화면 크기 변경
// ==========================================

window.addEventListener("resize", () => {

    camera.aspect =
        innerWidth / innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        innerWidth,
        innerHeight
    );
});
