const fs = require("fs");
const path = require('path');
const copy = require('copy-template-dir')
const { exit } = require('process');
const { paths } = require("./utils");

// Entry point
const args = buildArgs();
executeCreation(args.targetRootDir, args.blocktypeTemplateDirName, args.blockname);


/**
 * Read the arguments and processes them for errors etc
 * @returns {Object} containing path to template and the name to set
 */
function buildArgs() {
	if (process.argv.length !== 4 || ['help', '-h', '--help'].includes(process.argv[2])) {
		console.log("Syntax: new-block [blocktype] [blockname]");
		console.log('Blocktypes: d(dynamic) dr(dynamic-react) sb(static-block) sc(shortcode)')
		console.log('blockname: any string that matches /^[0-9a-z-]+$/i');
		exit(0);
	}
	
	let blocktypeTemplateDirName;
	const blocktype = process.argv[2];
	switch (blocktype) {
		
		case 'sc' : blocktypeTemplateDirName = 'shortcode';           break;
		case 'sb' : blocktypeTemplateDirName = 'static-block';        break;
		case 'd'  : blocktypeTemplateDirName = 'dynamic-block';       break;
		case 'dr' : blocktypeTemplateDirName = 'dynamic-react-block'; break;
		
		default: console.log('Blocktype "' + blocktype + '" not found'); exit(0);
	}

	const blockname = process.argv[3];
	// wrong block name
	if (!blockname.match(/^[a-z]+[0-9a-z-]*$/)) {
		console.log("Block Name has to be lowercase kebab-case starting with a letter");
		exit(0);
	}

	return {
		targetRootDir: blocktypeTemplateDirName === 'shortcode' ? paths.shortcodes : paths.blocks,
		blocktypeTemplateDirName: blocktypeTemplateDirName.trim(), 
		blockname: blockname.trim()
	};
}

/**
 * Calls the correct creation function based on template
 */
async function executeCreation(targetRootDir, blocktypeTemplateDirName, blockname) {
	// already exist block
	if (fs.existsSync(path.join(targetRootDir, 'blocks', blockname))) {
		console.log("Block " + blockname + " already existing");
		exit(0);
	}
	
	const vars = { 
		blockname: blockname,
		blocknamePascal: kebabToPascal(blockname),
		blockname_underscore: blockname.replace(/-/g, '_'), 
	};

	// create files
	const files = await new Promise((r, j) => copy(
		path.join(paths.templates, blocktypeTemplateDirName),
		path.join(targetRootDir, 'blocks'),
		vars,
		(err, files) => err ? j(err) : r(files)
	));

	// call the correct import lines
	switch (blocktypeTemplateDirName) {
		case 'shortcode': createImportShortcode(blockname); break;
		default: createImportGutenberg(blockname); break;
	}

	files.forEach(filePath => console.log(`Created ${filePath}`));
	console.log("Finished");
}


/**
 * Adds the template to the shortcode directory
 * @param {string} blockname 
 */
async function createImportShortcode(blockname) {
	fs.appendFileSync(paths.shortcodesIndex, `require(plugin_dir_path(__FILE__).'blocks/${blockname}/${blockname}.php');\n`);
}


/**
 * Adds the template to the gutenberg directory
 * @param {string} blockname 
 */
async function createImportGutenberg(blockname) {
	// add imports to source code
	fs.appendFileSync(paths.blockTsIndex, `import './blocks/${blockname}/${blockname}';\n`)
	
	// add to php
	const rows = fs.readFileSync(paths.blockPhpIndex).toString().split("\n");
	for (let i = 0; i < rows.length; i++) {
		const match = rows[i].match(/(.*?)require(.*?)blocks\/.*?(\.php.*$)/);
		if (match) {
			console.log('matched');
			rows.splice(i, 0, `${match[1]}require${match[2]}blocks/${blockname}/${blockname}${match[3]}`);
			break;
		}
	}
	fs.writeFileSync(paths.blockPhpIndex, rows.join("\n"), 'utf8');
}


function kebabToPascal(str){
	str = str.split('-');
	for (let i = 0; i < str.length; i++) {
		str[i] = str[i].slice(0,1).toUpperCase() + str[i].slice(1,str[i].length);
	}
	return str.join('');
}
