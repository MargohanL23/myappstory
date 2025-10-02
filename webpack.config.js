const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin'); // <-- Import Copy Plugin

module.exports = {
  entry: "./src/scripts/app.js",
  output: {
    // Output ke folder 'docs/' sesuai kebutuhan GitHub Pages
    path: path.resolve(__dirname, "docs"), 
    filename: "bundle.js",
    clean: true,
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "docs"),
    },
    compress: true,
    port: 3000,
    open: true,
    // Menghindari 404 saat navigasi di dev
    historyApiFallback: {
      index: 'index.html',
    }
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
    }),
    
    // KRITIS: Menyalin aset statis (SW dan Manifest) ke folder docs/
    new CopyWebpackPlugin({
      patterns: [
        {
          // Service Worker biasanya di root src/
          from: path.resolve(__dirname, 'src/service-worker.js'),
          to: path.resolve(__dirname, 'docs/service-worker.js'),
        },
        {
          // PERBAIKAN: Menggunakan src/public/manifest.json sebagai sumber
          from: path.resolve(__dirname, 'src/public/manifest.json'), 
          to: path.resolve(__dirname, 'docs/manifest.json'),
        },
        // Path icons juga disesuaikan ke folder public/
        {
          from: path.resolve(__dirname, 'src/public/icons'),
          to: path.resolve(__dirname, 'docs/icons'),
        },
      ],
    }),
  ],
};