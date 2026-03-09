// --- Board setup ---
let board;
const rowCount = 21;
const columnCount = 19;
const tileSize = 32;
const boardWidth = columnCount * tileSize;
const boardHeight = rowCount * tileSize;
let context;

// Images
let blueGhostImage, orangeGhostImage, pinkGhostImage, redGhostImage;
let pacmanUpImage, pacmanDownImage, pacmanRightImage, pacmanLeftImage;
let wallImage;

const tileMap = [
  "XXXXXXXXXXXXXXXXXXX",
  "X        X        X",
  "X XX XXX X XXX XX X",
  "X                 X",
  "X XX X XXXXX X XX X",
  "X    X       X    X",
  "XXXX XXXX XXXX XXXX",
  "OOOX X       X XOOO",
  "XXXX X X r X X XXXX",
  "O       b p o       O",
  "XXXX X XXXXX X XXXX",
  "OOOX X       X XOOO",
  "XXXX X XXXXX X XXXX",
  "X        X        X",
  "X XX XXX X XXX XX X",
  "X  X     P     X  X",
  "XX X X XXXXX X X XX",
  "X    X   X   X    X",
  "X XXXXXX X XXXXXX X",
  "X                 X",
  "XXXXXXXXXXXXXXXXXXX"
];

const walls = new Set();
const foods = new Set();
const ghosts = new Set();

const tunnelRowIndex = 9;
const tunnelYMin = tunnelRowIndex * tileSize;
const tunnelYMax = tunnelRowIndex * tileSize + tileSize;

let pacman;
let desiredDirection = null;
const directions = ['U', 'D', 'L', 'R'];
let score = 0;
let lives = 3;
let level = 1;
let gameOver = false;

// Level transition state
let levelTransition = false;
let levelTransitionTicks = 0;
const LEVEL_TRANSITION_TICKS = 60; // 60 * 50ms = ~3 seconds

// --- Initialization ---
window.onload = function () {
  board = document.getElementById("board");
  board.height = boardHeight;
  board.width = boardWidth;
  context = board.getContext("2d");

  loadImages();
  loadMap();

  for (let ghost of ghosts.values()) {
    ghost.updateDirection(directions[Math.floor(Math.random() * 4)]);
  }

  update();
  document.addEventListener("keyup", movePacman);
};

// --- Load Images ---
function loadImages() {
  wallImage = new Image(); wallImage.src = "./wall.png";
  blueGhostImage = new Image(); blueGhostImage.src = "./blueGhost.png";
  redGhostImage = new Image(); redGhostImage.src = "./redGhost.png";
  orangeGhostImage = new Image(); orangeGhostImage.src = "./orangeGhost.png";
  pinkGhostImage = new Image(); pinkGhostImage.src = "./pinkGhost.png";
  pacmanUpImage = new Image(); pacmanUpImage.src = "./pacmanUp.png";
  pacmanDownImage = new Image(); pacmanDownImage.src = "./pacmanDown.png";
  pacmanLeftImage = new Image(); pacmanLeftImage.src = "./pacmanLeft.png";
  pacmanRightImage = new Image(); pacmanRightImage.src = "./pacmanRight.png";
}

// --- Load Map ---
function loadMap() {
  walls.clear();
  foods.clear();
  ghosts.clear();

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < columnCount; c++) {
      const tile = tileMap[r][c] || ' ';
      const x = c * tileSize;
      const y = r * tileSize;

      switch (tile) {
        case 'X':
          walls.add(new Block(wallImage, x, y, tileSize, tileSize));
          break;
        case 'b':
          ghosts.add(new Block(blueGhostImage, x, y, tileSize, tileSize));
          break;
        case 'o':
          ghosts.add(new Block(orangeGhostImage, x, y, tileSize, tileSize));
          break;
        case 'p':
          ghosts.add(new Block(pinkGhostImage, x, y, tileSize, tileSize));
          break;
        case 'r':
          ghosts.add(new Block(redGhostImage, x, y, tileSize, tileSize));
          break;
        case 'P':
          pacman = new Block(pacmanRightImage, x, y, tileSize, tileSize);
          break;
        case ' ':
          foods.add(new Block(null, x + tileSize/2 - 2, y + tileSize/2 - 2, 4, 4));
          break;
      }
    }
  }
}

// --- Advance to next level ---
function nextLevel() {
  level += 1;
  levelTransition = false;
  levelTransitionTicks = 0;

  // Gain one extra life every 5 levels
  if ((level - 1) % 5 === 0) {
    lives += 1;
  }

  loadMap();

  pacman.direction = 'R';
  pacman.image = pacmanRightImage;
  pacman.updateVelocity();

  for (let ghost of ghosts.values()) {
    ghost.updateDirection(directions[Math.floor(Math.random() * 4)]);
  }
}

// --- Game Loop ---
function update() {
  if (levelTransition) {
    levelTransitionTicks++;
    if (levelTransitionTicks >= LEVEL_TRANSITION_TICKS) {
      nextLevel();
    } else {
      drawLevelTransition();
    }
  } else if (!gameOver) {
    move();
    draw();
  } else {
    drawGameOver();
  }
  setTimeout(update, 50);
}

// --- Draw normal game ---
function draw() {
  context.clearRect(0, 0, board.width, board.height);

  if (pacman) context.drawImage(pacman.image, pacman.x, pacman.y, pacman.width, pacman.height);

  for (let ghost of ghosts.values()) {
    context.drawImage(ghost.image, ghost.x, ghost.y, ghost.width, ghost.height);
  }

  for (let wall of walls.values()) {
    context.drawImage(wall.image, wall.x, wall.y, wall.width, wall.height);
  }

  context.fillStyle = "white";
  for (let food of foods.values()) {
    context.fillRect(food.x, food.y, food.width, food.height);
  }

  // HUD
  context.fillStyle = "white";
  context.font = "14px sans-serif";
  context.textAlign = "left";
  context.fillText("x" + lives + "  Score: " + score + "  Level: " + level, tileSize/2, tileSize/2);
}

// --- Game Over animation ---
let gameOverTick = 0;
function drawGameOver() {
  // Keep drawing the frozen game board underneath
  context.clearRect(0, 0, board.width, board.height);

  if (pacman) context.drawImage(pacman.image, pacman.x, pacman.y, pacman.width, pacman.height);
  for (let ghost of ghosts.values()) context.drawImage(ghost.image, ghost.x, ghost.y, ghost.width, ghost.height);
  for (let wall of walls.values()) context.drawImage(wall.image, wall.x, wall.y, wall.width, wall.height);
  context.fillStyle = "white";
  for (let food of foods.values()) context.fillRect(food.x, food.y, food.width, food.height);

  gameOverTick++;

  // Phase 1 (0-20): fade in dark overlay
  const fadeAlpha = Math.min(gameOverTick / 20, 1) * 0.82;
  context.fillStyle = "rgba(0,0,0," + fadeAlpha + ")";
  context.fillRect(0, 0, board.width, board.height);

  if (gameOverTick < 20) return;
  const t = gameOverTick - 20;

  // Phase 2: "GAME OVER" slides down from above
  const targetY = board.height / 2 - 38;
  const slideProgress = Math.min(t / 18, 1);
  // ease out
  const eased = 1 - Math.pow(1 - slideProgress, 3);
  const slideY = -40 + (targetY + 40) * eased;

  context.textAlign = "center";
  context.font = "bold 38px sans-serif";
  // Red glow
  context.shadowColor = "red";
  context.shadowBlur = 18;
  context.fillStyle = "red";
  context.fillText("GAME OVER", board.width / 2, slideY);
  context.shadowBlur = 0;

  if (t < 18) return;

  // Phase 3: score fades in
  const scoreAlpha = Math.min((t - 18) / 15, 1);
  context.fillStyle = "rgba(255,255,255," + scoreAlpha + ")";
  context.font = "17px sans-serif";
  context.fillText("Score: " + score + "     Level: " + level, board.width / 2, board.height / 2 + 4);

  if (t < 40) return;

  // Phase 4: "To be continued..." flickers in
  const flickerT = t - 40;
  const flickerAlpha = Math.min(flickerT / 10, 1);
  const blink = flickerT > 10 && Math.floor(flickerT / 14) % 2 === 0;
  context.fillStyle = blink ? "rgba(255,230,0,1)" : "rgba(255,230,0," + flickerAlpha + ")";
  context.font = "italic 16px sans-serif";
  context.fillText("To be continued...", board.width / 2, board.height / 2 + 36);

  if (t < 75) return;

  // Phase 5: refresh prompt pulses in and out
  const pulse = 0.5 + 0.5 * Math.sin((t - 75) * 0.12);
  context.fillStyle = "rgba(200,200,200," + pulse + ")";
  context.font = "13px sans-serif";
  context.fillText("Refresh the page to play again", board.width / 2, board.height / 2 + 62);

  context.textAlign = "left";
}

// --- Draw level transition screen ---
function drawLevelTransition() {
  context.clearRect(0, 0, board.width, board.height);
  context.fillStyle = "black";
  context.fillRect(0, 0, board.width, board.height);

  // Flashing effect
  const flash = levelTransitionTicks % 10 < 5;
  context.fillStyle = flash ? "yellow" : "white";
  context.font = "bold 28px sans-serif";
  context.textAlign = "center";
  context.fillText("LEVEL " + level + " CLEAR!", board.width / 2, board.height / 2 - 24);

  context.fillStyle = "white";
  context.font = "18px sans-serif";
  context.fillText("Score: " + score, board.width / 2, board.height / 2 + 14);

  context.fillStyle = "#aaaaaa";
  context.font = "14px sans-serif";
  context.fillText("Get ready for Level " + (level + 1) + "...", board.width / 2, board.height / 2 + 44);

  context.textAlign = "left";
}

// --- Tunnel helpers ---
function isInTunnel(block) {
  const centerY = block.y + block.height / 2;
  if (centerY < tunnelYMin || centerY >= tunnelYMax) return false;
  return block.x + block.width <= 0 || block.x >= boardWidth;
}

function handleTunnelWrap(block) {
  const centerY = block.y + block.height / 2;
  if (centerY < tunnelYMin || centerY >= tunnelYMax) return;
  if (block.x + block.width <= 0) block.x = boardWidth;
  else if (block.x >= boardWidth) block.x = -block.width;
}

// --- Move Pac-Man & Ghosts ---
function move() {
  if (!pacman) return;

  // Pac-Man queued turn
  if (desiredDirection && !isInTunnel(pacman)) {
    const original = pacman.direction;
    pacman.updateDirection(desiredDirection);

    let blocked = false;
    for (let wall of walls.values()) {
      if (collision(pacman, wall)) { blocked = true; break; }
    }

    if (blocked) pacman.updateDirection(original);
    else if (pacman.direction !== original) {
      if (pacman.direction == 'U') pacman.image = pacmanUpImage;
      else if (pacman.direction == 'D') pacman.image = pacmanDownImage;
      else if (pacman.direction == 'L') pacman.image = pacmanLeftImage;
      else if (pacman.direction == 'R') pacman.image = pacmanRightImage;
    }
  }

  // Move Pac-Man
  pacman.x += pacman.velocityX;
  pacman.y += pacman.velocityY;
  handleTunnelWrap(pacman);

  for (let wall of walls.values()) {
    if (collision(pacman, wall)) {
      pacman.x -= pacman.velocityX;
      pacman.y -= pacman.velocityY;
      break;
    }
  }

  // Move Ghosts
  for (let ghost of ghosts.values()) {
    ghost.x += ghost.velocityX;
    ghost.y += ghost.velocityY;
    handleTunnelWrap(ghost);

    if (!isInTunnel(ghost) &&
        ((ghost.x % tileSize === 0 && ghost.y % tileSize === 0) || Math.random() < 0.05)) {
      ghost.updateDirection(directions[Math.floor(Math.random() * 4)]);
    }

    if (!isInTunnel(ghost)) {
      for (let wall of walls.values()) {
        if (collision(ghost, wall)) {
          ghost.x -= ghost.velocityX;
          ghost.y -= ghost.velocityY;
          ghost.updateDirection(directions[Math.floor(Math.random() * 4)]);
          break;
        }
      }

      for (let otherGhost of ghosts.values()) {
        if (otherGhost === ghost) continue;
        if (collision(ghost, otherGhost)) {
          ghost.x -= ghost.velocityX;
          ghost.y -= ghost.velocityY;
          ghost.updateDirection(directions[Math.floor(Math.random() * 4)]);
          break;
        }
      }
    }
  }

  // Check food collision
  let foodEaten = null;
  for (let food of foods.values()) {
    if (collision(pacman, food)) {
      foodEaten = food;
      score += 10;
      break;
    }
  }
  if (foodEaten) foods.delete(foodEaten);

  // All food eaten -> trigger level transition
  if (foods.size === 0 && !levelTransition) {
    levelTransition = true;
    levelTransitionTicks = 0;
    return;
  }

  // Ghost collision with Pac-Man
  for (let ghost of ghosts.values()) {
    if (collision(pacman, ghost)) {
      lives -= 1;
      if (lives <= 0) gameOver = true;
      else resetPositions();
      break;
    }
  }
}

// --- Input ---
function movePacman(e) {
  let newDir = null;
  if (e.code == "ArrowUp" || e.code == "KeyW") newDir = 'U';
  else if (e.code == "ArrowDown" || e.code == "KeyS") newDir = 'D';
  else if (e.code == "ArrowLeft" || e.code == "KeyA") newDir = 'L';
  else if (e.code == "ArrowRight" || e.code == "KeyD") newDir = 'R';

  // DEV CHEAT: press F to clear all food and skip to next level
  if (e.code === "KeyF") foods.clear();

  if (newDir) desiredDirection = newDir;

  if (pacman) {
    if (pacman.direction == 'U') pacman.image = pacmanUpImage;
    else if (pacman.direction == 'D') pacman.image = pacmanDownImage;
    else if (pacman.direction == 'L') pacman.image = pacmanLeftImage;
    else if (pacman.direction == 'R') pacman.image = pacmanRightImage;
  }
}

// --- Collision ---
function collision(a, b) {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
}

// --- Reset positions on death (not level change) ---
function resetPositions() {
  pacman.reset();
  pacman.direction = 'R';
  pacman.image = pacmanRightImage;
  pacman.updateVelocity();

  for (let ghost of ghosts.values()) {
    ghost.reset();
    ghost.updateDirection(directions[Math.floor(Math.random() * 4)]);
  }
}

// --- Block Class ---
class Block {
  constructor(image, x, y, width, height) {
    this.image = image;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.direction = 'R';
    this.velocityX = 0;
    this.velocityY = 0;
    this.startX = x;
    this.startY = y;
  }

  updateDirection(direction) {
    const prev = this.direction;
    this.direction = direction;
    this.updateVelocity();

    this.x += this.velocityX;
    this.y += this.velocityY;

    for (let wall of walls.values()) {
      if (collision(this, wall)) {
        this.x -= this.velocityX;
        this.y -= this.velocityY;
        this.direction = prev;
        this.updateVelocity();
        return;
      }
    }
  }

  updateVelocity() {
    if (this.direction == 'U') { this.velocityX = 0; this.velocityY = -tileSize / 4; }
    else if (this.direction == 'D') { this.velocityX = 0; this.velocityY = tileSize / 4; }
    else if (this.direction == 'L') { this.velocityX = -tileSize / 4; this.velocityY = 0; }
    else if (this.direction == 'R') { this.velocityX = tileSize / 4; this.velocityY = 0; }
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.velocityX = 0;
    this.velocityY = 0;
  }
}
