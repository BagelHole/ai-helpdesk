const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  mode: process.env.NODE_ENV || "development",
  entry: "./src/renderer/index.tsx",
  target: "electron-renderer",
  devtool: "source-map",
  devServer: {
    static: {
      directory: path.join(__dirname, "dist/renderer"),
    },
    port: 3000,
    hot: true,
    historyApiFallback: true,
  },
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
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
      {
        test: /\.(png|jpe?g|gif|svg|ico)$/i,
        type: "asset/resource",
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@renderer": path.resolve(__dirname, "src/renderer"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  output: {
    filename: "renderer.js",
    path: path.resolve(__dirname, "dist/renderer"),
    clean: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/renderer/index.html",
      filename: "index.html",
    }),
  ],
};
