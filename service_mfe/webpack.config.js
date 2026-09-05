// Remote webpack config - headless data layer + event bus, served on :3003.
// See COMPREHENSIVE_GUIDE.md § 3.1.
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
      name: 'service_mfe',
      filename: 'remoteEntry.js',
      exposes: {
        './mount': './src/mount.tsx',
      },
      shared: {
        react: { singleton: true, eager: false, requiredVersion: '^18.2.0' },
        'react-dom': { singleton: true, eager: false, requiredVersion: '^18.2.0' },
      },
    }),
  ],
};
