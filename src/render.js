ShyFog.Client.defaultValues.canvas = null;
ShyFog.Client.defaultValues.context = null;
ShyFog.Client.defaultValues.paused = false;
ShyFog.Client.defaultValues.deltaTime = 0;
ShyFog.Client.defaultValues.prevFrame = 0;
ShyFog.Client.defaultValues.times = [];
ShyFog.Client.resetState();

// Handle window resizing
window.addEventListener("resize", () => {
  if (ShyFog.Client.canvas) {
    ShyFog.Client.canvas.width = window.innerWidth;
    ShyFog.Client.canvas.height = window.innerHeight;
  }
});

// Helper to make fake textures that are adding a tint to a real texture
ShyFog.Client.tintedTexture = (fakeFile, realFile, tint) => {
  // Already cached
  if (ShyFog.Client.hasTexture(fakeFile)) {
    return fakeFile;
  }

  var img = ShyFog.Client.getTexture(realFile);

  // Texture not loaded yet
  if (!img.complete) {
    return realFile;
  }

  var tempCanvas = document.createElement("canvas");
  tempCanvas.width = img.width;
  tempCanvas.height = img.height;

  var ctx = tempCanvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  var imageData = ctx.getImageData(0, 0, img.width, img.height);
  var data = imageData.data;

  for (var i = 0; i < data.length; i += 4) {
    var r = data[i];
    var g = data[i + 1];
    var b = data[i + 2];
    var a = data[i + 3];
    if (!a) {
      continue;
    }
    data[i] = Math.round(r * tint[0] / 255);
    data[i + 1] = Math.round(g * tint[1] / 255);
    data[i + 2] = Math.round(b * tint[2] / 255);
    data[i + 3] = a;
  }

  ctx.putImageData(imageData, 0, 0);

  ShyFog.Client.saveTexture(fakeFile, tempCanvas.toDataURL());
  return fakeFile;
};

ShyFog.Client.grassTint = (name, texture, biome) => {
  var color = [0, 0, 0];
  switch(biome) {
    case "shyfog:plains":
      color = [0, 255, 0];
      break;
    case "shyfog:desert":
      color = [200, 255, 0];
      break;
  }
  return ShyFog.Client.tintedTexture(`/dynamic/${name}/${biome}`, texture, color);
};

ShyFog.Client.leavesTint = (name, texture, biome) => {
  var color = [0, 0, 0];
  switch(biome) {
    case "shyfog:plains":
      color = [0, 200, 0];
      break;
    case "shyfog:desert":
      color = [200, 200, 0];
      break;
  }
  return ShyFog.Client.tintedTexture(`/dynamic/${name}/${biome}`, texture, color);
};

ShyFog.Client.getGUIScale = () => {
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
  return guiScale;
};

ShyFog.Client.getCameraPosition = () => {
  var { blockSize } = ShyFog.Client.settings;
  var currentUser = ShyFog.Client.players.get(ShyFog.Client.user.username);
  var cameraX = (ShyFog.Client.canvas.width / 2) - (ShyFog.Client.bigToNumber(currentUser.x) * blockSize) - (blockSize / 2);
  var cameraY = (ShyFog.Client.canvas.height / 2) - (ShyFog.Client.bigToNumber(currentUser.y) * -blockSize) - blockSize;
  return [ cameraX, cameraY ];
};

ShyFog.Client.renderVoid = () => {
  var { canvas, context: ctx } = ShyFog.Client;
  var { blockSize } = ShyFog.Client.settings;
  var [ cameraX, cameraY ] = ShyFog.Client.getCameraPosition();
  if (ShyFog.Client.worldMetadata.void) {
    var voidY = (-ShyFog.Client.worldMetadata.voidY * blockSize) + cameraY;
    if (voidY < 0) {
      voidY = 0;
    }
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, voidY, canvas.width, canvas.height);
  }
};

ShyFog.Client.renderPlayer = username => {
  var { context: ctx } = ShyFog.Client;
  var { blockSize } = ShyFog.Client.settings;
  var [ cameraX, cameraY ] = ShyFog.Client.getCameraPosition();
  if (!ShyFog.Client.hasTexture(`/skin/${username}`)) {
    ShyFog.Client.saveTexture(`/skin/${username}`, ShyFog.Client.players.get(username).skin);
  }
  if (ShyFog.Client.players.get(username).gamemode == "spectator") {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.drawImage(ShyFog.Client.getTexture(`/skin/${username}`), 8, 8, 8, 8, (ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
    ctx.drawImage(ShyFog.Client.getTexture(`/skin/${username}`), 40, 8, 8, 8, (ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
    ctx.restore();
  } else if (ShyFog.Client.players.get(username).direction == "none") {
    ctx.fillStyle = "#000000";
    ctx.fillRect((ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
    ctx.fillRect(ShyFog.Client.players.get(username).x * blockSize + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
    ctx.fillRect((ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 2, blockSize / 4 * 3);
    ctx.fillRect((ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4 * 3) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
    ctx.fillRect((ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
    ctx.fillRect((ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 2) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
    ctx.drawImage(ShyFog.Client.getTexture(`/skin/${username}`), 8, 8, 8, 8, (ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
    ctx.drawImage(ShyFog.Client.getTexture(`/skin/${username}`), 40, 8, 8, 8, (ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
    ctx.drawImage(ShyFog.Client.getTexture(`/skin/${username}`), 44, 20, 4, 12, ShyFog.Client.players.get(username).x * blockSize + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
    ctx.drawImage(ShyFog.Client.getTexture(`/skin/${username}`), 20, 20, 8, 12, (ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 2, blockSize / 4 * 3);
    ctx.drawImage(ShyFog.Client.getTexture(`/skin/${username}`), 36, 52, 4, 12, (ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4 * 3) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
    ctx.drawImage(ShyFog.Client.getTexture(`/skin/${username}`), 4, 20, 4, 12, (ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
    ctx.drawImage(ShyFog.Client.getTexture(`/skin/${username}`), 20, 52, 4, 12, (ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 2) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
  } else if (ShyFog.Client.players.get(username).direction == "left") {
    ctx.fillStyle = "#000000";
    ctx.fillRect((ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
    ctx.fillRect((ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
    ctx.fillRect((ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
    ctx.drawImage(ShyFog.Client.getTexture(`/skin/${username}`), 16, 8, 8, 8, (ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
    ctx.drawImage(ShyFog.Client.getTexture(`/skin/${username}`), 40, 52, 4, 12, (ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
    ctx.drawImage(ShyFog.Client.getTexture(`/skin/${username}`), 24, 52, 4, 12, (ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
  } else if (ShyFog.Client.players.get(username).direction == "right") {
    ctx.fillStyle = "#000000";
    ctx.fillRect((ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
    ctx.fillRect((ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
    ctx.fillRect((ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
    ctx.drawImage(ShyFog.Client.getTexture(`/skin/${username}`), 0, 8, 8, 8, (ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
    ctx.drawImage(ShyFog.Client.getTexture(`/skin/${username}`), 40, 20, 4, 12, (ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
    ctx.drawImage(ShyFog.Client.getTexture(`/skin/${username}`), 0, 20, 4, 12, (ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
  }
  if (ShyFog.Client.debugModeHitboxes && !ShyFog.Client.worldMetadata.reducedDebugInfo) {
    ctx.strokeStyle = "#ffffff";
    for (var hitbox of ShyFog.Client.players.get(username).hitboxes) {
      ctx.beginPath();
      ctx.moveTo(ShyFog.Client.bigToNumber(ShyFog.Client.players.get(username).x.add(hitbox.x).mul(blockSize).add(cameraX)), ShyFog.Client.players.get(username).y.add(hitbox.y).mul(-blockSize).add(cameraY));
      ctx.lineTo(ShyFog.Client.bigToNumber(ShyFog.Client.players.get(username).x.add(hitbox.x).add(hitbox.width).mul(blockSize).add(cameraX)), ShyFog.Client.players.get(username).y.add(hitbox.y).mul(-blockSize).add(cameraY));
      ctx.lineTo(ShyFog.Client.bigToNumber(ShyFog.Client.players.get(username).x.add(hitbox.x).add(hitbox.width).mul(blockSize).add(cameraX)), ShyFog.Client.players.get(username).y.add(hitbox.y).mul(-blockSize).add(hitbox.height * blockSize).add(cameraY));
      ctx.lineTo(ShyFog.Client.bigToNumber(ShyFog.Client.players.get(username).x.add(hitbox.x).mul(blockSize).add(cameraX)), ShyFog.Client.players.get(username).y.add(hitbox.y).mul(-blockSize).add(hitbox.height * blockSize).add(cameraY));
      ctx.lineTo(ShyFog.Client.bigToNumber(ShyFog.Client.players.get(username).x.add(hitbox.x).mul(blockSize).add(cameraX)), ShyFog.Client.players.get(username).y.add(hitbox.y).mul(-blockSize).add(cameraY));
      ctx.stroke();
    }
  }
};

ShyFog.Client.shouldShowPlayerNametag = username => {
  if (ShyFog.Client.players.get(username).gamemode == "spectator") {
    return false;
  }
  return (ShyFog.Client.settings.showOwnNametag == "ON" || username != ShyFog.Client.user.username);
};

ShyFog.Client.renderPlayerNametag = username => {
  var { context: ctx } = ShyFog.Client;
  var { blockSize } = ShyFog.Client.settings;
  var [ cameraX, cameraY ] = ShyFog.Client.getCameraPosition();
  ctx.textAlign = "center";
  ctx.font = `${blockSize * 0.3125}px Minecraft`;
  ctx.fillStyle = "#000000";
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillRect((ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 2) + cameraX - (ctx.measureText(username).width / 2) - 4, (ShyFog.Client.players.get(username).y * -blockSize) - blockSize - (blockSize / 4) + cameraY - 12, ctx.measureText(username).width + 8, 15);
  ctx.restore();
  ctx.fillStyle = "#ffffff";
  ctx.fillText(username, (ShyFog.Client.players.get(username).x * blockSize) + (blockSize / 2) + cameraX, (ShyFog.Client.players.get(username).y * -blockSize) - blockSize - (blockSize / 4) + cameraY);
};

ShyFog.Client.renderVignette = () => {
  var { canvas, context: ctx } = ShyFog.Client;
  var g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.72, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,1)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  var g2 = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, Math.min(canvas.width, canvas.height) * 0.3,
    canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) * 0.75
  );
  g2.addColorStop(0, "rgba(0,0,0,0)");
  g2.addColorStop(0.9, "rgba(0,0,0,1)");
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

ShyFog.Client.renderHealth = () => {
  var { canvas, context: ctx } = ShyFog.Client;
  var guiScale = ShyFog.Client.getGUIScale();
  var currentUser = ShyFog.Client.players.get(ShyFog.Client.user.username);
  var hotbarTexture = ShyFog.Client.getTexture("/gui/sprites/hud/hotbar.png");
  var experienceBarTexture = ShyFog.Client.getTexture("/gui/sprites/hud/experience_bar_background.png");
  var heartContainerTexture = ShyFog.Client.getTexture("/gui/sprites/hud/heart/container.png");
  var halfHeartTexture = ShyFog.Client.getTexture("/gui/sprites/hud/heart/half.png");
  var fullHeartTexture = ShyFog.Client.getTexture("/gui/sprites/hud/heart/full.png");

  for (var i = 0; i < currentUser.maxHealth; i += 2) {
    var x = i % 20;
    var y = Math.floor(i / 20);
    ctx.drawImage(heartContainerTexture, (canvas.width / 2) - (hotbarTexture.width * guiScale / 2) + (x / 2 * heartContainerTexture.width * guiScale) - (x / 2 * guiScale), canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale) - 5 - (heartContainerTexture.height * guiScale) - (y * heartContainerTexture.height * guiScale), heartContainerTexture.width * guiScale, heartContainerTexture.height * guiScale);
  }
  for (var i = 0; i < Math.min(currentUser.health, currentUser.maxHealth); i += 2) {
    var x = i % 20;
    var y = Math.floor(i / 20);
    if (currentUser.health % 2 && i == currentUser.health - 1) {
      ctx.drawImage(halfHeartTexture, (canvas.width / 2) - (hotbarTexture.width * guiScale / 2) + (x / 2 * halfHeartTexture.width * guiScale) - (x / 2 * guiScale), canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale) - 5 - (halfHeartTexture.height * guiScale) - (y * halfHeartTexture.height * guiScale), halfHeartTexture.width * guiScale, halfHeartTexture.height * guiScale);
    } else {
      ctx.drawImage(fullHeartTexture, (canvas.width / 2) - (hotbarTexture.width * guiScale / 2) + (x / 2 * fullHeartTexture.width * guiScale) - (x / 2 * guiScale), canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale) - 5 - (fullHeartTexture.height * guiScale) - (y * fullHeartTexture.height * guiScale), fullHeartTexture.width * guiScale, fullHeartTexture.height * guiScale);
    }
  }
};

ShyFog.Client.renderHunger = () => {
  var { canvas, context: ctx } = ShyFog.Client;
  var guiScale = ShyFog.Client.getGUIScale();
  var currentUser = ShyFog.Client.players.get(ShyFog.Client.user.username);
  var hotbarTexture = ShyFog.Client.getTexture("/gui/sprites/hud/hotbar.png");
  var experienceBarTexture = ShyFog.Client.getTexture("/gui/sprites/hud/experience_bar_background.png");
  var emptyFoodTexture = ShyFog.Client.getTexture("/gui/sprites/hud/food_empty.png");
  var halfFoodTexture = ShyFog.Client.getTexture("/gui/sprites/hud/food_half.png");
  var fullFoodTexture = ShyFog.Client.getTexture("/gui/sprites/hud/food_full.png");

  for (var i = 0; i < currentUser.maxFood; i += 2) {
    var x = i % 20;
    var y = Math.floor(i / 20);
    ctx.drawImage(emptyFoodTexture, (canvas.width / 2) + (hotbarTexture.width * guiScale / 2) - (((x / 2) + 1) * emptyFoodTexture.width * guiScale) + (x / 2 * guiScale), canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale) - 5 - (emptyFoodTexture.height * guiScale) - (y * emptyFoodTexture.height * guiScale), emptyFoodTexture.width * guiScale, emptyFoodTexture.height * guiScale);
  }
  for (var i = 0; i < Math.min(currentUser.food, currentUser.maxFood); i += 2) {
    var x = i % 20;
    var y = Math.floor(i / 20);
    if (currentUser.food % 2 && i == currentUser.food - 1) {
      ctx.drawImage(halfFoodTexture, (canvas.width / 2) + (hotbarTexture.width * guiScale / 2) - (((x / 2) + 1) * halfFoodTexture.width * guiScale) + (x / 2 * guiScale), canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale) - 5 - (halfFoodTexture.height * guiScale) - (y * halfFoodTexture.height * guiScale), halfFoodTexture.width * guiScale, halfFoodTexture.height * guiScale);
    } else {
      ctx.drawImage(fullFoodTexture, (canvas.width / 2) + (hotbarTexture.width * guiScale / 2) - (((x / 2) + 1) * fullFoodTexture.width * guiScale) + (x / 2 * guiScale), canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale) - 5 - (fullFoodTexture.height * guiScale) - (y * fullFoodTexture.height * guiScale), fullFoodTexture.width * guiScale, fullFoodTexture.height * guiScale);
    }
  }
};

ShyFog.Client.renderExperienceBar = () => {
  var { canvas, context: ctx } = ShyFog.Client;
  var guiScale = ShyFog.Client.getGUIScale();
  var hotbarTexture = ShyFog.Client.getTexture("/gui/sprites/hud/hotbar.png");
  var experienceBarTexture = ShyFog.Client.getTexture("/gui/sprites/hud/experience_bar_background.png");

  ctx.drawImage(experienceBarTexture, (canvas.width / 2) - (experienceBarTexture.width * guiScale / 2), canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale), experienceBarTexture.width * guiScale, experienceBarTexture.height * guiScale);
};

ShyFog.Client.renderHotbar = biome => {
  var { canvas, context: ctx } = ShyFog.Client;
  var guiScale = ShyFog.Client.getGUIScale();
  var currentUser = ShyFog.Client.players.get(ShyFog.Client.user.username);
  var hotbarTexture = ShyFog.Client.getTexture("/gui/sprites/hud/hotbar.png");
  var hotbarSelectionTexture = ShyFog.Client.getTexture("/gui/sprites/hud/hotbar_selection.png");

  ctx.drawImage(hotbarTexture, (canvas.width / 2) - (hotbarTexture.width * guiScale / 2), canvas.height - (hotbarTexture.height * guiScale), hotbarTexture.width * guiScale, hotbarTexture.height * guiScale);
  for (var hotbarIndex = 0; hotbarIndex < 9; hotbarIndex++) {
    var hotbarItem = currentUser.slots[`hotbar.${hotbarIndex}`];
    if (hotbarItem) {
      var texture = ShyFog.Client.items[hotbarItem.item]({ biome }).texture[0];
      ctx.drawImage(ShyFog.Client.getTexture(texture.file), (canvas.width / 2) - (hotbarTexture.width * guiScale / 2) + (20 * guiScale * hotbarIndex) + (6 * guiScale), canvas.height - (hotbarTexture.height * guiScale) + (6 * guiScale), 10 * guiScale, 10 * guiScale);
      if (hotbarItem.count > 1) {
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "end";
        ctx.font = `${7 * guiScale}px Minecraft`;
        ctx.fillText(hotbarItem.count.toString(), (canvas.width / 2) - (hotbarTexture.width * guiScale / 2) + (20 * guiScale * hotbarIndex) + (19 * guiScale), canvas.height - (hotbarTexture.height * guiScale) + (18 * guiScale));
      }
    }
  }

  // Hotbar selector
  ctx.drawImage(hotbarSelectionTexture, (canvas.width / 2) - (hotbarTexture.width * guiScale / 2) + (20 * guiScale * currentUser.selectedHotbarSlot) - guiScale, canvas.height - (hotbarTexture.height * guiScale) - guiScale, hotbarSelectionTexture.width * guiScale, hotbarSelectionTexture.height * guiScale);
};

ShyFog.Client.renderHUD = biome => {
  var currentUser = ShyFog.Client.players.get(ShyFog.Client.user.username);
  if (currentUser.gamemode == "survival" || currentUser.gamemode == "adventure") {
    ShyFog.Client.renderHealth();
    ShyFog.Client.renderHunger();
    ShyFog.Client.renderExperienceBar();
  }
  ShyFog.Client.renderHotbar(biome);
};

ShyFog.Client.renderChat = () => {
  var { canvas, context: ctx } = ShyFog.Client;
  var guiScale = ShyFog.Client.getGUIScale();
  var hotbarTexture = ShyFog.Client.getTexture("/gui/sprites/hud/hotbar.png");
  var experienceBarTexture = ShyFog.Client.getTexture("/gui/sprites/hud/experience_bar_background.png");
  var heartContainerTexture = ShyFog.Client.getTexture("/gui/sprites/hud/heart/container.png");
  var chatMessages = ShyFog.Client.chatMessages.filter(message => Date.now() - message.time <= 12000);
  const chatScale = 5;
  const chatWidth = 0.3;
  ctx.textAlign = "start";
  ctx.font = `${chatScale * guiScale}px Minecraft`;
  ctx.fillStyle = "#000000";
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale) - 5 - (heartContainerTexture.height * guiScale) - (chatScale * guiScale) - (2 * guiScale) - ((chatScale + 4) * guiScale * (chatMessages.length - 1)), canvas.width * chatWidth, (chatScale + 4) * guiScale * chatMessages.length);
  ctx.restore();
  for (var messageIndex = 0; messageIndex < chatMessages.length; messageIndex++) {
    var message = chatMessages[messageIndex];
    ctx.fillStyle = (message.color || "#ffffff");
    ctx.fillText(message.content, 10, canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale) - 5 - (heartContainerTexture.height * guiScale) - ((chatScale + 4) * guiScale * (chatMessages.length - messageIndex - 1)));
  }
};

ShyFog.Client.render = () => {
  var { canvas, context: ctx } = ShyFog.Client;
  var { blockSize, renderDistance, antiAliasing } = ShyFog.Client.settings;
  if (antiAliasing == "OFF") {
    antiAliasing = 1;
  } else {
    antiAliasing = parseFloat(antiAliasing.slice(1));
  }
  if (!canvas || !ctx) {
    return;
  }
  var guiScale = ShyFog.Client.getGUIScale();

  // Global settings
  ctx.imageSmoothingEnabled = false;
  ctx.lineWidth = 2;

  // Clear everything by rendering the sky
  ctx.fillStyle = (ShyFog.Client.worldMetadata.skyColor || "#000000");
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Haven't received PLAYER_METADATA packet yet, just wait
  var currentUser = ShyFog.Client.players.get(ShyFog.Client.user.username);
  if (!currentUser) {
    return window.requestAnimationFrame(ShyFog.Client.render);
  }

  var playerChunkX = ShyFog.Client.bigToNumber(ShyFog.Client.bigFloor(currentUser.x.div(16)));
  var playerChunkY = ShyFog.Client.bigToNumber(ShyFog.Client.bigFloor(currentUser.y.div(16)));
  var playerChunkZ = ShyFog.Client.bigToNumber(currentUser.z);
  var playerChunkPositionX = currentUser.x.mod(16);
  var playerChunkPositionY = currentUser.y.mod(16);
  if (playerChunkPositionX.lt(0)) {
    playerChunkPositionX = playerChunkPositionX.add(16);
  }
  if (playerChunkPositionY.lt(0)) {
    playerChunkPositionY = playerChunkPositionY.add(16);
  }
  var biome = null;
  var currentBiomeRange = ShyFog.Client.bigToNumber(ShyFog.Client.bigFloor(playerChunkPositionX));
  if (!ShyFog.Client.biomes[`${playerChunkX},${playerChunkY},${playerChunkZ}`]) {
    return window.requestAnimationFrame(ShyFog.Client.render);
  }
  for (var biomeRange of ShyFog.Client.biomes[`${playerChunkX},${playerChunkY},${playerChunkZ}`]) {
    var [ start, end, type ] = biomeRange;
    if (currentBiomeRange >= start && currentBiomeRange <= end) {
      biome = type;
      break;
    }
  }

  ShyFog.Client.physics();

  var [ cameraX, cameraY ] = ShyFog.Client.getCameraPosition();

  ShyFog.Client.renderVoid();

  // Render players
  for (var username of ShyFog.Client.players.keys()) {
    ShyFog.Client.renderPlayer(username);
  }

  // Render blocks in chunks around the player
  for (var chunkZ = playerChunkZ - 1; chunkZ <= playerChunkZ; chunkZ++) {
    for (var chunkX = playerChunkX - renderDistance; chunkX <= playerChunkX + renderDistance; chunkX++) {
      for (var chunkY = playerChunkY - renderDistance; chunkY <= playerChunkY + renderDistance; chunkY++) {
        if (!ShyFog.Client.chunks[`${chunkX},${chunkY},${chunkZ}`]) {
          if (ShyFog.Client.debugModeChunks && Math.floor(currentUser.z / 16) == chunkZ) {
            ctx.fillStyle = "#ff0000";
            ctx.textAlign = "start";
            ctx.font = "15px sans-serif";
            ctx.fillText("Waiting for server...", (((chunkX * 16) + 6) * blockSize) + cameraX, (((chunkY * -16) - 7) * blockSize) + cameraY);
          }
          continue;
        }
        if (chunkZ < playerChunkZ) {
          ctx.save();
          ctx.globalAlpha = 0.1;
        }
        for (var block of ShyFog.Client.chunks[`${chunkX},${chunkY},${chunkZ}`]) {
          if (!block) {
            continue;
          }
          var chunkBiome = null;
          for (var biomeRange of ShyFog.Client.biomes[`${chunkX},${chunkY},${chunkZ}`]) {
            var [ start, end, type ] = biomeRange;
            if (block.x >= start && block.x <= end) {
              chunkBiome = type;
              break;
            }
          }
          if (!ShyFog.Client.items[block.block]) {
            return ShyFog.Client.log("FATAL", `Unknown block "${block.block}"`);
          }
          var blockData = ShyFog.Client.items[block.block]({
            "biome": chunkBiome
          });
          // Optimization: Don't render blocks that aren't visible
          if ((((chunkX * 16) + block.x) * blockSize) + cameraX > canvas.width || (((chunkY * -16) - block.y) * blockSize) + cameraY > canvas.height || (((chunkX * 16) + block.x) * blockSize) + cameraX + blockSize < 0 || (((chunkY * -16) - block.y) * blockSize) + cameraY + blockSize < 0) {
            continue;
          }
          // Draw multiple times to fix aliasing (?)
          for (var i = 0; i < antiAliasing; i++) {
            for (var texture of blockData.texture) {
              ctx.drawImage(ShyFog.Client.getTexture(texture.file), (((chunkX * 16) + block.x + texture.x) * blockSize) + cameraX, (((chunkY * -16) - block.y - texture.y) * blockSize) + cameraY, texture.width * blockSize, texture.height * blockSize);
            }
          }
        }
        if (chunkZ < playerChunkZ) {
          ctx.restore();
        }
        if (ShyFog.Client.debugModeChunks && chunkZ == playerChunkZ) {
          ctx.strokeStyle = "#960000";
          ctx.beginPath();
          ctx.moveTo((chunkX * 16 * blockSize) + cameraX, (((chunkY * -16) + 1) * blockSize) + cameraY);
          ctx.lineTo((((chunkX * 16) + 16) * blockSize) + cameraX, (((chunkY * -16) + 1) * blockSize) + cameraY);
          ctx.lineTo((((chunkX * 16) + 16) * blockSize) + cameraX, (((chunkY * -16) - 15) * blockSize) + cameraY);
          ctx.lineTo((chunkX * 16 * blockSize) + cameraX, (((chunkY * -16) - 15) * blockSize) + cameraY);
          ctx.lineTo((chunkX * 16 * blockSize) + cameraX, (((chunkY * -16) + 1) * blockSize) + cameraY);
          ctx.stroke();
        }
      }
    }
  }

  // Render player nametags
  for (var username of ShyFog.Client.players.keys()) {
    if (ShyFog.Client.shouldShowPlayerNametag(username)) {
      ShyFog.Client.renderPlayerNametag(username);
    }
  }

  // Vignette effect
  if (ShyFog.Client.settings.vignette == "ON") {
    ShyFog.Client.renderVignette();
  }

  var blockCursorX = (ShyFog.Client.cursorX - cameraX) / blockSize;
  var blockCursorY = -((ShyFog.Client.cursorY - cameraY) / blockSize) + 1;
  var blockCursorChunkX = Math.floor(blockCursorX / 16);
  var blockCursorChunkY = Math.floor(blockCursorY / 16);
  var blockCursorRelativeX = Math.floor(blockCursorX) % 16;
  var blockCursorRelativeY = Math.floor(blockCursorY) % 16;
  if (blockCursorRelativeX < 0) {
    blockCursorRelativeX += 16;
  }
  if (blockCursorRelativeY < 0) {
    blockCursorRelativeY += 16;
  }
  if (ShyFog.Client.chunks[`${blockCursorChunkX},${blockCursorChunkY},${currentUser.z.toString()}`] && (currentUser.gamemode == "survival" || currentUser.gamemode == "creative")) {
    var blockId = ShyFog.Client.chunks[`${blockCursorChunkX},${blockCursorChunkY},${currentUser.z.toString()}`].findIndex(block => block && block.x == blockCursorRelativeX && block.y == blockCursorRelativeY);
    // Using Pythogorean theorem to check if the block is in player's range
    if (blockId > -1 && (currentUser.maximumRange == "Infinity" || currentUser.x.add(new Big("0.5")).sub(new Big(blockCursorX)).pow(2).add(currentUser.y.add(new Big("1")).sub(new Big(blockCursorY)).pow(2)).sqrt().lte(new Big(currentUser.maximumRange)))) {
      var block = ShyFog.Client.chunks[`${blockCursorChunkX},${blockCursorChunkY},${currentUser.z.toString()}`][blockId];

      // Block border at cursor
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 0.2;
      for (var i = 0; i < 2; i++) {
        ctx.strokeRect((Math.floor(blockCursorX) * blockSize) + cameraX, -(Math.floor(blockCursorY) * blockSize) + cameraY, blockSize, blockSize);
      }
      if (ShyFog.Client.breakingBlock && !currentUser.currentGUI && performance.now() - ShyFog.Client.lastBlockAction >= 300) {
        if (currentUser.gamemode == "creative") {
          ShyFog.Client.chunks[`${blockCursorChunkX},${blockCursorChunkY},${currentUser.z.toString()}`][blockId] = null;
          ShyFog.Client.sendPacket(ShyFog.Client.PacketType.BLOCK_BREAK, blockCursorX, blockCursorY, ShyFog.Client.bigToNumber(currentUser.z));
        } else {
          var now = performance.now();
          if (ShyFog.Client.breakingBlockCache.x != Math.floor(blockCursorX) || ShyFog.Client.breakingBlockCache.y != Math.floor(blockCursorY) || ShyFog.Client.breakingBlockCache.z != ShyFog.Client.bigToNumber(currentUser.z)) {
            ShyFog.Client.breakingBlockCache = {
              "x": Math.floor(blockCursorX),
              "y": Math.floor(blockCursorY),
              "z": ShyFog.Client.bigToNumber(currentUser.z)
            };
            ShyFog.Client.breakingBlockTicks = 0;
          } else if (now - ShyFog.Client.lastTick >= 50) {
            ShyFog.Client.lastTick = now - ((now - ShyFog.Client.lastTick) % 50);
            ShyFog.Client.breakingBlockTicks++;
          }
          var currentItem = currentUser.slots[`hotbar.${currentUser.selectedHotbarSlot}`];
          if (currentItem) {
            currentItem = ShyFog.Client.items[currentItem.item]({});
          }
          var breakingBlockType = ShyFog.Client.items[block.block]({});
          var requiredTicks = breakingBlockType.hardness;
          if (breakingBlockType.minMiningLevel < 1 || (currentItem && (!breakingBlockType.correctTool || currentItem.tags.includes(breakingBlockType.correctTool)) && currentItem.miningLevel >= breakingBlockType.minMiningLevel)) {
            requiredTicks *= 30;
          } else {
            requiredTicks *= 100;
          }
          requiredTicks = Math.round(requiredTicks / ((currentItem && (!breakingBlockType.correctTool || currentItem.tags.includes(breakingBlockType.correctTool))) ? currentItem.miningSpeed : 1));
          if (breakingBlockType.hardness == -1) {
            ctx.drawImage(getTexture("/block/destroy_stage_0.png"), (Math.floor(blockCursorX) * blockSize) + cameraX, -(Math.floor(blockCursorY) * blockSize) + cameraY, blockSize, blockSize);
          } else {
            if (ShyFog.Client.breakingBlockTicks >= requiredTicks) {
              ShyFog.Client.chunks[`${blockCursorChunkX},${blockCursorChunkY},${currentUser.z.toString()}`][blockId] = null;
              ShyFog.Client.sendPacket(ShyFog.Client.PacketType.BLOCK_BREAK, blockCursorX, blockCursorY, ShyFog.Client.bigToNumber(currentUser.z));
              ShyFog.Client.lastBlockAction = performance.now();
            }
            if (requiredTicks) {
              ctx.drawImage(ShyFog.Client.getTexture(`/block/destroy_stage_${Math.round(Math.min(ShyFog.Client.breakingBlockTicks, requiredTicks) / requiredTicks * 9)}.png`), (Math.floor(blockCursorX) * blockSize) + cameraX, -(Math.floor(blockCursorY) * blockSize) + cameraY, blockSize, blockSize);
            }
          }
        }
      }
    }
    if (ShyFog.Client.placingBlock && !currentUser.currentGUI && performance.now() - ShyFog.Client.lastBlockAction >= 300 && (currentUser.maximumRange == "Infinity" || currentUser.x.add(new Big("0.5")).sub(new Big(blockCursorX)).pow(2).add(currentUser.y.add(new Big("1")).sub(new Big(blockCursorY)).pow(2)).sqrt().lte(new Big(currentUser.maximumRange)))) {
      if (blockId == -1) {
        if ((currentUser.gamemode == "survival" || currentUser.gamemode == "creative") && (ShyFog.Client.worldMetadata.allowBuildingInVoid || (blockCursorChunkY * 16) + blockCursorRelativeY > ShyFog.Client.worldMetadata.voidY) && (ShyFog.Client.worldMetadata.worldHeight === null || (blockCursorChunkY * 16) + blockCursorRelativeY <= ShyFog.Client.worldMetadata.worldHeight) && currentUser.slots[`hotbar.${currentUser.selectedHotbarSlot}`] && ShyFog.Client.items[currentUser.slots[`hotbar.${currentUser.selectedHotbarSlot}`].item]({}).placeable) {
          var allowed = true;
          for (var username of ShyFog.Client.players.keys()) {
            for (var playerHitbox of ShyFog.Client.players.get(username).hitboxes) {
              if (ShyFog.Client.collidesAABB({
                "x": ShyFog.Client.players.get(username).x.add(playerHitbox.x),
                "y": ShyFog.Client.players.get(username).y.add(playerHitbox.y),
                "width": new Big(playerHitbox.width),
                "height": new Big(playerHitbox.height)
              }, {
                "x": new Big(Math.floor(blockCursorX)),
                "y": new Big(Math.floor(blockCursorY)),
                "width": new Big("1"),
                "height": new Big("1")
              })) {
                allowed = false;
                break;
              }
            }
          }
          if (allowed) {
            ShyFog.Client.chunks[`${blockCursorChunkX},${blockCursorChunkY},${ShyFog.Client.bigToNumber(currentUser.z)}`].push({
              "block": currentUser.slots[`hotbar.${currentUser.selectedHotbarSlot}`].item,
              "x": blockCursorRelativeX,
              "y": blockCursorRelativeY
            });
            if (currentUser.gamemode != "creative") {
              if (--currentUser.slots[`hotbar.${currentUser.selectedHotbarSlot}`].count < 1) {
                currentUser.slots[`hotbar.${currentUser.selectedHotbarSlot}`] = null;
              }
            }
            ShyFog.Client.sendPacket(ShyFog.Client.PacketType.USE, blockCursorX, blockCursorY, ShyFog.Client.bigToNumber(currentUser.z));
            ShyFog.Client.lastBlockAction = performance.now();
          }
        }
      } else {
        ShyFog.Client.sendPacket(ShyFog.Client.PacketType.USE, blockCursorX, blockCursorY, ShyFog.Client.bigToNumber(currentUser.z));
      }
    }
  }

  // HUD
  if (!ShyFog.Client.hideOverlays && currentUser.gamemode != "spectator") {
    ShyFog.Client.renderHUD(biome);
  }

  ShyFog.Client.renderChat();

  if (currentUser.currentGUI) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var currentGUIData = ShyFog.Client.guis[currentUser.currentGUI.id];
    var guiBackground = ShyFog.Client.getTexture(currentGUIData.background);
    var guiBackgroundWidth = (currentGUIData.backgroundWidth || guiBackground.width);
    var guiBackgroundHeight = (currentGUIData.backgroundHeight || guiBackground.height);
    var guiStartX = (canvas.width / 2) - (guiBackgroundWidth * guiScale / 2);
    var guiStartY = (canvas.height / 2) - (guiBackgroundHeight * guiScale / 2);
    var hoveringItem = null;
    ctx.drawImage(guiBackground, currentGUIData.backgroundOffsetX || 0, currentGUIData.backgroundOffsetY || 0, guiBackgroundWidth, guiBackgroundHeight, guiStartX, guiStartY, guiBackgroundWidth * guiScale, guiBackgroundHeight * guiScale);
    for (var element of currentGUIData.content) {
      if (element.type == "image") {
        ctx.drawImage(ShyFog.Client.getTexture(element.file), guiStartX + (element.x * guiScale), guiStartY + (element.y * guiScale), element.width * guiScale, element.height * guiScale);
      }
      if (element.type == "current_player") {
        ctx.fillStyle = "#000000";
        ctx.fillRect(guiStartX + (element.x * guiScale) + (element.width * guiScale / 4), guiStartY + (element.y * guiScale), element.width * guiScale / 2, element.height * guiScale / 4);
        ctx.fillRect(guiStartX + (element.x * guiScale) + (element.width * guiScale / 4), guiStartY + (element.y * guiScale), element.width * guiScale / 2, element.height * guiScale / 4);
        ctx.fillRect(guiStartX + (element.x * guiScale), guiStartY + (element.y * guiScale) + (element.height * guiScale / 4), element.width * guiScale / 4, element.height * guiScale / 8 * 3);
        ctx.fillRect(guiStartX + (element.x * guiScale) + (element.width * guiScale / 4), guiStartY + (element.y * guiScale) + (element.height * guiScale / 4), element.width * guiScale / 2, element.height * guiScale / 8 * 3);
        ctx.fillRect(guiStartX + (element.x * guiScale) + (element.width * guiScale / 4) + (element.width * guiScale / 2), guiStartY + (element.y * guiScale) + (element.height * guiScale / 4), element.width * guiScale / 4, element.height * guiScale / 8 * 3);
        ctx.fillRect(guiStartX + (element.x * guiScale) + (element.width * guiScale / 4), guiStartY + (element.y * guiScale) + (element.height * guiScale / 4) + (element.height * guiScale / 8 * 3), element.width * guiScale / 4, element.height * guiScale / 8 * 3);
        ctx.fillRect(guiStartX + (element.x * guiScale) + (element.width * guiScale / 2), guiStartY + (element.y * guiScale) + (element.height * guiScale / 4) + (element.height * guiScale / 8 * 3), element.width * guiScale / 4, element.height * guiScale / 8 * 3);
        ctx.drawImage(ShyFog.Client.getTexture(`/skin/${ShyFog.Client.user.username}`), 8, 8, 8, 8, guiStartX + (element.x * guiScale) + (element.width * guiScale / 4), guiStartY + (element.y * guiScale), element.width * guiScale / 2, element.height * guiScale / 4);
        ctx.drawImage(ShyFog.Client.getTexture(`/skin/${ShyFog.Client.user.username}`), 40, 8, 8, 8, guiStartX + (element.x * guiScale) + (element.width * guiScale / 4), guiStartY + (element.y * guiScale), element.width * guiScale / 2, element.height * guiScale / 4);
        ctx.drawImage(ShyFog.Client.getTexture(`/skin/${ShyFog.Client.user.username}`), 44, 20, 4, 12, guiStartX + (element.x * guiScale), guiStartY + (element.y * guiScale) + (element.height * guiScale / 4), element.width * guiScale / 4, element.height * guiScale / 8 * 3);
        ctx.drawImage(ShyFog.Client.getTexture(`/skin/${ShyFog.Client.user.username}`), 20, 20, 8, 12, guiStartX + (element.x * guiScale) + (element.width * guiScale / 4), guiStartY + (element.y * guiScale) + (element.height * guiScale / 4), element.width * guiScale / 2, element.height * guiScale / 8 * 3);
        ctx.drawImage(ShyFog.Client.getTexture(`/skin/${ShyFog.Client.user.username}`), 36, 52, 4, 12, guiStartX + (element.x * guiScale) + (element.width * guiScale / 4) + (element.width * guiScale / 2), guiStartY + (element.y * guiScale) + (element.height * guiScale / 4), element.width * guiScale / 4, element.height * guiScale / 8 * 3);
        ctx.drawImage(ShyFog.Client.getTexture(`/skin/${ShyFog.Client.user.username}`), 4, 20, 4, 12, guiStartX + (element.x * guiScale) + (element.width * guiScale / 4), guiStartY + (element.y * guiScale) + (element.height * guiScale / 4) + (element.height * guiScale / 8 * 3), element.width * guiScale / 4, element.height * guiScale / 8 * 3);
        ctx.drawImage(ShyFog.Client.getTexture(`/skin/${ShyFog.Client.user.username}`), 20, 52, 4, 12, guiStartX + (element.x * guiScale) + (element.width * guiScale / 2), guiStartY + (element.y * guiScale) + (element.height * guiScale / 4) + (element.height * guiScale / 8 * 3), element.width * guiScale / 4, element.height * guiScale / 8 * 3);
      }
      if (["player_slot", "block_slot", "world_slot"].includes(element.type)) {
        var hovering = ShyFog.Client.cursorX >= guiStartX + (element.x * guiScale) && ShyFog.Client.cursorY >= guiStartY + (element.y * guiScale) && ShyFog.Client.cursorX <= guiStartX + ((element.x + element.width) * guiScale) && ShyFog.Client.cursorY <= guiStartY + ((element.y + element.height) * guiScale);
        if (hovering) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.46)";
          ctx.fillRect(guiStartX + ((element.x + 1) * guiScale), guiStartY + ((element.y + 1) * guiScale), (element.width - 2) * guiScale, (element.height - 2) * guiScale);
        }
        var slotItem = null;
        if (element.type == "player_slot") {
          slotItem = currentUser.slots[element.slot];
        }
        if (slotItem) {
          var texture = ShyFog.Client.items[slotItem.item]({ biome }).texture[0];
          ctx.drawImage(ShyFog.Client.getTexture(texture.file), guiStartX + ((element.x + 1) * guiScale) + (element.width * guiScale * 0.1), guiStartY + ((element.y + 1) * guiScale) + (element.height * guiScale * 0.1), element.width * guiScale * 0.7, element.height * guiScale * 0.7);
          if (slotItem.count != 1) {
            if (slotItem.count > 0) {
              ctx.fillStyle = "#ffffff";
            } else {
              ctx.fillStyle = "#ff0000";
            }
            ctx.textAlign = "end";
            ctx.font = `${8 * guiScale}px Minecraft`;
            ctx.fillText(slotItem.count.toString(), guiStartX + ((element.x + element.width - 1) * guiScale), guiStartY + ((element.y + element.height - 2) * guiScale));
          }
          if (hovering) {
            hoveringItem = slotItem;
          }
        }
      }
    }
    if (hoveringItem && !currentUser.currentGUI.cursorItem) {
      ctx.textAlign = "start";
      ctx.font = `${8 * guiScale}px Minecraft`;
      var itemName = ShyFog.Client.items[hoveringItem.item]({ biome }).name;
      var tooltipX = ShyFog.Client.cursorX + (8 * guiScale);
      var tooltipY = ShyFog.Client.cursorY - (16 * guiScale);
      var tooltipWidth = ctx.measureText(itemName).width + (5 * guiScale);
      ctx.fillStyle = "rgba(16, 0, 16, 0.94)";
      ctx.fillRect(tooltipX + (1 * guiScale), tooltipY, tooltipWidth, 16 * guiScale);
      ctx.fillRect(tooltipX, tooltipY + (1 * guiScale), 1 * guiScale, 14 * guiScale);
      ctx.fillRect(tooltipX + tooltipWidth + (1 * guiScale), tooltipY + (1 * guiScale), 1 * guiScale, 14 * guiScale);
      ctx.fillStyle = "rgba(80, 0, 255, 0.315)";
      ctx.fillRect(tooltipX + (2 * guiScale), tooltipY + (1 * guiScale), tooltipWidth - (2 * guiScale), 1 * guiScale);
      ctx.fillStyle = "rgba(41, 0, 128, 0.315)";
      ctx.fillRect(tooltipX + (2 * guiScale), tooltipY + (14 * guiScale), tooltipWidth - (2 * guiScale), 1 * guiScale);
      var g = ctx.createLinearGradient(0, tooltipY + (2 * guiScale), 0, tooltipY + (2 * guiScale) + (12 * guiScale));
      g.addColorStop(0, "rgba(80, 0, 255, 0.315)");
      g.addColorStop(1, "rgba(41, 0, 128, 0.315)");
      ctx.fillStyle = g;
      ctx.fillRect(tooltipX + (1 * guiScale), tooltipY + (2 * guiScale), 1 * guiScale, 12 * guiScale);
      ctx.fillRect(tooltipX + tooltipWidth, tooltipY + (2 * guiScale), 1 * guiScale, 12 * guiScale);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(itemName, tooltipX + (4 * guiScale), tooltipY + (11 * guiScale));
    }
    if (currentUser.currentGUI.cursorItem) {
      var cursorItem = ShyFog.Client.items[currentUser.currentGUI.cursorItem.item]({ biome });
      var cursorItemSize = guiScale * 18 * 0.7;
      ctx.drawImage(ShyFog.Client.getTexture(cursorItem.texture[0].file), ShyFog.Client.cursorX - (cursorItemSize / 2), ShyFog.Client.cursorY - (cursorItemSize / 2), cursorItemSize, cursorItemSize);
      if (currentUser.currentGUI.cursorItem.count != 1) {
        if (currentUser.currentGUI.cursorItem.count > 0) {
          ctx.fillStyle = "#ffffff";
        } else {
          ctx.fillStyle = "#ff0000";
        }
        ctx.textAlign = "end";
        ctx.font = `${8 * guiScale}px Minecraft`;
        ctx.fillText(currentUser.currentGUI.cursorItem.count.toString(), ShyFog.Client.cursorX + (cursorItemSize / 2) + (2 * guiScale), ShyFog.Client.cursorY + (cursorItemSize / 2));
      }
    }
  }

  if (!ShyFog.Client.hideOverlays && ShyFog.Client.debugMode) {
    ctx.fillStyle = "#ff0000";
    ctx.textAlign = "start";
    ctx.font = "15px sans-serif";
    var debugInfo =  [
      `ShyFog ${ShyFog.Client.version}`,
      `Server Software: ${ShyFog.Client.serverSoftware} ${ShyFog.Client.serverVersion}`,
      `FPS: ${ShyFog.Client.times.length}`,
      `Ping: ${ShyFog.Client.measuredPing}ms`,
      `Current Player: ${ShyFog.Client.user.username}${ShyFog.Client.user.id ? ` (${ShyFog.Client.user.id})` : ""}`,
      `Position: (${currentUser.x}, ${currentUser.y}, ${currentUser.z})`,
      `Chunk: (${playerChunkX}, ${playerChunkY}, ${playerChunkZ})`,
      `Chunk Position: (${playerChunkPositionX}, ${playerChunkPositionY}, 0)`,
      `Camera: (${cameraX}, ${cameraY})`,
      `Gamemode: ${currentUser.gamemode}`,
      `Block Size: ${blockSize}`,
      `Cursor: (${ShyFog.Client.cursorX}, ${ShyFog.Client.cursorY})`,
      `Block Cursor (Float): (${blockCursorX}, ${blockCursorY}, ${Math.floor(currentUser.z)})`,
      `Block Cursor (Int): (${Math.floor(blockCursorX)}, ${Math.floor(blockCursorY)}, ${Math.floor(currentUser.z)})`,
      `Biome: ${biome}`
    ];
    if (ShyFog.Client.worldMetadata.reducedDebugInfo) {
      debugInfo =  [
        `ShyFog ${ShyFog.Client.version}`,
        `Server Software: ${ShyFog.Client.serverSoftware} ${ShyFog.Client.serverVersion}`,
        `FPS: ${ShyFog.Client.times.length}`,
        `Ping: ${ShyFog.Client.measuredPing}ms`,
        `Current Player: ${ShyFog.Client.user.username}${ShyFog.Client.user.id ? ` (${ShyFog.Client.user.id})` : ""}`,
        `Chunk Position: (${playerChunkPositionX}, ${playerChunkPositionY}, 0)`,
        `Gamemode: ${currentUser.gamemode}`,
        `Block Size: ${blockSize}`,
        `Cursor: (${ShyFog.Client.cursorX}, ${ShyFog.Client.cursorY})`
      ];
    }
    debugInfo.forEach((line, index) => {
      ctx.fillText(line, 15, 30 + (index * 20));
    });
  }

  window.requestAnimationFrame(() => {
    var now = performance.now();
    ShyFog.Client.deltaTime = (now - ShyFog.Client.prevFrame) / 1e3;
    ShyFog.Client.prevFrame = now;
    while (ShyFog.Client.times.length > 0 && ShyFog.Client.times[0] <= (now - 1e3)) {
      ShyFog.Client.times.shift();
    }
    ShyFog.Client.times.push(now);
    ShyFog.Client.render();
  });
};