import { inflateRawSync } from "zlib";
export const ZIP_GUARD_LIMITS = {
    maxEntries: 200,
    maxUncompressedTotal: 20 * 1024 * 1024,
    maxUncompressedEntry: 10 * 1024 * 1024,
    maxCompressionRatio: 100,
} as const;
const EOCD_SIGNATURE = 0x06054b50;
const CD_SIGNATURE = 0x02014b50;
const LOCAL_SIGNATURE = 0x04034b50;
const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;
const FLAG_ENCRYPTED = 0x0001;
const FLAG_STRONG_ENCRYPTION = 0x0040;
type ZipEntry = {
    method: number;
    flags: number;
    compressedSize: number;
    uncompressedSize: number;
    localHeaderOffset: number;
};
const readU16 = (buf: Buffer, offset: number) => buf.readUInt16LE(offset);
const readU32 = (buf: Buffer, offset: number) => buf.readUInt32LE(offset);
const findEndOfCentralDirectory = (buf: Buffer): number => {
    const minSize = 22;
    if (buf.length < minSize) {
        throw new Error("ZIP dosyası çok küçük.");
    }
    const start = Math.max(0, buf.length - (minSize + 0xffff));
    for (let i = buf.length - minSize; i >= start; i -= 1) {
        if (readU32(buf, i) === EOCD_SIGNATURE)
            return i;
    }
    throw new Error("ZIP merkezi dizin sonu bulunamadı.");
};
const parseCentralDirectory = (buf: Buffer): ZipEntry[] => {
    const eocd = findEndOfCentralDirectory(buf);
    const totalEntries = readU16(buf, eocd + 10);
    const cdSize = readU32(buf, eocd + 12);
    const cdOffset = readU32(buf, eocd + 16);
    if (totalEntries > ZIP_GUARD_LIMITS.maxEntries) {
        throw new Error(`ZIP en fazla ${ZIP_GUARD_LIMITS.maxEntries} dosya içerebilir.`);
    }
    if (cdOffset + cdSize > buf.length) {
        throw new Error("ZIP merkezi dizini bozuk.");
    }
    const entries: ZipEntry[] = [];
    let cursor = cdOffset;
    const cdEnd = cdOffset + cdSize;
    for (let i = 0; i < totalEntries; i += 1) {
        if (cursor + 46 > cdEnd || readU32(buf, cursor) !== CD_SIGNATURE) {
            throw new Error("ZIP merkezi dizin girdisi bozuk.");
        }
        const flags = readU16(buf, cursor + 8);
        const method = readU16(buf, cursor + 10);
        const compressedSize = readU32(buf, cursor + 20);
        const uncompressedSize = readU32(buf, cursor + 24);
        const nameLen = readU16(buf, cursor + 28);
        const extraLen = readU16(buf, cursor + 30);
        const commentLen = readU16(buf, cursor + 32);
        const localHeaderOffset = readU32(buf, cursor + 42);
        entries.push({ method, flags, compressedSize, uncompressedSize, localHeaderOffset });
        cursor += 46 + nameLen + extraLen + commentLen;
    }
    return entries;
};
const inflateEntry = (compressed: Buffer, claimedUncompressed: number): number => {
    const limit = Math.min(claimedUncompressed || ZIP_GUARD_LIMITS.maxUncompressedEntry, ZIP_GUARD_LIMITS.maxUncompressedEntry);
    try {
        const out = inflateRawSync(compressed, { maxOutputLength: limit });
        return out.length;
    }
    catch {
        throw new Error("ZIP girdisi açılamadı veya boyut sınırı aşıldı.");
    }
};
const measureLocalEntry = (buf: Buffer, entry: ZipEntry): number => {
    const offset = entry.localHeaderOffset;
    if (offset + 30 > buf.length || readU32(buf, offset) !== LOCAL_SIGNATURE) {
        throw new Error("ZIP yerel başlık bozuk.");
    }
    const flags = readU16(buf, offset + 6);
    const method = readU16(buf, offset + 8);
    const nameLen = readU16(buf, offset + 26);
    const extraLen = readU16(buf, offset + 28);
    const dataStart = offset + 30 + nameLen + extraLen;
    const compressedSize = entry.compressedSize;
    const uncompressedSize = entry.uncompressedSize;
    if (dataStart + compressedSize > buf.length) {
        throw new Error("ZIP sıkıştırılmış veri sınırı aşıyor.");
    }
    if ((flags | entry.flags) & (FLAG_ENCRYPTED | FLAG_STRONG_ENCRYPTION)) {
        throw new Error("Şifreli ZIP girdileri kabul edilmez.");
    }
    if (method !== entry.method) {
        throw new Error("ZIP sıkıştırma yöntemi tutarsız.");
    }
    if (uncompressedSize > ZIP_GUARD_LIMITS.maxUncompressedEntry) {
        throw new Error("ZIP girdisi çok büyük.");
    }
    if (compressedSize > 0 &&
        uncompressedSize / compressedSize > ZIP_GUARD_LIMITS.maxCompressionRatio) {
        throw new Error("ZIP sıkıştırma oranı çok yüksek.");
    }
    const payload = buf.subarray(dataStart, dataStart + compressedSize);
    if (method === METHOD_STORED) {
        if (payload.length !== uncompressedSize && uncompressedSize !== 0) {
            if (payload.length > ZIP_GUARD_LIMITS.maxUncompressedEntry) {
                throw new Error("ZIP girdisi çok büyük.");
            }
            return payload.length;
        }
        return payload.length;
    }
    if (method === METHOD_DEFLATE) {
        const actual = inflateEntry(Buffer.from(payload), uncompressedSize || ZIP_GUARD_LIMITS.maxUncompressedEntry);
        if (uncompressedSize > 0 && actual > uncompressedSize) {
            throw new Error("ZIP girdisi beyan edilen boyutu aşıyor.");
        }
        return actual;
    }
    throw new Error(`Desteklenmeyen ZIP sıkıştırma yöntemi: ${method}`);
};
export const assertSafeZip = (bytes: Uint8Array): void => {
    const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
    const entries = parseCentralDirectory(buf);
    let claimedTotal = 0;
    for (const entry of entries) {
        claimedTotal += entry.uncompressedSize;
        if (claimedTotal > ZIP_GUARD_LIMITS.maxUncompressedTotal) {
            throw new Error("ZIP toplam açılmış boyutu çok büyük.");
        }
    }
    let actualTotal = 0;
    for (const entry of entries) {
        actualTotal += measureLocalEntry(buf, entry);
        if (actualTotal > ZIP_GUARD_LIMITS.maxUncompressedTotal) {
            throw new Error("ZIP toplam açılmış boyutu çok büyük.");
        }
    }
};
