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
const stageSelect = document.querySelector('#stageSelect');
const stageName = document.querySelector('#stageName');
const chargeOne = document.querySelector('#chargeOne');
const chargeTwo = document.querySelector('#chargeTwo');
const playButton = document.querySelector('#playButton');
const mainMenu = document.querySelector('#mainMenu');
const gameShell = document.querySelector('#gameShell');
const lobbyCode = document.querySelector('#lobbyCode');
const lobbyStatus = document.querySelector('#lobbyStatus');

const keys = new Set();
const colors = { one: '#ff6b5f', two: '#60d9d4', gold: '#f2d36c' };
let width = 900, height = 560, lastFrame = 0, roundNumber = 1, roundTime = 90, winner = null;
let scores = { one: 0, two: 0 };
let particles = [], bolts = [], cores = [], sparks = [];
let stage = 'lowGravity';
let audioContext = null;
const stages = {
	lowGravity: { name: 'LOW GRAVITY', message: 'COLLECT ENERGY. OUTPLAY YOUR RIVAL.', speed: 205 },
	crossfire: { name: 'CROSSFIRE', message: 'WALLS BLOCK MOVEMENT AND BOLTS.', speed: 190 },
	pulseGrid: { name: 'PULSE GRID', message: 'THE CENTER BEAM PULSES EVERY FEW SECONDS.', speed: 220 }
};

const players = {
	one: { x: 110, y: 280, radius: 17, speed: 205, angle: 0, cooldown: 0, dash: 0, color: colors.one, controls: ['w','a','s','d'], dashKey: ' ' },
	two: { x: 790, y: 280, radius: 17, speed: 205, angle: Math.PI, cooldown: 0, dash: 0, color: colors.two, controls: ['arrowup','arrowleft','arrowdown','arrowright'], dashKey: 'enter' }
};

function resize() { const bounds = canvas.getBoundingClientRect(); const ratio = Math.min(window.devicePixelRatio || 1, 2); width = bounds.width; height = bounds.height; canvas.width = width * ratio; canvas.height = height * ratio; context.setTransform(ratio, 0, 0, ratio, 0, 0); }
function resetRound() {
	winner = null; roundTime = 90; roundOver.classList.add('hidden'); roundLabel.textContent = `ROUND ${String(roundNumber).padStart(2, '0')}`; stageName.textContent = stages[stage].name; arenaMessage.textContent = stages[stage].message;
	players.one.speed = stages[stage].speed; players.two.speed = stages[stage].speed;
	players.one.x = width * .16; players.one.y = height * .5; players.one.angle = 0; players.one.cooldown = 0; players.one.dash = 0; players.one.powered = false;
	players.one.moveSoundCooldown = 0;
	players.two.x = width * .84; players.two.y = height * .5; players.two.angle = Math.PI; players.two.cooldown = 0; players.two.dash = 0; players.two.powered = false; players.two.moveSoundCooldown = 0;
	bolts = []; cores = []; particles = []; sparks = [];
	for (let i = 0; i < 12; i++) particles.push({ x: Math.random() * width, y: Math.random() * height, r: Math.random() * 1.8 + .4, a: Math.random() * .5 + .15 });
	for (let i = 0; i < (stage === 'pulseGrid' ? 4 : 3); i++) spawnCore();
	updateChargeStatus(); scoreOne.textContent = scores.one; scoreTwo.textContent = scores.two; toast.textContent = `${stages[stage].name} // FIRST TO 5 WINS`; toast.style.opacity = '1'; setTimeout(() => toast.style.opacity = '0', 3500);
}
function spawnCore() { cores.push({ x: width * (.27 + Math.random() * .46), y: height * (.22 + Math.random() * .56), radius: 8, pulse: Math.random() * 6.28 }); }
function pressed(key) { return keys.has(key); }
function playSound(type) {
	if (!audioContext) return;
	const sounds = { move: [150, .025, 'sine'], shoot: [220, .07, 'square'], dash: [110, .14, 'sawtooth'], collect: [520, .16, 'triangle'], hit: [80, .22, 'sawtooth'], win: [660, .4, 'triangle'] };
	const sound = sounds[type];
	if (!sound) return;
	const [frequency, duration, wave] = sound;
	const oscillator = audioContext.createOscillator();
	const gain = audioContext.createGain();
	oscillator.type = wave; oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
	oscillator.frequency.exponentialRampToValueAtTime(frequency * (type === 'win' ? 1.8 : .55), audioContext.currentTime + duration);
	gain.gain.setValueAtTime(.0001, audioContext.currentTime); gain.gain.exponentialRampToValueAtTime(.12, audioContext.currentTime + .01); gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
	oscillator.connect(gain).connect(audioContext.destination); oscillator.start(); oscillator.stop(audioContext.currentTime + duration);
}
function enableAudio() { if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)(); if (audioContext.state === 'suspended') audioContext.resume(); }
function getObstacles() {
	if (stage === 'crossfire') return [{ x: width * .47, y: height * .18, w: width * .06, h: height * .27 }, { x: width * .47, y: height * .55, w: width * .06, h: height * .27 }];
	return [];
}
function collidesWithObstacle(x, y, radius) { return getObstacles().some(obstacle => x + radius > obstacle.x && x - radius < obstacle.x + obstacle.w && y + radius > obstacle.y && y - radius < obstacle.y + obstacle.h); }
function getPulseState() { const pulse = (performance.now() / 1000) % 4; return { active: stage === 'pulseGrid' && pulse > 2.8, x: width * (.25 + pulse * .125) }; }
function updatePlayer(player, side, dt) {
	const [up, left, down, right] = player.controls; let dx = (pressed(right) ? 1 : 0) - (pressed(left) ? 1 : 0); let dy = (pressed(down) ? 1 : 0) - (pressed(up) ? 1 : 0);
	if (dx || dy) { const length = Math.hypot(dx, dy); dx /= length; dy /= length; player.angle = Math.atan2(dy, dx); }
	player.cooldown -= dt; player.moveSoundCooldown = Math.max(0, player.moveSoundCooldown - dt); player.dash = Math.max(0, player.dash - dt);
	if (pressed(player.dashKey) && player.dash <= 0) { player.dash = 1.1; player.cooldown = Math.min(player.cooldown, 0); player.x += Math.cos(player.angle) * 75; player.y += Math.sin(player.angle) * 75; burst(player.x, player.y, player.color, 12); playSound('dash'); }
	const multiplier = player.dash > .85 ? 2.5 : 1; const nextX = player.x + dx * player.speed * multiplier * dt; const nextY = player.y + dy * player.speed * multiplier * dt; if (!collidesWithObstacle(nextX, nextY, player.radius)) { player.x = nextX; player.y = nextY; }
	if ((dx || dy) && player.moveSoundCooldown <= 0) { playSound('move'); player.moveSoundCooldown = .14; }
	player.x = Math.max(30, Math.min(width - 30, player.x)); player.y = Math.max(45, Math.min(height - 30, player.y));
	if (pressed(player.controls[0]) || pressed(player.controls[1]) || pressed(player.controls[2]) || pressed(player.controls[3])) player.fireHeld = true;
	if (player.fireHeld && player.cooldown <= 0) { fire(player, side); player.cooldown = .52; player.fireHeld = false; }
}
function fire(player, owner) { const powered = player.powered; bolts.push({ x: player.x + Math.cos(player.angle) * 24, y: player.y + Math.sin(player.angle) * 24, vx: Math.cos(player.angle) * (powered ? 520 : 440), vy: Math.sin(player.angle) * (powered ? 520 : 440), owner, life: 1.5, powered, radius: powered ? 16 : 7 }); player.powered = false; burst(player.x + Math.cos(player.angle) * 20, player.y + Math.sin(player.angle) * 20, player.color, powered ? 12 : 4); playSound('shoot'); updateChargeStatus(); }
function burst(x, y, color, count) { for (let i = 0; i < count; i++) { const angle = Math.random() * Math.PI * 2, speed = 25 + Math.random() * 110; sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: .4 + Math.random() * .45, color }); } }
function update(dt) {
	if (winner) return;
	roundTime = Math.max(0, roundTime - dt); updatePlayer(players.one, 'one', dt); updatePlayer(players.two, 'two', dt);
	const pulseState = getPulseState(); if (pulseState.active) for (const [side, player] of Object.entries(players)) if (Math.abs(player.x - pulseState.x) < 22) { const other = side === 'one' ? 'two' : 'one'; scores[other]++; endRound(other, 'The pulse caught them out.'); break; }
	for (let index = cores.length - 1; index >= 0; index--) { const core = cores[index]; core.pulse += dt * 3; for (const [side, player] of Object.entries(players)) if (Math.hypot(core.x-player.x, core.y-player.y) < 28) { player.powered = true; burst(core.x, core.y, colors.gold, 15); playSound('collect'); cores.splice(index, 1); setTimeout(spawnCore, 850); arenaMessage.textContent = `${side === 'one' ? 'PLAYER ONE' : 'PLAYER TWO'} CHARGED // KEEP MOVING TO FIRE`; updateChargeStatus(); break; } }
	for (let index = bolts.length - 1; index >= 0; index--) { const bolt = bolts[index]; bolt.x += bolt.vx * dt; bolt.y += bolt.vy * dt; bolt.life -= dt; if (bolt.life <= 0 || bolt.x < 0 || bolt.x > width || bolt.y < 30 || bolt.y > height || collidesWithObstacle(bolt.x, bolt.y, bolt.radius)) { bolts.splice(index, 1); continue; } const target = bolt.owner === 'one' ? players.two : players.one; if (Math.hypot(bolt.x-target.x, bolt.y-target.y) < target.radius + bolt.radius) { bolts.splice(index, 1); burst(target.x, target.y, target.color, 30); playSound('hit'); scores[bolt.owner]++; endRound(bolt.owner, bolt.powered ? 'Charged bolt landed. Brilliant timing.' : 'Direct hit. The arena is yours.'); break; } }
	for (let index = sparks.length - 1; index >= 0; index--) { const spark = sparks[index]; spark.x += spark.vx * dt; spark.y += spark.vy * dt; spark.life -= dt; if (spark.life <= 0) sparks.splice(index, 1); }
	timerLabel.textContent = `${String(Math.floor(roundTime / 60)).padStart(2,'0')}:${String(Math.floor(roundTime % 60)).padStart(2,'0')}`;
	if (roundTime <= 0) endRound(players.one.x > players.two.x ? 'one' : 'two', 'Time expired. Bold positioning wins.');
}
function updateChargeStatus() { chargeOne.textContent = players.one.powered ? '✦ CHARGED BOLT READY' : '○ UNCHARGED'; chargeTwo.textContent = players.two.powered ? '✦ CHARGED BOLT READY' : '○ UNCHARGED'; chargeOne.classList.toggle('ready', Boolean(players.one.powered)); chargeTwo.classList.toggle('ready', Boolean(players.two.powered)); }
function endRound(side, message) { if (winner) return; winner = side; scoreOne.textContent = scores.one; scoreTwo.textContent = scores.two; const matchWon = scores[side] >= 5; winnerText.textContent = matchWon ? `${side === 'one' ? 'PLAYER ONE' : 'PLAYER TWO'} TAKES THE MATCH` : `${side === 'one' ? 'PLAYER ONE' : 'PLAYER TWO'} WINS`; winnerSubtext.textContent = matchWon ? 'First to five. The rift is yours.' : message; playButton.innerHTML = matchWon ? 'NEW MATCH <span>↻</span>' : 'PLAY NEXT ROUND <span>→</span>'; playSound('win'); roundOver.classList.remove('hidden'); }
function draw() {
	context.clearRect(0, 0, width, height); context.fillStyle = '#0b1118'; context.fillRect(0, 0, width, height);
	context.strokeStyle = 'rgba(96,217,212,.07)'; context.lineWidth = 1; const grid = 42; for (let x = 0; x < width; x += grid) { context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke(); } for (let y = 28; y < height; y += grid) { context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke(); }
	particles.forEach(p => { context.fillStyle = `rgba(243,240,231,${p.a})`; context.beginPath(); context.arc(p.x,p.y,p.r,0,Math.PI*2); context.fill(); });
	context.strokeStyle = 'rgba(242,211,108,.22)'; context.setLineDash([3, 10]); context.beginPath(); context.arc(width/2, height/2, Math.min(width,height)*.25, 0, Math.PI*2); context.stroke(); context.setLineDash([]);
	if (stage === 'pulseGrid') { const pulse = (performance.now() / 1000) % 4; const beamX = width * (.25 + pulse * .125); context.fillStyle = pulse > 2.8 ? 'rgba(255,107,95,.18)' : 'rgba(242,211,108,.08)'; context.fillRect(beamX - 8, 30, 16, height - 55); if (pulse > 2.8) { context.fillStyle = 'rgba(255,107,95,.7)'; context.fillRect(beamX - 2, 30, 4, height - 55); } }
	getObstacles().forEach(obstacle => { context.fillStyle = 'rgba(96,217,212,.12)'; context.strokeStyle = 'rgba(96,217,212,.65)'; context.lineWidth = 1; context.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h); context.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h); });
	cores.forEach(core => { const glow = 14 + Math.sin(core.pulse) * 4; context.shadowBlur = glow; context.shadowColor = colors.gold; context.fillStyle = colors.gold; context.beginPath(); context.moveTo(core.x, core.y - core.radius); context.lineTo(core.x + core.radius, core.y); context.lineTo(core.x, core.y + core.radius); context.lineTo(core.x - core.radius, core.y); context.fill(); context.shadowBlur = 0; });
	bolts.forEach(bolt => { context.shadowBlur = bolt.powered ? 20 : 10; context.shadowColor = bolt.owner === 'one' ? colors.one : colors.two; context.strokeStyle = bolt.owner === 'one' ? colors.one : colors.two; context.lineWidth = bolt.powered ? 5 : 3; context.beginPath(); context.moveTo(bolt.x - bolt.vx*.035, bolt.y - bolt.vy*.035); context.lineTo(bolt.x, bolt.y); context.stroke(); context.shadowBlur = 0; });
	Object.values(players).forEach(drawPlayer); sparks.forEach(s => { context.globalAlpha = Math.max(0, s.life * 2); context.fillStyle = s.color; context.fillRect(s.x,s.y,3,3); context.globalAlpha = 1; });
}
function drawPlayer(player) { context.save(); context.translate(player.x, player.y); context.rotate(player.angle); context.shadowBlur = 24; context.shadowColor = player.color; context.fillStyle = player.color; context.beginPath(); context.moveTo(22, 0); context.lineTo(-12, -13); context.lineTo(-8, 0); context.lineTo(-12, 13); context.closePath(); context.fill(); context.shadowBlur = 0; context.fillStyle = '#10151d'; context.beginPath(); context.arc(3,0,5,0,Math.PI*2); context.fill(); context.restore(); }
function loop(time) { const dt = Math.min((time - lastFrame) / 1000 || 0, .05); lastFrame = time; update(dt); draw(); requestAnimationFrame(loop); }
window.addEventListener('keydown', event => { enableAudio(); const key = event.key.toLowerCase(); if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) event.preventDefault(); keys.add(key); }); window.addEventListener('keyup', event => keys.delete(event.key.toLowerCase())); window.addEventListener('blur', () => keys.clear()); window.addEventListener('resize', resize);
document.querySelector('#resetButton').addEventListener('click', () => { enableAudio(); scores = { one: 0, two: 0 }; roundNumber = 1; resize(); resetRound(); }); playButton.addEventListener('click', () => { enableAudio(); if (scores.one >= 5 || scores.two >= 5) scores = { one: 0, two: 0 }; else roundNumber++; resize(); resetRound(); }); stageSelect.addEventListener('change', event => { enableAudio(); stage = event.target.value; scores = { one: 0, two: 0 }; roundNumber = 1; resize(); resetRound(); });
function openLocalGame() { enableAudio(); mainMenu.classList.add('hidden'); gameShell.classList.remove('hidden'); resize(); resetRound(); }
document.querySelector('#localButton').addEventListener('click', openLocalGame);
document.querySelector('#backButton').addEventListener('click', () => { keys.clear(); gameShell.classList.add('hidden'); mainMenu.classList.remove('hidden'); });
document.querySelector('#onlineButton').addEventListener('click', () => { enableAudio(); document.querySelector('#onlinePanel').classList.toggle('hidden'); });
document.querySelector('#hostButton').addEventListener('click', () => { lobbyCode.value = Math.random().toString(36).slice(2, 8).toUpperCase(); lobbyStatus.textContent = 'HOST CODE CREATED // START THE LAN RELAY TO CONNECT PLAYERS'; });
document.querySelector('#joinButton').addEventListener('click', () => { lobbyStatus.textContent = lobbyCode.value.trim().length === 6 ? 'JOIN REQUEST READY // LAN RELAY CONNECTION IS NOT CONFIGURED' : 'ENTER A SIX-CHARACTER LOBBY CODE'; });
requestAnimationFrame(loop);
