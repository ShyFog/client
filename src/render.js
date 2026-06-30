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
  if (!game.biomes[`${playerChunkX},${playerChunkY},${playerChunkZ}`]) {
    return window.requestAnimationFrame(render);
  }
  for (var biomeRange of game.biomes[`${playerChunkX},${playerChunkY},${playerChunkZ}`]) {
    var [ start, end, type ] = biomeRange;
    if (currentBiomeRange >= start && currentBiomeRange <= end) {
      biome = type;
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
          if (!block) {
            continue;
          }
          for (var hitbox of game.items[block.block]({}).hitboxes) {
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
                "x": new Big((chunkOffset[0] * 16) + block.x + hitbox.x),
                "y": new Big((chunkOffset[1] * 16) + block.y + hitbox.y + 1),
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
          if (!block) {
            continue;
          }
          for (var hitbox of game.items[block.block]({}).hitboxes) {
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
                "x": new Big((chunkOffset[0] * 16) + block.x + hitbox.x),
                "y": new Big((chunkOffset[1] * 16) + block.y + hitbox.y + 1),
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
        [-1, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [-1, 1, 0],
        [1, 1, 0]
      ]) {
        if (!game.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          continue;
        }
        for (var block of game.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          if (!block) {
            continue;
          }
          for (var hitbox of game.items[block.block]({}).hitboxes) {
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
                "x": new Big((chunkOffset[0] * 16) + block.x + hitbox.x),
                "y": new Big((chunkOffset[1] * 16) + block.y + hitbox.y + 1),
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
      if (currentUserMetadata.currentGUI) {
        game.jumping = false;
      } else if (foundCollision) {
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

    if (game.chunks[`${playerChunkX},${playerChunkY},${playerChunkZ}`] && !currentUserMetadata.currentGUI && game.holdingKeys.get("KeyA")) {
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
          if (!block ) {
            continue;
          }
          for (var hitbox of game.items[block.block]({}).hitboxes) {
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
                "x": new Big((chunkOffset[0] * 16) + block.x + hitbox.x),
                "y": new Big((chunkOffset[1] * 16) + block.y + hitbox.y + 1),
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
    if (game.chunks[`${playerChunkX},${playerChunkY},${playerChunkZ}`] && !currentUserMetadata.currentGUI && game.holdingKeys.get("KeyD")) {
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
          if (!block) {
            continue;
          }
          for (var hitbox of game.items[block.block]({}).hitboxes) {
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
                "x": new Big((chunkOffset[0] * 16) + block.x + hitbox.x),
                "y": new Big((chunkOffset[1] * 16) + block.y + hitbox.y + 1),
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
    if (game.debugModeHitboxes && !game.worldMetadata.reducedDebugInfo) {
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
          for (var biomeRange of game.biomes[`${chunkX},${chunkY},${chunkZ}`]) {
            var [ start, end, type ] = biomeRange;
            if (block.x >= start && block.x <= end) {
              chunkBiome = type;
              break;
            }
          }
          if (!game.items[block.block]) {
            throw `Unknown block "${block.block}".`;
          }
          var blockData = game.items[block.block]({
            "biome": chunkBiome
          });
          // Optimization: Don't render blocks that aren't visible
          if ((((chunkX * 16) + block.x) * blockSize) + cameraX > canvas.width || (((chunkY * -16) - block.y) * blockSize) + cameraY > canvas.height || (((chunkX * 16) + block.x) * blockSize) + cameraX + blockSize < 0 || (((chunkY * -16) - block.y) * blockSize) + cameraY + blockSize < 0) {
            continue;
          }
          // Draw two times to fix aliasing
          // TODO: Some users still have aliasing issues (?)
          for (var i = 0; i < 2; i++) {
            for (var texture of blockData.texture) {
              ctx.drawImage(getTexture(texture.file), (((chunkX * 16) + block.x + texture.x) * blockSize) + cameraX, (((chunkY * -16) - block.y - texture.y) * blockSize) + cameraY, texture.width * blockSize, texture.height * blockSize);
            }
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

  // Render player nametags
  for (var username in game.playerMetadata) {
    if (username != game.currentUser.username && game.playerMetadata[username].gamemode != "spectator") {
      ctx.textAlign = "center";
      ctx.font = "10px Minecraft";
      ctx.fillStyle = "#000000";
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillRect((game.playerMetadata[username].x * blockSize) + (blockSize / 2) + cameraX - (ctx.measureText(username).width / 2) - 4, (game.playerMetadata[username].y * -blockSize) - blockSize - (blockSize / 4) + cameraY - 12, ctx.measureText(username).width + 8, 15);
      ctx.restore();
      ctx.fillStyle = "#ffffff";
      ctx.fillText(username, (game.playerMetadata[username].x * blockSize) + (blockSize / 2) + cameraX, (game.playerMetadata[username].y * -blockSize) - blockSize - (blockSize / 4) + cameraY);
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

  var blockCursorX = (game.cursorX - cameraX) / blockSize;
  var blockCursorY = -((game.cursorY - cameraY) / blockSize) + 1;
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
  if (game.chunks[`${blockCursorChunkX},${blockCursorChunkY},${currentUserMetadata.z.toString()}`] && (currentUserMetadata.gamemode == "survival" || currentUserMetadata.gamemode == "creative")) {
    var blockId = game.chunks[`${blockCursorChunkX},${blockCursorChunkY},${currentUserMetadata.z.toString()}`].findIndex(block => block && block.x == blockCursorRelativeX && block.y == blockCursorRelativeY);
    // Using Pythogorean theorem to check if the block is in player's range
    if (blockId > -1 && (currentUserMetadata.maximumRange == "Infinity" || currentUserMetadata.x.add(new Big("0.5")).sub(new Big(blockCursorX)).pow(2).add(currentUserMetadata.y.add(new Big("1")).sub(new Big(blockCursorY)).pow(2)).sqrt().lte(new Big(currentUserMetadata.maximumRange)))) {
      var block = game.chunks[`${blockCursorChunkX},${blockCursorChunkY},${currentUserMetadata.z.toString()}`][blockId];

      // Block border at cursor
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 0.2;
      for (var i = 0; i < 2; i++) {
        ctx.strokeRect((Math.floor(blockCursorX) * blockSize) + cameraX, -(Math.floor(blockCursorY) * blockSize) + cameraY, blockSize, blockSize);
      }
      if (game.breakingBlock) {
        if (currentUserMetadata.gamemode == "creative") {
          game.chunks[`${blockCursorChunkX},${blockCursorChunkY},${currentUserMetadata.z.toString()}`][blockId] = null;
          sendPacket(PacketType.BLOCK_BREAK, blockCursorX, blockCursorY, bigToNumber(currentUserMetadata.z));
        } else {
          var now = performance.now();
          if (game.breakingBlockCache.x != Math.floor(blockCursorX) || game.breakingBlockCache.y != Math.floor(blockCursorY) || game.breakingBlockCache.z != bigToNumber(currentUserMetadata.z)) {
            game.breakingBlockCache = {
              "x": Math.floor(blockCursorX),
              "y": Math.floor(blockCursorY),
              "z": bigToNumber(currentUserMetadata.z)
            };
            game.breakingBlockTicks = 0;
          } else if (now - game.lastTick >= 30) {
            game.lastTick = now - ((now - game.lastTick) % 30);
            game.breakingBlockTicks++;
          }
          if (game.items[block.block]({}).hardness == -1) {
            ctx.drawImage(getTexture("/block/destroy_stage_0.png"), (Math.floor(blockCursorX) * blockSize) + cameraX, -(Math.floor(blockCursorY) * blockSize) + cameraY, blockSize, blockSize);
          } else {
            if (game.breakingBlockTicks >= game.items[block.block]({}).hardness * 100) {
              game.chunks[`${blockCursorChunkX},${blockCursorChunkY},${currentUserMetadata.z.toString()}`][blockId] = null;
              sendPacket(PacketType.BLOCK_BREAK, blockCursorX, blockCursorY, bigToNumber(currentUserMetadata.z));
            }
            if (game.items[block.block]({}).hardness) {
              ctx.drawImage(getTexture(`/block/destroy_stage_${Math.round(Math.min(game.breakingBlockTicks, game.items[block.block]({}).hardness * 100) / (game.items[block.block]({}).hardness * 100) * 9)}.png`), (Math.floor(blockCursorX) * blockSize) + cameraX, -(Math.floor(blockCursorY) * blockSize) + cameraY, blockSize, blockSize);
            }
          }
        }
      }
    }
  }

  // Auto-detect GUI scale
  var guiScale = 1;
  while(256 * (guiScale + 1) <= Math.min(canvas.width, canvas.height)) {
    guiScale++;
  }

  // HUD
  if (!game.hideOverlays && currentUserMetadata.gamemode != "spectator") {
    var heartContainerTexture = getTexture("/gui/sprites/hud/heart/container.png");
    var halfHeartTexture = getTexture("/gui/sprites/hud/heart/half.png");
    var fullHeartTexture = getTexture("/gui/sprites/hud/heart/full.png");
    var emptyFoodTexture = getTexture("/gui/sprites/hud/food_empty.png");
    var halfFoodTexture = getTexture("/gui/sprites/hud/food_half.png");
    var fullFoodTexture = getTexture("/gui/sprites/hud/food_full.png");
    var experienceBarTexture = getTexture("/gui/sprites/hud/experience_bar_background.png");
    var hotbarTexture = getTexture("/gui/sprites/hud/hotbar.png");
    var hotbarSelectionTexture = getTexture("/gui/sprites/hud/hotbar_selection.png");

    if (currentUserMetadata.gamemode == "survival" || currentUserMetadata.gamemode == "adventure") {
      // Health
      for (var i = 0; i < currentUserMetadata.maxHealth; i += 2) {
        var x = i % 20;
        var y = Math.floor(i / 20);
        ctx.drawImage(heartContainerTexture, (canvas.width / 2) - (hotbarTexture.width * guiScale / 2) + (x / 2 * heartContainerTexture.width * guiScale) - (x / 2 * guiScale), canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale) - 5 - (heartContainerTexture.height * guiScale) - (y * heartContainerTexture.height * guiScale), heartContainerTexture.width * guiScale, heartContainerTexture.height * guiScale);
      }
      for (var i = 0; i < Math.min(currentUserMetadata.health, currentUserMetadata.maxHealth); i += 2) {
        var x = i % 20;
        var y = Math.floor(i / 20);
        if (currentUserMetadata.health % 2 && i == currentUserMetadata.health - 1) {
          ctx.drawImage(halfHeartTexture, (canvas.width / 2) - (hotbarTexture.width * guiScale / 2) + (x / 2 * halfHeartTexture.width * guiScale) - (x / 2 * guiScale), canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale) - 5 - (halfHeartTexture.height * guiScale) - (y * halfHeartTexture.height * guiScale), halfHeartTexture.width * guiScale, halfHeartTexture.height * guiScale);
        } else {
          ctx.drawImage(fullHeartTexture, (canvas.width / 2) - (hotbarTexture.width * guiScale / 2) + (x / 2 * fullHeartTexture.width * guiScale) - (x / 2 * guiScale), canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale) - 5 - (fullHeartTexture.height * guiScale) - (y * fullHeartTexture.height * guiScale), fullHeartTexture.width * guiScale, fullHeartTexture.height * guiScale);
        }
      }

      // Hunger
      for (var i = 0; i < currentUserMetadata.maxFood; i += 2) {
        var x = i % 20;
        var y = Math.floor(i / 20);
        ctx.drawImage(emptyFoodTexture, (canvas.width / 2) + (hotbarTexture.width * guiScale / 2) - (((x / 2) + 1) * emptyFoodTexture.width * guiScale) + (x / 2 * guiScale), canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale) - 5 - (emptyFoodTexture.height * guiScale) - (y * emptyFoodTexture.height * guiScale), emptyFoodTexture.width * guiScale, emptyFoodTexture.height * guiScale);
      }
      for (var i = 0; i < Math.min(currentUserMetadata.food, currentUserMetadata.maxFood); i += 2) {
        var x = i % 20;
        var y = Math.floor(i / 20);
        if (currentUserMetadata.food % 2 && i == currentUserMetadata.food - 1) {
          ctx.drawImage(halfFoodTexture, (canvas.width / 2) + (hotbarTexture.width * guiScale / 2) - (((x / 2) + 1) * halfFoodTexture.width * guiScale) + (x / 2 * guiScale), canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale) - 5 - (halfFoodTexture.height * guiScale) - (y * halfFoodTexture.height * guiScale), halfFoodTexture.width * guiScale, halfFoodTexture.height * guiScale);
        } else {
          ctx.drawImage(fullFoodTexture, (canvas.width / 2) + (hotbarTexture.width * guiScale / 2) - (((x / 2) + 1) * fullFoodTexture.width * guiScale) + (x / 2 * guiScale), canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale) - 5 - (fullFoodTexture.height * guiScale) - (y * fullFoodTexture.height * guiScale), fullFoodTexture.width * guiScale, fullFoodTexture.height * guiScale);
        }
      }

      // Experience bar
      ctx.drawImage(experienceBarTexture, (canvas.width / 2) - (experienceBarTexture.width * guiScale / 2), canvas.height - (hotbarTexture.height * guiScale) - 5 - (experienceBarTexture.height * guiScale), experienceBarTexture.width * guiScale, experienceBarTexture.height * guiScale);
    }

    // Hotbar
    ctx.drawImage(hotbarTexture, (canvas.width / 2) - (hotbarTexture.width * guiScale / 2), canvas.height - (hotbarTexture.height * guiScale), hotbarTexture.width * guiScale, hotbarTexture.height * guiScale);
    for (var hotbarIndex = 0; hotbarIndex < 9; hotbarIndex++) {
      var hotbarItem = currentUserMetadata.slots[`hotbar.${hotbarIndex}`];
      if (hotbarItem) {
        var texture = game.items[hotbarItem.item]({ biome }).texture[0];
        ctx.drawImage(getTexture(texture.file), (canvas.width / 2) - (hotbarTexture.width * guiScale / 2) + (20 * guiScale * hotbarIndex) + (6 * guiScale), canvas.height - (hotbarTexture.height * guiScale) + (6 * guiScale), 10 * guiScale, 10 * guiScale);
        if (hotbarItem.count > 1) {
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "end";
          ctx.font = `${7 * guiScale}px Minecraft`;
          ctx.fillText(hotbarItem.count.toString(), (canvas.width / 2) - (hotbarTexture.width * guiScale / 2) + (20 * guiScale * hotbarIndex) + (19 * guiScale), canvas.height - (hotbarTexture.height * guiScale) + (18 * guiScale));
        }
      }
    }

    // Hotbar selector
    ctx.drawImage(hotbarSelectionTexture, (canvas.width / 2) - (hotbarTexture.width * guiScale / 2) + (20 * guiScale * currentUserMetadata.selectedHotbarSlot) - guiScale, canvas.height - (hotbarTexture.height * guiScale) - guiScale, hotbarSelectionTexture.width * guiScale, hotbarSelectionTexture.height * guiScale); 
  }

  if (currentUserMetadata.currentGUI) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    var currentGUIData = game.guis[currentUserMetadata.currentGUI.id];
    var guiBackground = getTexture(currentGUIData.background);
    var guiBackgroundWidth = (currentGUIData.backgroundWidth || guiBackground.width);
    var guiBackgroundHeight = (currentGUIData.backgroundHeight || guiBackground.height);
    var guiStartX = (canvas.width / 2) - (guiBackgroundWidth * guiScale / 2);
    var guiStartY = (canvas.height / 2) - (guiBackgroundHeight * guiScale / 2);
    var hoveringItem = null;
    ctx.drawImage(guiBackground, currentGUIData.backgroundOffsetX || 0, currentGUIData.backgroundOffsetY || 0, guiBackgroundWidth, guiBackgroundHeight, guiStartX, guiStartY, guiBackgroundWidth * guiScale, guiBackgroundHeight * guiScale);
    for (var element of currentGUIData.content) {
      if (element.type == "image") {
        ctx.drawImage(getTexture(element.file), guiStartX + (element.x * guiScale), guiStartY + (element.y * guiScale), element.width * guiScale, element.height * guiScale);
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
        ctx.drawImage(getTexture(`/skin/${game.currentUser.username}`), 8, 8, 8, 8, guiStartX + (element.x * guiScale) + (element.width * guiScale / 4), guiStartY + (element.y * guiScale), element.width * guiScale / 2, element.height * guiScale / 4);
        ctx.drawImage(getTexture(`/skin/${game.currentUser.username}`), 40, 8, 8, 8, guiStartX + (element.x * guiScale) + (element.width * guiScale / 4), guiStartY + (element.y * guiScale), element.width * guiScale / 2, element.height * guiScale / 4);
        ctx.drawImage(getTexture(`/skin/${game.currentUser.username}`), 44, 20, 4, 12, guiStartX + (element.x * guiScale), guiStartY + (element.y * guiScale) + (element.height * guiScale / 4), element.width * guiScale / 4, element.height * guiScale / 8 * 3);
        ctx.drawImage(getTexture(`/skin/${game.currentUser.username}`), 20, 20, 8, 12, guiStartX + (element.x * guiScale) + (element.width * guiScale / 4), guiStartY + (element.y * guiScale) + (element.height * guiScale / 4), element.width * guiScale / 2, element.height * guiScale / 8 * 3);
        ctx.drawImage(getTexture(`/skin/${game.currentUser.username}`), 36, 52, 4, 12, guiStartX + (element.x * guiScale) + (element.width * guiScale / 4) + (element.width * guiScale / 2), guiStartY + (element.y * guiScale) + (element.height * guiScale / 4), element.width * guiScale / 4, element.height * guiScale / 8 * 3);
        ctx.drawImage(getTexture(`/skin/${game.currentUser.username}`), 4, 20, 4, 12, guiStartX + (element.x * guiScale) + (element.width * guiScale / 4), guiStartY + (element.y * guiScale) + (element.height * guiScale / 4) + (element.height * guiScale / 8 * 3), element.width * guiScale / 4, element.height * guiScale / 8 * 3);
        ctx.drawImage(getTexture(`/skin/${game.currentUser.username}`), 20, 52, 4, 12, guiStartX + (element.x * guiScale) + (element.width * guiScale / 2), guiStartY + (element.y * guiScale) + (element.height * guiScale / 4) + (element.height * guiScale / 8 * 3), element.width * guiScale / 4, element.height * guiScale / 8 * 3);
      }
      if (["player_slot", "block_slot", "world_slot"].includes(element.type)) {
        var hovering = game.cursorX >= guiStartX + (element.x * guiScale) && game.cursorY >= guiStartY + (element.y * guiScale) && game.cursorX <= guiStartX + ((element.x + element.width) * guiScale) && game.cursorY <= guiStartY + ((element.y + element.height) * guiScale);
        if (hovering) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.46)";
          ctx.fillRect(guiStartX + ((element.x + 1) * guiScale), guiStartY + ((element.y + 1) * guiScale), (element.width - 2) * guiScale, (element.height - 2) * guiScale);
        }
        var slotItem = null;
        if (element.type == "player_slot") {
          slotItem = currentUserMetadata.slots[element.slot];
        }
        if (slotItem) {
          var texture = game.items[slotItem.item]({ biome }).texture[0];
          ctx.drawImage(getTexture(texture.file), guiStartX + ((element.x + 1) * guiScale) + (element.width * guiScale * 0.1), guiStartY + ((element.y + 1) * guiScale) + (element.height * guiScale * 0.1), element.width * guiScale * 0.7, element.height * guiScale * 0.7);
          if (slotItem.count > 1) {
            ctx.fillStyle = "#ffffff";
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
    if (hoveringItem) {
      ctx.textAlign = "start";
      ctx.font = `${8 * guiScale}px Minecraft`;
      var itemName = game.items[hoveringItem.item]({ biome }).name;
      var tooltipX = game.cursorX + (8 * guiScale);
      var tooltipY = game.cursorY - (16 * guiScale);
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
      `Block Size: ${blockSize}`,
      `Cursor: (${game.cursorX}, ${game.cursorY})`,
      `Block Cursor (Float): (${blockCursorX}, ${blockCursorY}, ${Math.floor(currentUserMetadata.z)})`,
      `Block Cursor (Int): (${Math.floor(blockCursorX)}, ${Math.floor(blockCursorY)}, ${Math.floor(currentUserMetadata.z)})`,
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
        `Block Size: ${blockSize}`,
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

function handleMousedown() {
  if (game.paused) {
    return;
  }
  game.breakingBlock = true;
  game.breakingBlockTicks = 0;
}

function handleMouseup() {
  game.breakingBlock = false;
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
  if (currentUserMetadata.maximumRange != "Infinity" && currentUserMetadata.x.add(new Big("0.5")).sub(new Big(x)).pow(2).add(currentUserMetadata.y.add(new Big("1")).sub(new Big(y)).pow(2)).sqrt().gt(new Big(currentUserMetadata.maximumRange))) {
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
  if (!game.items[currentUserMetadata.slots[`hotbar.${currentUserMetadata.selectedHotbarSlot}`].item]({}).placeable) {
    return;
  }
  for (var username in game.playerMetadata) {
    for (var playerHitbox of game.playerMetadata[username].hitboxes) {
      if (collidesAABB({
        "x": game.playerMetadata[username].x.add(playerHitbox.x),
        "y": game.playerMetadata[username].y.add(playerHitbox.y),
        "width": new Big(playerHitbox.width),
        "height": new Big(playerHitbox.height)
      }, {
        "x": new Big(Math.floor(x)),
        "y": new Big(Math.floor(y)),
        "width": new Big("1"),
        "height": new Big("1")
      })) {
        return;
      }
    }
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