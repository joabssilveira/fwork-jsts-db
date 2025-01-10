const path = require('path')

module.exports = {
  entry: './src/index.ts',
  output: {
    filename: 'index.js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: {
          loader: 'ts-loader',
          options: {
            logLevel: 'info'
          }
        },
        exclude: [
          /node_modules/,
          /test/,
          /dist/
        ],
        resolve: {
          extensions: ['.ts', '.tsx', '.js', '.json']
        },
      }
    ]
  },
  target: 'node'
}
