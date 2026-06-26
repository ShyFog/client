window.game = {
  "version": "v0.0.4",
  "authServer": "https://shyfog-auth.topcatto8.workers.dev/api",
  "captchaSiteKey": "6LePli8tAAAAABxR-Y8ZfzDCQORwxLSXzbMMKHAl",
  "blockSize": 32,
  "canvas": null,
  "context": null,
  "chunks": {},
  "biomes": {},
  "worldMetadata": {},
  "playerMetadata": {},
  "holdingKeys": new Map,
  "hideOverlays": false,
  "debugMode": false,
  "debugModeChunks": false,
  "debugModeHitboxes": false,
  "renderDistance": 2,
  "deltaTime": 0,
  "prevFrame": 0,
  "times": [],
  "cursorX": 0,
  "cursorY": 0,
  "preventDebug": false,
  "lastJump": -Infinity,
  "coyoteTime": -Infinity,
  "serverSoftware": "",
  "serverVersion": ""
};

function resetState() {
  game.canvas = null;
  game.context = null;
  game.chunks = {};
  game.biomes = {};
  game.worldMetadata = {};
  game.playerMetadata = {};
  game.holdingKeys = new Map;
  game.debugMode = false;
  game.debugModeChunks = false;
  game.debugModeHitboxes = false;
  game.times = [];
  game.ws = null;
  game.serverSoftware = "";
  game.serverVersion = "";
}

// Handle window resizing
window.addEventListener("resize", () => {
  if (game.canvas) {
    game.canvas.width = window.innerWidth;
    game.canvas.height = window.innerHeight;
  }
});

window.addEventListener("keydown", event => {
  // A tiny bit of protection against cheating :)
  if (event.code == "F12") {
    return event.preventDefault();
  }
  if (event.ctrlKey && event.shiftKey && (event.code == "KeyI" || event.code == "KeyJ" || event.code == "KeyC")) {
    return event.preventDefault();
  }

  // Stop shortcuts like Ctrl + D doing a bookmark instead of sprinting right
  if (event.ctrlKey && ["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
    event.preventDefault();
  }

  // Esc to pause/resume
  if (game.canvas && game.context && event.code == "Escape") {
    game.paused = !game.paused;
    game.canvas.style.filter = (game.paused ? "blur(4px)" : "");
    document.querySelector("#main-menu").style.display = (game.paused ? "flex" : "none");
  }
  if (game.paused) {
    // Don't accept any keys while paused
    return;
  }

  // Hotbar using digits
  if (["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9"].includes(event.code)) {
    if (game.currentUser && game.playerMetadata[game.currentUser.username]) {
      game.playerMetadata[game.currentUser.username].selectedHotbarSlot = (parseInt(event.code.slice(5)) - 1);
      sendPacket(PacketType.HOTBAR_SWITCH, game.playerMetadata[game.currentUser.username].selectedHotbarSlot);
    }
  }

  // F1 to hide overlays like hotbar
  if (event.code == "F1") {
    game.hideOverlays = !game.hideOverlays;
    event.preventDefault();
  }

  // F3 debug keys
  if (event.code == "F3") {
    event.preventDefault();
  }
  if (game.holdingKeys.get("F3") && event.code == "KeyG") {
    game.debugModeChunks = !game.debugModeChunks;
    game.preventDebug = true;
  }
  if (game.holdingKeys.get("F3") && event.code == "KeyB") {
    game.debugModeHitboxes = !game.debugModeHitboxes;
    game.preventDebug = true;
  }
  if (game.holdingKeys.get("F3") && event.code == "KeyT") {
    game.texturesCache.clear();
    game.preventDebug = true;
  }

  game.holdingKeys.set(event.code, true);
});

window.addEventListener("keyup", event => {
  if (event.code == "F3") {
    // Prevent opening debug menu if another shortcut like F3 + G or F3 + B was pressed
    if (game.preventDebug) {
      game.preventDebug = false;
    } else {
      game.debugMode = !game.debugMode;
    }
  }
  game.holdingKeys.set(event.code, false);
});

window.addEventListener("mousemove", event => {
  game.cursorX = event.clientX;
  game.cursorY = event.clientY;
});

window.addEventListener("wheel", event => {
  var delta = Math.max(-1, Math.min(event.deltaY, 1));
  if (game.currentUser && game.playerMetadata[game.currentUser.username]) {
    game.playerMetadata[game.currentUser.username].selectedHotbarSlot += delta;
    if (game.playerMetadata[game.currentUser.username].selectedHotbarSlot < 0) {
      game.playerMetadata[game.currentUser.username].selectedHotbarSlot = 8;
    }
    if (game.playerMetadata[game.currentUser.username].selectedHotbarSlot > 8) {
      game.playerMetadata[game.currentUser.username].selectedHotbarSlot = 0;
    }
    sendPacket(PacketType.HOTBAR_SWITCH, game.playerMetadata[game.currentUser.username].selectedHotbarSlot);
  }
});

// Fix big delta time if the page was not visible for some time (for example, screenshots)
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState == "visible") {
    game.prevFrame = performance.now();
  } else if (game.canvas) {
    game.paused = true;
    game.canvas.style.filter = "blur(4px)";
    document.querySelector("#main-menu").style.display = "flex";
  }
});

// Menus
function loginMenu() {
  document.querySelector("#main-menu").innerHTML = `
    <font size="6">Login to ShyFog</font>
    <br />
    <p id="error"></p>
    <input type="email" name="email" id="email" placeholder="Email..." required />
    <input type="password" name="password" id="password" placeholder="Password..." required />
    <br />
    <div class="button" id="proceed">Login</div>
    <br />
    <br />
    <p style="margin: 0;">New to ShyFog? <a id="register">Register</a></p>
    <p style="margin: 0;">Or <a id="offline">play offline</a></p>
  `;
  document.querySelector("#proceed").addEventListener("click", () => proceed("login"));
  document.querySelector("#register").addEventListener("click", registerMenu);
  document.querySelector("#offline").addEventListener("click", offlineMenu);
}

function registerMenu() {
  document.querySelector("#main-menu").innerHTML = `
    <font size="6">Register in ShyFog</font>
    <br />
    <p id="error"></p>
    <input type="email" name="email" id="email" placeholder="Email..." required />
    <input type="text" name="username" id="username" placeholder="Username..." required />
    <input type="password" name="password" id="password" placeholder="Password..." required />
    <input type="password" name="password2" id="password2" placeholder="Repeat password..." required />
    <br />
    <div id="captcha"></div>
    <br />
    <div class="button" id="proceed">Register</div>
    <br />
    <br />
    <p style="margin: 0;">Already have a ShyFog account? <a id="login">Login</a></p>
    <p style="margin: 0;">Or <a id="offline">play offline</a></p>
  `;
  document.querySelector("#proceed").addEventListener("click", () => proceed("register"));
  document.querySelector("#login").addEventListener("click", loginMenu);
  document.querySelector("#offline").addEventListener("click", offlineMenu);
  game.registerCaptchaId = grecaptcha.render(document.querySelector("#captcha"), {
    "sitekey": game.captchaSiteKey
  });
}

function offlineMenu() {
  document.querySelector("#main-menu").innerHTML = `
    <font size="6">Play ShyFog offline</font>
    <br />
    <input type="text" name="username" id="username" placeholder="Username..." required />
    <br />
    <div class="button" id="proceed">Play</div>
    <br />
    <br />
    <p style="margin: 0;">Want to play online? <a id="login">Login</a> or <a id="register">register</a></p>
  `;
  document.querySelector("#proceed").addEventListener("click", () => proceed("offline"));
  document.querySelector("#login").addEventListener("click", loginMenu);
  document.querySelector("#register").addEventListener("click", registerMenu);
}

function mainMenu() {
  document.querySelector("#main-menu").innerHTML = `
    <font size="6">ShyFog</font>
    <br />
    <div class="button disabled" id="singleplayer" style="width: 200px;">Singleplayer</div>
    <div class="button" id="multiplayer" style="width: 200px;">Multiplayer</div>
    <div class="button disabled" id="settings" style="width: 200px;">Settings</div>
    <br />
    <br />
    <p style="margin: 0;">Logged in as <span class="skin-preview"><span class="skin-preview-layer skin-preview-layer1"></span><span class="skin-preview-layer skin-preview-layer2"></span><span class="skin-preview-layer skin-preview-layer3"></span></span> <a>${game.currentUser.username.split("<").join("&lt;").split(">").join("&gt;")}</a>${game.currentUser.token ? "" : ` <img src="offline.png" width="20px" height="20px" style="vertical-align: middle; cursor: help; margin-bottom: 3px;" title="Offline" />`} <img src="switch-user.png" width="20px" height="20px" style="vertical-align: middle; cursor: pointer; margin-bottom: 3px;" id="switch-user" title="Switch User" /></p>
  `;
  document.querySelector("#multiplayer").addEventListener("click", multiplayerMenu);
  document.querySelector(".skin-preview-layer2").style.backgroundImage = `url("${game.currentUser.skin}")`;
  document.querySelector(".skin-preview-layer3").style.backgroundImage = `url("${game.currentUser.skin}")`;
  document.querySelector("#switch-user").addEventListener("click", accountsMenu);
}

function multiplayerMenu() {
  document.querySelector("#main-menu").innerHTML = `
    <font size="6">Play Multiplayer</font>
    <br />
    <div id="server-list">
      ${game.servers.map((server, index) => `
        <div class="server" id="server-${index}">
          <img class="icon" src="textures/misc/unknown_server.png" />
          <div class="main">
            <div class="name">${server.name.split("<").join("&lt;").split(">").join("&gt;")}</div>
            <div class="description">Pinging...</div>
          </div>
          <div class="meta">
            <div class="status">
              <img src="textures/gui/sprites/server_list/pinging_5.png" />
            </div>
            <br />
            <div class="actions">
              <img class="delete" src="delete.png" />
            </div>
          </div>
        </div>
      `).join("")}
    </div>
    <br />
    <div class="button" id="add-server" style="width: 200px;">Add Server</div>
    <div class="button" id="direct-connect" style="width: 200px;">Direct Connection</div>
    <div class="button" id="refresh" style="width: 200px;">Refresh</div>
    <div class="button" id="cancel" style="width: 200px;">Cancel</div>
  `;
  document.querySelector("#add-server").addEventListener("click", addServerMenu);
  document.querySelector("#direct-connect").addEventListener("click", directConnectMenu);
  document.querySelector("#refresh").addEventListener("click", multiplayerMenu);
  document.querySelector("#cancel").addEventListener("click", mainMenu);
  async function probeServer(index) {
    var server = game.servers[index];
    if (server.cachedIcon) {
      document.querySelector(`#server-${index} .icon`).src = server.cachedIcon;
    }
    document.querySelector(`#server-${index}`).addEventListener("click", () => connectServer(server.address, server.forceSSL));
    document.querySelector(`#server-${index} .meta .actions .delete`).addEventListener("click", event => {
      event.stopPropagation();
      game.servers.splice(index, 1);
      localStorage.setItem("ShyFog_servers", JSON.stringify(game.servers));
      multiplayerMenu();
    });
    try {
      var url = new URL(`${server.forceSSL ? "https:" : location.protocol}//${server.address}`);
    } catch {
      try {
        document.querySelector(`#server-${index} .description`).innerText = "Can't resolve hostname";
        document.querySelector(`#server-${index} .description`).style.color = "red";
        document.querySelector(`#server-${index} .status`).innerHTML = `<img src="textures/gui/sprites/server_list/unreachable.png" />`;
      } catch {}
      return;
    }
    if (url.hostname == "localhost") {
      url.protocol = "http:";
    }
    if (!url.port) {
      url.port = 6280;
    }
    try {
      var pingResult = await fetch(`${url.toString()}api/shyfog/ping`);
      if (!pingResult.ok) {
        throw "";
      }
      pingResult = await pingResult.json();
      if (!pingResult.success) {
        throw "";
      }
    } catch {
      try {
        document.querySelector(`#server-${index} .description`).innerText = "Can't connect to server";
        document.querySelector(`#server-${index} .description`).style.color = "red";
        document.querySelector(`#server-${index} .status`).innerHTML = `<img src="textures/gui/sprites/server_list/unreachable.png" />`;
      } catch {}
      return;
    }
    server.cachedIcon = pingResult.icon;
    localStorage.setItem("ShyFog_servers", JSON.stringify(game.servers));
    try {
      document.querySelector(`#server-${index} .icon`).src = (server.cachedIcon || "textures/misc/unknown_server.png");
      document.querySelector(`#server-${index} .description`).innerText = pingResult.motd;
      document.querySelector(`#server-${index} .status`).innerHTML = `${pingResult.onlinePlayers} / ${pingResult.maxPlayers} <img src="textures/gui/sprites/server_list/ping_5.png" />`;
    } catch {}
  }
  for (var index = 0; index < game.servers.length; index++) {
    probeServer(index);
  }
}

function addServerMenu() {
  document.querySelector("#main-menu").innerHTML = `
    <font size="6">Add Server</font>
    <br />
    <input type="text" name="name" id="name" placeholder="Server name..." required />
    <input type="text" name="address" id="address" placeholder="Server address..." required />
    ${location.protocol == "http:" ? `
      <br />
      <label><input type="checkbox" name="force-ssl" id="force-ssl"> Force SSL</label>
    ` : ""}
    <br />
    <div class="button" id="done">Done</div>
    <div class="button" id="cancel">Cancel</div>
  `;
  document.querySelector("#done").addEventListener("click", () => {
    var name = (document.querySelector("#name").value || "ShyFog Server");
    var address = document.querySelector("#address").value;
    var forceSSL = document.querySelector("#force-ssl") ? document.querySelector("#force-ssl").checked : false;
    game.servers.push({
      name, address, forceSSL
    });
    localStorage.setItem("ShyFog_servers", JSON.stringify(game.servers));
    multiplayerMenu();
  });
  document.querySelector("#cancel").addEventListener("click", multiplayerMenu);
}

function directConnectMenu() {
  document.querySelector("#main-menu").innerHTML = `
    <font size="6">Direct connect</font>
    <br />
    <input type="text" name="address" id="address" placeholder="Server address..." required />
    <br />
    <div class="button" id="connect">Connect</div>
    <div class="button" id="cancel">Cancel</div>
  `;
  document.querySelector("#connect").addEventListener("click", () => connectServer(document.querySelector("#address").value));
  document.querySelector("#cancel").addEventListener("click", multiplayerMenu);
}

function accountsMenu() {
  document.querySelector("#main-menu").innerHTML = `
    <font size="6">Accounts</font>
    <br />
    <div id="server-list">
      ${game.accounts.map((account, index) => `
        <div class="server" id="server-${index}">
          <span class="skin-preview">
            <span class="skin-preview-layer skin-preview-layer1"></span>
            <span class="skin-preview-layer skin-preview-layer2"></span>
            <span class="skin-preview-layer skin-preview-layer3"></span>
          </span>
          <div class="main">
            <div class="name">${account.username.split("<").join("&lt;").split(">").join("&gt;")}</div>
          </div>
          <div class="meta">
            <br />
            <br />
            <div class="actions">
              <img class="delete" src="logout.png" />
            </div>
          </div>
        </div>
      `).join("")}
    </div>
    <br />
    <div class="button" id="add-account" style="width: 200px;">Add Account</div>
    <div class="button" id="cancel" style="width: 200px;">Cancel</div>
  `;
  document.querySelector("#add-account").addEventListener("click", () => {
    game.currentAccount = game.accounts.length;
    localStorage.setItem("ShyFog_currentAccount", game.currentAccount.toString());
    location.reload();
  });
  document.querySelector("#cancel").addEventListener("click", mainMenu);
  function registerAccountEvents(index) {
    var account = game.accounts[index];
    document.querySelector(`#server-${index} .skin-preview-layer2`).style.backgroundImage = `url("${account.skin}")`;
    document.querySelector(`#server-${index} .skin-preview-layer3`).style.backgroundImage = `url("${account.skin}")`;
    document.querySelector(`#server-${index}`).addEventListener("click", () => {
      game.currentAccount = index;
      localStorage.setItem("ShyFog_currentAccount", game.currentAccount.toString());
      location.reload();
    });
    document.querySelector(`#server-${index} .meta .actions .delete`).addEventListener("click", event => {
      event.stopPropagation();
      game.accounts.splice(index, 1);
      if (game.currentAccount == index) {
        game.currentAccount = 0;
      }
      localStorage.setItem("ShyFog_accounts", JSON.stringify(game.accounts));
      localStorage.setItem("ShyFog_currentAccount", game.currentAccount.toString());
      location.reload();
    });
  }
  for (var index = 0; index < game.accounts.length; index++) {
    registerAccountEvents(index);
  }
}

function pauseMenu() {
  document.querySelector("#main-menu").innerHTML = `
    <font size="6">Paused</font>
    <br />
    <div class="button" id="resume" style="width: 200px;">Resume</div>
    <div class="button disabled" id="settings" style="width: 200px;">Settings</div>
    <div class="button" id="leave" style="width: 200px;">Leave</div>
  `;
  document.querySelector("#resume").addEventListener("click", () => {
    game.paused = false;
    game.canvas.style.filter = "";
    document.querySelector("#main-menu").style.display = "none";
  });
  document.querySelector("#leave").addEventListener("click", () => game.ws.close(1000, "Disconnected"));
}

function proceedError(text) {
  document.querySelector("#error").style.display = "block";
  document.querySelector("#error").innerText = text;
  setTimeout(() => {
    if (document.querySelector("#error")) {
      document.querySelector("#error").style.display = "none";
      document.querySelector("#error").innerText = "";
    }
  }, 3000);
}

async function proceed(type) {
  switch(type) {
    case "login":
      var email = document.querySelector("#email").value;
      var password = document.querySelector("#password").value;
      if (!email || !email.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
        return proceedError("Invalid email.");
      }
      if (!password || !password.match(/^.+$/)) {
        return proceedError("Invalid password.");
      }
      if (password.length < 8) {
        return proceedError("Password is too short.");
      }
      var result = await fetch(`${game.authServer}/login`, {
        "method": "POST",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": JSON.stringify({ email, password })
      }).then(res => res.json());
      if (result.error) {
        return proceedError(result.error);
      }
      game.currentUser = {
        "id": result.id,
        "username": result.username,
        "token": result.token,
        "skin": result.skin
      };
      break;
    case "register":
      var email = document.querySelector("#email").value;
      var username = document.querySelector("#username").value;
      var password = document.querySelector("#password").value;
      var password2 = document.querySelector("#password2").value;
      var captcha = grecaptcha.getResponse(game.registerCaptchaId);
      if (!email || !email.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
        return proceedError("Invalid email.");
      }
      if (!username || !username.match(/^[A-Za-z0-9_]+$/)) {
        return proceedError("Invalid username.");
      }
      if (username.length < 3) {
        return proceedError("Username is too short.");
      }
      if (username.length > 20) {
        return proceedError("Username is too long.");
      }
      if (!password || !password.match(/^.+$/)) {
        return proceedError("Invalid password.");
      }
      if (password.length < 8) {
        return proceedError("Password is too short.");
      }
      if (password != password2) {
        return proceedError("Passwords do not match.");
      }
      if (!captcha) {
        return proceedError("CAPTCHA is not completed.");
      }
      var result = await fetch(`${game.authServer}/register`, {
        "method": "POST",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": JSON.stringify({ email, username, password, captcha })
      }).then(res => res.json());
      if (result.error) {
        grecaptcha.reset(game.registerCaptchaId);
        return proceedError(result.error);
      }
      game.currentUser = {
        "id": result.id,
        "username": result.username,
        "token": result.token,
        "skin": result.skin
      };
      break;
    case "offline":
      var username = document.querySelector("#username").value;
      game.currentUser = {
        username,
        "skin": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAABL1BMVEUBAABGOqUwKHIAr6+qfWaWX0EAaGgAf38AqKgAmZlqQDB1Ry8qHQ0mIVs/Pz9ra2uHVTuWb1soKCgAYGBWScwmGgoAzMwvHw86MYkkGAgoGwoAW1sAAABRMSUAnp4pHAwsHg6GUzQrHg2BUzkfEAsmGAsoGg0nGwstHQ4tIBCaY0QzJBFFIg6cZ0gjFwkkGAomGgwoGwsoHAsrHg4sHhEvIhEyIxBBIQw6KBRiQy9SPYl0SC+KTD2EUjGHWDqIWjmKWTucY0WcaUydak+iake0hG27iXL///8vIA1CHQo0JRI/KhVCKhJSKCZtQypvRSx6TjOAUzSDVTuPXj6QXkOWX0CcY0aaZEqfaEmcclysdlqze2K1e2etgG23gnK2iWy+iGy9i3K9jnK9jnTGloCtoI9HAAAAAXRSTlMAQObYZgAAAwBJREFUWMPtlmd7okAQxyNL2UX04O4QhAvNWNN7v/Tkeu+9ff/PcLO7bqIYA8a3/h8fdyjzY2aZh5mpqa4Mowq/6kyxq6lRZVQdBwDVos50C4Dj2BzwAPR8dEDVoTk4BgfcKgLDtp1xAMx/HIDthPYMBcR6HN/mLYQ2yDBGfo2eZzfDjXb7UeKsVO3EaLc3wqbteaIu8gDsKExmkySZffY0WplNwsimgG5dZAKiuh2uLi+Gyc8//37//fIkXFxeDe16JOoiO4JGK/Ka0bp8Jn//fH58vB41vajV8ERd5EjBW1p4eLR1drHz7XznQt46eriwBCdFXeQANOpr+8rBh68/dP3X6esDZX+t3qCbyOsiew+81vZJJy6+e7+5tzf3tlaMOyfbLS8SdZEJiONOPK8c7r58sfl4bu7Nq93DT/Mf5ztQS7QuinGuWrgPugsSxxVeS5V7XYnzuFLB+rQ+nQ3g34QBQAU0LgCDvz5WCgMASSpJBRAsdHU1TfNJUDut1YIAbC3AGCOEMbcRWxHoClDqAxQ0VdUwDsAfIbBVTO8GAJgawiig11MAqQ/AbkQ4IOAJtoq4MAMjBr0Z4KuqD9cDAn/cJggTDoCgbogADBek+r5PCHUjBEyfecOxoiimDDLBoGs/wHULdC8oAHxUwh9KAKYidoA5wJJlxbwO0LsHFAABYAaAPaDeADE5wGIAy+oBSNLAWxAAjW3iJYA+mQLM/ggEQLoCIOaFiNgwKvDjACUFKJcFoFy+A9JUTSOEBsABYLNtUDhAVmgkkEoPgDuKFVIpUWDBBQAtMtfFhLgFDrBkFkkGgEUEBCLKm8AffTL4WWY6gokmmmiiUeYFPKwr5x44QGMB8LDBYpQUcgN65wWX9gkQfOODgbkgG1C6bDQBNAmt2+rzA6RSb6fCA219FMC1c8FQQGpeGDoXDAeU+LxwCRAtLS8glQIFWBxg9s0F2QCeiskArCubOSOQUgCFA8ycgPS8oHRzp6MNTSUHoL/dsydb4wAgd8tio821gP/oPFz1ouD5GQAAAABJRU5ErkJggg=="
      };
      break;
  }
  game.accounts[game.currentAccount] = game.currentUser;
  localStorage.setItem("ShyFog_accounts", JSON.stringify(game.accounts));
  mainMenu();
}

// The main entrypoint of the game once page loads
window.addEventListener("DOMContentLoaded", () => {
  game.accounts = [];
  game.currentAccount = 0;
  if (localStorage.getItem("ShyFog_accounts")) {
    try {
      game.accounts = JSON.parse(localStorage.getItem("ShyFog_accounts"));
    } catch {}
  }
  if (localStorage.getItem("ShyFog_currentAccount")) {
    game.currentAccount = parseInt(localStorage.getItem("ShyFog_currentAccount"));
    if (isNaN(game.currentAccount)) {
      game.currentAccount = 0;
    }
  }
  game.currentUser = game.accounts[game.currentAccount];
  game.servers = [];
  if (localStorage.getItem("ShyFog_servers")) {
    try {
      game.servers = JSON.parse(localStorage.getItem("ShyFog_servers"));
    } catch {}
  }
  document.body.addEventListener("contextmenu", event => {
    event.preventDefault();
  });
  document.body.innerHTML = `
    <video id="panorama" src="panorama.mp4" autoplay muted loop playsinline disablepictureinpicture></video>
    <p id="client-info">ShyFog Client ${game.version}</p>
    <div id="main-menu"></div>
  `;
  if (!game.currentUser) {
    return loginMenu();
  }
  mainMenu();
});