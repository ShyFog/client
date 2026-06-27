const PacketType = {
  "JOIN": 0,
  "REQUIRE_AUTH": 1,
  "WORLD_METADATA": 2,
  "PLAYER_METADATA": 3,
  "CHUNKS": 4,
  "MOVEMENT": 5,
  "BLOCK_BREAK": 6,
  "USE": 7,
  "BLOCK_PLACE": 8,
  "PLAYER_DISCONNECTED": 9,
  "HOTBAR_SWITCH": 10,
  "SERVER_TRANSFER": 11,
  "OPEN_INVENTORY": 12,
  "OPEN_GUI": 13
};

function sendPacket(...packet) {
  if (!game.ws) {
    return;
  }
  var uncompressedPacket = JSON.stringify(packet).slice(1, -1);
  var compressedPacket = pako.deflate(uncompressedPacket);
  if (compressedPacket.length < uncompressedPacket.length) {
    game.ws.send(compressedPacket);
  } else {
    game.ws.send(uncompressedPacket);
  }
}

async function handleServerPacket(message) {
  var msg = null;
  if (message.data instanceof Blob) {
    try {
      msg = JSON.parse("[" + pako.inflate(await message.data.arrayBuffer(), {
        "to": "string"
      }) + "]");
    } catch {
      return;
    }
  } else {
    if (message.data.startsWith("PONG")) {
      game.measuredPing = (Date.now() - parseInt(message.data.slice(4)));
    }
    try {
      msg = JSON.parse(`[${message.data}]`);
    } catch {
      return;
    }
  }
  if (!Array.isArray(msg) || !msg.length) {
    return;
  }
  var [ op, ...data ] = msg;
  if (op == PacketType.REQUIRE_AUTH) {
    document.querySelector("#main-menu").innerHTML = `
      <font size="4">Encrypting...</font>
    `;
    if (!game.currentUser.token) {
      return sendPacket(PacketType.JOIN, {
        "version": game.version,
        "sessionToken": null
      });
    }
    var { sessionToken } = await fetch(`${game.authServer}/session/join`, {
      "method": "POST",
      "headers": {
        "Authorization": game.currentUser.token,
        "Content-Type": "application/json"
      },
      "body": JSON.stringify({
        "server": game.remoteAddress
      })
    }).then(res => res.json());
    sendPacket(PacketType.JOIN, {
      "version": game.version,
      "sessionToken": (sessionToken || null)
    });
  }
  if (op == PacketType.JOIN) {
    game.serverSoftware = data[0].software;
    game.serverVersion = data[0].version;
    document.body.innerHTML = `
      <canvas id="game" width="${window.innerWidth}px" height="${window.innerHeight}px">Your browser is unsupported for this game.</canvas>
      <div id="main-menu"></div>
    `;
    pauseMenu();
    document.querySelector("#main-menu").style.display = "none";
    game.canvas = document.querySelector("#game");
    game.context = game.canvas.getContext("2d");
    game.canvas.addEventListener("mousedown", handleMousedown);
    game.canvas.addEventListener("mouseup", handleMouseup);
    game.canvas.addEventListener("contextmenu", handleRightClick);
    window.requestAnimationFrame(render);
  }
  if (op == PacketType.WORLD_METADATA) {
    game.worldMetadata = Object.assign(game.worldMetadata, data[0]);
  }
  if (op == PacketType.PLAYER_METADATA) {
    game.playerMetadata[data[0]] = Object.assign(game.playerMetadata[data[0]] || {}, data[1]);
    if (typeof data[1].x === "string" || typeof data[1].y === "string" || typeof data[1].z === "string") {
      game.playerMetadata[data[0]].x = new Big(game.playerMetadata[data[0]].x);
      game.playerMetadata[data[0]].y = new Big(game.playerMetadata[data[0]].y);
      game.playerMetadata[data[0]].z = new Big(game.playerMetadata[data[0]].z);
    }
  }
  if (op == PacketType.CHUNKS) {
    game.chunks = Object.assign(game.chunks, data[0]);
    game.biomes = Object.assign(game.biomes, data[1]);
  }
  if (op == PacketType.BLOCK_BREAK) {
    game.chunks[`${data[0]},${data[1]},${data[2]}`][data[3]] = null;
  }
  if (op == PacketType.BLOCK_PLACE) {
    game.chunks[`${data[0]},${data[1]},${data[2]}`].push(data[3]);
  }
  if (op == PacketType.PLAYER_DISCONNECTED) {
    delete game.playerMetadata[data[0]];
  }
  if (op == PacketType.SERVER_TRANSFER) {
    game.serverTransferInProgress = true;
    game.ws.close(1000, "Disconnected");
    connectServer(data[0], data[1]);
  }
  if (op == PacketType.OPEN_GUI) {
    game.currentGUI = data[0];
  }
}

function connectServer(address, forceSSL) {
  try {
    var url = new URL(`ws${(forceSSL || location.protocol == "https:") ? "s" : ""}://${address}`);
  } catch {
    document.querySelector("#main-menu").innerHTML = `
      <font size="4">Invalid server address</font>
      <br />
      <div class="button" id="back" style="width: 200px;">Back to Server List</div>
    `;
    document.querySelector("#back").addEventListener("click", multiplayerMenu);
    return;
  }
  if (url.hostname == "localhost") {
    url.protocol = "ws:";
  }
  if (!url.port) {
    url.port = 6280;
  }
  resetState();
  game.remoteAddress = url.host;
  document.querySelector("#main-menu").innerHTML = `
    <font size="4">Connecting to server...</font>
  `;
  game.ws = new WebSocket(`${url.toString()}api/shyfog/game`);
  game.ws.addEventListener("open", () => {
    document.querySelector("#main-menu").innerHTML = `
      <font size="4">Logging in...</font>
    `;
    game.ws.send(`PING${Date.now()}`);
    sendPacket(PacketType.JOIN, {
      "version": game.version,
      "username": game.currentUser.username
    });
  });
  game.ws.addEventListener("message", handleServerPacket);
  game.ws.addEventListener("close", event => {
    if (game.serverTransferInProgress) {
      game.serverTransferInProgress = false;
      return;
    }
    resetState();
    document.body.innerHTML = `
      <video id="panorama" src="panorama.mp4" autoplay muted loop playsinline></video>
      <p id="client-info">ShyFog Client ${game.version}</p>
      <div id="main-menu"></div>
    `;
    document.querySelector("#main-menu").innerHTML = `
      <font size="4" style="text-align: center;">${event.reason ? event.reason.split("<").join("&lt;").split(">").join("&gt;").split("\n").join("<br />") : `Disconnected: ${event.code}`}</font>
      <br />
      <div class="button" id="reconnect" style="width: 200px;">Reconnect</div>
      <div class="button" id="back" style="width: 200px;">Back to Server List</div>
    `;
    document.querySelector("#reconnect").addEventListener("click", () => connectServer(address));
    document.querySelector("#back").addEventListener("click", multiplayerMenu);
  });
}

setInterval(() => {
  if (game.ws && game.ws.readyState == WebSocket.OPEN) {
    game.ws.send(`PING${Date.now()}`);
  }
}, 5000);