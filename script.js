const canvas = document.querySelector('#arena');
const context = canvas.getContext('2d');
const scoreOne = document.querySelector('#scoreOne');
const scoreTwo = document.querySelector('#scoreTwo');
const timerLabel = document.querySelector('#timer');
const roundLabel = document.querySelector('#roundLabel');
const arenaMessage = document.querySelector('#arenaMessage');
const roundOver = document.querySelector('#roundOver');
const winnerText = document.querySelector('#winnerText');
const winnerSubtext = document.querySelector('#winnerSubtext');
const toast = document.querySelector('#toast');

const keys = new Set();
const colors = { one: '#ff6b5f', two: '#60d9d4', gold: '#f2d36c' };
let width = 900, height = 560, lastFrame = 0, roundNumber = 1, roundTime = 90, winner = null;
let scores = { one: 0, two: 0 };
let particles = [], bolts = [], cores = [], sparks = [];

const players = {
	one: { x: 110, y: 280, radius: 17, speed: 205, angle: 0, cooldown: 0, dash: 0, color: colors.one, controls: ['w','a','s','d'], dashKey: ' ' },
	two: { x: 790, y: 280, radius: 17, speed: 205, angle: Math.PI, cooldown: 0, dash: 0, color: colors.two, controls: ['arrowup','arrowleft','arrowdown','arrowright'], dashKey: 'enter' }
};

function resize() { const bounds = canvas.getBoundingClientRect(); const ratio = Math.min(window.devicePixelRatio || 1, 2); width = bounds.width; height = bounds.height; canvas.width = width * ratio; canvas.height = height * ratio; context.setTransform(ratio, 0, 0, ratio, 0, 0); }
function resetRound() {
	winner = null; roundTime = 90; roundOver.classList.add('hidden'); roundLabel.textContent = `ROUND ${String(roundNumber).padStart(2, '0')}`; arenaMessage.textContent = 'COLLECT ENERGY. OUTPLAY YOUR RIVAL.';
	players.one.x = width * .16; players.one.y = height * .5; players.one.angle = 0; players.one.cooldown = 0; players.one.dash = 0;
	players.two.x = width * .84; players.two.y = height * .5; players.two.angle = Math.PI; players.two.cooldown = 0; players.two.dash = 0;
	bolts = []; cores = []; particles = []; sparks = [];
	for (let i = 0; i < 12; i++) particles.push({ x: Math.random() * width, y: Math.random() * height, r: Math.random() * 1.8 + .4, a: Math.random() * .5 + .15 });
	for (let i = 0; i < 3; i++) spawnCore();
	scoreOne.textContent = scores.one; scoreTwo.textContent = scores.two; toast.style.opacity = '1'; setTimeout(() => toast.style.opacity = '0', 3500);
}
function spawnCore() { cores.push({ x: width * (.27 + Math.random() * .46), y: height * (.22 + Math.random() * .56), radius: 8, pulse: Math.random() * 6.28 }); }
function pressed(key) { return keys.has(key); }
function updatePlayer(player, side, dt) {
	const [up, left, down, right] = player.controls; let dx = (pressed(right) ? 1 : 0) - (pressed(left) ? 1 : 0); let dy = (pressed(down) ? 1 : 0) - (pressed(up) ? 1 : 0);
	if (dx || dy) { const length = Math.hypot(dx, dy); dx /= length; dy /= length; player.angle = Math.atan2(dy, dx); }
	player.cooldown -= dt; player.dash = Math.max(0, player.dash - dt);
	if (pressed(player.dashKey) && player.dash <= 0) { player.dash = 1.1; player.cooldown = Math.min(player.cooldown, 0); player.x += Math.cos(player.angle) * 75; player.y += Math.sin(player.angle) * 75; burst(player.x, player.y, player.color, 12); }
	const multiplier = player.dash > .85 ? 2.5 : 1; player.x += dx * player.speed * multiplier * dt; player.y += dy * player.speed * multiplier * dt;
	player.x = Math.max(30, Math.min(width - 30, player.x)); player.y = Math.max(45, Math.min(height - 30, player.y));
	if (pressed(player.controls[0]) || pressed(player.controls[1]) || pressed(player.controls[2]) || pressed(player.controls[3])) player.fireHeld = true;
	if (player.fireHeld && player.cooldown <= 0) { fire(player, side); player.cooldown = .52; player.fireHeld = false; }
}
function fire(player, owner) { bolts.push({ x: player.x + Math.cos(player.angle) * 24, y: player.y + Math.sin(player.angle) * 24, vx: Math.cos(player.angle) * 440, vy: Math.sin(player.angle) * 440, owner, life: 1.5, powered: player.powered }); player.powered = false; burst(player.x + Math.cos(player.angle) * 20, player.y + Math.sin(player.angle) * 20, player.color, 4); }
function burst(x, y, color, count) { for (let i = 0; i < count; i++) { const angle = Math.random() * Math.PI * 2, speed = 25 + Math.random() * 110; sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .4 + Math.random() * .45, color }); } }
function update(dt) {
	if (winner) return;
	roundTime = Math.max(0, roundTime - dt); updatePlayer(players.one, 'one', dt); updatePlayer(players.two, 'two', dt);
	cores.forEach((core, index) => { core.pulse += dt * 3; for (const [side, player] of Object.entries(players)) if (Math.hypot(core.x-player.x, core.y-player.y) < 28) { player.powered = true; burst(core.x, core.y, colors.gold, 15); cores.splice(index, 1); setTimeout(spawnCore, 850); arenaMessage.textContent = `${side === 'one' ? 'PLAYER ONE' : 'PLAYER TWO'} HAS A CHARGED BOLT`; } });
	bolts.forEach((bolt, index) => { bolt.x += bolt.vx * dt; bolt.y += bolt.vy * dt; bolt.life -= dt; if (bolt.life <= 0 || bolt.x < 0 || bolt.x > width || bolt.y < 30 || bolt.y > height) bolts.splice(index, 1); else { const target = bolt.owner === 'one' ? players.two : players.one; if (Math.hypot(bolt.x-target.x, bolt.y-target.y) < target.radius + 7) { burst(target.x, target.y, target.color, 30); scores[bolt.owner]++; endRound(bolt.owner, 'Direct hit. The arena is yours.'); } } });
	sparks.forEach((spark, index) => { spark.x += spark.vx * dt; spark.y += spark.vy * dt; spark.life -= dt; if (spark.life <= 0) sparks.splice(index, 1); });
	timerLabel.textContent = `${String(Math.floor(roundTime / 60)).padStart(2,'0')}:${String(Math.floor(roundTime % 60)).padStart(2,'0')}`;
	if (roundTime <= 0) endRound(players.one.x > players.two.x ? 'one' : 'two', 'Time expired. Bold positioning wins.');
}
function endRound(side, message) { winner = side; scoreOne.textContent = scores.one; scoreTwo.textContent = scores.two; winnerText.textContent = `${side === 'one' ? 'PLAYER ONE' : 'PLAYER TWO'} WINS`; winnerSubtext.textContent = message; roundOver.classList.remove('hidden'); }
function draw() {
	context.clearRect(0, 0, width, height); context.fillStyle = '#0b1118'; context.fillRect(0, 0, width, height);
	context.strokeStyle = 'rgba(96,217,212,.07)'; context.lineWidth = 1; const grid = 42; for (let x = 0; x < width; x += grid) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); } for (let y = 28; y < height; y += grid) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
	particles.forEach(p => { context.fillStyle = `rgba(243,240,231,${p.a})`; context.beginPath(); context.arc(p.x,p.y,p.r,0,Math.PI*2); context.fill(); });
	context.strokeStyle = 'rgba(242,211,108,.22)'; context.setLineDash([3, 10]); context.beginPath(); context.arc(width/2, height/2, Math.min(width,height)*.25, 0, Math.PI*2); context.stroke(); context.setLineDash([]);
	cores.forEach(core => { const glow = 14 + Math.sin(core.pulse) * 4; context.shadowBlur = glow; context.shadowColor = colors.gold; context.fillStyle = colors.gold; context.beginPath(); context.moveTo(core.x, core.y - core.radius); context.lineTo(core.x + core.radius, core.y); context.lineTo(core.x, core.y + core.radius); context.lineTo(core.x - core.radius, core.y); context.fill(); context.shadowBlur = 0; });
	bolts.forEach(bolt => { context.shadowBlur = bolt.powered ? 20 : 10; context.shadowColor = bolt.owner === 'one' ? colors.one : colors.two; context.strokeStyle = bolt.owner === 'one' ? colors.one : colors.two; context.lineWidth = bolt.powered ? 5 : 3; context.beginPath(); context.moveTo(bolt.x - bolt.vx*.035, bolt.y - bolt.vy*.035); context.lineTo(bolt.x, bolt.y); context.stroke(); context.shadowBlur = 0; });
	Object.values(players).forEach(drawPlayer); sparks.forEach(s => { context.globalAlpha = Math.max(0, s.life * 2); context.fillStyle = s.color; context.fillRect(s.x,s.y,3,3); context.globalAlpha = 1; });
}
function drawPlayer(player) { context.save(); context.translate(player.x, player.y); context.rotate(player.angle); context.shadowBlur = 24; context.shadowColor = player.color; context.fillStyle = player.color; context.beginPath(); context.moveTo(22, 0); context.lineTo(-12, -13); context.lineTo(-8, 0); context.lineTo(-12, 13); context.closePath(); context.fill(); context.shadowBlur = 0; context.fillStyle = '#10151d'; context.beginPath(); context.arc(3,0,5,0,Math.PI*2); context.fill(); context.restore(); }
function loop(time) { const dt = Math.min((time - lastFrame) / 1000 || 0, .05); lastFrame = time; update(dt); draw(); requestAnimationFrame(loop); }
window.addEventListener('keydown', event => { const key = event.key.toLowerCase(); if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) event.preventDefault(); keys.add(key); }); window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase())); window.addEventListener('resize', resize);
document.querySelector('#resetButton').addEventListener('click', () => { scores = { one: 0, two: 0 }; roundNumber = 1; resize(); resetRound(); }); document.querySelector('#playButton').addEventListener('click', () => { roundNumber++; resize(); resetRound(); });
resize(); resetRound(); requestAnimationFrame(loop);
