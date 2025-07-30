const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  entry: './src/index.ts',
  mode: 'development',
  devtool: 'eval-source-map', // Enable proper source maps for debugging
  output: {
    publicPath: 'auto',
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
  },
  devServer: {
    port: 3000,
    historyApiFallback: true,
    static: path.join(__dirname, 'public'),
    
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: 'defaults' }],
                ['@babel/preset-react', { runtime: 'automatic' }],
                '@babel/preset-typescript'
              ],
              sourceMaps: true, // Enable source maps in Babel
              inputSourceMap: true, // Use input source maps
            },
          },
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { targets: 'defaults' }],
              ['@babel/preset-react', { runtime: 'automatic' }],
            ],
            sourceMaps: true, // Enable source maps in Babel
            inputSourceMap: true, // Use input source maps
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'container',
      remotes: {
        mfe_1: 'mfe_1@http://localhost:3001/remoteEntry.js',
        mfe_2: 'mfe_2@http://localhost:3002/remoteEntry.js',
        service_mfe: 'service_mfe@http://localhost:3003/remoteEntry.js',
        store_mfe: 'store_mfe@http://localhost:3004/remoteEntry.js',
        users_mfe: 'users_mfe@http://localhost:3005/remoteEntry.js'
      }
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};