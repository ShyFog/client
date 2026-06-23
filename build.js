var fs = require("fs");
var babel = require("@babel/core");
var admZip = require("adm-zip");

const texturesUrl = "https://github.com/ShyFog/client/releases/download/textures/textures.zip";

(async () => {
  if (!fs.existsSync("public/textures")) {
    fs.writeFileSync("textures.zip", Buffer.from(await fetch(texturesUrl).then(res => res.arrayBuffer())));
    var zip = new admZip("textures.zip");
    zip.extractAllTo("public", true);  
    fs.unlinkSync("textures.zip");
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
  }).code.split("\n").join("\\n");

  for (var file of fs.readdirSync("lib")) {
    minified += `\n${fs.readFileSync(`lib/${file}`).toString("utf-8")}`;
  }

  // Save the result
  fs.writeFileSync("public/shyfog.js", minified);
})();
