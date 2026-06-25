function bigMin(...values) {
  var min = values[0];
  for (var i = 1; i < values.length; i++) {
    if (values[i].lt(min)) {
      min = values[i];
    }
  }
  return min;
}

function bigFloor(x) {
  return x.lt(0) ? x.round(0, Big.roundDown).minus(x.eq(x.round(0, Big.roundDown)) ? 0 : 1) : x.round(0, Big.roundDown);
}

function bigToNumber(x) {
  return parseFloat(x.toString());
}

function collidesAABB(a, b, edgeX, edgeY) {
  var result = false;
  if (edgeX && edgeY) {
    result = a.x.lte(b.x.add(b.width)) && a.x.add(a.width).gte(b.x) && a.y.gte(b.y.sub(b.height)) && a.y.sub(a.height).lte(b.y);
  } else if (edgeX) {
    result = a.x.lte(b.x.add(b.width)) && a.x.add(a.width).gte(b.x) && a.y.gt(b.y.sub(b.height)) && a.y.sub(a.height).lt(b.y);
  } else if (edgeY) {
    result = a.x.lt(b.x.add(b.width)) && a.x.add(a.width).gt(b.x) && a.y.gte(b.y.sub(b.height)) && a.y.sub(a.height).lte(b.y);
  } else {
    result = a.x.lt(b.x.add(b.width)) && a.x.add(a.width).gt(b.x) && a.y.gt(b.y.sub(b.height)) && a.y.sub(a.height).lt(b.y);
  }
  if (!result) {
    return result;
  }
  var overlapLeft = a.x.add(a.width).sub(b.x);
  var overlapRight = b.x.add(b.width).sub(a.x);
  var overlapTop = a.y.sub(b.y.sub(b.height));
  var overlapBottom = b.y.sub(a.y.sub(a.height));
  var minOverlap = bigMin(overlapLeft, overlapRight, overlapTop, overlapBottom);
  if (minOverlap.eq(overlapTop)) {
    return "top";
  }
  if (minOverlap.eq(overlapBottom)) {
    return "bottom";
  }
  if (minOverlap.eq(overlapLeft)) {
    return "left";
  }
  if (minOverlap.eq(overlapRight)) {
    return "right";
  }
}

// Helper to make fake textures that are adding a tint to a real texture
function tintedTexture(fakeFile, realFile, tint) {
  // Already cached
  if (hasTexture(fakeFile)) {
    return fakeFile;
  }

  var img = getTexture(realFile);

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

  saveTexture(fakeFile, tempCanvas.toDataURL());
  return fakeFile;
}

function grassTint(name, texture, biome) {
  var color = [0, 0, 0];
  switch(biome) {
    case "shyfog:plains":
      color = [0, 255, 0];
      break;
    case "shyfog:desert":
      color = [200, 255, 0];
      break;
  }
  return tintedTexture(`/dynamic/${name}/${biome}`, texture, color);
}

function leavesTint(name, texture, biome) {
  var color = [0, 0, 0];
  switch(biome) {
    case "shyfog:plains":
      color = [0, 200, 0];
      break;
    case "shyfog:desert":
      color = [200, 200, 0];
      break;
  }
  return tintedTexture(`/dynamic/${name}/${biome}`, texture, color);
}

function render() {
  var { canvas, context: ctx, blockSize, renderDistance } = game;
  if (!canvas || !ctx) {
    return;
  }

  // Global settings
  ctx.imageSmoothingEnabled = false;
  ctx.lineWidth = 2;

  // Clear everything by rendering the sky
  ctx.fillStyle = (game.worldMetadata.skyColor || "#000000");
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Haven't received PLAYER_METADATA packet yet, just wait
  var currentUserMetadata = game.playerMetadata[game.currentUser.username];
  if (!currentUserMetadata) {
    return window.requestAnimationFrame(render);
  }

  var playerSpeed = (5 * game.deltaTime);
  if (game.holdingKeys.get("ShiftLeft")) {
    playerSpeed = (2 * game.deltaTime);
  }
  if (game.holdingKeys.get("ControlLeft")) {
    playerSpeed = (7 * game.deltaTime);
  }
  var playerChunkX = bigToNumber(bigFloor(currentUserMetadata.x.div(16)));
  var playerChunkY = bigToNumber(bigFloor(currentUserMetadata.y.div(16)));
  var playerChunkZ = bigToNumber(currentUserMetadata.z);
  var playerChunkPositionX = currentUserMetadata.x.mod(16);
  var playerChunkPositionY = currentUserMetadata.y.mod(16);
  if (playerChunkPositionX.lt(0)) {
    playerChunkPositionX = playerChunkPositionX.add(16);
  }
  if (playerChunkPositionY.lt(0)) {
    playerChunkPositionY = playerChunkPositionY.add(16);
  }
  var biome = null;
  var currentBiomeRange = bigToNumber(bigFloor(playerChunkPositionX));
  for (var biomeRange in game.biomes[`${playerChunkX},${playerChunkY},${playerChunkZ}`]) {
    var [ start, end ] = biomeRange.split(",").map(part => parseFloat(part));
    if (currentBiomeRange >= start && currentBiomeRange <= end) {
      biome = game.biomes[`${playerChunkX},${playerChunkY},${playerChunkZ}`][biomeRange];
      break;
    }
  }

  var moved = false;
  if (["creative", "spectator"].includes(currentUserMetadata.gamemode)) {
    if (game.holdingKeys.get("Space")) {
      currentUserMetadata.y = currentUserMetadata.y.add(3 * game.deltaTime);
      moved = true;
    }
    if (game.holdingKeys.get("KeyA")) {
      currentUserMetadata.x = currentUserMetadata.x.sub(playerSpeed);
      moved = true;
    }
    if (game.holdingKeys.get("KeyD")) {
      currentUserMetadata.x = currentUserMetadata.x.add(playerSpeed);
      moved = true;
    }
    if (game.holdingKeys.get("ShiftLeft")) {
      currentUserMetadata.y = currentUserMetadata.y.sub(3 * game.deltaTime);
      moved = true;
    }
  } else {
    // Gravity
    if (game.chunks[`${playerChunkX},${playerChunkY},${playerChunkZ}`] && ["survival", "adventure"].includes(currentUserMetadata.gamemode)) {
      game.wasOnGround = game.onGround;
      game.onGround = false;
      hitboxsearch:
      for (var chunkOffset of [
        [0, 0, 0],
        [-1, 0, 0],
        [1, 0, 0],
        [0, -1, 0],
        [-1, -1, 0],
        [1, -1, 0]
      ]) {
        if (!game.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          continue;
        }
        for (var block of game.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          if (!block || !game.items[block.block].hitboxes) {
            continue;
          }
          for (var hitbox of game.items[block.block].hitboxes) {
            if (hitbox.type == "none") {
              continue;
            }
            for (var playerHitbox of currentUserMetadata.hitboxes) {
              if (collidesAABB({
                "x": playerChunkPositionX.add(playerHitbox.x),
                "y": playerChunkPositionY.add(playerHitbox.y).add(1),
                "width": new Big(playerHitbox.width),
                "height": new Big(playerHitbox.height)
              }, {
                "x": (new Big(chunkOffset[0] * 16)).add(block.x).add(hitbox.x),
                "y": (new Big(chunkOffset[1] * 16)).add(block.y).add(hitbox.y).add(1),
                "width": new Big(hitbox.width),
                "height": new Big(hitbox.height)
              }, false, true) == "bottom") {
                game.onGround = true;
                break hitboxsearch;
              }
            }
          }
        }
      }
      // Coyote time to be able jump in the air for a quick time
      if (game.wasOnGround && !game.onGround) {
        game.coyoteTime = performance.now();
      }
    } else {
      game.onGround = true;
    }
    if (!game.onGround && !game.jumping) {
      // Not on ground, need to fall
      hitboxsearch:
      for (var chunkOffset of [
        [0, 0, 0],
        [-1, 0, 0],
        [1, 0, 0],
        [0, -1, 0],
        [-1, -1, 0],
        [1, -1, 0]
      ]) {
        if (!game.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          continue;
        }
        for (var block of game.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          if (!block || !game.items[block.block].hitboxes) {
            continue;
          }
          for (var hitbox of game.items[block.block].hitboxes) {
            if (hitbox.type == "none") {
              continue;
            }
            for (var playerHitbox of currentUserMetadata.hitboxes) {
              if (collidesAABB({
                "x": playerChunkPositionX.add(playerHitbox.x),
                "y": playerChunkPositionY.add(playerHitbox.y).add(1).sub(4 * game.deltaTime),
                "width": new Big(playerHitbox.width),
                "height": new Big(playerHitbox.height)
              }, {
                "x": (new Big(chunkOffset[0] * 16)).add(block.x).add(hitbox.x),
                "y": (new Big(chunkOffset[1] * 16)).add(block.y).add(hitbox.y).add(1),
                "width": new Big(hitbox.width),
                "height": new Big(hitbox.height)
              })) {
                foundCollision = { chunkOffset, block, hitbox, playerHitbox };
                break hitboxsearch;
              }
            }
          }
        }
      }
      if (foundCollision) {
        currentUserMetadata.y = new Big((playerChunkY * 16) + (foundCollision.chunkOffset[1] * 16) + foundCollision.block.y + foundCollision.hitbox.y + 1);
        moved = true;
      } else {
        currentUserMetadata.y = currentUserMetadata.y.sub(4 * game.deltaTime);
        moved = true;
      }
    }

    if (game.chunks[`${playerChunkX},${playerChunkY},${playerChunkZ}`] && game.holdingKeys.get("Space") && (game.onGround || performance.now() - game.coyoteTime <= 50) && !game.jumping && performance.now() - game.lastJump >= 150) {
      game.jumping = true;
      game.jumpedMotion = 0;
    }

    if (game.jumping) {
      hitboxsearch:
      for (var chunkOffset of [
        [0, 0, 0],
        [0, 1, 0],
        [-1, 1, 0],
        [1, 1, 0]
      ]) {
        if (!game.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          continue;
        }
        for (var block of game.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          if (!block || !game.items[block.block].hitboxes) {
            continue;
          }
          for (var hitbox of game.items[block.block].hitboxes) {
            if (hitbox.type == "none") {
              continue;
            }
            for (var playerHitbox of currentUserMetadata.hitboxes) {
              if (collidesAABB({
                "x": playerChunkPositionX.add(playerHitbox.x),
                "y": playerChunkPositionY.add(playerHitbox.y).add(1).add(7 * game.deltaTime),
                "width": new Big(playerHitbox.width),
                "height": new Big(playerHitbox.height)
              }, {
                "x": (new Big(chunkOffset[0] * 16)).add(block.x).add(hitbox.x),
                "y": (new Big(chunkOffset[1] * 16)).add(block.y).add(hitbox.y).add(1),
                "width": new Big(hitbox.width),
                "height": new Big(hitbox.height)
              })) {
                foundCollision = { chunkOffset, block, hitbox, playerHitbox };
                break hitboxsearch;
              }
            }
          }
        }
      }
      if (foundCollision) {
        currentUserMetadata.y = new Big((playerChunkY * 16) + (foundCollision.chunkOffset[1] * 16) + foundCollision.block.y - foundCollision.playerHitbox.height);
        game.jumping = false;
        game.lastJump = performance.now();
        moved = true;
      } else {
        currentUserMetadata.y = currentUserMetadata.y.add(7 * game.deltaTime);
        game.jumpedMotion += 7 * game.deltaTime;
        if (game.jumpedMotion >= currentUserMetadata.jumpHeight) {
          game.jumping = false;
          game.lastJump = performance.now();
        }
        moved = true;
      }
      moved = true;
    }

    if (game.chunks[`${playerChunkX},${playerChunkY},${playerChunkZ}`] && game.holdingKeys.get("KeyA")) {
      var foundCollision = null;
      hitboxsearch:
      for (var chunkOffset of [
        [0, 0, 0],
        [-1, 0, 0],
        [0, -1, 0],
        [0, 1, 0],
        [-1, -1, 0],
        [-1, 1, 0]
      ]) {
        for (var block of game.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          if (!block || !game.items[block.block].hitboxes) {
            continue;
          }
          for (var hitbox of game.items[block.block].hitboxes) {
            if (hitbox.type == "none") {
              continue;
            }
            for (var playerHitbox of currentUserMetadata.hitboxes) {
              if (collidesAABB({
                "x": playerChunkPositionX.add(playerHitbox.x).sub(playerSpeed),
                "y": playerChunkPositionY.add(playerHitbox.y).add(1),
                "width": new Big(playerHitbox.width),
                "height": new Big(playerHitbox.height)
              }, {
                "x": (new Big(chunkOffset[0] * 16)).add(block.x).add(hitbox.x),
                "y": (new Big(chunkOffset[1] * 16)).add(block.y).add(hitbox.y).add(1),
                "width": new Big(hitbox.width),
                "height": new Big(hitbox.height)
              })) {
                foundCollision = { chunkOffset, block, hitbox, playerHitbox };
                break hitboxsearch;
              }
            }
          }
        }
      }
      if (foundCollision) {
        currentUserMetadata.x = new Big((playerChunkX * 16) + (foundCollision.chunkOffset[0] * 16) + foundCollision.block.x + foundCollision.hitbox.x + foundCollision.playerHitbox.width + foundCollision.playerHitbox.x);
        moved = true;
      } else {
        currentUserMetadata.x = currentUserMetadata.x.sub(playerSpeed);
        moved = true;
      }
    }
    if (game.chunks[`${playerChunkX},${playerChunkY},${playerChunkZ}`] && game.holdingKeys.get("KeyD")) {
      var foundCollision = null;
      hitboxsearch:
      for (var chunkOffset of [
        [0, 0, 0],
        [1, 0, 0],
        [0, -1, 0],
        [0, 1, 0],
        [1, -1, 0],
        [1, 1, 0]
      ]) {
        for (var block of game.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          if (!block || !game.items[block.block].hitboxes) {
            continue;
          }
          for (var hitbox of game.items[block.block].hitboxes) {
            if (hitbox.type == "none") {
              continue;
            }
            for (var playerHitbox of currentUserMetadata.hitboxes) {
              if (collidesAABB({
                "x": playerChunkPositionX.add(playerHitbox.x).add(playerSpeed),
                "y": playerChunkPositionY.add(playerHitbox.y).add(1),
                "width": new Big(playerHitbox.width),
                "height": new Big(playerHitbox.height)
              }, {
                "x": (new Big(chunkOffset[0] * 16)).add(block.x).add(hitbox.x),
                "y": (new Big(chunkOffset[1] * 16)).add(block.y).add(hitbox.y).add(1),
                "width": new Big(hitbox.width),
                "height": new Big(hitbox.height)
              })) {
                foundCollision = { chunkOffset, block, hitbox, playerHitbox };
                break hitboxsearch;
              }
            }
          }
        }
      }
      if (foundCollision) {
        currentUserMetadata.x = new Big((playerChunkX * 16) + (foundCollision.chunkOffset[0] * 16) + foundCollision.block.x + foundCollision.hitbox.x - foundCollision.playerHitbox.width - foundCollision.playerHitbox.x);
        moved = true;
      } else {
        currentUserMetadata.x = currentUserMetadata.x.add(playerSpeed);
        moved = true;
      }
    }
  }

  var direction = "none";
  if (game.holdingKeys.get("KeyA") && !game.holdingKeys.get("KeyD")) {
    direction = "left";
  }
  if (!game.holdingKeys.get("KeyA") && game.holdingKeys.get("KeyD")) {
    direction = "right";
  }
  if (moved || currentUserMetadata.direction != direction) {
    currentUserMetadata.direction = direction;
    sendPacket(PacketType.MOVEMENT, currentUserMetadata.x.toString(), currentUserMetadata.y.toString(), currentUserMetadata.z.toString(), direction);
  }

  // Lock camera on the player
  var cameraX = (canvas.width / 2) - (currentUserMetadata.x * blockSize) - (blockSize / 2);
  var cameraY = (canvas.height / 2) - (currentUserMetadata.y * -blockSize) - blockSize;

  // Render void
  if (game.worldMetadata.void) {
    var voidY = (-game.worldMetadata.voidY * blockSize) + cameraY;
    if (voidY < 0) {
      voidY = 0;
    }
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, voidY, canvas.width, canvas.height);
  }

  // Render players
  for (var username in game.playerMetadata) {
    if (!hasTexture(`/skin/${username}`)) {
      saveTexture(`/skin/${username}`, game.playerMetadata[username].skin);
    }
    if (username != game.currentUser.username && game.playerMetadata[username].gamemode != "spectator") {
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.font = "15px sans-serif";
      ctx.fillText(username, (game.playerMetadata[username].x * blockSize) + (blockSize / 2) + cameraX, (game.playerMetadata[username].y * -blockSize) - blockSize - (blockSize / 4) + cameraY);
    }
    if (game.playerMetadata[username].gamemode == "spectator") {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.drawImage(getTexture(`/skin/${username}`), 8, 8, 8, 8, (game.playerMetadata[username].x * blockSize) + (blockSize / 4) + cameraX, (game.playerMetadata[username].y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
      ctx.drawImage(getTexture(`/skin/${username}`), 40, 8, 8, 8, (game.playerMetadata[username].x * blockSize) + (blockSize / 4) + cameraX, (game.playerMetadata[username].y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
      ctx.restore();
    } else if (game.playerMetadata[username].direction == "none") {
      ctx.fillStyle = "#000000";
      ctx.fillRect((game.playerMetadata[username].x * blockSize) + (blockSize / 4) + cameraX, (game.playerMetadata[username].y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
      ctx.fillRect(game.playerMetadata[username].x * blockSize + cameraX, (game.playerMetadata[username].y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
      ctx.fillRect((game.playerMetadata[username].x * blockSize) + (blockSize / 4) + cameraX, (game.playerMetadata[username].y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 2, blockSize / 4 * 3);
      ctx.fillRect((game.playerMetadata[username].x * blockSize) + (blockSize / 4 * 3) + cameraX, (game.playerMetadata[username].y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
      ctx.fillRect((game.playerMetadata[username].x * blockSize) + (blockSize / 4) + cameraX, (game.playerMetadata[username].y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
      ctx.fillRect((game.playerMetadata[username].x * blockSize) + (blockSize / 2) + cameraX, (game.playerMetadata[username].y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
      ctx.drawImage(getTexture(`/skin/${username}`), 8, 8, 8, 8, (game.playerMetadata[username].x * blockSize) + (blockSize / 4) + cameraX, (game.playerMetadata[username].y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
      ctx.drawImage(getTexture(`/skin/${username}`), 40, 8, 8, 8, (game.playerMetadata[username].x * blockSize) + (blockSize / 4) + cameraX, (game.playerMetadata[username].y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
      ctx.drawImage(getTexture(`/skin/${username}`), 44, 20, 4, 12, game.playerMetadata[username].x * blockSize + cameraX, (game.playerMetadata[username].y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
      ctx.drawImage(getTexture(`/skin/${username}`), 20, 20, 8, 12, (game.playerMetadata[username].x * blockSize) + (blockSize / 4) + cameraX, (game.playerMetadata[username].y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 2, blockSize / 4 * 3);
      ctx.drawImage(getTexture(`/skin/${username}`), 36, 52, 4, 12, (game.playerMetadata[username].x * blockSize) + (blockSize / 4 * 3) + cameraX, (game.playerMetadata[username].y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
      ctx.drawImage(getTexture(`/skin/${username}`), 4, 20, 4, 12, (game.playerMetadata[username].x * blockSize) + (blockSize / 4) + cameraX, (game.playerMetadata[username].y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
      ctx.drawImage(getTexture(`/skin/${username}`), 20, 52, 4, 12, (game.playerMetadata[username].x * blockSize) + (blockSize / 2) + cameraX, (game.playerMetadata[username].y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
    } else if (game.playerMetadata[username].direction == "left") {
      ctx.fillStyle = "#000000";
      ctx.fillRect((game.playerMetadata[username].x * blockSize) + (blockSize / 4) + cameraX, (game.playerMetadata[username].y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
      ctx.fillRect((game.playerMetadata[username].x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (game.playerMetadata[username].y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
      ctx.fillRect((game.playerMetadata[username].x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (game.playerMetadata[username].y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
      ctx.drawImage(getTexture(`/skin/${username}`), 16, 8, 8, 8, (game.playerMetadata[username].x * blockSize) + (blockSize / 4) + cameraX, (game.playerMetadata[username].y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
      ctx.drawImage(getTexture(`/skin/${username}`), 40, 52, 4, 12, (game.playerMetadata[username].x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (game.playerMetadata[username].y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
      ctx.drawImage(getTexture(`/skin/${username}`), 24, 52, 4, 12, (game.playerMetadata[username].x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (game.playerMetadata[username].y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
    } else if (game.playerMetadata[username].direction == "right") {
      ctx.fillStyle = "#000000";
      ctx.fillRect((game.playerMetadata[username].x * blockSize) + (blockSize / 4) + cameraX, (game.playerMetadata[username].y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
      ctx.fillRect((game.playerMetadata[username].x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (game.playerMetadata[username].y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
      ctx.fillRect((game.playerMetadata[username].x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (game.playerMetadata[username].y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
      ctx.drawImage(getTexture(`/skin/${username}`), 0, 8, 8, 8, (game.playerMetadata[username].x * blockSize) + (blockSize / 4) + cameraX, (game.playerMetadata[username].y * -blockSize) - blockSize + cameraY, blockSize / 2, blockSize / 2);
      ctx.drawImage(getTexture(`/skin/${username}`), 40, 20, 4, 12, (game.playerMetadata[username].x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (game.playerMetadata[username].y * -blockSize) - (blockSize / 2) + cameraY, blockSize / 4, blockSize / 4 * 3);
      ctx.drawImage(getTexture(`/skin/${username}`), 0, 20, 4, 12, (game.playerMetadata[username].x * blockSize) + (blockSize / 4) + (blockSize / 8) + cameraX, (game.playerMetadata[username].y * -blockSize) + (blockSize / 4) + cameraY, blockSize / 4, blockSize / 4 * 3);
    }
    if (game.debugModeHitboxes) {
      ctx.strokeStyle = "#ffffff";
      for (var hitbox of game.playerMetadata[username].hitboxes) {
        ctx.beginPath();
        ctx.moveTo(bigToNumber(game.playerMetadata[username].x.add(hitbox.x).mul(blockSize).add(cameraX)), game.playerMetadata[username].y.add(hitbox.y).mul(-blockSize).add(cameraY));
        ctx.lineTo(bigToNumber(game.playerMetadata[username].x.add(hitbox.x).add(hitbox.width).mul(blockSize).add(cameraX)), game.playerMetadata[username].y.add(hitbox.y).mul(-blockSize).add(cameraY));
        ctx.lineTo(bigToNumber(game.playerMetadata[username].x.add(hitbox.x).add(hitbox.width).mul(blockSize).add(cameraX)), game.playerMetadata[username].y.add(hitbox.y).mul(-blockSize).add(hitbox.height * blockSize).add(cameraY));
        ctx.lineTo(bigToNumber(game.playerMetadata[username].x.add(hitbox.x).mul(blockSize).add(cameraX)), game.playerMetadata[username].y.add(hitbox.y).mul(-blockSize).add(hitbox.height * blockSize).add(cameraY));
        ctx.lineTo(bigToNumber(game.playerMetadata[username].x.add(hitbox.x).mul(blockSize).add(cameraX)), game.playerMetadata[username].y.add(hitbox.y).mul(-blockSize).add(cameraY));
        ctx.stroke();
      }
    }
  }

  // Render blocks in chunks around the player
  for (var chunkZ = playerChunkZ - 1; chunkZ <= playerChunkZ; chunkZ++) {
    for (var chunkX = playerChunkX - renderDistance; chunkX <= playerChunkX + renderDistance; chunkX++) {
      for (var chunkY = playerChunkY - renderDistance; chunkY <= playerChunkY + renderDistance; chunkY++) {
        if (!game.chunks[`${chunkX},${chunkY},${chunkZ}`]) {
          if (game.debugModeChunks && Math.floor(currentUserMetadata.z / 16) == chunkZ) {
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
        for (var block of game.chunks[`${chunkX},${chunkY},${chunkZ}`]) {
          if (!block) {
            continue;
          }
          var chunkBiome = null;
          for (var biomeRange in game.biomes[`${chunkX},${chunkY},${chunkZ}`]) {
            var [ start, end ] = biomeRange.split(",").map(part => parseFloat(part));
            if (block.x >= start && block.x <= end) {
              chunkBiome = game.biomes[`${chunkX},${chunkY},${chunkZ}`][biomeRange];
              break;
            }
          }
          var texture = game.items[block.block].texture({
            "biome": chunkBiome
          });
          // Optimization: Don't render blocks that aren't visible
          if ((((chunkX * 16) + block.x) * blockSize) + cameraX > canvas.width || (((chunkY * -16) - block.y) * blockSize) + cameraY > canvas.height || (((chunkX * 16) + block.x) * blockSize) + cameraX + blockSize < 0 || (((chunkY * -16) - block.y) * blockSize) + cameraY + blockSize < 0) {
            continue;
          }
          // Draw two times to fix aliasing
          for (var i = 0; i < 2; i++) {
            ctx.drawImage(getTexture(texture.file), (((chunkX * 16) + block.x) * blockSize) + cameraX, (((chunkY * -16) - block.y) * blockSize) + cameraY, blockSize, blockSize);
          }
        }
        if (chunkZ < playerChunkZ) {
          ctx.restore();
        }
        if (game.debugModeChunks && chunkZ == playerChunkZ) {
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

  // Vignette effect
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

  // Hotbar
  if (!game.hideOverlays && currentUserMetadata.gamemode != "spectator") {
    var hotbarTexture = getTexture("/gui/sprites/hud/hotbar.png");
    var hotbarSelectionTexture = getTexture("/gui/sprites/hud/hotbar_selection.png");
    const hotbarScale = 0.5;
    var hotbarRatio = (canvas.width * hotbarScale / hotbarTexture.width);
    var hotbarHeight = hotbarTexture.height * hotbarRatio;
    var slotWidth = 20 * hotbarRatio;
    ctx.drawImage(hotbarTexture, canvas.width * ((1 - hotbarScale) / 2), canvas.height - hotbarHeight, canvas.width * hotbarScale, hotbarHeight);
    ctx.drawImage(hotbarSelectionTexture, (canvas.width * ((1 - hotbarScale) / 2)) + (currentUserMetadata.selectedHotbarSlot * slotWidth) - (1 * hotbarRatio), canvas.height - hotbarHeight - (1 * hotbarRatio), slotWidth + (4 * hotbarRatio), hotbarHeight);
    for (var hotbarIndex = 0; hotbarIndex < 9; hotbarIndex++) {
      var hotbarItem = currentUserMetadata.slots[`hotbar.${hotbarIndex}`];
      if (hotbarItem) {
        var texture = game.items[hotbarItem.item].texture({ biome });
        ctx.drawImage(getTexture(texture.file), (canvas.width * ((1 - hotbarScale) / 2)) + (hotbarIndex * slotWidth) + (slotWidth / 4) + (slotWidth / 32) + (slotWidth / 64), canvas.height - hotbarHeight + (hotbarHeight / 4), hotbarHeight / 2, hotbarHeight / 2);
        if (hotbarItem.count > 1) {
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "end";
          ctx.font = `${7 * hotbarRatio}px Arial`;
          ctx.fillText(hotbarItem.count.toString(), (canvas.width * ((1 - hotbarScale) / 2)) + (hotbarIndex * slotWidth) + (slotWidth / 4) + (slotWidth / 8) + (hotbarHeight / 2), canvas.height - hotbarHeight + (hotbarHeight / 4) + (hotbarHeight / 2));
        }
      }
    }
  }

  if (!game.hideOverlays && game.debugMode) {
    ctx.fillStyle = "#ff0000";
    ctx.textAlign = "start";
    ctx.font = "15px sans-serif";
    var debugInfo =  [
      `ShyFog ${game.version}`,
      `Server Software: ${game.serverSoftware} ${game.serverVersion}`,
      `FPS: ${game.times.length}`,
      `Ping: ${game.measuredPing}ms`,
      `Current Player: ${game.currentUser.username}${game.currentUser.id ? ` (${game.currentUser.id})` : ""}`,
      `Position: (${currentUserMetadata.x}, ${currentUserMetadata.y}, ${currentUserMetadata.z})`,
      `Chunk: (${playerChunkX}, ${playerChunkY}, ${playerChunkZ})`,
      `Chunk Position: (${playerChunkPositionX}, ${playerChunkPositionY}, 0)`,
      `Camera: (${cameraX}, ${cameraY})`,
      `Gamemode: ${currentUserMetadata.gamemode}`,
      `Block size: ${blockSize}`,
      `Cursor: (${game.cursorX}, ${game.cursorY})`,
      `Block Cursor: (${(game.cursorX - cameraX) / blockSize}, ${-((game.cursorY - cameraY) / blockSize) + 1}, ${Math.floor(currentUserMetadata.z)})`,
      `Biome: ${biome}`
    ];
    if (game.worldMetadata.reducedDebugInfo) {
      debugInfo =  [
        `ShyFog ${game.version}`,
        `Server Software: ${game.serverSoftware} ${game.serverVersion}`,
        `FPS: ${game.times.length}`,
        `Ping: ${game.measuredPing}ms`,
        `Current Player: ${game.currentUser.username}${game.currentUser.id ? ` (${game.currentUser.id})` : ""}`,
        `Chunk Position: (${playerChunkPositionX}, ${playerChunkPositionY}, 0)`,
        `Gamemode: ${currentUserMetadata.gamemode}`,
        `Block size: ${blockSize}`,
        `Cursor: (${game.cursorX}, ${game.cursorY})`
      ];
    }
    debugInfo.forEach((line, index) => {
      ctx.fillText(line, 15, 30 + (index * 20));
    });
  }

  window.requestAnimationFrame(() => {
    var now = performance.now();
    game.deltaTime = (now - game.prevFrame) / 1e3;
    game.prevFrame = now;
    while (game.times.length > 0 && game.times[0] <= (now - 1e3)) {
      game.times.shift();
    }
    game.times.push(now);
    render();
  });
}

function handleLeftClick(event) {
  if (game.paused) {
    return;
  }
  var currentUserMetadata = game.playerMetadata[game.currentUser.username];
  var cameraX = (game.canvas.width / 2) - (currentUserMetadata.x * game.blockSize) - (game.blockSize / 2);
  var cameraY = (game.canvas.height / 2) - (currentUserMetadata.y * -game.blockSize) - game.blockSize;
  var x = (event.clientX - cameraX) / game.blockSize;
  var y = -((event.clientY - cameraY) / game.blockSize) + 1;
  var z = Math.floor(currentUserMetadata.z);
  if (currentUserMetadata.gamemode != "survival" && currentUserMetadata.gamemode != "creative") {
    return;
  }
  sendPacket(PacketType.BLOCK_BREAK, x, y, z);
}

function handleRightClick(event) {
  if (game.paused) {
    return;
  }
  event.preventDefault();
  var currentUserMetadata = game.playerMetadata[game.currentUser.username];
  var cameraX = (game.canvas.width / 2) - (currentUserMetadata.x * game.blockSize) - (game.blockSize / 2);
  var cameraY = (game.canvas.height / 2) - (currentUserMetadata.y * -game.blockSize) - game.blockSize;
  var x = (event.clientX - cameraX) / game.blockSize;
  var y = -((event.clientY - cameraY) / game.blockSize) + 1;
  var z = Math.floor(currentUserMetadata.z);
  if (currentUserMetadata.gamemode != "survival" && currentUserMetadata.gamemode != "creative") {
    return;
  }
  var chunkX = Math.floor(x / 16);
  var chunkY = Math.floor(y / 16);
  var newBlockX = Math.floor(x) % 16;
  var newBlockY = Math.floor(y) % 16;
  if (newBlockX < 0) {
    newBlockX += 16;
  }
  if (newBlockY < 0) {
    newBlockY += 16;
  }
  if (!game.chunks[`${chunkX},${chunkY},${z}`]) {
    return;
  }
  if (!game.worldMetadata.allowBuildingInVoid && (chunkY * 16) + newBlockY <= game.worldMetadata.voidY) {
    return;
  }
  if (game.worldMetadata.worldHeight !== null && (chunkY * 16) + newBlockY > game.worldMetadata.worldHeight) {
    return;
  }
  var blockId = game.chunks[`${chunkX},${chunkY},${z}`].findIndex(block => block && block.x == newBlockX && block.y == newBlockY);
  if (blockId > -1) {
    return;
  }
  if (!currentUserMetadata.slots[`hotbar.${currentUserMetadata.selectedHotbarSlot}`]) {
    return;
  }
  if (!game.items[currentUserMetadata.slots[`hotbar.${currentUserMetadata.selectedHotbarSlot}`].item].placeable) {
    return;
  }
  var newBlock = {
    "block": currentUserMetadata.slots[`hotbar.${currentUserMetadata.selectedHotbarSlot}`].item,
    "x": newBlockX,
    "y": newBlockY
  };
  game.chunks[`${chunkX},${chunkY},${z}`].push(newBlock);
  if (currentUserMetadata.gamemode != "creative") {
    if (--currentUserMetadata.slots[`hotbar.${currentUserMetadata.selectedHotbarSlot}`].count < 1) {
      currentUserMetadata.slots[`hotbar.${currentUserMetadata.selectedHotbarSlot}`] = null;
    }
  }
  sendPacket(PacketType.USE, x, y, z);
}