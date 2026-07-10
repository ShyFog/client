globalThis.ShyFog = (globalThis.ShyFog || {});
ShyFog.Client = {};
ShyFog.Client.version = "%SHYFOG_VERSION%";
ShyFog.Client.authServer = "https://shyfog-auth.topcatto8.workers.dev/api";
ShyFog.Client.captchaSiteKey = "6LePli8tAAAAABxR-Y8ZfzDCQORwxLSXzbMMKHAl";
ShyFog.Client.settingsSchema = [{
  "property": "vignette",
  "type": "toggle",
  "name": "Vignette",
  "options": ["ON", "OFF"],
  "default": "ON"
}, {
  "property": "autoPause",
  "type": "toggle",
  "name": "Auto-pause",
  "options": ["ON", "OFF"],
  "default": "ON"
}, {
  "property": "showOwnNametag",
  "type": "toggle",
  "name": "Show Own Nametag",
  "options": ["ON", "OFF"],
  "default": "OFF"
}, {
  "property": "guiScale",
  "type": "toggle",
  "name": "GUI Scale",
  "options": ["Auto", "x1", "x2", "x3", "x4", "x5"],
  "default": "Auto"
}, {
  "property": "antiAliasing",
  "type": "toggle",
  "name": "Anti-aliasing",
  "options": ["OFF", "x2", "x4", "x8"],
  "default": "x2"
}, {
  "property": "blockSize",
  "type": "input",
  "name": "Block Size",
  "inputType": "number",
  "default": 32
}, {
  "property": "renderDistance",
  "type": "input",
  "name": "Render Distance",
  "inputType": "number",
  "default": 2
}];
ShyFog.Client.defaultValues = {};
ShyFog.Client.resetState = () => {
  for (var key in ShyFog.Client.defaultValues) {
    ShyFog.Client[key] = ShyFog.Client.defaultValues[key];
  }
};
ShyFog.Client.defaultValues.holdingKeys = new Map;
ShyFog.Client.defaultValues.worldMetadata = {};
ShyFog.Client.defaultValues.chunks = {};
ShyFog.Client.defaultValues.biomes = {};
ShyFog.Client.defaultValues.players = {};
ShyFog.Client.defaultValues.chatMessages = [];
ShyFog.Client.resetState();

ShyFog.Client.antiXSS = text => text.split("<").join("&lt;").split(">").join("&gt;");

ShyFog.Client.log = (type, text) => {
  var date = new Date;
  var methods = {
    "INFO": "log",
    "WARN": "warn",
    "ERROR": "error",
    "FATAL": "error"
  };
  var colors = {
    "INFO": 37,
    "WARN": 33,
    "ERROR": 31,
    "FATAL": 31
  };
  var hours = date.getHours().toString();
  var minutes = date.getMinutes().toString();
  var seconds = date.getSeconds().toString();
  if (hours.length < 2) {
    hours = `0${hours}`;
  }
  if (minutes.length < 2) {
    minutes = `0${minutes}`;
  }
  if (seconds.length < 2) {
    seconds = `0${seconds}`;
  }
  console[methods[type]](`\x1b[${colors[type]}m[${hours}:${minutes}:${seconds}]: [client/${type}] ${text}\x1b[0m`);
};

ShyFog.Client.log("INFO", `Loading ShyFog ${ShyFog.Client.version}`);

window.addEventListener("keydown", event => {
  // A tiny bit of protection against cheating :)
  if (event.code == "F12") {
    event.preventDefault();
  }
  if (event.ctrlKey && event.shiftKey && (event.code == "KeyI" || event.code == "KeyJ" || event.code == "KeyC")) {
    event.preventDefault();
  }

  // Stop shortcuts like Ctrl + D doing a bookmark instead of sprinting right
  if (event.ctrlKey && ["KeyW", "KeyA", "KeyS", "KeyD"].includes(event.code)) {
    event.preventDefault();
  }

  ShyFog.Client.holdingKeys.set(event.code, true);
});

window.addEventListener("keyup", event => {
  ShyFog.Client.holdingKeys.set(event.code, false);
});

// The main entrypoint of the game once page loads
window.addEventListener("DOMContentLoaded", () => {
  if (!ShyFog.Client.items || !ShyFog.Client.guis || !ShyFog.Client.recipes) {
    ShyFog.Client.log("ERROR", "Unable to find data repository, game will not work!");
  }
  ShyFog.Client.log("INFO", "Loading saved data...");
  ShyFog.Client.accounts = [];
  ShyFog.Client.currentAccount = 0;
  ShyFog.Client.settings = {};
  if (localStorage.getItem("ShyFog_accounts")) {
    try {
      ShyFog.Client.accounts = JSON.parse(localStorage.getItem("ShyFog_accounts"));
    } catch {}
  }
  if (localStorage.getItem("ShyFog_currentAccount")) {
    ShyFog.Client.currentAccount = parseInt(localStorage.getItem("ShyFog_currentAccount"));
    if (isNaN(ShyFog.Client.currentAccount)) {
      ShyFog.Client.currentAccount = 0;
    }
  }
  if (localStorage.getItem("ShyFog_settings")) {
    try {
      ShyFog.Client.settings = JSON.parse(localStorage.getItem("ShyFog_settings"));
    } catch {}
  }
  ShyFog.Client.settings = Object.assign(Object.fromEntries(ShyFog.Client.settingsSchema.map(setting => [setting.property, setting.default])), ShyFog.Client.settings);
  ShyFog.Client.user = ShyFog.Client.accounts[ShyFog.Client.currentAccount];
  ShyFog.Client.servers = [];
  if (localStorage.getItem("ShyFog_servers")) {
    try {
      ShyFog.Client.servers = JSON.parse(localStorage.getItem("ShyFog_servers"));
    } catch {}
  }

  document.body.addEventListener("contextmenu", event => {
    event.preventDefault();
  });
  document.body.innerHTML = `
    <video id="panorama" src="panorama.mp4" autoplay muted loop playsinline disablepictureinpicture></video>
    <p id="client-info">ShyFog Client ${ShyFog.Client.version}</p>
    <div id="main-menu"></div>
  `;
  if (!ShyFog.Client.user) {
    ShyFog.Client.log("INFO", "Current user not set, opening login menu");
    return ShyFog.Client.loginMenu();
  }
  ShyFog.Client.log("INFO", `Setting user: ${ShyFog.Client.user.username}`);
  ShyFog.Client.mainMenu();
});