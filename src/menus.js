ShyFog.Client.loginMenu = () => {
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
  document.querySelector("#proceed").addEventListener("click", () => ShyFog.Client.proceedAuth("login"));
  document.querySelector("#register").addEventListener("click", ShyFog.Client.registerMenu);
  document.querySelector("#offline").addEventListener("click", ShyFog.Client.offlineMenu);
};

ShyFog.Client.registerMenu = () => {
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
  document.querySelector("#proceed").addEventListener("click", () => ShyFog.Client.proceedAuth("register"));
  document.querySelector("#login").addEventListener("click", ShyFog.Client.loginMenu);
  document.querySelector("#offline").addEventListener("click", ShyFog.Client.offlineMenu);
  ShyFog.Client.registerCaptchaId = grecaptcha.render(document.querySelector("#captcha"), {
    "sitekey": ShyFog.Client.captchaSiteKey
  });
};

ShyFog.Client.offlineMenu = () => {
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
  document.querySelector("#proceed").addEventListener("click", () => ShyFog.Client.proceedAuth("offline"));
  document.querySelector("#login").addEventListener("click", ShyFog.Client.loginMenu);
  document.querySelector("#register").addEventListener("click", ShyFog.Client.registerMenu);
};

ShyFog.Client.mainMenu = () => {
  document.querySelector("#main-menu").innerHTML = `
    <font size="6">ShyFog</font>
    <br />
    <div class="button disabled" id="singleplayer" style="width: 200px;">Singleplayer</div>
    <div class="button" id="multiplayer" style="width: 200px;">Multiplayer</div>
    <div class="button" id="settings" style="width: 200px;">Settings</div>
    <br />
    <br />
    <p style="margin: 0;">Logged in as <span class="skin-preview"><span class="skin-preview-layer skin-preview-layer1"></span><span class="skin-preview-layer skin-preview-layer2"></span><span class="skin-preview-layer skin-preview-layer3"></span></span> <a>${ShyFog.Client.antiXSS(ShyFog.Client.user.username)}</a>${ShyFog.Client.user.token ? "" : ` <img src="offline.png" width="20px" height="20px" style="vertical-align: middle; cursor: help; margin-bottom: 3px;" title="Offline" />`} <img src="switch-user.png" width="20px" height="20px" style="vertical-align: middle; cursor: pointer; margin-bottom: 3px;" id="switch-user" title="Switch User" /></p>
  `;
  document.querySelector("#multiplayer").addEventListener("click", ShyFog.Client.multiplayerMenu);
  document.querySelector("#settings").addEventListener("click", ShyFog.Client.settingsMenu);
  document.querySelector(".skin-preview-layer2").style.backgroundImage = `url("${ShyFog.Client.user.skin}")`;
  document.querySelector(".skin-preview-layer3").style.backgroundImage = `url("${ShyFog.Client.user.skin}")`;
  document.querySelector("#switch-user").addEventListener("click", ShyFog.Client.accountsMenu);
};

ShyFog.Client.multiplayerMenu = () => {
  document.querySelector("#main-menu").innerHTML = `
    <font size="6">Play Multiplayer</font>
    <br />
    <div id="server-list">
      ${ShyFog.Client.servers.map((server, index) => `
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
  document.querySelector("#add-server").addEventListener("click", ShyFog.Client.addServerMenu);
  document.querySelector("#direct-connect").addEventListener("click", ShyFog.Client.directConnectMenu);
  document.querySelector("#refresh").addEventListener("click", ShyFog.Client.multiplayerMenu);
  document.querySelector("#cancel").addEventListener("click", ShyFog.Client.mainMenu);
  async function probeServer(index) {
    var server = ShyFog.Client.servers[index];
    if (server.cachedIcon) {
      document.querySelector(`#server-${index} .icon`).src = server.cachedIcon;
    }
    document.querySelector(`#server-${index}`).addEventListener("click", () => ShyFog.Client.connectServer(server.address, server.forceSSL));
    document.querySelector(`#server-${index} .meta .actions .delete`).addEventListener("click", event => {
      event.stopPropagation();
      ShyFog.Client.servers.splice(index, 1);
      localStorage.setItem("ShyFog_servers", JSON.stringify(ShyFog.Client.servers));
      ShyFog.Client.multiplayerMenu();
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
    localStorage.setItem("ShyFog_servers", JSON.stringify(ShyFog.Client.servers));
    try {
      document.querySelector(`#server-${index} .icon`).src = (server.cachedIcon || "textures/misc/unknown_server.png");
      document.querySelector(`#server-${index} .description`).innerText = pingResult.motd;
      document.querySelector(`#server-${index} .status`).innerHTML = `${pingResult.onlinePlayers} / ${pingResult.maxPlayers} <img src="textures/gui/sprites/server_list/ping_5.png" />`;
    } catch {}
  }
  for (var index = 0; index < ShyFog.Client.servers.length; index++) {
    probeServer(index);
  }
};

ShyFog.Client.settingsMenu = () => {
  document.querySelector("#main-menu").innerHTML = `
    <font size="6">Settings</font>
    <br />
    ${ShyFog.Client.settingsSchema.map((setting, index) => {
      if (setting.type == "toggle") {
        return `
          <div class="button" id="setting-${index}" style="width: 210px;">${setting.name}: ${ShyFog.Client.settings[setting.property]}</div>
        `;
      }
      if (setting.type == "input") {
        return `
          <div class="button" id="setting-${index}" style="width: 210px;">${setting.name}: <input type="${setting.inputType}" value="${ShyFog.Client.settings[setting.property]}" style="width: ${Math.max(1, ShyFog.Client.settings[setting.property].toString().length)}ch;" required /></div>
        `;
      }
      return "";
    }).join("")}
    <br />
    <br />
    <div class="button" id="done" style="width: 150px;">Done</div>
  `;
  document.querySelector("#done").addEventListener("click", () => {
    if (ShyFog.Client.context) {
      ShyFog.Client.pauseMenu();
    } else {
      ShyFog.Client.mainMenu();
    }
  });
  function registerSetting(index) {
    var setting = ShyFog.Client.settingsSchema[index];
    if (setting.type == "toggle") {
      document.querySelector(`#setting-${index}`).addEventListener("click", () => {
        var currentOptionIndex = setting.options.indexOf(ShyFog.Client.settings[setting.property]);
        if (++currentOptionIndex >= setting.options.length) {
          currentOptionIndex = 0;
        }
        ShyFog.Client.settings[setting.property] = setting.options[currentOptionIndex];
        localStorage.setItem("ShyFog_settings", JSON.stringify(ShyFog.Client.settings));
        document.querySelector(`#setting-${index}`).innerText = `${setting.name}: ${ShyFog.Client.settings[setting.property]}`;
      });
    }
    if (setting.type == "input") {
      document.querySelector(`#setting-${index}`).addEventListener("click", () => {
        document.querySelector(`#setting-${index} input`).focus();
      });
      document.querySelector(`#setting-${index} input`).addEventListener("input", () => {
        document.querySelector(`#setting-${index} input`).style.width = `${Math.max(1, document.querySelector(`#setting-${index} input`).value.length)}ch`;
      });
      document.querySelector(`#setting-${index} input`).addEventListener("change", () => {
        ShyFog.Client.settings[setting.property] = document.querySelector(`#setting-${index} input`).value;
        if (setting.inputType == "number") {
          ShyFog.Client.settings[setting.property] = parseFloat(ShyFog.Client.settings[setting.property] || "0");
        }
        localStorage.setItem("ShyFog_settings", JSON.stringify(ShyFog.Client.settings));
      });
    }
  }
  for (var index = 0; index < ShyFog.Client.settingsSchema.length; index++) {
    registerSetting(index);
  }
};

ShyFog.Client.addServerMenu = () => {
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
    ShyFog.Client.servers.push({
      name, address, forceSSL
    });
    localStorage.setItem("ShyFog_servers", JSON.stringify(ShyFog.Client.servers));
    ShyFog.Client.multiplayerMenu();
  });
  document.querySelector("#cancel").addEventListener("click", ShyFog.Client.multiplayerMenu);
};

ShyFog.Client.directConnectMenu = () => {
  document.querySelector("#main-menu").innerHTML = `
    <font size="6">Direct connect</font>
    <br />
    <input type="text" name="address" id="address" placeholder="Server address..." required />
    <br />
    <div class="button" id="connect">Connect</div>
    <div class="button" id="cancel">Cancel</div>
  `;
  document.querySelector("#connect").addEventListener("click", () => ShyFog.Client.connectServer(document.querySelector("#address").value));
  document.querySelector("#cancel").addEventListener("click", ShyFog.Client.multiplayerMenu);
};

ShyFog.Client.accountsMenu = () => {
  document.querySelector("#main-menu").innerHTML = `
    <font size="6">Accounts</font>
    <br />
    <div id="server-list">
      ${ShyFog.Client.accounts.map((account, index) => `
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
    ShyFog.Client.currentAccount = ShyFog.Client.accounts.length;
    localStorage.setItem("ShyFog_currentAccount", ShyFog.Client.currentAccount.toString());
    location.reload();
  });
  document.querySelector("#cancel").addEventListener("click", ShyFog.Client.mainMenu);
  function registerAccountEvents(index) {
    var account = ShyFog.Client.accounts[index];
    document.querySelector(`#server-${index} .skin-preview-layer2`).style.backgroundImage = `url("${account.skin}")`;
    document.querySelector(`#server-${index} .skin-preview-layer3`).style.backgroundImage = `url("${account.skin}")`;
    document.querySelector(`#server-${index}`).addEventListener("click", () => {
      ShyFog.Client.currentAccount = index;
      localStorage.setItem("ShyFog_currentAccount", ShyFog.Client.currentAccount.toString());
      location.reload();
    });
    document.querySelector(`#server-${index} .meta .actions .delete`).addEventListener("click", event => {
      event.stopPropagation();
      ShyFog.Client.accounts.splice(index, 1);
      if (ShyFog.Client.currentAccount == index) {
        ShyFog.Client.currentAccount = 0;
      }
      localStorage.setItem("ShyFog_accounts", JSON.stringify(ShyFog.Client.accounts));
      localStorage.setItem("ShyFog_currentAccount", ShyFog.Client.currentAccount.toString());
      location.reload();
    });
  }
  for (var index = 0; index < ShyFog.Client.accounts.length; index++) {
    registerAccountEvents(index);
  }
};

ShyFog.Client.pauseMenu = () => {
  document.querySelector("#main-menu").innerHTML = `
    <font size="6">Paused</font>
    <br />
    <div class="button" id="resume" style="width: 200px;">Resume</div>
    <div class="button" id="settings" style="width: 200px;">Settings</div>
    <div class="button" id="leave" style="width: 200px;">Leave</div>
  `;
  document.querySelector("#resume").addEventListener("click", () => {
    ShyFog.Client.paused = false;
    ShyFog.Client.canvas.style.filter = "";
    document.querySelector("#main-menu").style.display = "none";
  });
  document.querySelector("#settings").addEventListener("click", ShyFog.Client.settingsMenu);
  document.querySelector("#leave").addEventListener("click", () => ShyFog.Client.ws.close(1000, "Disconnected"));
}

ShyFog.Client.proceedError = text => {
  document.querySelector("#error").style.display = "block";
  document.querySelector("#error").innerText = text;
  setTimeout(() => {
    if (document.querySelector("#error")) {
      document.querySelector("#error").style.display = "none";
      document.querySelector("#error").innerText = "";
    }
  }, 3000);
};

ShyFog.Client.proceedAuth = async type => {
  switch(type) {
    case "login":
      var email = document.querySelector("#email").value;
      var password = document.querySelector("#password").value;
      if (!email || !email.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
        return ShyFog.Client.proceedError("Invalid email.");
      }
      if (!password || !password.match(/^.+$/)) {
        return ShyFog.Client.proceedError("Invalid password.");
      }
      if (password.length < 8) {
        return ShyFog.Client.proceedError("Password is too short.");
      }
      var result = await fetch(`${ShyFog.Client.authServer}/login`, {
        "method": "POST",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": JSON.stringify({ email, password })
      }).then(res => res.json());
      if (result.error) {
        return ShyFog.Client.proceedError(result.error);
      }
      ShyFog.Client.user = {
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
      var captcha = grecaptcha.getResponse(ShyFog.Client.registerCaptchaId);
      if (!email || !email.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/)) {
        return ShyFog.Client.proceedError("Invalid email.");
      }
      if (!username || !username.match(/^[A-Za-z0-9_]+$/)) {
        return ShyFog.Client.proceedError("Invalid username.");
      }
      if (username.length < 3) {
        return ShyFog.Client.proceedError("Username is too short.");
      }
      if (username.length > 20) {
        return ShyFog.Client.proceedError("Username is too long.");
      }
      if (!password || !password.match(/^.+$/)) {
        return ShyFog.Client.proceedError("Invalid password.");
      }
      if (password.length < 8) {
        return ShyFog.Client.proceedError("Password is too short.");
      }
      if (password != password2) {
        return ShyFog.Client.proceedError("Passwords do not match.");
      }
      if (!captcha) {
        return ShyFog.Client.proceedError("CAPTCHA is not completed.");
      }
      var result = await fetch(`${ShyFog.Client.authServer}/register`, {
        "method": "POST",
        "headers": {
          "Content-Type": "application/json"
        },
        "body": JSON.stringify({ email, username, password, captcha })
      }).then(res => res.json());
      if (result.error) {
        grecaptcha.reset(ShyFog.Client.registerCaptchaId);
        return ShyFog.Client.proceedError(result.error);
      }
      ShyFog.Client.user = {
        "id": result.id,
        "username": result.username,
        "token": result.token,
        "skin": result.skin
      };
      break;
    case "offline":
      var username = document.querySelector("#username").value;
      ShyFog.Client.user = {
        username,
        "skin": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAMAAACdt4HsAAABL1BMVEUBAABGOqUwKHIAr6+qfWaWX0EAaGgAf38AqKgAmZlqQDB1Ry8qHQ0mIVs/Pz9ra2uHVTuWb1soKCgAYGBWScwmGgoAzMwvHw86MYkkGAgoGwoAW1sAAABRMSUAnp4pHAwsHg6GUzQrHg2BUzkfEAsmGAsoGg0nGwstHQ4tIBCaY0QzJBFFIg6cZ0gjFwkkGAomGgwoGwsoHAsrHg4sHhEvIhEyIxBBIQw6KBRiQy9SPYl0SC+KTD2EUjGHWDqIWjmKWTucY0WcaUydak+iake0hG27iXL///8vIA1CHQo0JRI/KhVCKhJSKCZtQypvRSx6TjOAUzSDVTuPXj6QXkOWX0CcY0aaZEqfaEmcclysdlqze2K1e2etgG23gnK2iWy+iGy9i3K9jnK9jnTGloCtoI9HAAAAAXRSTlMAQObYZgAAAwBJREFUWMPtlmd7okAQxyNL2UX04O4QhAvNWNN7v/Tkeu+9ff/PcLO7bqIYA8a3/h8fdyjzY2aZh5mpqa4Mowq/6kyxq6lRZVQdBwDVos50C4Dj2BzwAPR8dEDVoTk4BgfcKgLDtp1xAMx/HIDthPYMBcR6HN/mLYQ2yDBGfo2eZzfDjXb7UeKsVO3EaLc3wqbteaIu8gDsKExmkySZffY0WplNwsimgG5dZAKiuh2uLi+Gyc8//37//fIkXFxeDe16JOoiO4JGK/Ka0bp8Jn//fH58vB41vajV8ERd5EjBW1p4eLR1drHz7XznQt46eriwBCdFXeQANOpr+8rBh68/dP3X6esDZX+t3qCbyOsiew+81vZJJy6+e7+5tzf3tlaMOyfbLS8SdZEJiONOPK8c7r58sfl4bu7Nq93DT/Mf5ztQS7QuinGuWrgPugsSxxVeS5V7XYnzuFLB+rQ+nQ3g34QBQAU0LgCDvz5WCgMASSpJBRAsdHU1TfNJUDut1YIAbC3AGCOEMbcRWxHoClDqAxQ0VdUwDsAfIbBVTO8GAJgawiig11MAqQ/AbkQ4IOAJtoq4MAMjBr0Z4KuqD9cDAn/cJggTDoCgbogADBek+r5PCHUjBEyfecOxoiimDDLBoGs/wHULdC8oAHxUwh9KAKYidoA5wJJlxbwO0LsHFAABYAaAPaDeADE5wGIAy+oBSNLAWxAAjW3iJYA+mQLM/ggEQLoCIOaFiNgwKvDjACUFKJcFoFy+A9JUTSOEBsABYLNtUDhAVmgkkEoPgDuKFVIpUWDBBQAtMtfFhLgFDrBkFkkGgEUEBCLKm8AffTL4WWY6gokmmmiiUeYFPKwr5x44QGMB8LDBYpQUcgN65wWX9gkQfOODgbkgG1C6bDQBNAmt2+rzA6RSb6fCA219FMC1c8FQQGpeGDoXDAeU+LxwCRAtLS8glQIFWBxg9s0F2QCeiskArCubOSOQUgCFA8ycgPS8oHRzp6MNTSUHoL/dsydb4wAgd8tio821gP/oPFz1ouD5GQAAAABJRU5ErkJggg=="
      };
      break;
  }
  ShyFog.Client.accounts[ShyFog.Client.currentAccount] = ShyFog.Client.user;
  localStorage.setItem("ShyFog_accounts", JSON.stringify(ShyFog.Client.accounts));
  ShyFog.Client.mainMenu();
};