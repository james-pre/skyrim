import { array, primitive, struct, types as t, type Value } from 'memium';
import { GlobalData } from './global_data.js';
import { MS_FILETIME, wstring, wstring_le } from './util_structs.js';
import { ChangeForm } from './changes.js';

export enum PlayerSex {
	Male = 0,
	Female = 1,
}

export enum CompressionType {
	None = 0,
	zLib = 1,
	LZ4 = 2,
}

export const SaveHeader = struct(
	'SaveHeader',
	{
		version: t.uint32.bigEndian(),
		saveNumber: t.uint32.bigEndian(),
		playerName: wstring,
		playerLevel: t.uint32.bigEndian(),
		playerLocation: wstring,
		gameDate: wstring,
		playerRaceEditorId: wstring,
		playerSex: t.uint16.bigEndian().$type<PlayerSex>(),
		playerCurExp: t.float32.bigEndian(),
		playerLvlUpExp: t.float32.bigEndian(),
		filetime: MS_FILETIME,
		shotWidth: t.uint32.bigEndian(),
		shotHeight: t.uint32.bigEndian(),
		compressionType: t.uint16.bigEndian().$type<CompressionType>(),
	},
	{ isDynamic: true, isPacked: true }
);

export const PluginInfo = struct(
	'PluginInfo',
	{
		pluginCount: t.uint8,
		plugins: array(wstring_le).countedBy('pluginCount'),
	},
	{ isDynamic: true, isPacked: true }
);

export const LightPluginInfo = struct(
	'LightPluginInfo',
	{
		pluginCount: t.uint16,
		plugins: array(wstring_le).countedBy('pluginCount'),
	},
	{ isDynamic: true, isPacked: true }
);

export const FileLocationTable = struct.packed('FileLocationTable', {
	formIDArrayCountOffset: t.uint32.bigEndian(),
	unknownTable3Offset: t.uint32.bigEndian(),
	globalDataTable1Offset: t.uint32.bigEndian(),
	globalDataTable2Offset: t.uint32.bigEndian(),
	changeFormsOffset: t.uint32.bigEndian(),
	globalDataTable3Offset: t.uint32.bigEndian(),
	globalDataTable1Count: t.uint32.bigEndian(),
	globalDataTable2Count: t.uint32.bigEndian(),
	globalDataTable3Count: t.uint32.bigEndian(),
	changeFormCount: t.uint32.bigEndian(),
	unused: t.uint32(15),
});

export const Unknown3Table = struct(
	'Unknown3Table',
	{
		count: t.uint32.bigEndian(),
		unknown: array(wstring).countedBy('count'),
	},
	{ isDynamic: true, isPacked: true }
);

export const SaveFile = struct(
	'SaveFile',
	{
		magic: t.char(13),
		headerSize: t.uint32.bigEndian(),
		header: SaveHeader,
		screenshotData: array(primitive.types.uint8).countedBy((sv) => sv.header.shotHeight * sv.header.shotWidth * 4),
		uncompressedLen: t.uint32.bigEndian(),
		compressedLen: t.uint32.bigEndian(),
	},
	{ isDynamic: true, isPacked: true }
);

export class SaveFileRest extends struct(
	'SaveFileRest',
	{
		formVersion: t.uint8,
		pluginInfoSize: t.uint32,
		pluginInfo: PluginInfo,
		lightPluginInfo: LightPluginInfo,
		fileLocationTable: FileLocationTable,
		globalDataTable1: array(GlobalData)
			.bigEndian()
			.countedBy((sv) => sv.fileLocationTable.globalDataTable1Count),
		globalDataTable2: array(GlobalData)
			.bigEndian()
			.countedBy((sv) => sv.fileLocationTable.globalDataTable2Count),
		changeForms: array(ChangeForm)
			.bigEndian()
			.countedBy((sv) => sv.fileLocationTable.changeFormCount),
		globalDataTable3: array(GlobalData)
			.bigEndian()
			.countedBy((sv) => sv.fileLocationTable.globalDataTable3Count),
		formIDArrayCount: t.uint32.bigEndian(),
		formIDArray: array(primitive.types.uint32).bigEndian().countedBy('formIDArrayCount'),
		visitedWorldspaceArrayCount: t.uint32.bigEndian(),
		visitedWorldspaceArray: array(primitive.types.uint32).bigEndian().countedBy('visitedWorldspaceArrayCount'),
		unknown3TableSize: t.uint32.bigEndian(),
		unknown3Table: Unknown3Table,
	},
	{ isDynamic: true, isPacked: true }
) {}
