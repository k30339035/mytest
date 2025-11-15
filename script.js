class Domino {
    constructor(x, y, angle = 0) {
        this.x = x;
        this.y = y;
        this.width = 8;
        this.height = 20;
        this.angle = angle;
        this.rotationAngle = 0;
        this.isFalling = false;
        this.hasFallen = false;
        this.fallSpeed = 0;
    }

    update() {
        if (this.isFalling && !this.hasFallen) {
            this.fallSpeed += 0.8;
            this.rotationAngle += this.fallSpeed * 0.015;

            if (this.rotationAngle >= Math.PI / 2) {
                this.rotationAngle = Math.PI / 2;
                this.hasFallen = true;
            }
        }
    }

    fall() {
        if (!this.isFalling) {
            this.isFalling = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle + this.rotationAngle);

        // 도미노 본체
        ctx.fillStyle = this.hasFallen ? '#e74c3c' : '#3498db';
        ctx.fillRect(-this.width/2, -this.height, this.width, this.height);

        // 테두리
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.width/2, -this.height, this.width, this.height);

        ctx.restore();
    }

    getTopPosition() {
        const topX = this.x + Math.sin(this.angle + this.rotationAngle) * this.height;
        const topY = this.y - Math.cos(this.angle + this.rotationAngle) * this.height;
        return { x: topX, y: topY };
    }

    distanceTo(domino) {
        return Math.sqrt(
            Math.pow(this.x - domino.x, 2) +
            Math.pow(this.y - domino.y, 2)
        );
    }
}

class DominoGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.dominoes = [];
        this.animationId = null;
        this.currentName = '';
        this.fallingIndex = -1;

        this.setupCanvas();
        this.setupEventListeners();
        this.animate();
    }

    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    setupEventListeners() {
        document.getElementById('createBtn').addEventListener('click', () => {
            const nameInput = document.getElementById('nameInput');
            const name = nameInput.value.trim();

            if (name === '') {
                alert('이름을 입력해주세요!');
                return;
            }

            // 한글만 허용
            const koreanRegex = /^[가-힣\s]+$/;
            if (!koreanRegex.test(name)) {
                alert('한글만 입력 가능합니다!');
                return;
            }

            this.createDominoes(name);
        });

        document.getElementById('resetBtn').addEventListener('click', () => {
            this.reset();
        });

        this.canvas.addEventListener('click', (e) => {
            this.handleCanvasClick(e);
        });

        window.addEventListener('resize', () => {
            this.setupCanvas();
            if (this.currentName) {
                this.createDominoes(this.currentName);
            }
        });
    }

    extractTextOutline(text, fontSize) {
        // 임시 캔버스 생성
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');

        tempCanvas.width = fontSize * 1.5;
        tempCanvas.height = fontSize * 1.5;

        // 텍스트 렌더링
        tempCtx.font = `bold ${fontSize}px Malgun Gothic, sans-serif`;
        tempCtx.fillStyle = 'black';
        tempCtx.textAlign = 'center';
        tempCtx.textBaseline = 'middle';
        tempCtx.fillText(text, tempCanvas.width / 2, tempCanvas.height / 2);

        // 픽셀 데이터 가져오기
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        const pixels = imageData.data;

        // 외곽선 포인트 찾기
        const outlinePoints = [];
        const step = 2; // 샘플링 간격

        for (let y = 0; y < tempCanvas.height; y += step) {
            for (let x = 0; x < tempCanvas.width; x += step) {
                const index = (y * tempCanvas.width + x) * 4;
                const alpha = pixels[index + 3];

                if (alpha > 128) {
                    // 현재 픽셀이 글자의 일부인지 확인
                    // 주변 픽셀 중 하나라도 비어있으면 외곽선
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

    createDominoes(name) {
        this.currentName = name;
        this.dominoes = [];
        this.fallingIndex = -1;

        const chars = name.replace(/\s/g, '').split('');
        const fontSize = 150;
        const charSpacing = fontSize * 1.8;
        const startX = 100;
        const startY = this.canvas.height / 2;

        let allPoints = [];

        chars.forEach((char, charIndex) => {
            const outline = this.extractTextOutline(char, fontSize);

            // 포인트들을 실제 캔버스 좌표로 변환
            outline.forEach(point => {
                allPoints.push({
                    x: startX + charIndex * charSpacing + point.x,
                    y: startY + point.y - fontSize * 0.75
                });
            });
        });

        // 포인트들을 경로로 정렬 (가장 가까운 점 찾기)
        const sortedPoints = this.sortPointsByPath(allPoints);

        // 일정 간격으로 도미노 배치
        const dominoSpacing = 12;
        let distance = 0;

        for (let i = 0; i < sortedPoints.length - 1; i++) {
            const p1 = sortedPoints[i];
            const p2 = sortedPoints[i + 1];
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const segmentLength = Math.sqrt(dx * dx + dy * dy);

            distance += segmentLength;

            if (distance >= dominoSpacing) {
                const angle = Math.atan2(dy, dx) + Math.PI / 2;
                this.dominoes.push(new Domino(p2.x, p2.y, angle));
                distance = 0;
            }
        }

        console.log(`생성된 도미노: ${this.dominoes.length}개`);
    }

    sortPointsByPath(points) {
        if (points.length === 0) return [];

        const sorted = [points[0]];
        const remaining = points.slice(1);

        while (remaining.length > 0 && sorted.length < 1000) {
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

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 클릭한 위치에서 가장 가까운 도미노 찾기
        let closestIndex = -1;
        let minDist = Infinity;

        this.dominoes.forEach((domino, index) => {
            const dist = Math.sqrt(
                Math.pow(domino.x - mouseX, 2) +
                Math.pow(domino.y - mouseY, 2)
            );

            if (dist < minDist && dist < 30) {
                minDist = dist;
                closestIndex = index;
            }
        });

        if (closestIndex !== -1 && this.fallingIndex === -1) {
            this.startDominoEffect(closestIndex);
        }
    }

    startDominoEffect(startIndex) {
        this.fallingIndex = startIndex;
        this.dominoes[startIndex].fall();

        const fallInterval = setInterval(() => {
            if (this.fallingIndex >= this.dominoes.length - 1) {
                clearInterval(fallInterval);
                return;
            }

            // 다음 도미노가 쓰러질 조건 확인
            const current = this.dominoes[this.fallingIndex];

            if (current.hasFallen || current.rotationAngle > 0.3) {
                this.fallingIndex++;
                if (this.fallingIndex < this.dominoes.length) {
                    this.dominoes[this.fallingIndex].fall();
                }
            }
        }, 50);
    }

    reset() {
        this.dominoes = [];
        this.currentName = '';
        this.fallingIndex = -1;
        document.getElementById('nameInput').value = '';
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 도미노 업데이트 및 그리기
        this.dominoes.forEach(domino => {
            domino.update();
            domino.draw(this.ctx);
        });

        // 도미노 개수 표시
        if (this.dominoes.length > 0) {
            this.ctx.fillStyle = '#333';
            this.ctx.font = '14px Malgun Gothic';
            this.ctx.fillText(`도미노 개수: ${this.dominoes.length}`, 10, 20);
        }

        this.animationId = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
    }
}

// 게임 초기화
let game;
window.addEventListener('DOMContentLoaded', () => {
    game = new DominoGame();
});

window.addEventListener('beforeunload', () => {
    if (game) {
        game.destroy();
    }
});
