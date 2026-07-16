ShyFog.Client.defaultValues.onGround = false;
ShyFog.Client.defaultValues.wasOnGround = false;
ShyFog.Client.defaultValues.jumping = false;
ShyFog.Client.defaultValues.jumpedMotion = 0;
ShyFog.Client.defaultValues.lastJump = -Infinity;
ShyFog.Client.defaultValues.coyoteTime = -Infinity;
ShyFog.Client.resetState();

ShyFog.Client.physics = () => {
  var currentUser = ShyFog.Client.players.get(ShyFog.Client.user.username);
  var playerSpeed = (currentUser.walkSpeed * ShyFog.Client.deltaTime);
  if (ShyFog.Client.holdingKeys.get("ShiftLeft")) {
    playerSpeed = (currentUser.shiftSpeed * ShyFog.Client.deltaTime);
  }
  if (ShyFog.Client.holdingKeys.get("ControlLeft")) {
    playerSpeed = (currentUser.sprintSpeed * ShyFog.Client.deltaTime);
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

  var moved = false;
  if (["creative", "spectator"].includes(currentUser.gamemode)) {
    if (ShyFog.Client.holdingKeys.get("Space")) {
      currentUser.y = currentUser.y.add(currentUser.verticalFlySpeed * ShyFog.Client.deltaTime);
      moved = true;
    }
    if (ShyFog.Client.holdingKeys.get("KeyA")) {
      currentUser.x = currentUser.x.sub(playerSpeed);
      moved = true;
    }
    if (ShyFog.Client.holdingKeys.get("KeyD")) {
      currentUser.x = currentUser.x.add(playerSpeed);
      moved = true;
    }
    if (ShyFog.Client.holdingKeys.get("ShiftLeft")) {
      currentUser.y = currentUser.y.sub(currentUser.verticalFlySpeed * ShyFog.Client.deltaTime);
      moved = true;
    }
  } else {
    // Gravity
    if (ShyFog.Client.chunks[`${playerChunkX},${playerChunkY},${playerChunkZ}`] && ["survival", "adventure"].includes(currentUser.gamemode)) {
      ShyFog.Client.wasOnGround = ShyFog.Client.onGround;
      ShyFog.Client.onGround = false;
      hitboxsearch:
      for (var chunkOffset of [
        [0, 0, 0],
        [-1, 0, 0],
        [1, 0, 0],
        [0, -1, 0],
        [-1, -1, 0],
        [1, -1, 0]
      ]) {
        if (!ShyFog.Client.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          continue;
        }
        for (var block of ShyFog.Client.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          if (!block) {
            continue;
          }
          for (var hitbox of ShyFog.Client.items[block.block]({}).hitboxes) {
            if (hitbox.type == "none") {
              continue;
            }
            for (var playerHitbox of currentUser.hitboxes) {
              if (ShyFog.Client.collidesAABB({
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
                ShyFog.Client.onGround = true;
                break hitboxsearch;
              }
            }
          }
        }
      }
      // Coyote time to be able jump in the air for a quick time
      if (ShyFog.Client.wasOnGround && !ShyFog.Client.onGround) {
        ShyFog.Client.coyoteTime = performance.now();
      }
    } else {
      ShyFog.Client.onGround = true;
    }
    if (!ShyFog.Client.onGround && !ShyFog.Client.jumping) {
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
        if (!ShyFog.Client.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          continue;
        }
        for (var block of ShyFog.Client.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          if (!block) {
            continue;
          }
          for (var hitbox of ShyFog.Client.items[block.block]({}).hitboxes) {
            if (hitbox.type == "none") {
              continue;
            }
            for (var playerHitbox of currentUser.hitboxes) {
              if (ShyFog.Client.collidesAABB({
                "x": playerChunkPositionX.add(playerHitbox.x),
                "y": playerChunkPositionY.add(playerHitbox.y).add(1).sub(4 * ShyFog.Client.deltaTime),
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
        currentUser.y = new Big((playerChunkY * 16) + (foundCollision.chunkOffset[1] * 16) + foundCollision.block.y + foundCollision.hitbox.y + 1);
      } else {
        currentUser.y = currentUser.y.sub(4 * ShyFog.Client.deltaTime);
      }
      moved = true;
      playerChunkY = ShyFog.Client.bigToNumber(ShyFog.Client.bigFloor(currentUser.y.div(16)));
      playerChunkPositionY = currentUser.y.mod(16);
      if (playerChunkPositionY.lt(0)) {
        playerChunkPositionY = playerChunkPositionY.add(16);
      }
    }

    if (ShyFog.Client.chunks[`${playerChunkX},${playerChunkY},${playerChunkZ}`] && ShyFog.Client.holdingKeys.get("Space") && (ShyFog.Client.onGround || performance.now() - ShyFog.Client.coyoteTime <= 50) && !ShyFog.Client.jumping && performance.now() - ShyFog.Client.lastJump >= 150) {
      ShyFog.Client.jumping = true;
      ShyFog.Client.jumpedMotion = 0;
    }

    if (ShyFog.Client.jumping) {
      hitboxsearch:
      for (var chunkOffset of [
        [0, 0, 0],
        [-1, 0, 0],
        [1, 0, 0],
        [0, 1, 0],
        [-1, 1, 0],
        [1, 1, 0]
      ]) {
        if (!ShyFog.Client.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          continue;
        }
        for (var block of ShyFog.Client.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          if (!block) {
            continue;
          }
          for (var hitbox of ShyFog.Client.items[block.block]({}).hitboxes) {
            if (hitbox.type == "none") {
              continue;
            }
            for (var playerHitbox of currentUser.hitboxes) {
              if (ShyFog.Client.collidesAABB({
                "x": playerChunkPositionX.add(playerHitbox.x),
                "y": playerChunkPositionY.add(playerHitbox.y).add(1).add(7 * ShyFog.Client.deltaTime),
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
      if (currentUser.currentGUI) {
        ShyFog.Client.jumping = false;
      } else if (foundCollision) {
        currentUser.y = new Big((playerChunkY * 16) + (foundCollision.chunkOffset[1] * 16) + foundCollision.block.y - foundCollision.playerHitbox.height);
        ShyFog.Client.jumping = false;
        ShyFog.Client.lastJump = performance.now();
        moved = true;
        playerChunkY = ShyFog.Client.bigToNumber(ShyFog.Client.bigFloor(currentUser.y.div(16)));
        playerChunkPositionY = currentUser.y.mod(16);
        if (playerChunkPositionY.lt(0)) {
          playerChunkPositionY = playerChunkPositionY.add(16);
        }
      } else {
        currentUser.y = currentUser.y.add(7 * ShyFog.Client.deltaTime);
        ShyFog.Client.jumpedMotion += 7 * ShyFog.Client.deltaTime;
        if (ShyFog.Client.jumpedMotion >= currentUser.jumpHeight) {
          ShyFog.Client.jumping = false;
          ShyFog.Client.lastJump = performance.now();
        }
        moved = true;
        playerChunkY = ShyFog.Client.bigToNumber(ShyFog.Client.bigFloor(currentUser.y.div(16)));
        playerChunkPositionY = currentUser.y.mod(16);
        if (playerChunkPositionY.lt(0)) {
          playerChunkPositionY = playerChunkPositionY.add(16);
        }
      }
    }

    if (ShyFog.Client.chunks[`${playerChunkX},${playerChunkY},${playerChunkZ}`] && !currentUser.currentGUI && ShyFog.Client.holdingKeys.get("KeyA")) {
      var foundCollision = null;
      for (var chunkOffset of [
        [0, 0, 0],
        [-1, 0, 0],
        [0, -1, 0],
        [0, 1, 0],
        [-1, -1, 0],
        [-1, 1, 0]
      ]) {
        for (var block of ShyFog.Client.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          if (!block) {
            continue;
          }
          for (var hitbox of ShyFog.Client.items[block.block]({}).hitboxes) {
            if (hitbox.type == "none") {
              continue;
            }
            for (var playerHitbox of currentUser.hitboxes) {
              if (ShyFog.Client.collidesAABB({
                "x": playerChunkPositionX.add(playerHitbox.x).sub(playerSpeed),
                "y": playerChunkPositionY.add(playerHitbox.y).add(1),
                "width": new Big(playerHitbox.width),
                "height": new Big(playerHitbox.height)
              }, {
                "x": new Big((chunkOffset[0] * 16) + block.x + hitbox.x),
                "y": new Big((chunkOffset[1] * 16) + block.y + hitbox.y + 1),
                "width": new Big(hitbox.width),
                "height": new Big(hitbox.height)
              }) && (!foundCollision || (chunkOffset[0] * 16) + block.x + hitbox.x < (foundCollision.chunkOffset[0] * 16) + foundCollision.block.x + foundCollision.hitbox.x)) {
                foundCollision = { chunkOffset, block, hitbox, playerHitbox };
              }
            }
          }
        }
      }
      if (foundCollision) {
        currentUser.x = new Big((playerChunkX * 16) + (foundCollision.chunkOffset[0] * 16) + foundCollision.block.x + foundCollision.hitbox.x + foundCollision.playerHitbox.width + foundCollision.playerHitbox.x);
        moved = true;
      } else {
        currentUser.x = currentUser.x.sub(playerSpeed);
        moved = true;
      }
    }
    if (ShyFog.Client.chunks[`${playerChunkX},${playerChunkY},${playerChunkZ}`] && !currentUser.currentGUI && ShyFog.Client.holdingKeys.get("KeyD")) {
      var foundCollision = null;
      for (var chunkOffset of [
        [0, 0, 0],
        [1, 0, 0],
        [0, -1, 0],
        [0, 1, 0],
        [1, -1, 0],
        [1, 1, 0]
      ]) {
        for (var block of ShyFog.Client.chunks[`${playerChunkX + chunkOffset[0]},${playerChunkY + chunkOffset[1]},${playerChunkZ + chunkOffset[2]}`]) {
          if (!block) {
            continue;
          }
          for (var hitbox of ShyFog.Client.items[block.block]({}).hitboxes) {
            if (hitbox.type == "none") {
              continue;
            }
            for (var playerHitbox of currentUser.hitboxes) {
              if (ShyFog.Client.collidesAABB({
                "x": playerChunkPositionX.add(playerHitbox.x).add(playerSpeed),
                "y": playerChunkPositionY.add(playerHitbox.y).add(1),
                "width": new Big(playerHitbox.width),
                "height": new Big(playerHitbox.height)
              }, {
                "x": new Big((chunkOffset[0] * 16) + block.x + hitbox.x),
                "y": new Big((chunkOffset[1] * 16) + block.y + hitbox.y + 1),
                "width": new Big(hitbox.width),
                "height": new Big(hitbox.height)
              }) && (!foundCollision || (chunkOffset[0] * 16) + block.x + hitbox.x > (foundCollision.chunkOffset[0] * 16) + foundCollision.block.x + foundCollision.hitbox.x)) {
                foundCollision = { chunkOffset, block, hitbox, playerHitbox };
              }
            }
          }
        }
      }
      if (foundCollision) {
        currentUser.x = new Big((playerChunkX * 16) + (foundCollision.chunkOffset[0] * 16) + foundCollision.block.x + foundCollision.hitbox.x - foundCollision.playerHitbox.width - foundCollision.playerHitbox.x);
        moved = true;
      } else {
        currentUser.x = currentUser.x.add(playerSpeed);
        moved = true;
      }
    }
  }

  var direction = "none";
  if (ShyFog.Client.holdingKeys.get("KeyA") && !ShyFog.Client.holdingKeys.get("KeyD")) {
    direction = "left";
  }
  if (!ShyFog.Client.holdingKeys.get("KeyA") && ShyFog.Client.holdingKeys.get("KeyD")) {
    direction = "right";
  }
  if (moved || currentUser.direction != direction) {
    currentUser.direction = direction;
    ShyFog.Client.sendPacket(ShyFog.Client.PacketType.MOVEMENT, currentUser.x.toString(), currentUser.y.toString(), currentUser.z.toString(), direction);
  }
};