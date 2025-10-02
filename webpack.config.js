const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin'); 

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
          // Copy Service Worker
          from: path.resolve(__dirname, 'src/service-worker.js'),
          to: path.resolve(__dirname, 'docs/service-worker.js'),
        },
        {
          // Copy Manifest (sudah dikoreksi path sumbernya)
          from: path.resolve(__dirname, 'src/public/manifest.json'), 
          to: path.resolve(__dirname, 'docs/manifest.json'),
        },
        // CATATAN: Path icons telah dihapus karena menyebabkan "unable to locate" error.
        // Jika kamu ingin menyalin icons, pastikan kamu membuat folder src/public/icons terlebih dahulu.
      ],
    }),
  ],
};