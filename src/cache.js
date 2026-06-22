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