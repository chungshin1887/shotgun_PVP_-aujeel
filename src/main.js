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
// PAUSE UI
// ============================================================

// HTML을 따로 수정하지 않고 JS에서 일시정지 화면 생성

const pauseScreen = document.createElement("div");

pauseScreen.id = "pauseScreen";

pauseScreen.innerHTML = `
    <div id="pauseBox">

        <div id="pauseTitle">
            PAUSED
        </div>

        <button id="resumeButton">
            계속하기
        </button>

        <div id="pauseHint">
            ESC를 누르면 게임으로 돌아갈 수 있습니다.
        </div>

    </div>
`;

document.body.appendChild(pauseScreen);


// Pause 화면 스타일

const pauseStyle = document.createElement("style");

pauseStyle.textContent = `

    #pauseScreen {

        position: fixed;

        inset: 0;

        display: none;

        align-items: center;

        justify-content: center;

        background: rgba(0, 0, 0, 0.75);

        z-index: 9999;

        font-family: Arial, sans-serif;

    }


    #pauseBox {

        text-align: center;

        background: rgba(20, 20, 20, 0.95);

        border: 2px solid #ffffff;

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

        color: #aaaaaa;

        font-size: 13px;

        margin-top: 20px;

    }

`;

document.head.appendChild(pauseStyle);


const resumeButton =
    document.getElementById("resumeButton");


// ============================================================
// GAME STATE
// ============================================================

let gameStarted = false;

let isPaused = false;

let isGameOver = false;


// ============================================================
// THREE.JS 기본 설정
// ============================================================

const scene = new THREE.Scene();

scene.background =
    new THREE.Color(0x080808);

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
// 벽 생성
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
// 던전 구조
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

    rotationX: 0

};


// ============================================================
// KEY INPUT
// ============================================================

const keys = {};


// 키 누름

window.addEventListener(
    "keydown",
    event => {

        keys[event.code] = true;


        // ----------------------------------------------------
        // ESC
        // ----------------------------------------------------

        if (
            event.code === "Escape"
        ) {

            // 게임이 시작되지 않았다면 무시

            if (
                !gameStarted
            ) {

                return;

            }


            // 게임 오버 상태라면 무시

            if (
                isGameOver
            ) {

                return;

            }


            // 현재 게임 중이면
            // Pointer Lock 해제 → Pause

            if (
                !isPaused
            ) {

                pauseGame();

            }

            // 현재 Pause라면
            // ESC를 다시 눌러도 자동으로 게임을 시작하지 않음

            // 반드시 "계속하기" 버튼을 클릭해서
            // 브라우저가 허용하는 사용자 입력으로
            // Pointer Lock을 다시 획득한다.

            return;

        }


        // ----------------------------------------------------
        // R = RELOAD
        // ----------------------------------------------------

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


// 키 뗌

window.addEventListener(
    "keyup",
    event => {

        keys[event.code] = false;

    }
);


// ============================================================
// POINTER LOCK
// ============================================================

// 게임 시작 버튼

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


        // Pointer Lock 요청

        requestGamePointerLock();

    }
);


// ============================================================
// Pointer Lock 요청 함수
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
// Pointer Lock 상태 확인
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


            // Pointer Lock을 얻었다면
            // Pause 상태 해제

            if (
                gameStarted &&
                !isGameOver
            ) {

                isPaused = false;

                pauseScreen.style.display =
                    "none";

            }

        }
        else {

            console.log(
                "Pointer Lock이 해제되었습니다."
            );


            // 게임 중 ESC 등으로 Pointer Lock이 풀렸다면

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
// Pointer Lock 오류
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
// PAUSE GAME
// ============================================================

function pauseGame() {

    if (
        isPaused ||
        isGameOver
    ) {

        return;

    }


    isPaused = true;


    // Pointer Lock 해제

    if (
        document.pointerLockElement ===
        renderer.domElement
    ) {

        document.exitPointerLock();

    }


    // Pause 화면

    pauseScreen.style.display =
        "flex";

}


// ============================================================
// PAUSE UI
// ============================================================

function pauseGameUI() {

    isPaused = true;


    pauseScreen.style.display =
        "flex";

}


// ============================================================
// RESUME
// ============================================================

resumeButton.addEventListener(
    "click",
    event => {

        // 버튼 클릭이 canvas로 전달되는 것을 방지

        event.stopPropagation();


        if (
            isGameOver
        ) {

            return;

        }


        console.log(
            "게임 계속하기!"
        );


        // Pointer Lock 다시 요청

        requestGamePointerLock();

    }
);


// ============================================================
// MOUSE LOOK
// ============================================================

document.addEventListener(
    "mousemove",
    event => {

        // 게임이 시작되지 않았으면 무시

        if (
            !gameStarted
        ) {

            return;

        }


        // Pause 상태면 무시

        if (
            isPaused
        ) {

            return;

        }


        // Pointer Lock이 아니면 무시

        if (
            document.pointerLockElement !==
            renderer.domElement
        ) {

            return;

        }


        const sensitivity =
            0.002;


        // 좌우 회전

        player.rotationY -=
            event.movementX *
            sensitivity;


        // 위아래 회전

        player.rotationX -=
            event.movementY *
            sensitivity;


        // 위아래 회전 제한

        player.rotationX =
            THREE.MathUtils.clamp(
                player.rotationX,
                -Math.PI / 2,
                Math.PI / 2
            );


        // FPS 카메라 회전

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

    // Pause 중이면 움직이지 않음

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


    // 오른쪽 방향

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


    // W

    if (
        keys["KeyW"]
    ) {

        movement.add(
            direction
        );

    }


    // S

    if (
        keys["KeyS"]
    ) {

        movement.sub(
            direction
        );

    }


    // D

    if (
        keys["KeyD"]
    ) {

        movement.add(
            right
        );

    }


    // A

    if (
        keys["KeyA"]
    ) {

        movement.sub(
            right
        );

    }


    // 이동

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


        // 벽 충돌

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


    // 손전등 위치

    flashlight.position.copy(
        camera.position
    );

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

        speed: 1.2,

        attackTimer: 0

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

    // Pause 중이면 적도 멈춤

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


        // 플레이어 추적

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

        // 게임이 시작되지 않았으면 무시

        if (
            !gameStarted
        ) {

            return;

        }


        // Pause 중이면 무시

        if (
            isPaused
        ) {

            return;

        }


        // 게임 오버면 무시

        if (
            isGameOver
        ) {

            return;

        }


        // Pointer Lock이 아니면 발사하지 않음

        if (
            document.pointerLockElement !==
            renderer.domElement
        ) {

            return;

        }


        // 좌클릭

        if (
            event.button !== 0
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

    // 탄약 없음

    if (
        player.ammo <= 0
    ) {

        showMessage(
            "RELOAD!"
        );

        return;

    }


    player.ammo--;

    updateHUD();


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
            enemies
        );


    // 적을 맞혔는지 확인

    if (
        hits.length > 0
    ) {

        const enemy =
            hits[0].object;


        enemy.userData.hp -=
            10;


        // 피격 효과

        enemy.material.color.set(
            0xffffff
        );


        setTimeout(
            () => {

                if (
                    enemy.parent
                ) {

                    enemy.material.color.set(
                        0x8b0000
                    );

                }

            },
            80
        );


        // 적 처치

        if (
            enemy.userData.hp <= 0
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

        }

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
            1000
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
// GAME START
// ============================================================

updateHUD();

animate();
