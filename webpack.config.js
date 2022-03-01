const path = require('path');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack')
module.exports = {
    resolve: {
        fallback: {
            "fs": false,
            "tls": false,
            "net": false,
            "path": false,
            "zlib": false,
            "http": false,
            "https": false,
            "stream": false,
            "url": false,
            "assert": false,
            "crypto": false,
            "querystring": false,
            "buffer": false,
            "zlib": false
        },
        alias: {
            stream: require.resolve('stream-browserify'),
            zlib: require.resolve('browserify-zlib')
          }
    },
    mode: 'development',
    entry: {
        main: path.resolve(__dirname, 'src/app.js')
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'app.[contenthash].js',
        clean: true
    },
    devtool: 'inline-source-map',
    devServer: {
        //contentBase: path.resolve(__dirname, 'dist'),
        open: false
    },
    module: {
        rules: [
            {
                test: /\.(png|jpe?g|gif)$/i,
                use: [
                    {
                        loader: 'file-loader',
                    },
                ],
            },
        ]
    },
    plugins: [
        new webpack.ProvidePlugin({
            process: 'process/browser',
          }),
        new HTMLWebpackPlugin({
            title: 'Mesh Tiles',
            filename: 'index.html',
            template: path.resolve(__dirname, 'src/template.html'),

        })
    ]
}