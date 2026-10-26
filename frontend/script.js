(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const status = $("status");
  const connectionDot = $("connectionDot");
  const socketIdElement = $("socketId");
  const log = $("log");
  const playerIdElement = $("playerId");
  const playerAvatar = $("playerAvatar");
  const positionElement = $("position");
  const createRoomBtn = $("createRoomBtn");
  const joinRoomBtn = $("joinRoomBtn");
  const roomIdInput = $("roomIdInput");
  const roomIdDisplay = $("roomIdDisplay");
  const roomPlayers = $("roomPlayers");
  const leaveRoomBtn = $("leaveRoomBtn");
  const arenaRoomLabel = $("arenaRoomLabel");
  const arenaEmptyState = $("arenaEmptyState");
  const footerConnection = $("footerConnection");
  const gameCanvas = $("gameCanvas");
  const ctx = gameCanvas.getContext("2d");

  let gamePlayers = [];
  let currentRoomMaxPlayers = 3;
  let currentRoomId = null;
  const pressedKeys = new Set();

  const movementKeys = new Set([
    "w", "a", "s", "d",
    "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"
  ]);

  const socket = io({
    autoConnect: false,
    auth: (callback) => {
      callback({
        sessionToken: sessionStorage.getItem("worldsync-session-token")
      });
    }
  });

  function writeLog(message) {
    log.replaceChildren();
    const bullet = document.createElement("span");
    bullet.className = "log-bullet";
    const text = document.createElement("span");
    text.textContent = message;
    log.append(bullet, text);
  }

  function setConnectionState(state, message) {
    status.textContent = message;
    const connected = state === "connected";
    const failed = state === "failed";
    connectionDot.style.background = connected ? "var(--green)" : failed ? "var(--red)" : "#8290a8";
    connectionDot.style.color = connected ? "var(--green)" : failed ? "var(--red)" : "#8290a8";
    connectionDot.style.boxShadow = connected || failed ? "0 0 10px currentColor" : "none";
    footerConnection.textContent = connected ? "CONNECTION ESTABLISHED" : failed ? "CONNECTION UNAVAILABLE" : "WAITING FOR CONNECTION";
    footerConnection.style.color = connected ? "var(--green)" : failed ? "var(--red)" : "";
  }

  function updateRoomCount(count, max = currentRoomMaxPlayers) {
    roomPlayers.textContent = `${count} / ${max}`;
  }

  function updateRoomUI(roomId, maxPlayers = 3, count = 0) {
    currentRoomId = roomId || null;
    currentRoomMaxPlayers = maxPlayers || 3;
    roomIdDisplay.textContent = currentRoomId || "None";
    arenaRoomLabel.textContent = currentRoomId || "NO ROOM";
    updateRoomCount(count, currentRoomMaxPlayers);
    leaveRoomBtn.disabled = !currentRoomId;
    arenaEmptyState.classList.toggle("is-hidden", Boolean(currentRoomId));
    if (!currentRoomId) {
      gamePlayers = [];
      drawArena();
    }
  }

  function resizeCanvasForDisplay() {
    // Keep the server's 800x600 world coordinates while the canvas scales responsively in CSS.
    drawArena();
  }

  function drawArena() {
    const width = gameCanvas.width;
    const height = gameCanvas.height;
    ctx.clearRect(0, 0, width, height);

    // Deep background with a subtle central glow.
    const gradient = ctx.createRadialGradient(width * 0.5, height * 0.45, 15, width * 0.5, height * 0.45, width * 0.75);
    gradient.addColorStop(0, "#101f34");
    gradient.addColorStop(1, "#08101e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Fine grid.
    ctx.beginPath();
    ctx.strokeStyle = "rgba(107, 145, 195, 0.105)";
    ctx.lineWidth = 1;
    const grid = 40;
    for (let x = 0; x <= width; x += grid) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, height);
    }
    for (let y = 0; y <= height; y += grid) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
    }
    ctx.stroke();

    // Slightly brighter center guides.
    ctx.beginPath();
    ctx.strokeStyle = "rgba(100, 232, 237, 0.07)";
    ctx.setLineDash([5, 8]);
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Corner accents and arena frame.
    ctx.strokeStyle = "rgba(100, 232, 237, 0.62)";
    ctx.lineWidth = 2;
    const corner = 20;
    [[1, 1], [width - 1, 1], [1, height - 1], [width - 1, height - 1]].forEach(([x, y], index) => {
      const sx = index % 2 === 0 ? 1 : -1;
      const sy = index < 2 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x, y + sy * corner);
      ctx.lineTo(x, y);
      ctx.lineTo(x + sx * corner, y);
      ctx.stroke();
    });
    ctx.strokeStyle = "rgba(111, 147, 199, 0.25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    const myId = playerIdElement.textContent;
    for (const player of gamePlayers) {
      const x = Number(player.x);
      const y = Number(player.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      const isMe = player.playerId === myId;
      const radius = 14;

      // Player glow.
      const glow = ctx.createRadialGradient(x, y, 1, x, y, radius * 2.5);
      glow.addColorStop(0, isMe ? "rgba(100,232,237,.27)" : "rgba(130,152,255,.23)");
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Player body.
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = isMe ? "#64e8ed" : "#8298ff";
      ctx.fill();
      ctx.lineWidth = isMe ? 3 : 2;
      ctx.strokeStyle = isMe ? "rgba(220,255,255,.95)" : "rgba(222,229,255,.78)";
      ctx.stroke();

      // Inner core.
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = isMe ? "#173b4a" : "#27345f";
      ctx.fill();

      // Readable name tag.
      const label = isMe ? "YOU" : String(player.playerId || "PLAYER").slice(0, 6);
      ctx.font = "600 11px Manrope, Arial, sans-serif";
      const labelWidth = ctx.measureText(label).width;
      const pillWidth = labelWidth + 16;
      const pillX = x - pillWidth / 2;
      const pillY = y - 35;
      ctx.fillStyle = isMe ? "rgba(22, 59, 72, .94)" : "rgba(23, 34, 58, .94)";
      roundedRect(ctx, pillX, pillY, pillWidth, 21, 6);
      ctx.fill();
      ctx.strokeStyle = isMe ? "rgba(100,232,237,.55)" : "rgba(130,152,255,.35)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = isMe ? "#a8ffff" : "#d9e0ff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x, pillY + 10.5);
    }
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
  }

  function roundedRect(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + width, y, x + width, y + height, r);
    context.arcTo(x + width, y + height, x, y + height, r);
    context.arcTo(x, y + height, x, y, r);
    context.arcTo(x, y, x + width, y, r);
    context.closePath();
  }

  function sendMovement() {
    let dx = 0;
    let dy = 0;
    if (pressedKeys.has("a") || pressedKeys.has("ArrowLeft")) dx -= 1;
    if (pressedKeys.has("d") || pressedKeys.has("ArrowRight")) dx += 1;
    if (pressedKeys.has("w") || pressedKeys.has("ArrowUp")) dy -= 1;
    if (pressedKeys.has("s") || pressedKeys.has("ArrowDown")) dy += 1;
    if (socket.connected) socket.emit("player:move", { dx, dy });
  }

  $("connectBtn").addEventListener("click", () => {
    if (!socket.connected) {
      writeLog("Attempting to connect...");
      socket.connect();
    } else {
      writeLog("You are already connected.");
    }
  });

  $("disconnectBtn").addEventListener("click", () => {
    if (socket.connected) {
      pressedKeys.clear();
      socket.emit("player:stop");
      socket.disconnect();
    }
  });

  createRoomBtn.addEventListener("click", () => {
    if (!socket.connected) return writeLog("Connect to the server before creating a room.");
    socket.emit("room:create");
  });

  joinRoomBtn.addEventListener("click", () => {
    const roomId = roomIdInput.value.trim();
    if (!roomId) {
      writeLog("Please enter a room ID.");
      roomIdInput.focus();
      return;
    }
    if (!socket.connected) return writeLog("Connect to the server before joining a room.");
    socket.emit("room:join", { roomId });
  });

  roomIdInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") joinRoomBtn.click();
  });

  leaveRoomBtn.addEventListener("click", () => {
    if (socket.connected) socket.emit("room:leave");
  });

  socket.on("connect", () => {
    setConnectionState("connected", "Connected");
    socketIdElement.textContent = socket.id || "Connected";
    writeLog("Successfully connected to WorldSync backend.");
  });

  socket.on("player:welcome", (data) => {
    if (!data) return;
    playerIdElement.textContent = data.playerId || "Unknown";
    playerAvatar.textContent = String(data.playerId || "?").slice(0, 1).toUpperCase();
    positionElement.textContent = `X: ${Math.round(data.x)}, Y: ${Math.round(data.y)}`;
    if (data.sessionToken) {
      sessionStorage.setItem("worldsync-session-token", data.sessionToken);
    }
    writeLog(data.recovered ? `Session recovered: ${data.playerId}` : `Welcome, player ${data.playerId}`);
    if (data.roomId) {
      currentRoomId = data.roomId;
      arenaRoomLabel.textContent = data.roomId;
      roomIdDisplay.textContent = data.roomId;
      leaveRoomBtn.disabled = false;
      arenaEmptyState.classList.add("is-hidden");
    }
    drawArena();
  });

  socket.on("disconnect", (reason) => {
    setConnectionState("disconnected", "Disconnected");
    socketIdElement.textContent = "Offline";
    pressedKeys.clear();
    socket.emit("player:stop");
    writeLog(`Disconnected: ${reason}`);
  });

  socket.on("connect_error", (error) => {
    setConnectionState("failed", "Connection failed");
    writeLog(`Connection error: ${error.message}`);
  });

  socket.on("room:joined", (data) => {
    if (!data) return;
    updateRoomUI(data.roomId, data.maxPlayers, Array.isArray(data.players) ? data.players.length : 0);
    gamePlayers = Array.isArray(data.players) ? data.players : [];
    roomIdInput.value = "";
    writeLog(`Joined room ${data.roomId}`);
    drawArena();
  });

  socket.on("room:left", (data) => {
    updateRoomUI(null, currentRoomMaxPlayers, 0);
    gamePlayers = [];
    drawArena();
    writeLog(`You left room${data?.roomId ? ` ${data.roomId}` : ""}.`);
  });

  socket.on("room:player-joined", (data) => {
    if (data?.roomId && currentRoomId && data.roomId !== currentRoomId) return;
    if (Array.isArray(data?.players)) {
      updateRoomCount(data.players.length, data.maxPlayers);
      gamePlayers = data.players;
      drawArena();
    }
    writeLog(`Player joined: ${data?.playerId ?? "Unknown player"}`);
  });

  socket.on("room:player-left", (data) => {
    if (data?.roomId && currentRoomId && data.roomId !== currentRoomId) return;
    if (Array.isArray(data?.players)) {
      updateRoomCount(data.players.length, data.maxPlayers);
      gamePlayers = data.players;
      drawArena();
    }
    writeLog(`Player left: ${data?.playerId ?? "Unknown player"}`);
  });

  socket.on("game:state", (data) => {
    if (!data || !Array.isArray(data.players)) return;
    if (currentRoomId && data.roomId && data.roomId !== currentRoomId) return;
    gamePlayers = data.players;
    if (data.roomId && !currentRoomId) {
      currentRoomId = data.roomId;
      roomIdDisplay.textContent = data.roomId;
      arenaRoomLabel.textContent = data.roomId;
      leaveRoomBtn.disabled = false;
      arenaEmptyState.classList.add("is-hidden");
    }
    updateRoomCount(data.players.length, currentRoomMaxPlayers);
    const myPlayer = data.players.find((player) => player.playerId === playerIdElement.textContent);
    if (myPlayer) {
      positionElement.textContent = `X: ${Math.round(myPlayer.x)}, Y: ${Math.round(myPlayer.y)}`;
    }
    arenaEmptyState.classList.toggle("is-hidden", Boolean(currentRoomId));
    drawArena();
  });

  socket.on("game:error", (data) => {
    writeLog(data?.message ?? "An unexpected game error occurred.");
  });

  socket.on("room:error", (data) => {
    writeLog(`Room error: ${data?.message ?? "Unable to complete room action."}`);
  });

  window.addEventListener("keydown", (event) => {
    if (!movementKeys.has(event.key)) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    event.preventDefault();
    if (event.repeat) return;
    pressedKeys.add(event.key);
    sendMovement();
  });

  window.addEventListener("keyup", (event) => {
    if (!movementKeys.has(event.key)) return;
    pressedKeys.delete(event.key);
    sendMovement();
  });

  window.addEventListener("blur", () => {
    pressedKeys.clear();
    if (socket.connected) socket.emit("player:stop");
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pressedKeys.clear();
      if (socket.connected) socket.emit("player:stop");
    }
  });

  window.addEventListener("resize", resizeCanvasForDisplay);

  drawArena();
  socket.connect();
})();
