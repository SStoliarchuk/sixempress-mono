const { ProgressPlugin } = require("webpack");
const ExtraWatchWebpackPlugin = require('extra-watch-webpack-plugin');
const fs = require("fs");
const path = require('path');
const utils = require("../../../tools/wp-integration/scripts/utils");
const sass = require('node-sass');
const _LiveReloadPlugin = require( 'webpack-livereload-plugin' );
const crypto = require('crypto');

class LiveReloadPlugin extends _LiveReloadPlugin {
  _afterEmit(compilation) {
		return super._afterEmit({...compilation, hash: Math.random().toString()});
	}
}

function getWebpackConfig(config, context) {
	const ctx = context.options || context.buildOptions;
	const ovr = overrideWebpack(config, ctx);
	return ovr;
}
exports.getWebpackConfig = getWebpackConfig;
module.exports = getWebpackConfig;

function overrideWebpack(conf, ctx) {
	conf.entry = {
		index: conf.entry.main[0]
	};
	conf.output = {
		path: conf.output.path,
		filename: '[name].js',
	};

	ExtraWatchWebpackPlugin.defaults.cwd = __dirname;
	let additionalBuildTriggered = false;

	conf.plugins = [
		...conf.plugins,

		new ExtraWatchWebpackPlugin({
			files: ['src/**/*.php', 'src/**/*.svg', 'src/**/*.sass', 'src/**/*.scss', 'src/**/*.css'],
		}),

		/** add php to the build folder */
		new ProgressPlugin((percentage, msg) => {
			if (!additionalBuildTriggered) {
				additionalBuildTriggered = true;
				const src = path.join(ctx.root, ctx.sourceRoot);
				const dist = ctx.outputPath;
				additionalBuild(src, dist);
			}

			// percentage 0 = PRE HOOK
			// percentage 1 = POST HOOK
			if (percentage === 1)
				additionalBuildTriggered = false;
		}),
	];

	/** Live reload for development */
	if (ctx.watch)
		conf.plugins.push(
			new LiveReloadPlugin( {
				port: +ctx.liveReloadPort || 35729,
				cert: ctx.sslCert && fs.readFileSync(ctx.sslCert, 'utf-8'),
				key: ctx.sslKey && fs.readFileSync(ctx.sslKey, 'utf-8'),
				protocol: ctx.ssl ? 'https' : 'http',
			} ),
		);

	return conf;
}

function additionalBuild(srcPath, distPath) {
	console.log("Additional Build step");

	utils.copyFolderSync(srcPath, distPath, [/\.php$/, /\.svg$/, /\.css$/]);
	utils.copyFolderSync(utils.paths.vendor, path.join(distPath, 'vendor'), [/./]);

	// build sass
	const sassRgx = /\.s[ac]ss$/;
	for (const source of utils.findFilePath(srcPath, sassRgx)) {
		const dest = source.replace(srcPath, distPath).replace(sassRgx, '.css');

		// 
		// compile
		//
		const r = sass.renderSync({file: source, outFile: dest, compressed: 'compact'});
		fs.writeFileSync(dest, r.css);
		if (r.map)
			fs.writeFileSync(dest + '.map', r.map.toString())

		//
		// // TODO add postcss ?
		//
		// const autoprefixer = require('autoprefixer')
		// const postcss = require('postcss')
		// const postcssNested = require('postcss-nested')
		
		// const post = postcss([autoprefixer, postcssNested]).process(css, { from: dest, to: dest });
		// fs.writeFileSync(dest, post.css);
		// if ( post.map ) {
		// 	fs.writeFile(dest + '.map', post.map.toString());

		//
		// create version hash
		//
		const fileBuffer = fs.readFileSync(dest);
		const hex = crypto.createHash('md5').update(fileBuffer).digest('hex');

		fs.writeFileSync(dest.replace('.css', '.asset.php'), "<?php return array('dependencies' => array(), 'version' => '" + hex + "');")
	}
}


