const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

// ---------- RLE (групове стиснення по байтах) ----------
function rleCompress(buffer) {
    const input = buffer;
    const out = [];

    let i = 0;
    while (i < input.length) {
        const value = input[i];
        let runLength = 1;

        while (i + runLength < input.length && input[i + runLength] === value && runLength < 255) {
            runLength++;
        }

        out.push(runLength);
        out.push(value);
        i += runLength;
    }

    return Buffer.from(out);
}

// ---------- LZW (словниковий метод, по байтах) ----------
function lzwCompress(buffer) {
    // байти → рядок з символів 0..255
    const data = Array.from(buffer, b => String.fromCharCode(b)).join("");

    // початковий словник (усі можливі байти)
    const dict = new Map();
    for (let i = 0; i < 256; i++) {
        dict.set(String.fromCharCode(i), i);
    }

    let phrase = data[0];
    let code = 256;
    const outputCodes = [];

    for (let i = 1; i < data.length; i++) {
        const currChar = data[i];
        const phrasePlus = phrase + currChar;

        if (dict.has(phrasePlus)) {
            phrase = phrasePlus;
        } else {
            outputCodes.push(dict.get(phrase));
            dict.set(phrasePlus, code++);
            phrase = currChar;
        }
    }
    outputCodes.push(dict.get(phrase));

    // КОЖЕН КОД = 4 байти (UInt32), щоб не було переповнення
    const outBuf = Buffer.alloc(outputCodes.length * 4);
    outputCodes.forEach((c, idx) => {
        outBuf.writeUInt32BE(c >>> 0, idx * 4);
    });
    return outBuf;
}


// ---------- Допоміжне: відсоток стиснення ----------
function ratio(original, compressed) {
    return (compressed / original * 100).toFixed(2) + " %";
}

// ---------- JPEG (через sharp) ----------
async function jpegCompress(inputPath) {
    const dir = path.dirname(inputPath);
    const base = path.basename(inputPath, path.extname(inputPath));
    const outPath = path.join(dir, base + "_q75.jpg");

    await sharp(inputPath)
        .jpeg({ quality: 75 }) // можна поміняти якість
        .toFile(outPath);

    const size = fs.statSync(outPath).size;
    return { outPath, size };
}

// ---------- Основна логіка ----------
async function processFile(filePath) {
    const origStat = fs.statSync(filePath);
    const origSize = origStat.size;
    const buffer = fs.readFileSync(filePath);

    console.log("======================================");
    console.log("Файл:", filePath);
    console.log("Оригінальний розмір:", origSize, "байт");

    // RLE
    const rleBuf = rleCompress(buffer);
    console.log("RLE розмір:", rleBuf.length, "байт",
        "(", ratio(origSize, rleBuf.length), ")");

    // LZW
    const lzwBuf = lzwCompress(buffer);
    console.log("LZW розмір:", lzwBuf.length, "байт",
        "(", ratio(origSize, lzwBuf.length), ")");

    // JPEG
    try {
        const jpegRes = await jpegCompress(filePath);
        console.log("JPEG файл:", jpegRes.outPath);
        console.log("JPEG розмір:", jpegRes.size, "байт",
            "(", ratio(origSize, jpegRes.size), ")");
    } catch (e) {
        console.error("Помилка при JPEG-стисненні:", e.message);
    }
}

// ---------- Запуск з командного рядка ----------
// приклад: node index.js img1.png img2.bmp img3.jpg
async function main() {
    const files = process.argv.slice(2);
    if (files.length === 0) {
        console.log("Використання: node index.js image1.png image2.bmp ...");
        return;
    }
    for (const f of files) {
        await processFile(f);
    }
}

main().catch(err => console.error(err));
