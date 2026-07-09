ShyFog.Client.defaultValues.cursorX = 0;
ShyFog.Client.defaultValues.cursorY = 0;
ShyFog.Client.defaultValues.breakingBlock = false;
ShyFog.Client.defaultValues.breakingBlockTicks = 0;
ShyFog.Client.defaultValues.breakingBlockCache = {};
ShyFog.Client.defaultValues.placingBlock = false;
ShyFog.Client.defaultValues.lastTick = 0;
ShyFog.Client.defaultValues.lastBlockAction = -Infinity;
ShyFog.Client.defaultValues.hideOverlays = false;
ShyFog.Client.defaultValues.preventDebug = false;
ShyFog.Client.defaultValues.debugMode = false;
ShyFog.Client.defaultValues.debugModeHitboxes = false;
ShyFog.Client.defaultValues.debugModeChunks = false;
ShyFog.Client.resetState();

ShyFog.Client.handleMousedown = event => {
  if (ShyFog.Client.paused) {
    return;
  }
  if (event.button == 0) {
    ShyFog.Client.breakingBlock = true;
    ShyFog.Client.breakingBlockTicks = 0;
  }
  if (event.button == 2) {
    ShyFog.Client.placingBlock = true;
  }

  var { guiScale } = ShyFog.Client.settings;
  if (guiScale == "Auto") {
    // Auto-detect GUI scale
    guiScale = 1;
    while(256 * (guiScale + 1) <= Math.min(ShyFog.Client.canvas.width, ShyFog.Client.canvas.height)) {
      guiScale++;
    }
  } else {
    guiScale = parseFloat(guiScale.slice(1));
  }

  var currentUser = ShyFog.Client.players[ShyFog.Client.user.username];
  if (currentUser.currentGUI) {
    var currentGUIData = ShyFog.Client.guis[currentUser.currentGUI.id];
    var guiBackground = ShyFog.Client.getTexture(currentGUIData.background);
    var guiBackgroundWidth = (currentGUIData.backgroundWidth || guiBackground.width);
    var guiBackgroundHeight = (currentGUIData.backgroundHeight || guiBackground.height);
    var guiStartX = (ShyFog.Client.canvas.width / 2) - (guiBackgroundWidth * guiScale / 2);
    var guiStartY = (ShyFog.Client.canvas.height / 2) - (guiBackgroundHeight * guiScale / 2);
    for (var element of currentGUIData.content) {
      var hovering = ShyFog.Client.cursorX >= guiStartX + (element.x * guiScale) && ShyFog.Client.cursorY >= guiStartY + (element.y * guiScale) && ShyFog.Client.cursorX <= guiStartX + ((element.x + element.width) * guiScale) && ShyFog.Client.cursorY <= guiStartY + ((element.y + element.height) * guiScale);
      if (["player_slot", "block_slot", "world_slot"].includes(element.type) && hovering) {
        ShyFog.Client.sendPacket(ShyFog.Client.PacketType.GUI_CLICK, event.button, element.type, element.slot);
      }
    }
  }
};

ShyFog.Client.handleMouseup = event => {
  if (event.button == 0) {
    ShyFog.Client.breakingBlock = false;
  }
  if (event.button == 2) {
    ShyFog.Client.placingBlock = false;
  }
};

window.addEventListener("keydown", () => {
  if (!ShyFog.Client.context) {
    return;
  }

  // Esc to pause/resume, but prioritize closing current GUI
  if (event.code == "Escape") {
    if (ShyFog.Client.players[ShyFog.Client.user.username].currentGUI) {
      ShyFog.Client.players[ShyFog.Client.user.username].currentGUI = null;
      ShyFog.Client.sendPacket(ShyFog.Client.PacketType.CLOSE_GUI);
    } else {
      ShyFog.Client.paused = !ShyFog.Client.paused;
      ShyFog.Client.canvas.style.filter = (ShyFog.Client.paused ? "blur(4px)" : "");
      ShyFog.Client.pauseMenu();
      document.querySelector("#main-menu").style.display = (ShyFog.Client.paused ? "flex" : "none");
    }
  }

  if (ShyFog.Client.paused) {
    // Don't accept any keys while paused
    return;
  }

  // Hotbar using digits
  if (["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9"].includes(event.code)) {
    ShyFog.Client.players[ShyFog.Client.user.username].selectedHotbarSlot = (parseInt(event.code.slice(5)) - 1);
    ShyFog.Client.sendPacket(ShyFog.Client.PacketType.HOTBAR_SWITCH, ShyFog.Client.players[ShyFog.Client.user.username].selectedHotbarSlot);
  }

  // E to open inventory/close current GUI
  if (event.code == "KeyE") {
    if (ShyFog.Client.players[ShyFog.Client.user.username].currentGUI) {
      ShyFog.Client.players[ShyFog.Client.user.username].currentGUI = null;
      ShyFog.Client.sendPacket(ShyFog.Client.PacketType.CLOSE_GUI);
    } else {
      ShyFog.Client.sendPacket(ShyFog.Client.PacketType.OPEN_INVENTORY);
    }
  }

  // F1 to hide overlays like hotbar
  if (event.code == "F1") {
    ShyFog.Client.hideOverlays = !ShyFog.Client.hideOverlays;
    event.preventDefault();
  }

  // F3 debug keys
  if (event.code == "F3") {
    event.preventDefault();
  }
  if (ShyFog.Client.holdingKeys.get("F3") && event.code == "KeyG") {
    ShyFog.Client.debugModeChunks = !ShyFog.Client.debugModeChunks;
    ShyFog.Client.preventDebug = true;
  }
  if (ShyFog.Client.holdingKeys.get("F3") && event.code == "KeyB") {
    ShyFog.Client.debugModeHitboxes = !ShyFog.Client.debugModeHitboxes;
    ShyFog.Client.preventDebug = true;
  }
  if (ShyFog.Client.holdingKeys.get("F3") && event.code == "KeyT") {
    ShyFog.Client.texturesCache.clear();
    ShyFog.Client.preventDebug = true;
  }
});

window.addEventListener("keyup", event => {
  if (event.code == "F3") {
    // Prevent opening debug menu if another shortcut like F3 + G or F3 + B was pressed
    if (ShyFog.Client.preventDebug) {
      ShyFog.Client.preventDebug = false;
    } else {
      ShyFog.Client.debugMode = !ShyFog.Client.debugMode;
    }
  }
});

window.addEventListener("mousemove", event => {
  ShyFog.Client.cursorX = event.clientX;
  ShyFog.Client.cursorY = event.clientY;
});

window.addEventListener("wheel", event => {
  if (!ShyFog.Client.context || ShyFog.Client.paused) {
    return;
  }
  var delta = Math.max(-1, Math.min(event.deltaY, 1));
  if (ShyFog.Client.players[ShyFog.Client.user.username].currentGUI) {
    return;
  }
  ShyFog.Client.players[ShyFog.Client.user.username].selectedHotbarSlot += delta;
  if (ShyFog.Client.players[ShyFog.Client.user.username].selectedHotbarSlot < 0) {
    ShyFog.Client.players[ShyFog.Client.user.username].selectedHotbarSlot = 8;
  }
  if (ShyFog.Client.players[ShyFog.Client.user.username].selectedHotbarSlot > 8) {
    ShyFog.Client.players[ShyFog.Client.user.username].selectedHotbarSlot = 0;
  }
  ShyFog.Client.sendPacket(ShyFog.Client.PacketType.HOTBAR_SWITCH, ShyFog.Client.players[ShyFog.Client.user.username].selectedHotbarSlot);
});

// Fix big delta time if the page was not visible for some time (for example, screenshots)
window.addEventListener("visibilitychange", () => {
  if (!ShyFog.Client.context) {
    return;
  }

  if (document.visibilityState == "visible") {
    ShyFog.Client.log("INFO", "Resetting delta time");
    ShyFog.Client.prevFrame = performance.now();
  } else if (ShyFog.Client.settings.autoPause == "ON") {
    ShyFog.Client.log("INFO", "Auto-pausing");
    ShyFog.Client.paused = true;
    ShyFog.Client.canvas.style.filter = "blur(4px)";
    document.querySelector("#main-menu").style.display = "flex";
  }
});