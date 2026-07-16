ShyFog.Client.PacketType = {
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
  "CLOSE_GUI": 13,
  "GUI_CLICK": 14,
  "CHAT_MESSAGE": 15
};
ShyFog.Client.defaultValues.ws = null;
ShyFog.Client.defaultValues.serverTransferInProgress = false;
ShyFog.Client.resetState();

ShyFog.Client.sendPacket = (...packet) => {
  if (!ShyFog.Client.ws) {
    return;
  }
  var uncompressedPacket = JSON.stringify(packet).slice(1, -1);
  var compressedPacket = pako.deflate(uncompressedPacket);
  if (compressedPacket.length < uncompressedPacket.length) {
    ShyFog.Client.ws.send(compressedPacket);
  } else {
    ShyFog.Client.ws.send(uncompressedPacket);
  }
};

ShyFog.Client.decodePacket = async data => {
  var packet = null;
  if (data instanceof Blob) {
    try {
      packet = JSON.parse("[" + pako.inflate(await data.arrayBuffer(), {
        "to": "string"
      }) + "]");
    } catch {
      return null;
    }
  } else {
    if (data.startsWith("PONG")) {
      ShyFog.Client.measuredPing = (Date.now() - parseInt(data.slice(4)));
      return null;
    }
    try {
      packet = JSON.parse(`[${data}]`);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(packet) || !packet.length || typeof packet[0] !== "number") {
    return null;
  }
  return packet;
};

ShyFog.Client.handlePacket = async message => {
  var packet = await ShyFog.Client.decodePacket(message.data);
  if (!packet) {
    return;
  }
  var [ op, ...data ] = packet;
  if (op == ShyFog.Client.PacketType.REQUIRE_AUTH) {
    document.querySelector("#main-menu").innerHTML = `
      <font size="4">Encrypting...</font>
    `;
    if (!ShyFog.Client.user.token) {
      return sendPacket(ShyFog.Client.PacketType.JOIN, {
        "version": ShyFog.Client.version,
        "sessionToken": null
      });
    }
    var { sessionToken } = await fetch(`${ShyFog.Client.authServer}/session/join`, {
      "method": "POST",
      "headers": {
        "Authorization": ShyFog.Client.user.token,
        "Content-Type": "application/json"
      },
      "body": JSON.stringify({
        "server": ShyFog.Client.remoteAddress
      })
    }).then(res => res.json());
    ShyFog.Client.sendPacket(ShyFog.Client.PacketType.JOIN, {
      "version": ShyFog.Client.version,
      "sessionToken": (sessionToken || null)
    });
  }
  if (op == ShyFog.Client.PacketType.JOIN) {
    ShyFog.Client.log("INFO", "Server approved, starting game");
    ShyFog.Client.serverSoftware = data[0].software;
    ShyFog.Client.serverVersion = data[0].version;
    document.body.innerHTML = `
      <canvas id="game" width="${window.innerWidth}px" height="${window.innerHeight}px">Your browser is unsupported for this game.</canvas>
      <div id="main-menu"></div>
    `;
    ShyFog.Client.pauseMenu();
    document.querySelector("#main-menu").style.display = "none";
    ShyFog.Client.canvas = document.querySelector("#game");
    ShyFog.Client.context = ShyFog.Client.canvas.getContext("2d");
    ShyFog.Client.canvas.addEventListener("mousedown", ShyFog.Client.handleMousedown);
    ShyFog.Client.canvas.addEventListener("mouseup", ShyFog.Client.handleMouseup);
    window.requestAnimationFrame(ShyFog.Client.render);
  }
  if (op == ShyFog.Client.PacketType.WORLD_METADATA) {
    ShyFog.Client.worldMetadata = Object.assign(ShyFog.Client.worldMetadata, data[0]);
  }
  if (op == ShyFog.Client.PacketType.PLAYER_METADATA) {
    ShyFog.Client.players.set(data[0], Object.assign(ShyFog.Client.players.get(data[0]) || {}, data[1]));
    if (typeof data[1].x === "string" || typeof data[1].y === "string" || typeof data[1].z === "string") {
      ShyFog.Client.players.get(data[0]).x = new Big(ShyFog.Client.players.get(data[0]).x);
      ShyFog.Client.players.get(data[0]).y = new Big(ShyFog.Client.players.get(data[0]).y);
      ShyFog.Client.players.get(data[0]).z = new Big(ShyFog.Client.players.get(data[0]).z);
    }
  }
  if (op == ShyFog.Client.PacketType.CHUNKS) {
    ShyFog.Client.chunks = Object.assign(ShyFog.Client.chunks, data[0]);
    ShyFog.Client.biomes = Object.assign(ShyFog.Client.biomes, data[1]);
  }
  if (op == ShyFog.Client.PacketType.BLOCK_BREAK) {
    ShyFog.Client.chunks[`${data[0]},${data[1]},${data[2]}`][data[3]] = null;
  }
  if (op == ShyFog.Client.PacketType.BLOCK_PLACE) {
    ShyFog.Client.chunks[`${data[0]},${data[1]},${data[2]}`].push(data[3]);
  }
  if (op == ShyFog.Client.PacketType.PLAYER_DISCONNECTED) {
    ShyFog.Client.players.delete(data[0]);
  }
  if (op == ShyFog.Client.PacketType.SERVER_TRANSFER) {
    ShyFog.Client.log("INFO", `Transferring to ${data[0]}`);
    ShyFog.Client.serverTransferInProgress = true;
    ShyFog.Client.ws.close(1000, "Disconnected");
    ShyFog.Client.connectServer(data[0], data[1]);
  }
  if (op == ShyFog.Client.PacketType.CHAT_MESSAGE) {
    data.forEach(chatMessage => {
      ShyFog.Client.log("INFO", `[CHAT] ${chatMessage.content}`);
      ShyFog.Client.chatMessages.push(Object.assign(chatMessage, {
        "time": Date.now()
      }));
    });
  }
}

ShyFog.Client.connectServer = (address, forceSSL) => {
  try {
    var url = new URL(`ws${(forceSSL || location.protocol == "https:") ? "s" : ""}://${address}`);
  } catch {
    document.querySelector("#main-menu").innerHTML = `
      <font size="4">Invalid server address</font>
      <br />
      <div class="button" id="back" style="width: 200px;">Back to Server List</div>
    `;
    document.querySelector("#back").addEventListener("click", ShyFog.Client.multiplayerMenu);
    return;
  }
  if (url.hostname == "localhost") {
    url.protocol = "ws:";
  }
  if (!url.port) {
    url.port = 6280;
  }
  ShyFog.Client.log("INFO", `Connecting to ${url.hostname}, ${url.port}`);
  ShyFog.Client.resetState();
  ShyFog.Client.remoteAddress = url.host;
  document.querySelector("#main-menu").innerHTML = `
    <font size="4">Connecting to server...</font>
  `;
  ShyFog.Client.ws = new WebSocket(`${url.toString()}api/shyfog/game`);
  ShyFog.Client.ws.addEventListener("open", () => {
    document.querySelector("#main-menu").innerHTML = `
      <font size="4">Logging in...</font>
    `;
    ShyFog.Client.ws.send(`PING${Date.now()}`);
    ShyFog.Client.sendPacket(ShyFog.Client.PacketType.JOIN, {
      "version": ShyFog.Client.version,
      "username": ShyFog.Client.user.username
    });
  });
  ShyFog.Client.ws.addEventListener("message", ShyFog.Client.handlePacket);
  ShyFog.Client.ws.addEventListener("close", event => {
    if (ShyFog.Client.serverTransferInProgress) {
      ShyFog.Client.serverTransferInProgress = false;
      return;
    }
    ShyFog.Client.resetState();
    document.body.innerHTML = `
      <video id="panorama" src="panorama.mp4" autoplay muted loop playsinline></video>
      <p id="client-info">ShyFog Client ${ShyFog.Client.version}</p>
      <div id="main-menu"></div>
    `;
    document.querySelector("#main-menu").innerHTML = `
      <font size="4" style="text-align: center;">${event.reason ? ShyFog.Client.antiXSS(event.reason).split("\n").join("<br />") : `Disconnected: ${event.code}`}</font>
      <br />
      <div class="button" id="reconnect" style="width: 200px;">Reconnect</div>
      <div class="button" id="back" style="width: 200px;">Back to Server List</div>
    `;
    document.querySelector("#reconnect").addEventListener("click", () => ShyFog.Client.connectServer(address));
    document.querySelector("#back").addEventListener("click", ShyFog.Client.multiplayerMenu);
  });
}

// Send pings every 5 seconds
setInterval(() => {
  if (ShyFog.Client.ws && ShyFog.Client.ws.readyState == WebSocket.OPEN) {
    ShyFog.Client.ws.send(`PING${Date.now()}`);
  }
}, 5000);