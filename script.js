const { Application, Graphics } = PIXI;

const INIT_SNAKE_SIZE = 3;
const BOARD_COLOR = '#575757';
const BRICK_COLOR = '#A96A0E';
const SNAKE_COLOR = '#B8B928';
const FOOT_COLOR = '#27865D';
const PORTAL_COLOR = '#0764a3';
const SNAKE_HEAD_COLOR = '#F4F2F5';
const CELL_SIZE = 30;
const BOARD_SIZE = 20;
const SPEED_STEP = .1;
const INIT_SPEED = 12
const GAME_MODES = {
    classic: 1,
    god: 2,
    walls: 3,
    portal: 4,
    speed: 5,
};
const SELECTORS = {
    buttons: {
        play: '#play-button',
        exit: '#exit-button',
        menu: '#menu-button',
    },
    texts: {
        score: '#score',
        bestScore: '#best-score',
        gameOver: '#game-over',
    },
    modes: '#game-modes',
    game: '#game',
};

class Game {
    constructor() {
        this.app = new Application();
        this.app.init({
            width: BOARD_SIZE * CELL_SIZE,
            height: BOARD_SIZE * CELL_SIZE,
            backgroundColor: BOARD_COLOR,
        }).then(() => {
            document.querySelector(SELECTORS.game).appendChild(this.app.view);
            this.createBorder();

            this.footCounter = 0;
            this.bestScore = 0;
            this.currentScore = 0;
    
            this.snake = new Snake(this);
            this.food = new Food(this);
            this.portalFood = new Food(this, this.food);
            this.wall = [];
            this.mode = GAME_MODES.classic;
    
            this.setupControls();
            this.setupGUI();
            this.gameLoop = this.gameLoop.bind(this);

        })
    }

    createBorder() {
        const border = new Graphics();
        const borderSize = BOARD_SIZE * CELL_SIZE;
        border.rect(0, 0, borderSize, borderSize);
        border.stroke({ color: BRICK_COLOR, width: CELL_SIZE, alignment: 1 });
        border.position.set(0, 0);
        this.app.stage.addChild(border);
    }

    setupControls() {
        window.addEventListener('keydown', (event) => {
            switch (event.key) {
                case 'ArrowUp': return this.snake.switchDirection(0, -1);
                case 'ArrowDown': return this.snake.switchDirection(0, 1);
                case 'ArrowLeft': return this.snake.switchDirection(-1, 0);
                case 'ArrowRight': return this.snake.switchDirection(1, 0);
            }
        });
    }

    setupGUI() {
        this.playButton = document.querySelector(SELECTORS.buttons.play);
        this.exitButton = document.querySelector(SELECTORS.buttons.exit);
        this.menuButton = document.querySelector(SELECTORS.buttons.menu);
        this.bestScoreLabel = document.querySelector(SELECTORS.texts.bestScore);
        this.currentScoreLabel = document.querySelector(SELECTORS.texts.score);

        this.playButton.addEventListener('click', () => this.startGame());
        this.exitButton.addEventListener('click', () => this.exitGame());
        this.menuButton.addEventListener('click', () => this.showMenu());

        const modes = document.getElementsByName('mode');
        modes.forEach((mode) =>mode.addEventListener('change', (e) => this.mode = +e.target.value));
    }

    exitGame() {
        this.resetGame();
        this.bestScore = 0;
        this.bestScoreLabel.textContent = this.bestScore;
    }

    startGame() {
        this.playButton.style.display = 'none';
        this.exitButton.style.display = 'none';
        document.querySelector(SELECTORS.modes).style.display = 'none';
        this.menuButton.style.display = 'block';
        this.resetGame();
        this.app.ticker.add(this.gameLoop);
    }

    resetGame() {
        this.currentScore = 0;
        this.updateScore();

        this.snake.reset();
        this.food.spawn();
        if (this.mode === GAME_MODES.portal) {
            this.portalFood.spawn();
        } else {
            this.portalFood.hide();
        }

        this.wall.forEach(brick => this.app.stage.removeChild(brick.sprite));
        this.wall = [];
    }

    showMenu() {
        this.playButton.style.display = 'block';
        this.exitButton.style.display = 'block';
        document.querySelector(SELECTORS.modes).style.display = 'flex';
        document.querySelector(SELECTORS.texts.gameOver).style.display = 'none';
        this.menuButton.style.display = 'none';

        this.app.ticker.remove(this.gameLoop);
    }

    updateScore() {
        this.currentScoreLabel.textContent = this.currentScore;
        if (this.currentScore > this.bestScore) {
            this.bestScore = this.currentScore;
            this.bestScoreLabel.textContent = this.bestScore;
        }
    }

    ate() {
        if (this.snake.head.x === this.food.position.x && this.snake.head.y === this.food.position.y) {
            return this.food;
        };
        if (this.mode === GAME_MODES.portal) {
            if (this.snake.head.x === this.portalFood.position.x && this.snake.head.y === this.portalFood.position.y) {
                return this.portalFood;
            };
        }
        return null;
    }

    crashed() {
        if (this.mode === GAME_MODES.walls) {
            for (let brick of this.wall) {
                if (this.snake.head.x === brick.position.x && this.snake.head.y === brick.position.y) {
                    return true;
                }
            }
        }
        return false
    }

    bitten() {
        if (this.mode !== GAME_MODES.god) {
            let head = this.snake.body[0];
            for (let i = 1; i < this.snake.body.length; i++) {
                if (head.x === this.snake.body[i].x && head.y === this.snake.body[i].y) {
                    return true;
                }
            }
        }
        return false;
    }

    fellOut() {
        if (this.mode !== GAME_MODES.god) {
            let head = this.snake.body[0];
            return head.x < 1 || head.x >= BOARD_SIZE -1 || head.y < 1 || head.y >= BOARD_SIZE - 1;
        }
        return false;
    }

    gameLoop() {
        if (this.fellOut() || this.bitten() || this.crashed()) return this.gameOver();
        this.snake.move();

        const eatenFoot = this.ate();
        if (eatenFoot) {
            this.snake.grow();
            if (this.footCounter === 0) this.currentScore += 1;
            this.updateScore();

            if (this.mode === GAME_MODES.walls) {
                let brick = new Brick(this);
                this.wall.push(brick);
            } else if (this.mode === GAME_MODES.speed) {
                this.snake.speedUp();
            }

            if (this.mode === GAME_MODES.portal) {
                const fromFoot = eatenFoot;
                const toFoot = fromFoot === this.food ? this.portalFood : this.food;
                if (!this.snake.teleportation) {
                    this.footCounter = this.snake.size;
                    this.snake.teleportation = {
                        x: toFoot.position.x - fromFoot.position.x,
                        y: toFoot.position.y - fromFoot.position.y,
                    };
                }
            }

            if (this.mode !== GAME_MODES.portal) this.food.spawn();
        }
        if (this.mode === GAME_MODES.god) this.snake.wrapAround();
    }

    gameOver() {
        this.app.ticker.remove(this.gameLoop);
        document.querySelector(SELECTORS.texts.gameOver).style.display = 'block';
    }
}

class Snake {
    constructor(game) {
        this.game = game;
        this.teleportation = null;
        this.reset();
    }

    reset() {
        if (this.body) {
            this.body.forEach(segment => {
                this.game.app.stage.removeChild(segment.sprite);
            });
        }
        this.body = [];
        this.direction = { x: 1, y: 0 };
        this.speed = INIT_SPEED;
        this.moveCounter = 0;
        this.growing = false;
        this.createSnake();
    }

    createSnake() {
        for (let i = 0; i < INIT_SNAKE_SIZE; i++) {
            let x = BOARD_SIZE / 2 - i;
            let y = BOARD_SIZE / 2;
            this.initUnit(x, y, i === 0);
        }
        this.size = INIT_SNAKE_SIZE;
    }

    initUnit(x, y, isHead) {
        let unit = new Graphics();
        unit.beginFill(isHead ? SNAKE_HEAD_COLOR : SNAKE_COLOR);
        unit.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
        unit.endFill();
        unit.x = x * CELL_SIZE;
        unit.y = y * CELL_SIZE;
        this.game.app.stage.addChild(unit);
        this.body.push({ x, y, sprite: unit });
    }

    switchDirection(x, y) {
        if (this.direction.x + x !== 0 || this.direction.y + y !== 0) {
            this.direction = { x, y };
        }
    }

    move() {
        this.moveCounter++;
        if (this.moveCounter >= this.speed) {
            let kX = 0;
            let kY = 0;
            if (this.teleportation) {
                kX = this.teleportation.x;
                kY = this.teleportation.y;
                this.teleportation = null;
            }
            this.moveCounter = 0;
            
            let newX = this.body[0].x + this.direction.x + kX;
            let newY = this.body[0].y + this.direction.y + kY;

            this.body[0].sprite.beginFill(SNAKE_COLOR);
            this.body[0].sprite.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
            this.body[0].sprite.endFill();

            let newHead = { x: newX, y: newY, sprite: this.addHead(newX, newY) };
            this.body.unshift(newHead);

            if (!this.growing) {
                let tail = this.body.pop();
                this.game.app.stage.removeChild(tail.sprite);
            } else {
                this.growing = false;
                this.size += 1;
            }

            if (this.game.mode === GAME_MODES.portal && this.game.footCounter > 0) {
                this.game.footCounter -= 1;
                if (this.game.footCounter === 0) {
                    this.game.food.spawn();
                    this.game.portalFood.spawn();
                }
            }
        }
    }

    addHead(x, y) {
        let unit = new Graphics();
        unit.beginFill(SNAKE_HEAD_COLOR);
        unit.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
        unit.endFill();
        unit.x = x * CELL_SIZE;
        unit.y = y * CELL_SIZE;
        this.game.app.stage.addChild(unit);
        return unit;
    }

    grow() {
        this.growing = true;
    }

    checkWallCollision() {
        let head = this.body[0];
        return head.x < 0 || head.x >= BOARD_SIZE || head.y < 0 || head.y >= BOARD_SIZE;
    }

    wrapAround() {
        let head = this.body[0];
        if (head.x < 0) head.x = BOARD_SIZE - 1;
        else if (head.x >= BOARD_SIZE) head.x = 0;
        if (head.y < 0) head.y = BOARD_SIZE - 1;
        else if (head.y >= BOARD_SIZE) head.y = 0;

        head.sprite.x = head.x * CELL_SIZE;
        head.sprite.y = head.y * CELL_SIZE;
    }

    speedUp() {
        this.speed -= this.speed * SPEED_STEP;
    }

    get head() {
        return this.body[0];
    }
}

class Food {
    constructor(game, originFood) {
        this.game = game;
        this.shown = false;
        this.originFood = originFood;
        this.sprite = new Graphics();
        this.sprite.beginFill(FOOT_COLOR);
        this.sprite.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
        this.sprite.endFill();
        this.position = { x: 0, y: 0 };
    }

    spawn() {
        if (!this.shown) {
            this.game.app.stage.addChild(this.sprite);
            this.shown = true;
        }
        let x, y;
        do {
            const k = this.game.mode === GAME_MODES.portal ? 3 : 2;
            x = Math.min(Math.max(Math.floor(Math.random() * BOARD_SIZE), k), BOARD_SIZE - k);
            y = Math.min(Math.max(Math.floor(Math.random() * BOARD_SIZE), k), BOARD_SIZE - k);
        } while (this.game.snake.body.some(unit => unit.x === x && unit.y === y));

        this.position = { x, y };
        this.sprite.x = x * CELL_SIZE;
        this.sprite.y = y * CELL_SIZE;
    }

    hide() {
        this.shown = false;
        this.position = { x: 0, y: 0 };
        this.game.app.stage.removeChild(this.sprite);
    }
}


class Brick {
    constructor(game) {
        this.game = game;
        this.sprite = new Graphics();
        this.sprite.beginFill(BRICK_COLOR);
        this.sprite.drawRect(0, 0, CELL_SIZE, CELL_SIZE);
        this.sprite.endFill();
        this.position = { x: 0, y: 0 };
        this.spawn();
    }

    spawn() {
        let x, y;
        do {
            x = Math.min(Math.max(Math.floor(Math.random() * BOARD_SIZE), 2), BOARD_SIZE - 2);
            y = Math.min(Math.max(Math.floor(Math.random() * BOARD_SIZE), 2), BOARD_SIZE - 2);
        } while (
            this.game.snake.body.some(unit => unit.x === x && unit.y === y) ||
            (this.game.food.position.x === x && this.game.food.position.y === y) ||
            (this.game.wall.some(brick => brick.x === x && brick.y === y))
        );
        this.position.x = x;
        this.position.y = y;
        this.sprite.x = this.position.x * CELL_SIZE;
        this.sprite.y = this.position.y * CELL_SIZE;
        this.game.app.stage.addChild(this.sprite);
    }
}

const game = new Game();
