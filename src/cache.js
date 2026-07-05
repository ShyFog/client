// Optimization: Texture caching

game.texturesCache = new Map;

function hasTexture(file) {
  return game.texturesCache.has(file);
}

function getTexture(file) {
  if (!hasTexture(file)) {
    game.texturesCache.set(file, new Image);
    game.texturesCache.get(file).src = `textures${file}`;
  }
  return game.texturesCache.get(file);
}

function saveTexture(file, source) {
  game.texturesCache.set(file, new Image);
  game.texturesCache.get(file).src = source;
}

// Pre-cache destroy stages
getTexture("/block/destroy_stage_0.png");
getTexture("/block/destroy_stage_1.png");
getTexture("/block/destroy_stage_2.png");
getTexture("/block/destroy_stage_3.png");
getTexture("/block/destroy_stage_4.png");
getTexture("/block/destroy_stage_5.png");
getTexture("/block/destroy_stage_6.png");
getTexture("/block/destroy_stage_7.png");
getTexture("/block/destroy_stage_8.png");
getTexture("/block/destroy_stage_9.png");