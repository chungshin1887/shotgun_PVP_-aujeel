import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";


// ============================================================
// GAME / UI
// ============================================================

const game = document.getElementById("game");
const intro = document.getElementById("intro");
const startButton = document.getElementById("startButton");

const hpText = document.getElementById("hp");
const ammoText = document.getElementById("ammo");
const enemyCountText = document.getElementById("enemyCount");
const message = document.getElementById("message");
const gameover = document.getElementById("gameover");


// ============================================================
// CROSSHAIR
// ============================================================

const crosshair = document.createElement("div");

crosshair.id = "crosshair";

crosshair.innerHTML = `
    <div class="crosshair-line horizontal"></div>
    <div class="crosshair-line vertical"></div>
`;

document.body.appendChild(crosshair);


// 크로스헤어 스타일

const crosshairStyle = document.createElement("style");

crosshairStyle.textContent = `

    #crosshair {

        position: fixed;

        left: 50%;
        top: 50%;

        width: 22px;
        height: 22px;

        transform: translate(-50%, -50%);

        pointer-events: none;

        z-index: 5000;

        display: none;

    }


    .crosshair-line {

        position: absolute;

        background: white;

        box-shadow:
            0 0 2px black;

    }


    .crosshair-line.horizontal {

        width: 22px;
        height: 2px;

        left: 0;
        top: 10px;

    }


    .crosshair-line.vertical {

        width: 2px;
        height: 22px;

        left: 10px;
        top: 0;

    }


    #crosshair.hit {

        transform:
            translate(-50%, -50%)
            scale(1.35);

    }

`;

document.head.appendChild(
    crosshairStyle
);


// ============================================================
// PAUSE UI
// ============================================================

const pauseScreen =
    document.createElement("div");

pauseScreen.id =
    "pauseScreen";

pauseScreen.innerHTML = `

    <div id="pauseBox">

        <div id="pauseTitle">
            PAUSED
        </div>

        <button id="resumeButton">
            계속하기
        </button>

        <div id="pauseHint">
            계속하기를 누르면 게임이 재개됩니다.
        </div>

    </div>

`;

document.body.appendChild(
    pauseScreen
);


// Pause 스타일

const pauseStyle =
    document.createElement("style");

pauseStyle.textContent = `

    #pauseScreen {

        position: fixed;

        inset: 0;

        display: none;

        align-items: center;

        justify-content: center;

        background:
            rgba(0, 0, 0, 0.75);

        z-index: 9999;

        font-family: Arial, sans-serif;

    }


    #pauseBox {

        text-align: center;

        background:
            rgba(20, 20, 20, 0.95);

        border: 2px solid white;

        padding: 40px 60px;

        min-width: 260px;

    }


    #pauseTitle {

        color: white;

        font-size: 42px;

        font-weight: bold;

        margin-bottom: 30px;

        letter-spacing: 4px;

    }


    #resumeButton {

        background: #222;

        color: white;

        border: 2px solid white;

        padding: 14px 35px;

        font-size: 20px;

        cursor: pointer;

    }


    #resumeButton:hover {

        background: white;

        color: black;

    }


    #pauseHint {

        color: #aaa;

        font-size: 13px;

        margin-top: 20px;

    }

`;

document.head.appendChild(
    pauseStyle
);


const resumeButton =
    document.getElementById(
        "resumeButton"
    );


// ============================================================
// GAME STATE
// ============================================================

let gameStarted = false;

let isPaused = false;

let isGameOver = false;


// ============================================================
// THREE.JS
// ============================================================

const scene =
    new THREE.Scene();

scene.background =
    new THREE.Color(
        0x080808
    );

scene.fog =
    new THREE.Fog(
        0x080808,
        5,
        35
    );


// ============================================================
// CAMERA
// ============================================================

const camera =
    new THREE.PerspectiveCamera(
        75,
        window.innerWidth /
        window.innerHeight,
        0.1,
        100
    );

camera.position.set(
    0,
    1.7,
    5
);


// ============================================================
// RENDERER
// ============================================================

const renderer =
    new THREE.WebGLRenderer({
        antialias: true
    });

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(
        window.devicePixelRatio,
        2
    )
);

game.appendChild(
    renderer.domElement
);


// ============================================================
// LIGHT
// ============================================================

const ambientLight =
    new THREE.HemisphereLight(
        0xffffff,
        0x222222,
        1.5
    );

scene.add(
    ambientLight
);


const flashlight =
    new THREE.PointLight(
        0xffffff,
        8,
        12
    );

flashlight.position.copy(
    camera.position
);

scene.add(
    flashlight
);


// ============================================================
// DUNGEON
// ============================================================

const wallMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x444444,
        roughness: 1
    });


const floorMaterial =
    new THREE.MeshStandardMaterial({
        color: 0x181818,
        roughness: 1
    });


// 바닥

const floor =
    new THREE.Mesh(
        new THREE.PlaneGeometry(
            50,
            50
        ),
        floorMaterial
    );

floor.rotation.x =
    -Math.PI / 2;

scene.add(
    floor
);


// 벽 목록

const walls = [];


// ============================================================
// WALL
// ============================================================

function createWall(
    x,
    z,
    width,
    depth
) {

    const wall =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                width,
                3,
                depth
            ),
            wallMaterial
        );

    wall.position.set(
        x,
        1.5,
        z
    );

    scene.add(
        wall
    );

    walls.push(
        wall
    );

}


// ============================================================
// DUNGEON STRUCTURE
// ============================================================

// 외벽

createWall(
    0,
    -15,
    30,
    1
);

createWall(
    0,
    15,
    30,
    1
);

createWall(
    -15,
    0,
    1,
    30
);

createWall(
    15,
    0,
    1,
    30
);


// 내부 벽

createWall(
    -7,
    -7,
    12,
    1
);

createWall(
    6,
    -7,
    8,
    1
);

createWall(
    -7,
    7,
    1,
    12
);

createWall(
    7,
    7,
    1,
    12
);

createWall(
    0,
    0,
    8,
    1
);

createWall(
    -5,
    3,
    1,
    7
);

createWall(
    5,
    -3,
    1,
    7
);


// ============================================================
// PLAYER
// ============================================================

const player = {

    hp: 100,

    speed: 5,

    ammo: 12,

    maxAmmo: 12,

    rotationY: 0,

    rotationX: 0,

    damage: 10,

    fireRate: 0.15,

    fireCooldown: 0

};


// ============================================================
// INPUT
// ============================================================

const keys = {};


// ============================================================
// KEY DOWN
// ============================================================

window.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;


        // ESC

        if (
            event.code === "Escape"
        ) {

            if (
                !gameStarted
            ) {

                return;

            }


            if (
                isGameOver
            ) {

                return;

            }


            if (
                !isPaused
            ) {

                pauseGame();

            }


            return;

        }


        // R

        if (
            event.code === "KeyR"
        ) {

            if (
                gameStarted &&
                !isPaused &&
                !isGameOver
            ) {

                reload();

            }

        }

    }
);


// ============================================================
// KEY UP
// ============================================================

window.addEventListener(
    "keyup",
    event => {

        keys[event.code] = false;

    }
);


// ============================================================
// POINTER LOCK
// ============================================================

startButton.addEventListener(
    "click",
    () => {

        console.log(
            "게임 시작 버튼 클릭!"
        );


        gameStarted = true;

        isPaused = false;

        isGameOver = false;


        intro.style.display =
            "none";

        game.style.display =
            "block";


        pauseScreen.style.display =
            "none";


        crosshair.style.display =
            "block";


        requestGamePointerLock();

    }
);


// ============================================================
// REQUEST POINTER LOCK
// ============================================================

function requestGamePointerLock() {

    if (
        isGameOver
    ) {

        return;

    }


    renderer.domElement.requestPointerLock();

}


// ============================================================
// POINTER LOCK CHANGE
// ============================================================

document.addEventListener(
    "pointerlockchange",
    () => {

        const locked =
            document.pointerLockElement ===
            renderer.domElement;


        console.log(
            "Pointer Lock:",
            locked
        );


        if (
            locked
        ) {

            console.log(
                "마우스가 게임 화면에 잠겼습니다."
            );


            if (
                gameStarted &&
                !isGameOver
            ) {

                isPaused = false;

                pauseScreen.style.display =
                    "none";

                crosshair.style.display =
                    "block";

            }

        }
        else {

            console.log(
                "Pointer Lock이 해제되었습니다."
            );


            if (
                gameStarted &&
                !isGameOver &&
                !isPaused
            ) {

                pauseGameUI();

            }

        }

    }
);


// ============================================================
// POINTER LOCK ERROR
// ============================================================

document.addEventListener(
    "pointerlockerror",
    () => {

        console.error(
            "Pointer Lock을 사용할 수 없습니다."
        );

    }
);


// ============================================================
// PAUSE
// ============================================================

function pauseGame() {

    if (
        isPaused ||
        isGameOver
    ) {

        return;

    }


    isPaused = true;


    pauseScreen.style.display =
        "flex";

    crosshair.style.display =
        "none";


    if (
        document.pointerLockElement ===
        renderer.domElement
    ) {

        document.exitPointerLock();

    }

}


// ============================================================
// PAUSE UI
// ============================================================

function pauseGameUI() {

    isPaused = true;


    pauseScreen.style.display =
        "flex";

    crosshair.style.display =
        "none";

}


// ============================================================
// RESUME
// ============================================================

resumeButton.addEventListener(
    "click",
    event => {

        event.stopPropagation();


        if (
            isGameOver
        ) {

            return;

        }


        console.log(
            "게임 계속하기!"
        );


        requestGamePointerLock();

    }
);


// ============================================================
// MOUSE LOOK
// ============================================================

document.addEventListener(
    "mousemove",
    event => {

        if (
            !gameStarted ||
            isPaused ||
            isGameOver
        ) {

            return;

        }


        if (
            document.pointerLockElement !==
            renderer.domElement
        ) {

            return;

        }


        const sensitivity =
            0.002;


        player.rotationY -=
            event.movementX *
            sensitivity;


        player.rotationX -=
            event.movementY *
            sensitivity;


        player.rotationX =
            THREE.MathUtils.clamp(
                player.rotationX,
                -Math.PI / 2,
                Math.PI / 2
            );


        camera.rotation.order =
            "YXZ";


        camera.rotation.y =
            player.rotationY;

        camera.rotation.x =
            player.rotationX;

    }
);


// ============================================================
// COLLISION
// ============================================================

const playerRadius =
    0.35;


function checkCollision(
    position
) {

    const playerBox =
        new THREE.Box3(

            new THREE.Vector3(
                position.x -
                playerRadius,
                0.2,
                position.z -
                playerRadius
            ),

            new THREE.Vector3(
                position.x +
                playerRadius,
                2,
                position.z +
                playerRadius
            )

        );


    for (
        const wall of walls
    ) {

        const wallBox =
            new THREE.Box3()
                .setFromObject(
                    wall
                );


        if (
            playerBox.intersectsBox(
                wallBox
            )
        ) {

            return true;

        }

    }


    return false;

}


// ============================================================
// PLAYER MOVEMENT
// ============================================================

const clock =
    new THREE.Clock();


function updatePlayer(
    delta
) {

    if (
        isPaused ||
        isGameOver
    ) {

        return;

    }


    const direction =
        new THREE.Vector3();


    camera.getWorldDirection(
        direction
    );


    direction.y = 0;

    direction.normalize();


    const right =
        new THREE.Vector3();


    right.crossVectors(
        direction,
        new THREE.Vector3(
            0,
            1,
            0
        )
    );


    right.normalize();


    const movement =
        new THREE.Vector3();


    if (
        keys["KeyW"]
    ) {

        movement.add(
            direction
        );

    }


    if (
        keys["KeyS"]
    ) {

        movement.sub(
            direction
        );

    }


    if (
        keys["KeyD"]
    ) {

        movement.add(
            right
        );

    }


    if (
        keys["KeyA"]
    ) {

        movement.sub(
            right
        );

    }


    if (
        movement.lengthSq() > 0
    ) {

        movement.normalize();


        movement.multiplyScalar(
            player.speed *
            delta
        );


        const newPosition =
            camera.position.clone();


        newPosition.add(
            movement
        );


        if (
            !checkCollision(
                newPosition
            )
        ) {

            camera.position.copy(
                newPosition
            );

        }

    }


    flashlight.position.copy(
        camera.position
    );


    // 발사 쿨다운

    if (
        player.fireCooldown > 0
    ) {

        player.fireCooldown -=
            delta;

    }

}


// ============================================================
// ENEMY
// ============================================================

const enemies = [];


function createEnemy(
    x,
    z
) {

    const material =
        new THREE.MeshStandardMaterial({
            color: 0x8b0000
        });


    const enemy =
        new THREE.Mesh(
            new THREE.BoxGeometry(
                0.9,
                1.8,
                0.9
            ),
            material
        );


    enemy.position.set(
        x,
        0.9,
        z
    );


    enemy.userData = {

        hp: 30,

        maxHp: 30,

        speed: 1.2,

        attackTimer: 0,

        hitTimer: 0

    };


    scene.add(
        enemy
    );

    enemies.push(
        enemy
    );

}


// 적 배치

createEnemy(
    -10,
    -10
);

createEnemy(
    10,
    -10
);

createEnemy(
    -10,
    10
);

createEnemy(
    10,
    10
);

createEnemy(
    0,
    -10
);


updateEnemyCount();


// ============================================================
// ENEMY AI
// ============================================================

function updateEnemies(
    delta
) {

    if (
        isPaused ||
        isGameOver
    ) {

        return;

    }


    for (
        let i =
            enemies.length - 1;

        i >= 0;

        i--
    ) {

        const enemy =
            enemies[i];


        const direction =
            camera.position
                .clone()
                .sub(
                    enemy.position
                );


        const distance =
            direction.length();


        // 추적

        if (
            distance > 1.7
        ) {

            direction.normalize();


            const movement =
                direction.multiplyScalar(
                    enemy.userData.speed *
                    delta
                );


            const newPosition =
                enemy.position.clone();


            newPosition.add(
                movement
            );


            if (
                !checkCollision(
                    newPosition
                )
            ) {

                enemy.position.copy(
                    newPosition
                );

            }

        }


        // 공격

        else {

            enemy.userData.attackTimer -=
                delta;


            if (
                enemy.userData.attackTimer <= 0
            ) {

                player.hp -= 10;


                enemy.userData.attackTimer =
                    1;


                updateHUD();


                if (
                    player.hp <= 0
                ) {

                    endGame();

                }

            }

        }


        // 피격 효과 복구

        if (
            enemy.userData.hitTimer > 0
        ) {

            enemy.userData.hitTimer -=
                delta;


            if (
                enemy.userData.hitTimer <= 0
            ) {

                enemy.material.color.set(
                    0x8b0000
                );

            }

        }


        // 플레이어 바라보기

        enemy.lookAt(
            camera.position.x,
            enemy.position.y,
            camera.position.z
        );

    }

}


// ============================================================
// SHOOTING
// ============================================================

const raycaster =
    new THREE.Raycaster();


window.addEventListener(
    "mousedown",
    event => {

        if (
            event.button !== 0
        ) {

            return;

        }


        if (
            !gameStarted ||
            isPaused ||
            isGameOver
        ) {

            return;

        }


        if (
            document.pointerLockElement !==
            renderer.domElement
        ) {

            return;

        }


        shoot();

    }
);


// ============================================================
// SHOOT
// ============================================================

function shoot() {

    // 발사 속도 제한

    if (
        player.fireCooldown > 0
    ) {

        return;

    }


    // 탄약 없음

    if (
        player.ammo <= 0
    ) {

        showMessage(
            "RELOAD!"
        );

        return;

    }


    // 발사 쿨다운

    player.fireCooldown =
        player.fireRate;


    // 탄약 감소

    player.ammo--;

    updateHUD();


    // 총 발사 효과

    createMuzzleFlash();


    // 화면 중앙에서 레이 발사

    raycaster.setFromCamera(
        new THREE.Vector2(
            0,
            0
        ),
        camera
    );


    const hits =
        raycaster.intersectObjects(
            enemies,
            false
        );


    // 적을 맞혔는지 확인

    if (
        hits.length === 0
    ) {

        showMessage(
            "MISS"
        );

        return;

    }


    const enemy =
        hits[0].object;


    // 데미지

    enemy.userData.hp -=
        player.damage;


    // 피격 효과

    enemy.material.color.set(
        0xffffff
    );

    enemy.userData.hitTimer =
        0.08;


    // 명중 효과

    showHitMarker();


    // 적 HP 표시

    showMessage(
        "HIT - " +
        Math.max(
            0,
            enemy.userData.hp
        ) +
        " HP"
    );


    // 적 처치

    if (
        enemy.userData.hp <= 0
    ) {

        killEnemy(
            enemy
        );

    }

}


// ============================================================
// MUZZLE FLASH
// ============================================================

function createMuzzleFlash() {

    const flash =
        new THREE.PointLight(
            0xffaa44,
            8,
            4
        );


    flash.position.copy(
        camera.position
    );


    scene.add(
        flash
    );


    setTimeout(
        () => {

            scene.remove(
                flash
            );

        },
        45
    );

}


// ============================================================
// HIT MARKER
// ============================================================

function showHitMarker() {

    crosshair.classList.add(
        "hit"
    );


    setTimeout(
        () => {

            crosshair.classList.remove(
                "hit"
            );

        },
        80
    );

}


// ============================================================
// KILL ENEMY
// ============================================================

function killEnemy(
    enemy
) {

    scene.remove(
        enemy
    );


    const index =
        enemies.indexOf(
            enemy
        );


    if (
        index !== -1
    ) {

        enemies.splice(
            index,
            1
        );

    }


    updateEnemyCount();


    showMessage(
        "ENEMY DOWN"
    );


    // 모든 적 처치

    if (
        enemies.length === 0
    ) {

        showMessage(
            "ALL ENEMIES DOWN!"
        );

    }

}


// ============================================================
// RELOAD
// ============================================================

function reload() {

    if (
        player.ammo ===
        player.maxAmmo
    ) {

        return;

    }


    player.ammo =
        player.maxAmmo;


    updateHUD();


    showMessage(
        "RELOADED"
    );

}


// ============================================================
// HUD
// ============================================================

function updateHUD() {

    hpText.textContent =
        Math.max(
            0,
            player.hp
        );


    ammoText.textContent =
        player.ammo;


    enemyCountText.textContent =
        enemies.length;

}


function updateEnemyCount() {

    enemyCountText.textContent =
        enemies.length;

}


// ============================================================
// MESSAGE
// ============================================================

let messageTimer = null;


function showMessage(
    text
) {

    message.textContent =
        text;


    clearTimeout(
        messageTimer
    );


    messageTimer =
        setTimeout(
            () => {

                message.textContent =
                    "";

            },
            700
        );

}


// ============================================================
// GAME OVER
// ============================================================

function endGame() {

    isGameOver = true;

    isPaused = false;


    gameover.style.display =
        "flex";


    pauseScreen.style.display =
        "none";


    crosshair.style.display =
        "none";


    if (
        document.pointerLockElement
    ) {

        document.exitPointerLock();

    }

}


// ============================================================
// RESIZE
// ============================================================

window.addEventListener(
    "resize",
    () => {

        camera.aspect =
            window.innerWidth /
            window.innerHeight;


        camera.updateProjectionMatrix();


        renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

    }
);


// ============================================================
// GAME LOOP
// ============================================================

function animate() {

    requestAnimationFrame(
        animate
    );


    const delta =
        Math.min(
            clock.getDelta(),
            0.05
        );


    updatePlayer(
        delta
    );


    updateEnemies(
        delta
    );


    renderer.render(
        scene,
        camera
    );

}


// ============================================================
// INITIALIZE
// ============================================================

updateHUD();

animate();
