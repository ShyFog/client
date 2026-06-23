window.game = {
  "version": "v0.0.1",
  "authServer": "https://shyfog-auth.topcatto8.workers.dev/api",
  "blockSize": 32,
  "canvas": null,
  "context": null,
  "chunks": {},
  "biomes": {},
  "worldMetadata": {},
  "playerMetadata": {},
  "holdingKeys": new Map,
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
  "coyoteTime": -Infinity
};

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

// Fix big delta time if the page was not visible for some time (for example, screenshots)
window.addEventListener("visibilitychange", () => {
  if (document.visibilityState == "visible") {
    game.prevFrame = performance.now();
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
    <div class="button" id="proceed">Register</div>
    <br />
    <br />
    <p style="margin: 0;">Already have a ShyFog account? <a id="login">Login</a></p>
    <p style="margin: 0;">Or <a id="offline">play offline</a></p>
  `;
  document.querySelector("#proceed").addEventListener("click", () => proceed("register"));
  document.querySelector("#login").addEventListener("click", loginMenu);
  document.querySelector("#offline").addEventListener("click", offlineMenu);
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
    <p style="margin: 0;">Logged in as <span id="skin-preview"><span class="skin-preview-layer" id="skin-preview-layer1"></span><span class="skin-preview-layer" id="skin-preview-layer2"></span></span> <a>${game.currentUser.username.split("<").join("&lt;").split(">").join("&gt;")}</a>${game.currentUser.token ? "" : ` <img src="offline.png" width="20px" height="20px" style="vertical-align: middle; cursor: help; margin-bottom: 3px;" title="Offline" />`} <img src="logout.png" width="20px" height="20px" style="vertical-align: middle; cursor: pointer; margin-bottom: 3px;" id="logout" title="Logout" /></p>
  `;
  document.querySelector("#multiplayer").addEventListener("click", directConnectMenu);
  document.querySelector("#skin-preview-layer1").style.backgroundImage = `url("${game.currentUser.skin}")`;
  document.querySelector("#skin-preview-layer2").style.backgroundImage = `url("${game.currentUser.skin}")`;
  document.querySelector("#logout").addEventListener("click", logout);
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
  document.querySelector("#cancel").addEventListener("click", mainMenu);
}

function logout() {
  localStorage.removeItem("ShyFog_auth");
  location.reload();
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
      var result = await fetch(`${game.authServer}/register`, {
        "method": "POST",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": JSON.stringify({ email, username, password })
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
    case "offline":
      var username = document.querySelector("#username").value;
      game.currentUser = {
        username,
        "skin": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAABL1BMVEUBAABGOqUwKHIAr6+qfWaWX0EAaGgAf38AqKgAmZlqQDB1Ry8qHQ0mIVs/Pz9ra2uHVTuWb1soKCgAYGBWScwmGgoAzMwvHw86MYkkGAgoGwoAW1sAAABRMSUAnp4pHAwsHg6GUzQrHg2BUzkfEAsmGAsoGg0nGwstHQ4tIBCaY0QzJBFFIg6cZ0gjFwkkGAomGgwoGwsoHAsrHg4sHhEvIhEyIxBBIQw6KBRiQy9SPYl0SC+KTD2EUjGHWDqIWjmKWTucY0WcaUydak+iake0hG27iXL///8vIA1CHQo0JRI/KhVCKhJSKCZtQypvRSx6TjOAUzSDVTuPXj6QXkOWX0CcY0aaZEqfaEmcclysdlqze2K1e2etgG23gnK2iWy+iGy9i3K9jnK9jnTGloCtoI9HAAAAAXRSTlMAQObYZgAAAwBJREFUWMPtlmd7okAQxyNL2UX04O4QhAvNWNN7v/Tkeu+9ff/PcLO7bqIYA8a3/h8fdyjzY2aZh5mpqa4Mowq/6kyxq6lRZVQdBwDVos50C4Dj2BzwAPR8dEDVoTk4BgfcKgLDtp1xAMx/HIDthPYMBcR6HN/mLYQ2yDBGfo2eZzfDjXb7UeKsVO3EaLc3wqbteaIu8gDsKExmkySZffY0WplNwsimgG5dZAKiuh2uLi+Gyc8//37//fIkXFxeDe16JOoiO4JGK/Ka0bp8Jn//fH58vB41vajV8ERd5EjBW1p4eLR1drHz7XznQt46eriwBCdFXeQANOpr+8rBh68/dP3X6esDZX+t3qCbyOsiew+81vZJJy6+e7+5tzf3tlaMOyfbLS8SdZEJiONOPK8c7r58sfl4bu7Nq93DT/Mf5ztQS7QuinGuWrgPugsSxxVeS5V7XYnzuFLB+rQ+nQ3g34QBQAU0LgCDvz5WCgMASSpJBRAsdHU1TfNJUDut1YIAbC3AGCOEMbcRWxHoClDqAxQ0VdUwDsAfIbBVTO8GAJgawiig11MAqQ/AbkQ4IOAJtoq4MAMjBr0Z4KuqD9cDAn/cJggTDoCgbogADBek+r5PCHUjBEyfecOxoiimDDLBoGs/wHULdC8oAHxUwh9KAKYidoA5wJJlxbwO0LsHFAABYAaAPaDeADE5wGIAy+oBSNLAWxAAjW3iJYA+mQLM/ggEQLoCIOaFiNgwKvDjACUFKJcFoFy+A9JUTSOEBsABYLNtUDhAVmgkkEoPgDuKFVIpUWDBBQAtMtfFhLgFDrBkFkkGgEUEBCLKm8AffTL4WWY6gokmmmiiUeYFPKwr5x44QGMB8LDBYpQUcgN65wWX9gkQfOODgbkgG1C6bDQBNAmt2+rzA6RSb6fCA219FMC1c8FQQGpeGDoXDAeU+LxwCRAtLS8glQIFWBxg9s0F2QCeiskArCubOSOQUgCFA8ycgPS8oHRzp6MNTSUHoL/dsydb4wAgd8tio821gP/oPFz1ouD5GQAAAABJRU5ErkJggg=="
      };
      break;
  }
  localStorage.setItem("ShyFog_auth", JSON.stringify(game.currentUser));
  mainMenu();
}

// The main entrypoint of the game once page loads
window.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("ShyFog_auth")) {
    try {
      game.currentUser = JSON.parse(localStorage.getItem("ShyFog_auth"));
    } catch {}
  }
  document.body.innerHTML = `
    <video id="panorama" src="panorama.mp4" autoplay muted loop playsinline></video>
    <div id="main-menu"></div>
  `;
  if (!game.currentUser) {
    return loginMenu();
  }
  mainMenu();
});