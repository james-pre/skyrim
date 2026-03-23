#!/usr/bin/env node
import { decodeBlock } from 'lz4';
import { isStructInstance, sizeof, type StructInstance } from 'memium';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs, styleText, type InspectColor } from 'node:util';
import { dumpTable as dumpGlobalDataTable } from './global_data.js';
import { CompressionType, PlayerSex, SaveFile, SaveFileRest } from './structs.js';
import { getDate, wstring, wstring_le } from './util_structs.js';
import { num, str, bytes } from './format.js';

const {
	positionals: [saveFilePath],
	values: opts,
} = parseArgs({
	options: {
		verbose: { type: 'boolean', short: 'v', default: false },
		help: { type: 'boolean', short: 'h', default: false },
		debug: { type: 'boolean', default: false },

		// export
		exportDecompressed: { type: 'string' },

		// output
		header: { type: 'boolean', short: 'H', default: false },
		plugins: { type: 'boolean', short: 'P', default: false },
		light: { type: 'boolean', short: 'L', default: false },
		locationTable: { type: 'boolean', short: 'F', default: false },
		globals: { type: 'boolean', short: 'G', default: false },
		changeForms: { type: 'boolean', short: 'C', default: false },
		formIDs: { type: 'boolean', short: 'I', default: false },
		all: { type: 'boolean', short: 'a', default: false },
	},
	allowPositionals: true,
});

if (opts.help || !saveFilePath) {
	console.log(`Usage: ${process.argv0} [options] <savefile>
Options:
    -v, --verbose    Enable verbose output
    -h, --help       Show this help message
    --debug          Enable debug output

Export Options:
    --exportDecompressed <path>  Export decompressed data

Output:
    -H, --header           Show header (and some other metadata)
    -P, --plugins          Show plugin list
    -L, --light            Show light plugin info (SE only)
    -F, --locationTable    Show file location table
    -G, --globals          Show global data
    -I, --formIDs          Show form ID array
    -a, --all              Show all entries
`);
	process.exit(0);
}

function __maybeStyle(style: InspectColor | readonly InspectColor[], ...args: any[]) {
	return args.map((a) => (typeof a == 'string' ? styleText(style, a) : a));
}

function debug(...args: any[]) {
	if (!opts.debug) return;
	console.debug(...__maybeStyle('dim', '[debug]', ...args));
}

function exit(...error: any[]) {
	console.error(...__maybeStyle('red', ...error));
	process.exit(1);
}

const decoder = new TextDecoder();

function dumpStruct<T extends {}>(struct: StructInstance<T>, depth: number = 0) {
	depth++;
	const indent = ' '.repeat(depth * 4);
	for (const { name } of struct.constructor.fields) {
		process.stdout.write(indent + name + ': ');
		const value = struct[name];
		if (value instanceof wstring || value instanceof wstring_le) {
			console.log(`${value.constructor.name} "${decoder.decode(value.data)}"`);
		} else if (isStructInstance(struct[name])) {
			console.log();
			dumpStruct(struct[name], depth);
		} else console.log(name == 'magic' ? magic : struct[name]);
	}
}

const fileData = readFileSync(saveFilePath);
const saveFile = new SaveFile(fileData.buffer, fileData.byteOffset, fileData.byteLength);

const magic = decoder.decode(saveFile.magic);
console.log('Magic:', magic);

if (magic != 'TESV_SAVEGAME') exit('Invalid magic');

const hd = saveFile.header;
if (opts.all || opts.header) {
	console.log(`Header:
	version ${num(hd.version)}
	save #${num(hd.saveNumber)}
	player: ${str(hd.playerName)}
		level: ${num(hd.playerLevel)} (${num(hd.playerCurExp)}/${num(hd.playerLvlUpExp)})
		location: ${str(hd.playerLocation)}
		race: ${str(hd.playerRaceEditorId)}
		sex: ${PlayerSex[hd.playerSex]}
	game date: ${str(hd.gameDate)}
	save date: ${getDate(hd.filetime).toLocaleString()}
	screenshot: ${num(hd.shotWidth)}x${num(hd.shotHeight)} (${bytes(hd.shotWidth * hd.shotHeight * 4)})
Compression: ${CompressionType[hd.compressionType]}, ${bytes(saveFile.compressedLen)} compressed, ${bytes(saveFile.uncompressedLen)} uncompressed`);
}

let restData: Buffer<ArrayBufferLike> = fileData.subarray(sizeof(saveFile));
if (hd.compressionType == CompressionType.LZ4) {
	const output = Buffer.alloc(saveFile.uncompressedLen);
	decodeBlock(restData, output);
	restData = output;
}
const rest = new SaveFileRest(restData.buffer, restData.byteOffset, restData.byteLength);

if (opts.exportDecompressed) writeFileSync(opts.exportDecompressed, restData);

if (opts.all || opts.header) {
	console.log('Form version:', num(rest.formVersion));
}

if (opts.all || opts.plugins) {
	const { plugins, pluginCount } = rest.pluginInfo;
	console.log(`Plugins (${pluginCount}):`, Array.from(plugins).map(str).join(', '));
}

if (opts.all || opts.light) {
	const { plugins, pluginCount } = rest.lightPluginInfo;
	console.log(`Light Plugins (${pluginCount}):`, Array.from(plugins).map(str).join(', '));
}

if (opts.all || opts.locationTable) {
	const table = rest.fileLocationTable;
	console.log(`File Location Table:
	form ID array count offset: ${num(table.formIDArrayCountOffset, 16)}
	unknown table 3 offset: ${num(table.unknownTable3Offset, 16)}
	change forms: ${num(table.changeFormCount)} items at ${num(table.changeFormsOffset, 16)}`);

	const tables = [
		[table.globalDataTable1Count, table.globalDataTable1Offset],
		[table.globalDataTable2Count, table.globalDataTable2Offset],
		[table.globalDataTable3Count, table.globalDataTable3Offset],
	] as const;

	let countLength = 0,
		offsetLength = 0;
	for (const [count, offset] of tables) {
		countLength = Math.max(countLength, num(count).length);
		offsetLength = Math.max(offsetLength, num(offset, 16).length);
	}

	for (const [i, [count, offset]] of tables.entries()) {
		console.log(`\tglobal data table #${i + 1}: ${num(count).padStart(countLength)} items at ${num(offset, 16).padStart(offsetLength)}`);
	}
}

if (opts.all || opts.changeForms) {
	console.log(
		'Change Forms:',
		Object.entries(Object.groupBy(rest.changeForms, (cf) => cf.summary(rest.formVersion)))
			.map(([summary, forms = []]) => `${num(forms.length)} ${summary}`)
			.join(', ')
	);
}

if (opts.all || opts.globals) {
	console.log('Global Data Table #1:');
	dumpGlobalDataTable(rest.globalDataTable1);
	console.log('Global Data Table #2:');
	dumpGlobalDataTable(rest.globalDataTable2);
	console.log('Global Data Table #3:');
	dumpGlobalDataTable(rest.globalDataTable3);
}

if (opts.all || opts.formIDs) {
}
