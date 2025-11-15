// ==================== 3D 도미노 게임 - Professional Edition ====================
// Three.js + Cannon.js 물리 엔진 기반 3D 도미노 시뮬레이션

class DominoGame3D {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.world = null;
        this.controls = null;

        this.dominoes = [];
        this.dominoBodies = [];
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.settings = {
            dominoSize: 1.5,
            dominoSpacing: 25,  // 간격 크게 늘림 (12 -> 25)
            autoRotate: true
        };

        this.currentName = '';
        this.lastTime = performance.now();
        this.frameCount = 0;
        this.lastFpsUpdate = performance.now();

        this.init();
    }

    init() {
        this.setupScene();
        this.setupPhysics();
        this.setupLights();
        this.setupGround();
        this.setupCamera();
        this.setupControls();
        this.setupEventListeners();
        this.hideLoading();
        this.animate();
    }

    setupScene() {
        // 씬 생성
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x1a1a2e);
        this.scene.fog = new THREE.Fog(0x1a1a2e, 50, 200);

        // 렌더러 설정
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
    }

    setupPhysics() {
        // Cannon.js 물리 세계 생성
        this.world = new CANNON.World();
        this.world.gravity.set(0, -15, 0); // 중력 (약하게 조정)
        this.world.broadphase = new CANNON.NaiveBroadphase();
        this.world.solver.iterations = 20; // 정확한 충돌 감지를 위해 증가
        this.world.defaultContactMaterial.friction = 0.5;
        this.world.defaultContactMaterial.restitution = 0.05;
        this.world.allowSleep = true; // Sleep 모드 활성화
    }

    setupLights() {
        // 주변광
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // 메인 디렉셔널 라이트 (태양광)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
        directionalLight.position.set(50, 100, 50);
        directionalLight.castShadow = true;

        // 그림자 품질 설정
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        directionalLight.shadow.bias = -0.0001;

        this.scene.add(directionalLight);

        // 포인트 라이트 (강조용)
        const pointLight1 = new THREE.PointLight(0x667eea, 2, 100);
        pointLight1.position.set(30, 20, 30);
        this.scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x764ba2, 2, 100);
        pointLight2.position.set(-30, 20, -30);
        this.scene.add(pointLight2);

        // 반구 조명 (하늘색)
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x362561, 0.6);
        this.scene.add(hemisphereLight);
    }

    setupGround() {
        // 3D 바닥 (시각적)
        const groundGeometry = new THREE.PlaneGeometry(200, 200);
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x2c3e50,
            roughness: 0.8,
            metalness: 0.2
        });

        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // 물리 바닥
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0,
            material: new CANNON.Material({ friction: 0.5, restitution: 0.1 })
        });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
        this.world.addBody(groundBody);

        // 그리드 헬퍼
        const gridHelper = new THREE.GridHelper(200, 50, 0x667eea, 0x444444);
        gridHelper.material.opacity = 0.3;
        gridHelper.material.transparent = true;
        this.scene.add(gridHelper);
    }

    setupCamera() {
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 50, 100);
        this.camera.lookAt(0, 0, 0);
    }

    setupControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 - 0.1;
        this.controls.minDistance = 20;
        this.controls.maxDistance = 200;
        this.controls.autoRotate = this.settings.autoRotate;
        this.controls.autoRotateSpeed = 0.5;
    }

    setupEventListeners() {
        // 생성 버튼
        document.getElementById('createBtn').addEventListener('click', () => {
            const nameInput = document.getElementById('nameInput');
            const name = nameInput.value.trim();

            if (name === '') {
                alert('텍스트를 입력해주세요!');
                return;
            }

            // 한글, 영어, 숫자만 허용
            const validRegex = /^[가-힣a-zA-Z0-9\s]+$/;
            if (!validRegex.test(name)) {
                alert('한글, 영어, 숫자만 입력 가능합니다!');
                return;
            }

            this.createDominoes(name);
        });

        // 초기화 버튼
        document.getElementById('resetBtn').addEventListener('click', () => {
            this.reset();
        });

        // 설정 변경
        document.getElementById('dominoSize').addEventListener('input', (e) => {
            this.settings.dominoSize = parseFloat(e.target.value);
            if (this.currentName) {
                this.createDominoes(this.currentName);
            }
        });

        document.getElementById('dominoSpacing').addEventListener('input', (e) => {
            this.settings.dominoSpacing = parseFloat(e.target.value);
            if (this.currentName) {
                this.createDominoes(this.currentName);
            }
        });

        document.getElementById('autoRotate').addEventListener('change', (e) => {
            this.settings.autoRotate = e.target.checked;
            this.controls.autoRotate = this.settings.autoRotate;
        });

        // 마우스 클릭 (도미노 쓰러뜨리기)
        this.renderer.domElement.addEventListener('click', (e) => {
            this.onMouseClick(e);
        });

        // 마우스 이동 (호버 효과)
        this.renderer.domElement.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        // 윈도우 리사이즈
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    extractTextOutline(text, fontSize) {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        tempCanvas.width = fontSize * 1.5;
        tempCanvas.height = fontSize * 1.5;

        tempCtx.font = `bold ${fontSize}px Malgun Gothic, sans-serif`;
        tempCtx.fillStyle = 'black';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        tempCtx.fillText(text, tempCanvas.width / 2, tempCanvas.height / 2);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const pixels = imageData.data;

        const outlinePoints = [];
        const step = 1;  // 2에서 1로 변경 - 더 많은 포인트 추출

        for (let y = 0; y < tempCanvas.height; y += step) {
            for (let x = 0; x < tempCanvas.width; x += step) {
                const index = (y * tempCanvas.width + x) * 4;
                const alpha = pixels[index + 3];

                if (alpha > 128) {
                    let isOutline = false;

                    for (let dy = -step; dy <= step; dy += step) {
                        for (let dx = -step; dx <= step; dx += step) {
                            if (dx === 0 && dy === 0) continue;

                            const nx = x + dx;
                            const ny = y + dy;

                            if (nx >= 0 && nx < tempCanvas.width && ny >= 0 && ny < tempCanvas.height) {
                                const nIndex = (ny * tempCanvas.width + nx) * 4;
                                if (pixels[nIndex + 3] < 128) {
                                    isOutline = true;
                                    break;
                                }
                            }
                        }
                        if (isOutline) break;
                    }

                    if (isOutline) {
                        outlinePoints.push({ x, y });
                    }
                }
            }
        }

        return outlinePoints;
    }

    sortPointsByPath(points) {
        if (points.length === 0) return [];

        const sorted = [points[0]];
        const remaining = points.slice(1);

        while (remaining.length > 0 && sorted.length < 10000) {  // 2000에서 10000으로 증가
            const last = sorted[sorted.length - 1];
            let minDist = Infinity;
            let minIndex = 0;

            for (let i = 0; i < remaining.length; i++) {
                const dist = Math.sqrt(
                    Math.pow(remaining[i].x - last.x, 2) +
                    Math.pow(remaining[i].y - last.y, 2)
                );

                if (dist < minDist) {
                    minDist = dist;
                    minIndex = i;
                }
            }

            sorted.push(remaining[minIndex]);
            remaining.splice(minIndex, 1);
        }

        return sorted;
    }

    createDominoes(name) {
        this.currentName = name;
        this.reset();

        const chars = name.replace(/\s/g, '').split('');
        const fontSize = 100;
        const charSpacing = fontSize * 2.5; // 글자 간격 증가
        const startX = -(chars.length - 1) * charSpacing / 2;

        let allCharPoints = []; // 각 글자별로 분리된 포인트 배열

        // 각 글자마다 외곽선 포인트 추출 및 정렬
        chars.forEach((char, charIndex) => {
            const outline = this.extractTextOutline(char, fontSize);

            const charPoints = outline.map(point => ({
                x: startX + charIndex * charSpacing + point.x - fontSize * 0.75,
                z: point.y - fontSize * 0.75
            }));

            // 각 글자의 포인트를 경로로 정렬
            const sortedCharPoints = this.sortPointsByPath(charPoints);
            allCharPoints.push(sortedCharPoints);
        });

        const dominoSpacing = this.settings.dominoSpacing;
        const scale = 0.15;

        // 각 글자마다 도미노 생성
        for (let charIndex = 0; charIndex < allCharPoints.length; charIndex++) {
            const charPoints = allCharPoints[charIndex];
            let distance = 0;

            for (let i = 0; i < charPoints.length - 1; i++) {
                const p1 = charPoints[i];
                const p2 = charPoints[i + 1];
                const dx = p2.x - p1.x;
                const dz = p2.z - p1.z;
                const segmentLength = Math.sqrt(dx * dx + dz * dz);

                distance += segmentLength;

                if (distance >= dominoSpacing) {
                    const angle = Math.atan2(dz, dx);
                    this.createDomino(
                        p2.x * scale,
                        p2.z * scale,
                        angle
                    );
                    distance = 0;
                }
            }

            // 글자 사이 연결 브릿지 도미노 생성
            if (charIndex < allCharPoints.length - 1) {
                // 현재 글자의 마지막 포인트
                const currentLast = charPoints[charPoints.length - 1];
                // 다음 글자의 첫 포인트
                const nextFirst = allCharPoints[charIndex + 1][0];

                this.createBridgeDominoes(
                    currentLast.x * scale,
                    currentLast.z * scale,
                    nextFirst.x * scale,
                    nextFirst.z * scale
                );
            }
        }

        // 마지막 글자와 첫 글자 연결 (원형 구조)
        if (allCharPoints.length > 0) {
            const lastChar = allCharPoints[allCharPoints.length - 1];
            const firstChar = allCharPoints[0];

            const lastPoint = lastChar[lastChar.length - 1];
            const firstPoint = firstChar[0];

            this.createBridgeDominoes(
                lastPoint.x * scale,
                lastPoint.z * scale,
                firstPoint.x * scale,
                firstPoint.z * scale
            );
        }

        this.updateDominoCount();
        console.log(`생성된 3D 도미노: ${this.dominoes.length}개`);
    }

    createBridgeDominoes(x1, z1, x2, z2) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        const distance = Math.sqrt(dx * dx + dz * dz);
        const angle = Math.atan2(dz, dx);

        const dominoSpacing = this.settings.dominoSpacing * 0.15; // 스케일 적용된 간격
        const numBridgeDominoes = Math.floor(distance / dominoSpacing);

        for (let i = 1; i <= numBridgeDominoes; i++) {
            const t = i / (numBridgeDominoes + 1);
            const x = x1 + dx * t;
            const z = z1 + dz * t;

            this.createDomino(x, z, angle, true); // 브릿지 도미노 표시
        }
    }

    createDomino(x, z, angle, isBridge = false) {
        const size = this.settings.dominoSize;
        const width = 0.8 * size;   // 너비
        const height = 5.0 * size;  // 높이
        const depth = 2.0 * size;   // 깊이

        // Three.js 메시
        const geometry = new THREE.BoxGeometry(width, height, depth);

        // 브릿지 도미노는 다른 색상
        const color = isBridge ? 0x9b59b6 : 0x3498db;
        const emissive = isBridge ? 0x8e44ad : 0x2980b9;

        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.4,
            metalness: 0.6,
            emissive: emissive,
            emissiveIntensity: 0.2
        });

        const domino = new THREE.Mesh(geometry, material);
        domino.position.set(x, height / 2, z);
        domino.rotation.y = angle;
        domino.castShadow = true;
        domino.receiveShadow = true;

        this.scene.add(domino);
        this.dominoes.push(domino);

        // Cannon.js 물리 바디
        const shape = new CANNON.Box(new CANNON.Vec3(width / 2, height / 2, depth / 2));
        const body = new CANNON.Body({
            mass: 1.5,
            shape: shape,
            material: new CANNON.Material({ friction: 0.5, restitution: 0.05 }),
            linearDamping: 0.1,  // 감쇠 줄여서 충돌 시 힘이 더 전달되도록
            angularDamping: 0.1,
            sleepSpeedLimit: 0.5,  // sleep 기준 높여서 쉽게 안 깨어나도록
            sleepTimeLimit: 0.2
        });

        body.position.set(x, height / 2, z);
        body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle);

        // 초기에는 sleep 상태로 설정하여 안정화
        body.allowSleep = true;
        body.sleepState = CANNON.Body.SLEEPING;

        // 충돌 시 조건부로 깨우기 - 충격이 충분히 클 때만
        body.addEventListener('collide', (event) => {
            // 충돌 속도 계산
            const relativeVelocity = event.contact.getImpactVelocityAlongNormal();

            // 충분히 강한 충격일 때만 깨우기 (임계값 높임: 1.0 -> 2.0)
            if (Math.abs(relativeVelocity) > 2.0) {
                if (event.body && event.body.sleepState === CANNON.Body.SLEEPING) {
                    event.body.wakeUp();
                }
            }
        });

        this.world.addBody(body);
        this.dominoBodies.push(body);

        // 메시와 바디 연결
        domino.userData.body = body;
    }

    onMouseClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.dominoes);

        if (intersects.length > 0) {
            const domino = intersects[0].object;
            const body = domino.userData.body;

            if (body) {
                // Sleep 상태 해제
                body.wakeUp();

                // 도미노에 힘을 가함 - 앞쪽 방향으로 강하게 밀기
                const euler = body.quaternion.toEuler();
                const forwardDirection = new CANNON.Vec3(
                    Math.sin(euler.y),
                    0,
                    -Math.cos(euler.y)
                );

                // 더 강한 힘으로 확실하게 쓰러뜨림 (200 -> 300)
                const force = forwardDirection.scale(300);
                const worldPoint = new CANNON.Vec3(
                    body.position.x,
                    body.position.y + 4.5,  // 위쪽에서 밀어서 쓰러뜨리기
                    body.position.z
                );
                body.applyImpulse(force, worldPoint);

                // 색상 변경
                domino.material.color.setHex(0xe74c3c);
                domino.material.emissive.setHex(0xc0392b);

                console.log('도미노 클릭! 연쇄 반응 시작...');
            }
        }
    }

    reset() {
        // 모든 도미노 제거
        this.dominoes.forEach(domino => {
            this.scene.remove(domino);
            domino.geometry.dispose();
            domino.material.dispose();
        });

        this.dominoBodies.forEach(body => {
            this.world.removeBody(body);
        });

        this.dominoes = [];
        this.dominoBodies = [];
        this.currentName = '';

        document.getElementById('nameInput').value = '';
        this.updateDominoCount();
    }

    updateDominoCount() {
        document.getElementById('dominoCount').textContent = `도미노: ${this.dominoes.length}개`;
    }

    hideLoading() {
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 1000);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        // 물리 시뮬레이션 업데이트
        this.world.step(1 / 60, deltaTime, 3);

        // Three.js 메시를 Cannon.js 바디와 동기화
        for (let i = 0; i < this.dominoes.length; i++) {
            const domino = this.dominoes[i];
            const body = this.dominoBodies[i];

            domino.position.copy(body.position);
            domino.quaternion.copy(body.quaternion);

            // 쓰러진 도미노 색상 변경
            if (body.position.y < 1) {
                domino.material.color.setHex(0xe74c3c);
            }
        }

        // 컨트롤 업데이트
        this.controls.update();

        // 렌더링
        this.renderer.render(this.scene, this.camera);

        // FPS 업데이트
        this.frameCount++;
        if (currentTime - this.lastFpsUpdate > 1000) {
            const fps = Math.round(this.frameCount / ((currentTime - this.lastFpsUpdate) / 1000));
            document.getElementById('fps').textContent = `FPS: ${fps}`;
            this.frameCount = 0;
            this.lastFpsUpdate = currentTime;
        }
    }
}

// 게임 초기화
window.addEventListener('DOMContentLoaded', () => {
    const game = new DominoGame3D();
});
