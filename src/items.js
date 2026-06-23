// This file defines every single item and block in the game

// Simple full-block hitbox
const SIMPLE_HITBOX = [{
  "x": 0,
  "y": 0,
  "width": 1,
  "height": 1,
  "rotation": 0
}];

// Utilities for registering common types of blocks
function registerSimpleSolidBlock(id, texture) {
  game.items[id] = {
    "texture": () => ({
      "file": texture
    }),
    "hitboxes": SIMPLE_HITBOX
  };
}

function registerGrass(id, texture) {
  game.items[id] = {
    "texture": ({ biome }) => ({
      "file": grassTint(id, texture, biome)
    }),
    "hitboxes": []
  };
}

function registerFlower(id, texture) {
  game.items[id] = {
    "texture": () => ({
      "file": texture
    }),
    "hitboxes": []
  };
}

function registerLeaves(id, texture) {
  game.items[id] = {
    "texture": ({ biome }) => ({
      "file": leavesTint(id, texture, biome)
    }),
    "hitboxes": SIMPLE_HITBOX
  };
}

game.items = {};

// General terrain blocks
registerSimpleSolidBlock("shyfog:stone", "/block/stone.png");
registerSimpleSolidBlock("shyfog:cobblestone", "/block/cobblestone.png");
registerSimpleSolidBlock("shyfog:deepslate", "/block/deepslate.png");
registerSimpleSolidBlock("shyfog:dirt", "/block/dirt.png");
registerSimpleSolidBlock("shyfog:grass_block", "/block/grass_block_side.png");
registerSimpleSolidBlock("shyfog:bedrock", "/block/bedrock.png");
registerSimpleSolidBlock("shyfog:sand", "/block/sand.png");
registerSimpleSolidBlock("shyfog:sandstone", "/block/sandstone.png");
registerSimpleSolidBlock("shyfog:obsidian", "/block/obsidian.png");

// Grass
registerGrass("shyfog:short_grass", "/block/short_grass.png");
registerGrass("shyfog:tall_grass_top", "/block/tall_grass_top.png");
registerGrass("shyfog:tall_grass_bottom", "/block/tall_grass_bottom.png");

// Flowers
registerFlower("shyfog:dandelion", "/block/dandelion.png");
registerFlower("shyfog:poppy", "/block/poppy.png");
registerFlower("shyfog:blue_orchid", "/block/blue_orchid.png");
registerFlower("shyfog:allium", "/block/allium.png");
registerFlower("shyfog:azure_bluet", "/block/azure_bluet.png");
registerFlower("shyfog:white_tulip", "/block/white_tulip.png");
registerFlower("shyfog:red_tulip", "/block/red_tulip.png");
registerFlower("shyfog:pink_tulip", "/block/pink_tulip.png");
registerFlower("shyfog:orange_tulip", "/block/orange_tulip.png");
registerFlower("shyfog:oxeye_daisy", "/block/oxeye_daisy.png");
registerFlower("shyfog:cornflower", "/block/cornflower.png");

// Trees
registerSimpleSolidBlock("shyfog:oak_log", "/block/oak_log.png");
registerLeaves("shyfog:oak_leaves", "/block/oak_leaves.png");

// Ores
registerSimpleSolidBlock("shyfog:coal_ore", "/block/coal_ore.png");
registerSimpleSolidBlock("shyfog:copper_ore", "/block/copper_ore.png");
registerSimpleSolidBlock("shyfog:iron_ore", "/block/iron_ore.png");
registerSimpleSolidBlock("shyfog:lapis_ore", "/block/lapis_ore.png");
registerSimpleSolidBlock("shyfog:redstone_ore", "/block/redstone_ore.png");
registerSimpleSolidBlock("shyfog:gold_ore", "/block/gold_ore.png");
registerSimpleSolidBlock("shyfog:diamond_ore", "/block/diamond_ore.png");
registerSimpleSolidBlock("shyfog:emerald_ore", "/block/emerald_ore.png");

registerSimpleSolidBlock("shyfog:deepslate_coal_ore", "/block/deepslate_coal_ore.png");
registerSimpleSolidBlock("shyfog:deepslate_copper_ore", "/block/deepslate_copper_ore.png");
registerSimpleSolidBlock("shyfog:deepslate_iron_ore", "/block/deepslate_iron_ore.png");
registerSimpleSolidBlock("shyfog:deepslate_lapis_ore", "/block/deepslate_lapis_ore.png");
registerSimpleSolidBlock("shyfog:deepslate_redstone_ore", "/block/deepslate_redstone_ore.png");
registerSimpleSolidBlock("shyfog:deepslate_gold_ore", "/block/deepslate_gold_ore.png");
registerSimpleSolidBlock("shyfog:deepslate_diamond_ore", "/block/deepslate_diamond_ore.png");
registerSimpleSolidBlock("shyfog:deepslate_emerald_ore", "/block/deepslate_emerald_ore.png");

// Other
registerSimpleSolidBlock("shyfog:cactus", "/block/cactus_side.png");