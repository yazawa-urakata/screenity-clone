import type { KnipConfig } from 'knip';

const config: KnipConfig = {
    entry: [
        'src/pages/**/index.{ts,tsx,js,jsx}',
        'src/assets/**/*',
        'utils/*.js',
        'webpack.config.js',
    ],
    project: ['src/**/*.{ts,tsx,js,jsx}'],
    ignore: ['src/assets/**/*'],
    ignoreDependencies: [
        'sass-loader',
        'style-loader',
        'css-loader',
        'babel-loader',
        'ts-loader',
        'html-loader',
        'source-map-loader',
        'terser-webpack-plugin',
        'copy-webpack-plugin',
        'clean-webpack-plugin',
        'html-webpack-plugin',
        'patch-package',
        'cross-env',
        'webpack-cli',
        'webpack-dev-server',
        '@babel/core',
        '@babel/preset-env',
        '@babel/preset-react',
        '@babel/plugin-transform-runtime',
        '@babel/plugin-transform-react-jsx',
        '@types/chrome',
        '@types/react',
        '@types/react-dom',
        'eslint',
        'prettier',
        'typescript',
    ],
};

export default config;
