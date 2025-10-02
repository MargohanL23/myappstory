const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin'); 

module.exports = {
  entry: "./src/scripts/app.js",
  output: {
    // KRITIS: Menentukan publicPath agar semua aset yang di-link (JS/CSS) 
    // menggunakan base path repo '/myappstory/'
    publicPath: '/myappstory/', 
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
      // Pastikan injection diaktifkan
      inject: true, 
    }),
    
    new CopyWebpackPlugin({
      patterns: [
        {
          // Copy Service Worker
          from: path.resolve(__dirname, 'src/service-worker.js'),
          to: path.resolve(__dirname, 'docs/service-worker.js'),
        },
        {
          // Copy Manifest (path sumber sudah dikoreksi)
          from: path.resolve(__dirname, 'src/public/manifest.json'), 
          to: path.resolve(__dirname, 'docs/manifest.json'),
        },
      ],
    }),
  ],
};
