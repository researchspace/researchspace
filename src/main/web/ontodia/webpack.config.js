const path = require('path');

// if BUNDLE_PEERS is set, we'll produce bundle with all dependencies
const BUNDLE_PEERS = Boolean(process.env.BUNDLE_PEERS);

module.exports = {
    mode: 'production',
    entry: './src/ontodia/index.ts',
    resolve: {
        extensions: ['.ts', '.tsx', '.js'],
    },
    module: {
        rules: [
            {test: /\.ts$|\.tsx$/, use: ['ts-loader']},
            {test: /\.css$/, use: ['style-loader', 'css-loader']},
            {test: /\.scss$/, use: ['style-loader', 'css-loader', 'sass-loader']},
            {
                test: /\.(jpe?g|gif|png|svg)$/,
                use: [{loader: 'url-loader'}],
            },
            {test: /\.ttl$/, use: ['raw-loader']},
        ]
    },
    output: {
        path: path.join(__dirname, 'dist'),
        filename: (
            BUNDLE_PEERS ? 'ontodia-full.min.js' : 'ontodia.js'
        ),
        library: 'Ontodia',
        libraryTarget: 'umd',
    },
    devtool: 'source-map',
    externals: [
        'd3-color',
        'file-saverjs',
        'lodash',
        'n3',
        'rdf-ext',
        'react',
        'react-dom',
        'webcola',
    ],
    performance: {
        maxEntrypointSize: 2048000,
        maxAssetSize: 2048000,
    },
};
