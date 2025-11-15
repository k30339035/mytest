class Domino {
    constructor(x, y, char, index) {
        this.x = x;
        this.y = y;
        this.char = char;
        this.index = index;
        this.width = 40;
        this.height = 80;
        this.angle = 0;
        this.targetAngle = 0;
        this.isFalling = false;
        this.hasFallen = false;
        this.fallSpeed = 0;
        this.baseY = y;
    }

    update() {
        if (this.isFalling && !this.hasFallen) {
            this.fallSpeed += 0.5;
            this.angle += this.fallSpeed * 0.02;

            if (this.angle >= Math.PI / 2) {
                this.angle = Math.PI / 2;
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

        // 도미노의 중심점으로 이동 (하단 중앙)
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // 그림자
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;

        // 도미노 본체
        const gradient = ctx.createLinearGradient(-this.width/2, -this.height, this.width/2, 0);
        gradient.addColorStop(0, '#4facfe');
        gradient.addColorStop(1, '#00f2fe');

        ctx.fillStyle = gradient;
        ctx.fillRect(-this.width/2, -this.height, this.width, this.height);

        // 테두리
        ctx.strokeStyle = '#2c3e50';
        ctx.lineWidth = 3;
        ctx.strokeRect(-this.width/2, -this.height, this.width, this.height);

        // 글자 그리기
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = 'white';
        ctx.font = 'bold 24px Malgun Gothic';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.char, 0, -this.height/2);

        ctx.restore();
    }

    isClicked(mouseX, mouseY) {
        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        return Math.abs(dx) < this.width/2 && dy > -this.height && dy < 0;
    }
}

class DominoGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.dominoes = [];
        this.animationId = null;
        this.currentName = '';

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

        // 반응형 리사이즈
        window.addEventListener('resize', () => {
            this.setupCanvas();
            if (this.currentName) {
                this.createDominoes(this.currentName, true);
            }
        });
    }

    createDominoes(name, skipAnimation = false) {
        this.currentName = name;
        this.dominoes = [];

        const chars = name.replace(/\s/g, '').split('');
        const spacing = 100;
        const startX = (this.canvas.width - (chars.length - 1) * spacing) / 2;
        const baseY = this.canvas.height - 100;

        chars.forEach((char, index) => {
            const domino = new Domino(
                startX + index * spacing,
                baseY,
                char,
                index
            );
            this.dominoes.push(domino);
        });

        if (!skipAnimation) {
            this.showCreationAnimation();
        }
    }

    showCreationAnimation() {
        let index = 0;
        const interval = setInterval(() => {
            if (index < this.dominoes.length) {
                const domino = this.dominoes[index];
                domino.y = domino.baseY;
                index++;
            } else {
                clearInterval(interval);
            }
        }, 100);
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        this.dominoes.forEach((domino, index) => {
            if (domino.isClicked(mouseX, mouseY) && !domino.isFalling) {
                this.startDominoEffect(index);
            }
        });
    }

    startDominoEffect(startIndex) {
        let currentIndex = startIndex;

        const fallNext = () => {
            if (currentIndex < this.dominoes.length) {
                const domino = this.dominoes[currentIndex];
                domino.fall();
                currentIndex++;
                setTimeout(fallNext, 200);
            }
        };

        fallNext();
    }

    reset() {
        this.dominoes = [];
        this.currentName = '';
        document.getElementById('nameInput').value = '';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 바닥 그리기
        this.ctx.fillStyle = '#8B4513';
        this.ctx.fillRect(0, this.canvas.height - 50, this.canvas.width, 50);

        // 도미노 업데이트 및 그리기
        this.dominoes.forEach(domino => {
            domino.update();
            domino.draw(this.ctx);
        });

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
