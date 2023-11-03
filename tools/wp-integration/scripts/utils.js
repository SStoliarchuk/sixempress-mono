const fs = require("fs");
const path = require('path');

// TODO remove this project line and pass params from the build script
const project = require('../../../apps/wordpress/sxmp-external-sync/project.json');
const rootPath = path.join(__dirname, '..', '..', '..');
const srcPath = path.resolve(path.join(rootPath, project.sourceRoot));

const paths = {
	root           : rootPath,
	vendor         : path.resolve(rootPath, 'vendor'),
	src            : srcPath,
	// build          : project.targets.build.options.outputPath,
	templates      : path.join(__dirname, '..', 'templates'),
	
	blocks         : path.resolve(path.join(srcPath, 'gutenberg')),
	blockPhpIndex  : path.resolve(path.join(srcPath, 'gutenberg', 'index.php')),
	blockTsIndex   : path.resolve(path.join(srcPath, 'gutenberg', 'index.ts')),
	
	shortcodes     : path.resolve(path.join(srcPath, 'shortcodes')),
	shortcodesIndex: path.resolve(path.join(srcPath, 'shortcodes', 'index.php')),
};

/**
 * Returns an array of absolute filepaths of file names that matches the given regex
 * 
 * @param {string} startDir The path where to find for the specific filter
 * @param {RegExp} regex The filter that should be matched by the file
 * @returns {Array<string>}
 */
function findFilePath(startDir, regex) {
	if (!fs.existsSync(startDir)){
		console.log("Directory not existent: " + startDir);
		return [];
	}

	const toR = [];

	const files = fs.readdirSync(startDir);
	for (const f of files) {
		const filepath = path.join(startDir, f);
		const stat = fs.lstatSync(filepath);
		
		if (stat.isDirectory()) {
			const sub = findFilePath(filepath, regex);
			if (sub) { toR.push(...sub); }
		}
		else if (f.match(regex)) {
			toR.push(filepath);
		}
	}

	return toR;
}

function copyFolderSync(srcDir, destDir, whiteListRegexs) {
	for (const regex of whiteListRegexs) {
		for (const f of findFilePath(srcDir, regex)) {
				
			const treeToBuild = f.replace(srcDir, '');
			const folderStructure = path.join(destDir, path.dirname(treeToBuild));
			
			fs.mkdirSync(folderStructure, {recursive: true});
			fs.copyFileSync(f, path.join(folderStructure, path.basename(treeToBuild)));
		}
	}
}

module.exports = {
	paths,
	findFilePath,
	copyFolderSync,
}
