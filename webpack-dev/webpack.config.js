const path = require('path')
class P {
    apply(compiler) {
        console.log('mock P plugin')
        compiler.hooks.emit.tap('emit', function () {
            console.log('emit')
        })
    }
}
class P1 {
    apply(compiler) {
        console.log('mock P1 plugin')
        compiler.hooks.afterPlugins.tap('emit', function () {
            console.log('afterPlugins')
        })
    }
}
module.exports = {
    mode: 'development',
    entry: './src/index.js',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist')
    },
    module: {
        rules: [
            {
                test: /\.less$/,
                use: [
                    path.resolve(__dirname, 'loader', 'style-loader'),
                    path.resolve(__dirname, 'loader', 'less-loader')
                ]
            }
        ]
    },
    plugins: [
        new P(),
        new P1()
    ]
}