const ModuleFederationPlugin = require("webpack/lib/container/ModuleFederationPlugin");

const webpackConfig = {
  output: {
    publicPath: "auto",
  },
  optimization: {
    runtimeChunk: false,
  },
  experiments: {
    outputModule: true,
  },
  plugins: [
    new ModuleFederationPlugin({
      name: "mfe1",
      library: { type: "module" },
      filename: "remoteEntry.js",
      shared: ["@angular/core", "@angular/router", "@angular/common"],
    }),
  ],
};

console.log("\n\n==========WEBPACK CONFIG==========");
console.log(JSON.stringify(webpackConfig, null, 2));
console.log("==========WEBPACK CONFIG==========\n\n");

module.exports = webpackConfig;
