import { array, primitive, struct, types as t, type Value } from 'memium';
import { GlobalData } from './global_data.js';
import { MS_FILETIME, wstring, wstring_le } from './util_structs.js';

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

export enum ChangeFormType {}

export const ChangeForm = struct.packed('ChangeForm', {});

/**
 * Change Form

Note: the layout of the data section is not a Record as it is in a mod file. Work is in progress documenting changeForm structures here: changeFlags
Name 	Type/Size 	Info
formID 	RefID 	
changeFlags 	uint32 	A combination of changeFlags that indicates which changes are included in the data.
type 	uint8 	

Upper 2 bits represent the size of the data lengths:

    0 = uint8
    1 = uint16 (> 0xFF)
    2 = uint32 (> 0xFFFF)

Lower 6 bits represent the type of form:

    0 = 63 (REFR) REFR change form
    1 = 64 (ACHR) ACHR change form
    2 = 65 (PMIS)
    3 = 67 (PGRE)
    4 = 68 (PBEA)
    5 = 69 (PFLA)
    6 = 62 (CELL)
    7 = 78 (INFO)
    8 = 79 (QUST) QUST change form
    9 = 45 (NPC_) NPC_ change form
    10 = 25 (ACTI)
    11 = 26 (TACT)
    12 = 27 (ARMO)
    13 = 28 (BOOK)
    14 = 29 (CONT)
    15 = 30 (DOOR)
    16 = 31 (INGR)
    17 = 32 (LIGH)
    18 = 33 (MISC)
    19 = 34 (APPA)
    20 = 35 (STAT)
    21 = 37 (MSTT)
    22 = 42 (FURN)
    23 = 43 (WEAP)
    24 = 44 (AMMO)
    25 = 47 (KEYM)
    26 = 48 (ALCH)
    27 = 49 (IDLM)
    28 = 50 (NOTE)
    29 = 105 (ECZN)
    30 = 10 (CLAS)
    31 = 11 (FACT)
    32 = 81 (PACK)
    33 = 75 (NAVM)
    34 = 120 (WOOP)
    35 = 19 (MGEF)
    36 = 115 (SMQN)
    37 = 124 (SCEN)
    38 = 106 (LCTN)
    39 = 123 (RELA)
    40 = 72 (PHZD)
    41 = 71 (PBAR)
    42 = 70 (PCON)
    43 = 93 (FLST) FLST change form
    44 = 46 (LVLN)
    45 = 55 (LVLI)
    46 = 84 (LVSP)
    47 = 66 (PARW)
    48 = 22 (ENCH)

version 	uint8 	Current as of Skyrim 1.9 is 74. Older values (57, 64, 73) are also valid.
length1 	depends on flags 	Length of following data.
length2 	depends on flags 	If this value is non-zero, data is compressed (ZLib, so far tested on SE only). This value then represents the uncompressed length.
data 	uint8[length1] 	
 */

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

type _v = Value<typeof GlobalData>;
type _ = SaveFileRest['globalDataTable1'][number];
