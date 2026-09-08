// ============================================================
// SHOOTING
// ============================================================

const raycaster = new THREE.Raycaster();

window.addEventListener(
    "mousedown",
    event => {

        // 게임 시작 전
        if (!gameStarted) {
            return;
        }

        // 일시정지 중
        if (isPaused) {
            return;
        }

        // 게임 오버
        if (isGameOver) {
            return;
        }

        // Pointer Lock이 아니면 발사하지 않음
        if (
            document.pointerLockElement !==
            renderer.domElement
        ) {
            return;
        }

        // 좌클릭만 사용
        if (event.button !== 0) {
            return;
        }

        shoot();
    }
);


// ============================================================
// SHOOT
// ============================================================

function shoot() {

    // --------------------------------------------------------
    // 탄약 확인
    // --------------------------------------------------------

    if (player.ammo <= 0) {

        showMessage("RELOAD!");

        return;
    }


    // --------------------------------------------------------
    // 탄약 감소
    // --------------------------------------------------------

    player.ammo--;

    updateHUD();


    // --------------------------------------------------------
    // 총구 효과
    // --------------------------------------------------------

    createMuzzleFlash();


    // --------------------------------------------------------
    // 화면 중앙에서 레이 발사
    // --------------------------------------------------------

    raycaster.setFromCamera(
        new THREE.Vector2(0, 0),
        camera
    );


    // --------------------------------------------------------
    // 벽과 적을 각각 검사
    // --------------------------------------------------------

    const wallHits =
        raycaster.intersectObjects(
            walls,
            false
        );

    const enemyHits =
        raycaster.intersectObjects(
            enemies,
            false
        );


    // --------------------------------------------------------
    // 가장 가까운 벽
    // --------------------------------------------------------

    const nearestWall =
        wallHits.length > 0
            ? wallHits[0]
            : null;


    // --------------------------------------------------------
    // 가장 가까운 적
    // --------------------------------------------------------

    const nearestEnemy =
        enemyHits.length > 0
            ? enemyHits[0]
            : null;


    // --------------------------------------------------------
    // 아무것도 맞지 않음
    // --------------------------------------------------------

    if (
        !nearestWall &&
        !nearestEnemy
    ) {

        showMessage("MISS");

        return;
    }


    // --------------------------------------------------------
    // 벽이 적보다 가까움
    //
    // 플레이어
    //    ↓
    //   벽
    //    ↓
    //   적
    //
    // → 벽에 총알이 막힘
    // --------------------------------------------------------

    if (
        nearestWall &&
        nearestEnemy &&
        nearestWall.distance <
        nearestEnemy.distance
    ) {

        showMessage("WALL");

        return;
    }


    // --------------------------------------------------------
    // 벽만 맞음
    // --------------------------------------------------------

    if (
        nearestWall &&
        !nearestEnemy
    ) {

        showMessage("WALL");

        return;
    }


    // --------------------------------------------------------
    // 적을 맞힘
    // --------------------------------------------------------

    if (nearestEnemy) {

        const enemy =
            nearestEnemy.object;


        // ----------------------------------------------------
        // 데미지
        // ----------------------------------------------------

        enemy.userData.hp -=
            player.damage;


        // ----------------------------------------------------
        // 피격 효과
        // ----------------------------------------------------

        enemy.material.color.set(
            0xffffff
        );

        enemy.userData.hitTimer =
            0.08;


        // ----------------------------------------------------
        // 히트 마커
        // ----------------------------------------------------

        showHitMarker();


        // ----------------------------------------------------
        // 적 HP 표시
        // ----------------------------------------------------

        showMessage(
            "HIT - " +
            Math.max(
                0,
                enemy.userData.hp
            ) +
            " HP"
        );


        // ----------------------------------------------------
        // 적 사망
        // ----------------------------------------------------

        if (
            enemy.userData.hp <= 0
        ) {

            killEnemy(
                enemy
            );
        }
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


    if (
        enemies.length === 0
    ) {

        showMessage(
            "ALL ENEMIES DOWN!"
        );
    }
}
