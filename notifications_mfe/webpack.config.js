// Remote webpack config - notifications dashboard, served on :3005.
// See COMPREHENSIVE_GUIDE.md § 3.1.
const ModuleFederationPlugin = require('webpack').container.ModuleFederationPlugin;
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

module.exports = {
  mode: 'development',
  entry: './src/mount.tsx',
  devServer: {
    port: 3005,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': '*',
      'Access-Control-Allow-Headers': '*'
    },
    historyApiFallback: true
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js']
  },
  module: {
    rules: [
      // The only remote compiled with ts-loader; the others use babel-loader,
      // which strips types without checking them.
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    // REMOTE side of Module Federation (§ 3.1):
    //   name      -> the global the entry script defines (window.<name>) and
    //                the left half of the host's `remotes` entry;
    //   filename  -> served at http://<host>:<port>/remoteEntry.js;
    //   exposes   -> the only public modules; the key is concatenated to the
    //                remote name, so './mount' is imported as '<name>/mount'.
    //                Everything else in src/ stays private to this remote.
    //   shared    -> React must be a singleton, otherwise hooks break across
    //                the boundary (§ 3.5, § A.3).
    new ModuleFederationPlugin({
      name: 'notifications_mfe',
      filename: 'remoteEntry.js',
      exposes: {
        './mount': './src/mount.tsx'
      },
      // INCONSISTENT with the other remotes (§ 3.5): `eager: true` bundles the
      // shared deps into the entry instead of loading them through the share
      // scope, and styled-components is shared here only - at v5, while the
      // other remotes use v6. Hence the "several instances of
      // styled-components" console warning (§ 8).
      shared: {
        react: { singleton: true, eager: true },
        'react-dom': { singleton: true, eager: true },
        'styled-components': { singleton: true, eager: true }
      }
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'public', 'index.html')
    })
  ]
};