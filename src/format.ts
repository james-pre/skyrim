import type { StructInstance } from 'memium';
import { styleText } from 'node:util';
import { wstring, wstring_le } from './util_structs.js';

export function num(n: number | bigint, base?: number): string {
	const prefix = base == 16 ? '0x' : base == 2 ? '0b' : '';
	return styleText('blueBright', prefix + n.toString(base));
}

export function bytes(bytes: number): string {
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];

	const i = bytes == 0 ? 0 : Math.floor(Math.log10(bytes) / 3);

	const value = bytes == 0 ? 0 : bytes / Math.pow(1000, i);

	return `${Number.isInteger(value) ? value : value.toFixed(2)} ${units[i]}`;
}

const decoder = new TextDecoder();

export function str(s: string | Uint8Array | StructInstance<any>): string {
	if (s instanceof wstring || s instanceof wstring_le) s = s.data;
	if (ArrayBuffer.isView(s)) s = decoder.decode(s);
	return styleText('yellow', `"${s}"`);
}
