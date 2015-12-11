var webpack = require('webpack');
var packageJSON = require('./package.json');

function keyMirror(obj) {
    return Object.keys(obj).reduce(function(memo, key) {
        memo[key] = key;
        return memo;
    }, {});
}

module.exports = {
    context: __dirname,
    entry: {
        'index': './src/index'
    },
    output: {
        libraryTarget: 'commonjs2',
        path: __dirname,
        filename: '[name].js',
    },
    // these will not be built into the published module
    externals: keyMirror(packageJSON.dependencies),
    module: {
        loaders: [
            {
                test: /\.jsx?$/,
                exclude: /(node_modules|bower_components)/,
                loader: 'babel-loader'
            }
        ]
    },
    plugins: [
        new webpack.optimize.OccurrenceOrderPlugin(),
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.UglifyJsPlugin({comments: false}),
        new webpack.NoErrorsPlugin(),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: 'production'
            },
        })
    ]
};
