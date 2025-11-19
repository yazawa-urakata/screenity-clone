// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = "production";
process.env.NODE_ENV = "production";
process.env.ASSET_PATH = "/";

var webpack = require("webpack"),
  config = require("../webpack.config");

//delete config.chromeExtensionBoilerplate;
delete config.custom;

config.mode = "production";

webpack(config, (err, stats) => {
  if (err) {
    console.error("Webpack compilation error:", err);
    throw err;
  }

  if (stats.hasErrors()) {
    console.error("Webpack compilation errors:");
    const info = stats.toJson();
    info.errors.forEach(error => console.error(error));
    process.exit(1);
  }

  console.log("Production build completed successfully!");
  console.log("Output path:", stats.compilation.outputOptions.path);
  console.log("Assets created:", Object.keys(stats.compilation.assets).length);
});
