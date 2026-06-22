var fs = require("fs");
var babel = require("@babel/core");

if (!fs.existsSync("public/textures")) {
  // TODO: Download textures
}

// Bundle all files together
var bundle = fs.readFileSync("src/main.js").toString("utf-8");
for (var file of fs.readdirSync("src")) {
  if (file == "main.js") {
    continue;
  }
  bundle += `\n${fs.readFileSync(`src/${file}`).toString("utf-8")}`;
}

// Minify
var minified = babel.transformSync(bundle, {
  "presets": ["minify"],
  "comments": false
}).code;

for (var file of fs.readdirSync("lib")) {
  minified += `\n${fs.readFileSync(`lib/${file}`).toString("utf-8")}`;
}

// Save the result
fs.writeFileSync("public/shyfog.js", minified);