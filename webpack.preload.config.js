const path = require("path");

module.exports = {
  target: "electron-preload",
  entry: "./src/preload/preload.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: "ts-loader",
          options: {
            transpileOnly: true,
          },
        },
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "preload.js",
    path: path.resolve(__dirname, "dist/preload"),
  },
  mode: "production",
  node: {
    __dirname: false,
    __filename: false,
  },
};
