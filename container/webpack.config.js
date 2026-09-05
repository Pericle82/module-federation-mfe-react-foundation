// Host webpack config - the container app on :3000 (port set by the npm start
// script, not here). See COMPREHENSIVE_GUIDE.md § 3.
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  entry: './src/index.ts',
  mode: 'development',
  devtool: 'eval-source-map', // Enable proper source maps for debugging
  output: {
    // 'auto' makes webpack derive the chunk base URL at runtime from the script
    // that loaded it. Mandatory in a federated setup (§ 3.1): otherwise a
    // remote's secondary chunks would be requested from the page's origin.
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
      // HOST side of Module Federation (§ 3.1). No `exposes` - the container
      // publishes nothing - and no `shared`, which is why the host ends up on
      // its own React instance, separate from the one the five remotes share
      // (§ 3.5, § 8). Harmless today because nothing React-shaped crosses the
      // boundary; the fix, when it stops being true, is to add the same
      // `shared` block the remotes declare.
      name: 'container', // Force reload
      // Each entry reads as  <local prefix>: '<remote name>@<remoteEntry URL>'.
      // The prefix is what appears in import('mfe_1/mount'); the remote name is
      // the global the remote's entry script defines (window.mfe_1).
      // Adding a remote means touching this map, moduleLoader.ts and
      // remotes.d.ts - all three, by hand (§ 3.4).
      remotes: {
        mfe_1: 'mfe_1@http://localhost:3001/remoteEntry.js',
        mfe_2: 'mfe_2@http://localhost:3002/remoteEntry.js',
        service_mfe: 'service_mfe@http://localhost:3003/remoteEntry.js',
        users_mfe: 'users_mfe@http://localhost:3004/remoteEntry.js',
        notifications_mfe: 'notifications_mfe@http://localhost:3005/remoteEntry.js'
      }
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
  ],
};