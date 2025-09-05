const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');
const playerScoreEl = document.getElementById('playerScore');
const aiScoreEl = document.getElementById('aiScore');
const gameMessage = document.getElementById('gameMessage');
const restartBtn = document.getElementById('restartBtn');
const hitSound = document.getElementById('hitSound');
const scoreSound = document.getElementById('scoreSound');

const W = canvas.width, H = canvas.height;
const paddleW = 18, paddleH = 110, paddleMargin = 24, paddleRadius = 13;
const ballRadius = 13;
const netW = 7, netSegH = 32, netGap = 18;
const maxScore = 7;

// Game state
let playerY = (H-paddleH)/2, aiY = (H-paddleH)/2;
let paddleSpeed = 7, aiSpeed = 7;
let ball = {x: W/2, y: H/2, vx: 7, vy: 3, spin: 0};
let playerScore = 0, aiScore = 0;
let running = true, gameOver = false;

// Ball launch direction
function resetBall(toPlayer = true) {
    ball.x = W/2;
    ball.y = H/2;
    ball.vx = (toPlayer ? 1 : -1) * (6 + Math.random()*2);
    ball.vy = (Math.random()>0.5?1:-1) * (3 + Math.random()*3);
    ball.spin = 0;
}

function drawNet() {
    ctx.save();
    ctx.globalAlpha = 0.30;
    ctx.fillStyle = '#fff';
    let y = 0;
    while (y < H) {
        ctx.fillRect(W/2 - netW/2, y, netW, netSegH);
        y += netSegH + netGap;
    }
    ctx.restore();
}

function drawPaddle(x, y, color, glow) {
    ctx.save();
    ctx.shadowColor = glow;
    ctx.shadowBlur = 14;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + paddleRadius);
    ctx.arcTo(x, y, x+paddleW, y, paddleRadius);
    ctx.arcTo(x+paddleW, y, x+paddleW, y+paddleH, paddleRadius);
    ctx.arcTo(x+paddleW, y+paddleH, x, y+paddleH, paddleRadius);
    ctx.arcTo(x, y+paddleH, x, y, paddleRadius);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawBall(ball) {
    ctx.save();
    ctx.shadowColor = "#00eaff";
    ctx.shadowBlur = 15 + Math.abs(ball.spin)*4;
    let grad = ctx.createRadialGradient(ball.x, ball.y, ballRadius/2, ball.x, ball.y, ballRadius);
    grad.addColorStop(0, "#fff");
    grad.addColorStop(0.3, "#00eaff");
    grad.addColorStop(0.8, "#0a355c");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballRadius, 0, 2*Math.PI);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
}

function drawScores() {
    playerScoreEl.textContent = playerScore;
    aiScoreEl.textContent = aiScore;
}

function playSound(sound) {
    if (sound) {
        sound.currentTime = 0;
        sound.play();
    }
}

// Main game loop
function gameLoop() {
    ctx.clearRect(0, 0, W, H);
    drawNet();

    // Draw paddles
    drawPaddle(paddleMargin, playerY, "#2ecc71", "#1abc9c");
    drawPaddle(W-paddleMargin-paddleW, aiY, "#e74c3c", "#c0392b");

    // Draw ball
    drawBall(ball);

    // Ball movement
    if (running) {
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Ball spin effect (slight curve)
        ball.y += ball.spin * 0.7;

        // Top/bottom wall collision
        if (ball.y-ballRadius <= 0) {
            ball.y = ballRadius;
            ball.vy *= -1;
            playSound(hitSound);
        }
        if (ball.y+ballRadius >= H) {
            ball.y = H-ballRadius;
            ball.vy *= -1;
            playSound(hitSound);
        }

        // Left paddle collision
        if (ball.x-ballRadius <= paddleMargin+paddleW &&
            ball.y > playerY && ball.y < playerY + paddleH) {
            ball.x = paddleMargin+paddleW+ballRadius;
            ball.vx *= -1.07;
            // Add spin based on paddle movement
            ball.spin = ((ball.y - (playerY+paddleH/2))/paddleH)*6 + (mouseDY||0)/2;
            // Increase ball speed slightly
            ball.vy += ball.spin*0.4;
            playSound(hitSound);
        }

        // Right paddle collision (AI)
        if (ball.x+ballRadius >= W-paddleMargin-paddleW &&
            ball.y > aiY && ball.y < aiY + paddleH) {
            ball.x = W-paddleMargin-paddleW-ballRadius;
            ball.vx *= -1.06;
            ball.spin = ((ball.y - (aiY+paddleH/2))/paddleH)*5;
            ball.vy += ball.spin*0.4;
            playSound(hitSound);
        }

        // Score: player missed
        if (ball.x < 0) {
            aiScore++;
            drawScores();
            playSound(scoreSound);
            if (aiScore >= maxScore) {
                gameOver = true;
                running = false;
                showGameMessage("Game Over! AI Wins 🏆");
                restartBtn.style.display = "inline-block";
            } else {
                showGameMessage("Missed! Point for AI.");
                resetBall(false);
                setTimeout(()=>showGameMessage(""),1200);
            }
        }
        // Score: AI missed
        if (ball.x > W) {
            playerScore++;
            drawScores();
            playSound(scoreSound);
            if (playerScore >= maxScore) {
                gameOver = true;
                running = false;
                showGameMessage("You Win! 🎉");
                restartBtn.style.display = "inline-block";
            } else {
                showGameMessage("Nice! Point for You.");
                resetBall(true);
                setTimeout(()=>showGameMessage(""),1200);
            }
        }

        // AI paddle movement
        let target = ball.y - paddleH/2 + (ball.vy>0?30:-30);
        if (aiY + paddleH/2 < target) aiY += aiSpeed;
        else if (aiY + paddleH/2 > target) aiY -= aiSpeed;
        // Clamp AI paddle
        if (aiY < 0) aiY = 0;
        if (aiY + paddleH > H) aiY = H - paddleH;
    }

    requestAnimationFrame(gameLoop);
}

// Paddle control (W/S and mouse)
let mouseDY = 0, lastMouseY = null;
document.addEventListener('keydown', (e) => {
    if (!running) return;
    if (e.key === 'w' || e.key === 'W') {
        playerY -= paddleSpeed*2;
    } else if (e.key === 's' || e.key === 'S') {
        playerY += paddleSpeed*2;
    }
    clampPlayer();
});
canvas.addEventListener('mousemove', (e) => {
    if (!running) return;
    const rect = canvas.getBoundingClientRect();
    let mouseY = e.clientY - rect.top;
    mouseDY = (lastMouseY!==null) ? mouseY-lastMouseY : 0;
    lastMouseY = mouseY;
    playerY = mouseY - paddleH/2;
    clampPlayer();
});
function clampPlayer() {
    if (playerY < 0) playerY = 0;
    if (playerY + paddleH > H) playerY = H - paddleH;
}

// Restart button handler
restartBtn.onclick = function() {
    playerScore = 0; aiScore = 0;
    running = true; gameOver = false;
    drawScores();
    playerY = aiY = (H-paddleH)/2;
    resetBall();
    showGameMessage("");
    restartBtn.style.display = "none";
};

function showGameMessage(msg) {
    gameMessage.textContent = msg;
}

// Initial setup
drawScores();
resetBall();
gameLoop();