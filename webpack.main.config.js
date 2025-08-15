const path = require("path");

module.exports = {
  mode: process.env.NODE_ENV || "development",
  entry: "./src/main/main.ts",
  target: "electron-main",
  devtool: "source-map",
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
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@main": path.resolve(__dirname, "src/main"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist/main"),
    clean: true,
  },
  node: {
    __dirname: false,
    __filename: false,
  },
  externals: {
    sqlite3: "commonjs sqlite3",
  },
};
