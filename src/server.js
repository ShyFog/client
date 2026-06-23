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
  "HOTBAR_SWITCH": 10
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
    document.body.innerHTML = `<canvas id="game" width="${window.innerWidth}px" height="${window.innerHeight}px">Your browser is unsupported for this game.</canvas>`;
    game.canvas = document.querySelector("#game");
    game.context = game.canvas.getContext("2d");
    game.canvas.addEventListener("click", handleLeftClick);
    game.canvas.addEventListener("contextmenu", handleRightClick);
    window.requestAnimationFrame(render);
  }
  if (op == PacketType.WORLD_METADATA) {
    game.worldMetadata = data[0];
  }
  if (op == PacketType.PLAYER_METADATA) {
    game.playerMetadata[data[0]] = data[1];
    game.playerMetadata[data[0]].x = new Big(game.playerMetadata[data[0]].x);
    game.playerMetadata[data[0]].y = new Big(game.playerMetadata[data[0]].y);
    game.playerMetadata[data[0]].z = new Big(game.playerMetadata[data[0]].z);
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
}

function connectServer(address) {
  try {
    var url = new URL(`ws://${address}`);
  } catch {
    document.querySelector("#main-menu").innerHTML = `
      <font size="4">Invalid server address</font>
      <br />
      <div class="button" id="back" style="width: 200px;">Back to Server List</div>
    `;
    document.querySelector("#back").addEventListener("click", directConnectMenu);
    return;
  }
  if (!url.port) {
    url.port = 6280;
  }
  resetState();
  game.remoteAddress = url.hostname;
  document.querySelector("#main-menu").innerHTML = `
    <font size="4">Connecting to server...</font>
  `;
  game.ws = new WebSocket(`${url.toString()}api/shyfog/game`);
  game.ws.addEventListener("open", () => {
    document.querySelector("#main-menu").innerHTML = `
      <font size="4">Logging in...</font>
    `;
    sendPacket(PacketType.JOIN, {
      "version": game.version,
      "username": game.currentUser.username
    });
  });
  game.ws.addEventListener("message", handleServerPacket);
  game.ws.addEventListener("close", event => {
    resetState();
    if (!document.querySelector("#main-menu")) {
      document.body.innerHTML = `
        <video id="panorama" src="panorama.mp4" autoplay muted loop playsinline></video>
        <div id="main-menu"></div>
      `;
    }
    document.querySelector("#main-menu").innerHTML = `
      <font size="4">${event.reason ? event.reason.split("<").join("&lt;").split(">").join("&gt;") : `Disconnected: ${event.code}`}</font>
      <br />
      <div class="button" id="reconnect" style="width: 200px;">Reconnect</div>
      <div class="button" id="back" style="width: 200px;">Back to Server List</div>
    `;
    document.querySelector("#reconnect").addEventListener("click", () => connectServer(address));
    document.querySelector("#back").addEventListener("click", directConnectMenu);
  });
}