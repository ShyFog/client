// Optimization: Texture caching
ShyFog.Client.defaultValues.texturesCache = new Map;
ShyFog.Client.resetState();

ShyFog.Client.hasTexture = file => {
  return ShyFog.Client.texturesCache.has(file);
};

ShyFog.Client.getTexture = file => {
  if (!ShyFog.Client.hasTexture(file)) {
    ShyFog.Client.texturesCache.set(file, new Image);
    ShyFog.Client.texturesCache.get(file).src = `textures${file}`;
  }
  return ShyFog.Client.texturesCache.get(file);
};

ShyFog.Client.saveTexture = (file, source) => {
  ShyFog.Client.log("INFO", `Creating dynamic texture ${file}`);
  ShyFog.Client.texturesCache.set(file, new Image);
  ShyFog.Client.texturesCache.get(file).src = source;
};

// Pre-cache destroy stages
ShyFog.Client.getTexture("/block/destroy_stage_0.png");
ShyFog.Client.getTexture("/block/destroy_stage_1.png");
ShyFog.Client.getTexture("/block/destroy_stage_2.png");
ShyFog.Client.getTexture("/block/destroy_stage_3.png");
ShyFog.Client.getTexture("/block/destroy_stage_4.png");
ShyFog.Client.getTexture("/block/destroy_stage_5.png");
ShyFog.Client.getTexture("/block/destroy_stage_6.png");
ShyFog.Client.getTexture("/block/destroy_stage_7.png");
ShyFog.Client.getTexture("/block/destroy_stage_8.png");
ShyFog.Client.getTexture("/block/destroy_stage_9.png");