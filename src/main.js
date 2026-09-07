import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";


// ============================================================
// GAME
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
// THREE.JS 기본 설정
// ============================================================

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x080808);

scene.fog = new THREE.Fog(
    0x080808,
    5,
    35
);


const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
);

camera.position.set(
    0,
    1.7,
    5
);


// Renderer

const renderer = new THREE.WebGLRenderer({
    antialias: true
});

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);

renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, 2)
);

game.appendChild(renderer.domElement);


// ============================================================
// LIGHT
// ============================================================

const ambientLight = new THREE.HemisphereLight(
    0xffffff,
    0x222222,
    1.5
);

scene.add(ambientLight);


const flashlight = new THREE.PointLight(
    0xffffff,
    8,
    12
);

flashlight.position.copy(camera.position);

scene.add(flashlight);


// ============================================================
// DUNGEON
// ============================================================

const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x444444,
    roughness: 1
});


const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0x181818,
    roughness: 1
});


// 바닥

const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    floorMaterial
);

floor.rotation.x = -Math.PI / 2;

scene.add(floor);


// 벽을 만드는 함수

const walls = [];

function createWall(x, z, width, depth) {

    const wall = new THREE.Mesh(
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

    scene.add(wall);

    walls.push(wall);
}


// ============================================================
// 던전 구조
// ============================================================

// 바깥 벽

createWall(0, -15, 30, 1);
createWall(0, 15, 30, 1);
createWall(-15, 0, 1, 30);
createWall(15, 0, 1, 30);


// 내부 벽

createWall(-7, -7, 12, 1);
createWall(6, -7, 8, 1);

createWall(-7, 7, 1, 12);
createWall(7, 7, 1, 12);

createWall(0, 0, 8, 1);

createWall(-5, 3, 1, 7);
createWall(5, -3, 1, 7);


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


// 키 입력

const keys = {};

window.addEventListener("keydown", event => {

    keys[event.code] = true;

});


window.addEventListener("keyup", event => {

    keys[event.code] = false;

});


// ============================================================
// POINTER LOCK
// ============================================================

startButton.addEventListener("click", () => {

    intro.style.display = "none";
    game.style.display = "block";

    renderer.domElement.requestPointerLock();

});


document.addEventListener(
    "mousemove",
    event => {

        if (
            document.pointerLockElement !== renderer.domElement
        ) {
            return;
        }

        const sensitivity = 0.002;

        player.rotationY -=
            event.movementX * sensitivity;

        player.rotationX -=
            event.movementY * sensitivity;

        // 위아래 회전 제한

        player.rotationX = THREE.MathUtils.clamp(
            player.rotationX,
            -Math.PI / 2,
            Math.PI / 2
        );

        camera.rotation.order = "YXZ";

        camera.rotation.y =
            player.rotationY;

        camera.rotation.x =
            player.rotationX;

    }
);


// ============================================================
// COLLISION
// ============================================================

const playerRadius = 0.35;


function checkCollision(position) {

    const playerBox = new THREE.Box3(
        new THREE.Vector3(
            position.x - playerRadius,
            0.2,
            position.z - playerRadius
        ),
        new THREE.Vector3(
            position.x + playerRadius,
            2,
            position.z + playerRadius
        )
    );


    for (const wall of walls) {

        const wallBox =
            new THREE.Box3().setFromObject(wall);

        if (
            playerBox.intersectsBox(wallBox)
        ) {
            return true;
        }

    }

    return false;
}


// ============================================================
// MOVEMENT
// ============================================================

const clock = new THREE.Clock();


function updatePlayer(delta) {

    const direction =
        new THREE.Vector3();


    camera.getWorldDirection(direction);

    direction.y = 0;

    direction.normalize();


    const right =
        new THREE.Vector3();

    right.crossVectors(
        direction,
        new THREE.Vector3(0, 1, 0)
    ).normalize();


    const movement =
        new THREE.Vector3();


    if (keys["KeyW"]) {

        movement.add(direction);

    }

    if (keys["KeyS"]) {

        movement.sub(direction);

    }

    if (keys["KeyD"]) {

        movement.add(right);

    }

    if (keys["KeyA"]) {

        movement.sub(right);

    }


    if (movement.lengthSq() > 0) {

        movement.normalize();

        movement.multiplyScalar(
            player.speed * delta
        );


        const newPosition =
            camera.position.clone();

        newPosition.add(movement);


        if (!checkCollision(newPosition)) {

            camera.position.copy(
                newPosition
            );

        }

    }


    flashlight.position.copy(
        camera.position
    );

}


// ============================================================
// ENEMY
// ============================================================

const enemies = [];


function createEnemy(x, z) {

    const material =
        new THREE.MeshStandardMaterial({
            color: 0x8b0000
        });


    const enemy = new THREE.Mesh(
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


    scene.add(enemy);

    enemies.push(enemy);

}


// 적 생성

createEnemy(-10, -10);
createEnemy(10, -10);
createEnemy(-10, 10);
createEnemy(10, 10);
createEnemy(0, -10);

updateEnemyCount();


// ============================================================
// ENEMY AI
// ============================================================

function updateEnemies(delta) {

    for (
        let i = enemies.length - 1;
        i >= 0;
        i--
    ) {

        const enemy = enemies[i];

        const direction =
            camera.position
                .clone()
                .sub(enemy.position);


        const distance =
            direction.length();


        if (distance > 1.7) {

            direction.normalize();

            const movement =
                direction.multiplyScalar(
                    enemy.userData.speed * delta
                );


            const newPosition =
                enemy.position.clone();

            newPosition.add(movement);


            if (!checkCollision(newPosition)) {

                enemy.position.copy(
                    newPosition
                );

            }

        }
        else {

            enemy.userData.attackTimer -= delta;


            if (
                enemy.userData.attackTimer <= 0
            ) {

                player.hp -= 10;

                enemy.userData.attackTimer = 1;

                updateHUD();

                if (player.hp <= 0) {

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

        if (
            document.pointerLockElement !==
            renderer.domElement
        ) {
            return;
        }

        if (event.button !== 0) {
            return;
        }

        shoot();

    }
);


function shoot() {

    if (player.ammo <= 0) {

        showMessage("RELOAD!");

        return;

    }


    player.ammo--;

    updateHUD();


    // 화면 중앙에서 Ray 발사

    raycaster.setFromCamera(
        new THREE.Vector2(0, 0),
        camera
    );


    const hits =
        raycaster.intersectObjects(
            enemies
        );


    if (hits.length > 0) {

        const enemy =
            hits[0].object;


        enemy.userData.hp -= 10;


        // 피격 효과

        enemy.material.color.set(
            0xffffff
        );


        setTimeout(() => {

            if (enemy.parent) {

                enemy.material.color.set(
                    0x8b0000
                );

            }

        }, 80);


        if (
            enemy.userData.hp <= 0
        ) {

            scene.remove(enemy);

            const index =
                enemies.indexOf(enemy);

            if (index !== -1) {

                enemies.splice(
                    index,
                    1
                );

            }

            updateEnemyCount();

            showMessage("ENEMY DOWN");

        }

    }

}


// ============================================================
// RELOAD
// ============================================================

window.addEventListener(
    "keydown",
    event => {

        if (event.code === "KeyR") {

            reload();

        }

    }
);


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

    showMessage("RELOADING...");

}


// ============================================================
// HUD
// ============================================================

function updateHUD() {

    hpText.textContent =
        Math.max(0, player.hp);

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


function showMessage(text) {

    message.textContent = text;


    clearTimeout(messageTimer);


    messageTimer = setTimeout(() => {

        message.textContent = "";

    }, 1000);

}


// ============================================================
// GAME OVER
// ============================================================

function endGame() {

    gameover.style.display =
        "flex";


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


    updatePlayer(delta);

    updateEnemies(delta);

    renderer.render(
        scene,
        camera
    );

}


updateHUD();

animate();
