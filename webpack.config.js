const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: "./src/scripts/app.js",
    output: {
      publicPath: isProduction ? '/myappstory/' : '/', 
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
      hot: false, 
      liveReload: false, 
      historyApiFallback: true,
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ["style-loader", "css-loader"],
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif)$/i,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./src/index.html",
        filename: "index.html",
        inject: true,
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'src/service-worker.js'),
            to: path.resolve(__dirname, 'docs/service-worker.js'),
          },
          {
            from: path.resolve(__dirname, 'src/public/manifest.json'),
            to: path.resolve(__dirname, 'docs/manifest.json'),
          },
          {
            from: path.resolve(__dirname, 'src/public/icons'),
            to: path.resolve(__dirname, 'docs/icons'),
          },
        ],
      }),
    ],
  };
};