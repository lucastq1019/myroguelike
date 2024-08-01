const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin')
module.exports = {
    mode: "development",
    entry: "/src/index.ts",
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname, 'dist')
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src")
        },
        extensions: ['.ts', '.tsx', '.js', '.jsx','json'],
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
            type: "asset/resource",
            generator: {
                filename: '[name][ext]'
            }
        }, {
            test: /\.css$/i,
            use: ["style-loader", "css-loader"]
        }, {
            test: /\.(ts|tsx)$/,
            exclude: /node_modules/,
            use: [
                {
                    loader: 'ts-loader',
                    options: {
                        transpileOnly: true, // 可选，仅进行转译而不执行类型检查，提高构建速度。若需要类型检查，去掉此选项或设为 false
                        configFile: 'tsconfig.json', // 可选，指定 tsconfig.json 文件路径。默认为项目根目录下的 tsconfig.json
                    },
                },
            ],
        },],

    }
}