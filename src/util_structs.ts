import { array, primitive, struct, types as t, type InstanceOf } from 'memium';

const decoder = new TextDecoder();

export class wstring extends struct(
	'wstring',
	{
		length: t.uint16.bigEndian(),
		data: array(primitive.types.uint8).countedBy('length'),
	},
	{ isDynamic: true, isPacked: true }
) {
	toString() {
		return decoder.decode(this.data);
	}
}

export class wstring_le extends struct(
	'wstring_le',
	{
		length: t.uint16,
		data: array(primitive.types.uint8).countedBy('length'),
	},
	{ isDynamic: true, isPacked: true }
) {
	toString() {
		return decoder.decode(this.data);
	}
}

export const MS_FILETIME = struct.packed('MS_FILETIME', {
	dwLowDateTime: t.uint32.bigEndian(),
	dwHighDateTime: t.uint32.bigEndian(),
});

export function getDate(filetime: InstanceOf<typeof MS_FILETIME>): Date {
	const time = (BigInt(filetime.dwHighDateTime) << 32n) | BigInt(filetime.dwLowDateTime);
	const unixTime = time / 10000n - 11644473600000n;
	return new Date(Number(unixTime));
}
