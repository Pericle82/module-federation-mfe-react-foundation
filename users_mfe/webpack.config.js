const path = require('path');
const { ModuleFederationPlugin } = require('webpack').container;

module.exports = {
  entry: './src/mount.tsx',
  mode: 'development',
  devtool: 'eval-source-map', // Enable proper source maps for debugging
  output: {
    publicPath: 'auto',
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|js)x?$/i,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              '@babel/preset-react',
              '@babel/preset-typescript',
            ],
            plugins: ['@babel/plugin-transform-runtime'],
            sourceMaps: true, // Enable source maps in Babel
            inputSourceMap: true, // Use input source maps
          },
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new ModuleFederationPlugin({
      name: 'users_mfe',
      filename: 'remoteEntry.js',
      exposes: {
        './mount': './src/mount.tsx',
      },
      shared: {
        react: { singleton: true },
        'react-dom': { singleton: true },
      },
    }),
  ],
  devServer: {
    port: 3005,
    hot: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
};
