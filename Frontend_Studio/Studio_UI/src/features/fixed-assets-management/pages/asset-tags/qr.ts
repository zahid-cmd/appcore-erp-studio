//===============================================================
// A small QR Code encoder (no library) : byte mode, error
// correction level M, versions 1 to 5 (up to 84 bytes).
//
//   qrMatrix(text)      the modules, [row][column], true = dark
//   qrSvg(text, size)   an inline <svg> : black on white, with the
//                       quiet zone of 4 modules
//
// ISO/IEC 18004 : finder, separator, timing and alignment patterns,
// the dark module, the format information (BCH 15,5), Reed-Solomon
// over GF(256) (x^8 + x^4 + x^3 + x^2 + 1) with the block structure
// of level M, and the mask with the lowest penalty score.
//===============================================================

interface QrVersion
{
    version: number;
    // Data codewords of one block
    blockData: number;
    // Error correction codewords of one block
    blockEc: number;
    blocks: number;
}

// Level M
const VERSIONS:
    QrVersion[] =
[
    { version:1, blockData:16, blockEc:10, blocks:1 },
    { version:2, blockData:28, blockEc:16, blocks:1 },
    { version:3, blockData:44, blockEc:26, blocks:1 },
    { version:4, blockData:32, blockEc:18, blocks:2 },
    { version:5, blockData:43, blockEc:24, blocks:2 }
];

// The most bytes a tag can hold (version 5, level M)
export const QR_MAX_BYTES =
    84;


//===============================================================
// GF(256) and Reed-Solomon
//===============================================================

const EXP: number[] = new Array<number>(512).fill(0);

const LOG: number[] = new Array<number>(256).fill(0);

(function buildField(): void
{
    let x = 1;

    for (let i = 0; i < 255; i++)
    {
        EXP[i] = x;
        LOG[x] = i;

        x <<= 1;

        if (x & 0x100)
        {
            x ^= 0x11d;
        }
    }

    for (let i = 255; i < 512; i++)
    {
        EXP[i] = EXP[i - 255];
    }
})();

function multiply(a: number, b: number): number
{
    return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
}

// (x - a^0)(x - a^1)...(x - a^(degree-1)) : the coefficients
// after the leading 1, highest power first
function generator(degree: number): number[]
{
    const poly: number[] = new Array<number>(degree).fill(0);

    poly[degree - 1] = 1;

    let root = 1;

    for (let i = 0; i < degree; i++)
    {
        for (let j = 0; j < degree; j++)
        {
            poly[j] = multiply(poly[j], root);

            if (j + 1 < degree)
            {
                poly[j] ^= poly[j + 1];
            }
        }

        root = multiply(root, 2);
    }

    return poly;
}

// The error correction codewords of a block
function remainder(data: number[], divisor: number[]): number[]
{
    const result: number[] = new Array<number>(divisor.length).fill(0);

    for (const byte of data)
    {
        const factor = byte ^ (result.shift() as number);

        result.push(0);

        for (let i = 0; i < divisor.length; i++)
        {
            result[i] ^= multiply(divisor[i], factor);
        }
    }

    return result;
}


//===============================================================
// The text as codewords
//===============================================================

function utf8(text: string): number[]
{
    const bytes: number[] = [];

    for (const symbol of text)
    {
        const code = symbol.codePointAt(0) ?? 0x3f;

        if (code < 0x80)
        {
            bytes.push(code);
        }
        else if (code < 0x800)
        {
            bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        }
        else if (code < 0x10000)
        {
            bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        }
        else
        {
            bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        }
    }

    return bytes;
}

// Mode, length, the bytes, the terminator and the pad codewords
function dataCodewords(bytes: number[], capacity: number): number[]
{
    const bits: number[] = [];

    const put =
        (value: number, length: number): void =>
        {
            for (let i = length - 1; i >= 0; i--)
            {
                bits.push((value >>> i) & 1);
            }
        };

    // byte mode
    put(0b0100, 4);

    // versions 1 to 9 : the length in 8 bits
    put(bytes.length, 8);

    for (const byte of bytes)
    {
        put(byte, 8);
    }

    const room = capacity * 8;

    put(0, Math.min(4, room - bits.length));

    put(0, (8 - bits.length % 8) % 8);

    const words: number[] = [];

    for (let i = 0; i < bits.length; i += 8)
    {
        let word = 0;

        for (let j = 0; j < 8; j++)
        {
            word = (word << 1) | bits[i + j];
        }

        words.push(word);
    }

    for (let pad = 0xec; words.length < capacity; pad ^= 0xec ^ 0x11)
    {
        words.push(pad);
    }

    return words;
}

// The blocks with their error correction, interleaved
function finalCodewords(data: number[], spec: QrVersion): number[]
{
    const divisor = generator(spec.blockEc);

    const blocks: number[][] = [];

    const corrections: number[][] = [];

    for (let b = 0; b < spec.blocks; b++)
    {
        const block = data.slice(b * spec.blockData, (b + 1) * spec.blockData);

        blocks.push(block);
        corrections.push(remainder(block, divisor));
    }

    const result: number[] = [];

    for (let i = 0; i < spec.blockData; i++)
    {
        for (const block of blocks)
        {
            result.push(block[i]);
        }
    }

    for (let i = 0; i < spec.blockEc; i++)
    {
        for (const correction of corrections)
        {
            result.push(correction[i]);
        }
    }

    return result;
}


//===============================================================
// The symbol
//===============================================================

// Is the module (x across, y down) turned over by the mask
function masked(mask: number, x: number, y: number): boolean
{
    switch (mask)
    {
        case 0: return (x + y) % 2 === 0;
        case 1: return y % 2 === 0;
        case 2: return x % 3 === 0;
        case 3: return (x + y) % 3 === 0;
        case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
        case 5: return x * y % 2 + x * y % 3 === 0;
        case 6: return (x * y % 2 + x * y % 3) % 2 === 0;
        default: return ((x + y) % 2 + x * y % 3) % 2 === 0;
    }
}

// Level M (00) and the mask, with the BCH bits, masked by 0x5412
function formatBits(mask: number): number
{
    const data = (0b00 << 3) | mask;

    let rest = data;

    for (let i = 0; i < 10; i++)
    {
        rest = (rest << 1) ^ ((rest >>> 9) * 0x537);
    }

    return ((data << 10) | rest) ^ 0x5412;
}

function penalty(modules: boolean[][]): number
{
    const size = modules.length;

    let score = 0;

    const lines: boolean[][] = [];

    for (let i = 0; i < size; i++)
    {
        lines.push(modules[i]);
        lines.push(modules.map(row => row[i]));
    }

    for (const line of lines)
    {
        // runs of five or more of one colour
        let run = 1;

        for (let i = 1; i <= size; i++)
        {
            if (i < size && line[i] === line[i - 1])
            {
                run++;
            }
            else
            {
                if (run >= 5)
                {
                    score += 3 + (run - 5);
                }

                run = 1;
            }
        }

        // 1 : 1 : 3 : 1 : 1 with four light modules on a side
        for (let i = 0; i + 11 <= size; i++)
        {
            const d = (k: number): boolean => line[i + k];

            if (d(0) && !d(1) && d(2) && d(3) && d(4) && !d(5) && d(6) && !d(7) && !d(8) && !d(9) && !d(10))
            {
                score += 40;
            }

            if (!d(0) && !d(1) && !d(2) && !d(3) && d(4) && !d(5) && d(6) && d(7) && d(8) && !d(9) && d(10))
            {
                score += 40;
            }
        }
    }

    // blocks of 2 x 2 of one colour
    let dark = 0;

    for (let y = 0; y < size; y++)
    {
        for (let x = 0; x < size; x++)
        {
            const colour = modules[y][x];

            if (colour)
            {
                dark++;
            }

            if (x + 1 < size && y + 1 < size
                && colour === modules[y][x + 1]
                && colour === modules[y + 1][x]
                && colour === modules[y + 1][x + 1])
            {
                score += 3;
            }
        }
    }

    // how far the dark share is from a half, in steps of 5 %
    const total = size * size;

    score += Math.floor(Math.abs(dark * 20 - total * 10) / total) * 10;

    return score;
}

// The modules of the QR Code of a text : [row][column], true = dark.
// Throws when the text is longer than 84 bytes.
export function qrMatrix(text: string): boolean[][]
{
    const bytes = utf8(String(text ?? ''));

    const spec =
        VERSIONS.find(x => x.blockData * x.blocks - 2 >= bytes.length);

    if (!spec)
    {
        throw new Error(`The text is too long for a tag (${bytes.length} bytes; at most ${QR_MAX_BYTES}).`);
    }

    const size = spec.version * 4 + 17;

    const modules: boolean[][] = [];

    // finder, timing, alignment, format : never data, never masked
    const fixed: boolean[][] = [];

    for (let y = 0; y < size; y++)
    {
        modules.push(new Array<boolean>(size).fill(false));
        fixed.push(new Array<boolean>(size).fill(false));
    }

    const set =
        (x: number, y: number, dark: boolean): void =>
        {
            modules[y][x] = dark;
            fixed[y][x] = true;
        };

    // timing patterns
    for (let i = 0; i < size; i++)
    {
        set(6, i, i % 2 === 0);
        set(i, 6, i % 2 === 0);
    }

    // finder patterns with their separators
    for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]])
    {
        for (let dy = -4; dy <= 4; dy++)
        {
            for (let dx = -4; dx <= 4; dx++)
            {
                const x = cx + dx;
                const y = cy + dy;

                if (x < 0 || x >= size || y < 0 || y >= size)
                {
                    continue;
                }

                const ring = Math.max(Math.abs(dx), Math.abs(dy));

                set(x, y, ring !== 2 && ring !== 4);
            }
        }
    }

    // the alignment pattern (versions 2 and above : one)
    if (spec.version >= 2)
    {
        const centre = size - 7;

        for (let dy = -2; dy <= 2; dy++)
        {
            for (let dx = -2; dx <= 2; dx++)
            {
                set(centre + dx, centre + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
            }
        }
    }

    // the format information : both copies, and the dark module
    const format =
        (mask: number): void =>
        {
            const bits = formatBits(mask);

            const bit = (i: number): boolean => ((bits >>> i) & 1) === 1;

            for (let i = 0; i <= 5; i++)
            {
                set(8, i, bit(i));
            }

            set(8, 7, bit(6));
            set(8, 8, bit(7));
            set(7, 8, bit(8));

            for (let i = 9; i < 15; i++)
            {
                set(14 - i, 8, bit(i));
            }

            for (let i = 0; i < 8; i++)
            {
                set(size - 1 - i, 8, bit(i));
            }

            for (let i = 8; i < 15; i++)
            {
                set(8, size - 15 + i, bit(i));
            }

            set(8, size - 8, true);
        };

    // keeps the place of the format information
    format(0);

    // the codewords : two columns at a time, from the right, up
    // and down in turn (the column of the timing pattern is skipped)
    const words =
        finalCodewords(dataCodewords(bytes, spec.blockData * spec.blocks), spec);

    let index = 0;

    for (let right = size - 1; right >= 1; right -= 2)
    {
        if (right === 6)
        {
            right = 5;
        }

        for (let step = 0; step < size; step++)
        {
            for (let j = 0; j < 2; j++)
            {
                const x = right - j;

                const upward = ((right + 1) & 2) === 0;

                const y = upward ? size - 1 - step : step;

                if (!fixed[y][x] && index < words.length * 8)
                {
                    modules[y][x] = ((words[index >>> 3] >>> (7 - (index & 7))) & 1) === 1;
                    index++;
                }

                // the remainder bits (versions 2 to 5 : 7) stay light
            }
        }
    }

    // the mask with the lowest penalty
    const turn =
        (mask: number): void =>
        {
            for (let y = 0; y < size; y++)
            {
                for (let x = 0; x < size; x++)
                {
                    if (!fixed[y][x] && masked(mask, x, y))
                    {
                        modules[y][x] = !modules[y][x];
                    }
                }
            }
        };

    let best = 0;

    let lowest = Number.MAX_SAFE_INTEGER;

    for (let mask = 0; mask < 8; mask++)
    {
        turn(mask);
        format(mask);

        const score = penalty(modules);

        if (score < lowest)
        {
            lowest = score;
            best = mask;
        }

        // the same mask again takes it off
        turn(mask);
    }

    turn(best);
    format(best);

    return modules;
}

// The QR Code of a text as an inline <svg> of size x size pixels :
// black on white, a quiet zone of 4 modules around it. A text that
// is too long gives an empty white square.
export function qrSvg(text: string, size: number): string
{
    let modules: boolean[][];

    try
    {
        modules = qrMatrix(text);
    }
    catch
    {
        modules = [];
    }

    const quiet = 4;

    const side = modules.length + quiet * 2;

    const parts: string[] = [];

    modules.forEach((row, y) =>
    {
        // a run of dark modules is one rectangle
        for (let x = 0; x < row.length; x++)
        {
            if (!row[x])
            {
                continue;
            }

            let run = 1;

            while (x + run < row.length && row[x + run])
            {
                run++;
            }

            parts.push(`M${x + quiet} ${y + quiet}h${run}v1h-${run}z`);

            x += run - 1;
        }
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges">`
        + `<rect width="${side}" height="${side}" fill="#ffffff"/>`
        + `<path d="${parts.join('')}" fill="#000000"/>`
        + '</svg>';
}
