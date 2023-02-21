const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
    mode: "development",
    entry: "/src/index.js",
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, 'dist')
    },
    resolve:{
        alias:{
            "@":path.resolve(__dirname,"src")
        }
    },
    devServer: {
        static: "./dist"
    },
    plugins: [new HtmlWebpackPlugin({
        title: "canvas"
    })],
    module: {
        rules: [{
            test: /\.(png|jpeg|jpg|gif|svg)$/i,
            type: "asset/resource"
        },{
            test: /\.css$/i,
            use: ["style-loader","css-loader"]
        }],
        
    }
}