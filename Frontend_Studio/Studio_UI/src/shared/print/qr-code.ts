//===============================================================
// QR Code (built in, no package)
//
// Encodes text (UTF-8, byte mode, error correction M) into a QR
// Code and returns it as an inline SVG for the print templates.
// Versions 1 – 40; the mask with the lowest penalty is used.
//
// Algorithm after the public QR Code specification (ISO/IEC
// 18004) as described by Project Nayuki's reference generator.
//===============================================================


//---------------------------------------------------------------
// Tables (error correction level M, index = version)
//---------------------------------------------------------------

const ECC_PER_BLOCK:
    number[] =
[
    -1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26,
    30, 22, 22, 24, 24, 28, 28, 26, 26, 26,
    26, 28, 28, 28, 28, 28, 28, 28, 28, 28,
    28, 28, 28, 28, 28, 28, 28, 28, 28, 28
];

const ECC_BLOCKS:
    number[] =
[
    -1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5,
    5, 8, 9, 9, 10, 10, 11, 13, 14, 16,
    17, 17, 18, 20, 21, 23, 25, 26, 28, 29,
    31, 33, 35, 37, 38, 40, 43, 45, 47, 49
];

// Format bits of level M
const ECC_FORMAT_M =
    0;


//---------------------------------------------------------------
// Public : matrix and SVG
//---------------------------------------------------------------

// true = dark module; [row][column]
export function qrMatrix
(
    text:
        string
):
    boolean[][]
{
    const bytes =
        Array.from(
            new TextEncoder().encode(text ?? '')
        );

    // Smallest version that holds the data
    let version =
        1;

    for
    (
        ;
        version <= 40;
        version++
    )
    {
        const capacityBits =
            dataCodewords(version) * 8;

        const usedBits =
            4 + (version <= 9 ? 8 : 16) + bytes.length * 8;

        if
        (
            usedBits <= capacityBits
        )
        {
            break;
        }
    }

    if
    (
        version > 40
    )
    {
        throw new Error('QR : text is too long.');
    }

    //-----------------------------------------------------------
    // Data bits : mode, count, bytes, terminator, padding
    //-----------------------------------------------------------

    const bits:
        number[] =
        [];

    const push =
        (value: number, length: number): void =>
        {
            for
            (
                let i = length - 1;
                i >= 0;
                i--
            )
            {
                bits.push((value >>> i) & 1);
            }
        };

    push(0x4, 4);

    push(bytes.length, version <= 9 ? 8 : 16);

    for
    (
        const value of bytes
    )
    {
        push(value, 8);
    }

    const capacity =
        dataCodewords(version) * 8;

    push(0, Math.min(4, capacity - bits.length));

    push(0, (8 - bits.length % 8) % 8);

    for
    (
        let pad = 0xEC;
        bits.length < capacity;
        pad ^= 0xEC ^ 0x11
    )
    {
        push(pad, 8);
    }

    const data:
        number[] =
        [];

    for
    (
        let i = 0;
        i < bits.length;
        i += 8
    )
    {
        let value =
            0;

        for
        (
            let j = 0;
            j < 8;
            j++
        )
        {
            value = (value << 1) | bits[i + j];
        }

        data.push(value);
    }

    const codewords =
        addEccAndInterleave(
            data,
            version
        );

    //-----------------------------------------------------------
    // Matrix : function patterns, data, best mask
    //-----------------------------------------------------------

    const size =
        version * 4 + 17;

    const modules =
        grid(size, false);

    const isFunction =
        grid(size, false);

    drawFunctionPatterns(
        modules,
        isFunction,
        version
    );

    drawCodewords(
        modules,
        isFunction,
        codewords
    );

    let bestMask =
        0;

    let bestPenalty =
        Number.POSITIVE_INFINITY;

    for
    (
        let mask = 0;
        mask < 8;
        mask++
    )
    {
        applyMask(modules, isFunction, mask);

        drawFormatBits(modules, isFunction, mask);

        const penalty =
            penaltyScore(modules);

        if
        (
            penalty < bestPenalty
        )
        {
            bestPenalty = penalty;

            bestMask = mask;
        }

        // Undo (XOR)
        applyMask(modules, isFunction, mask);
    }

    applyMask(modules, isFunction, bestMask);

    drawFormatBits(modules, isFunction, bestMask);

    return modules;
}

// Inline SVG (scales to its box); quiet zone included
export function qrSvg
(
    text:
        string,
    color:
        string =
        '#0b2a5b',
    quietZone:
        number =
        0
):
    string
{
    const modules =
        qrMatrix(text);

    const size =
        modules.length;

    const full =
        size + quietZone * 2;

    let path =
        '';

    for
    (
        let y = 0;
        y < size;
        y++
    )
    {
        for
        (
            let x = 0;
            x < size;
            x++
        )
        {
            if
            (
                modules[y][x]
            )
            {
                path += `M${x + quietZone},${y + quietZone}h1v1h-1z`;
            }
        }
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} ${full}" shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet"><rect width="${full}" height="${full}" fill="#ffffff"/><path d="${path}" fill="${color}"/></svg>`;
}


//---------------------------------------------------------------
// Capacity
//---------------------------------------------------------------

function rawDataModules
(
    version:
        number
):
    number
{
    let result =
        (16 * version + 128) * version + 64;

    if
    (
        version >= 2
    )
    {
        const align =
            Math.floor(version / 7) + 2;

        result -= (25 * align - 10) * align - 55;

        if
        (
            version >= 7
        )
        {
            result -= 36;
        }
    }

    return result;
}

function dataCodewords
(
    version:
        number
):
    number
{
    return Math.floor(rawDataModules(version) / 8)
        - ECC_PER_BLOCK[version] * ECC_BLOCKS[version];
}


//---------------------------------------------------------------
// Error correction (Reed-Solomon over GF(256), 0x11D)
//---------------------------------------------------------------

function gfMultiply
(
    x:
        number,
    y:
        number
):
    number
{
    let z =
        0;

    for
    (
        let i = 7;
        i >= 0;
        i--
    )
    {
        z = (z << 1) ^ ((z >>> 7) * 0x11D);

        z ^= ((y >>> i) & 1) * x;
    }

    return z & 0xFF;
}

function rsDivisor
(
    degree:
        number
):
    number[]
{
    const result:
        number[] =
        new Array(degree).fill(0);

    result[degree - 1] =
        1;

    let root =
        1;

    for
    (
        let i = 0;
        i < degree;
        i++
    )
    {
        for
        (
            let j = 0;
            j < result.length;
            j++
        )
        {
            result[j] =
                gfMultiply(result[j], root);

            if
            (
                j + 1 < result.length
            )
            {
                result[j] ^= result[j + 1];
            }
        }

        root =
            gfMultiply(root, 0x02);
    }

    return result;
}

function rsRemainder
(
    data:
        number[],
    divisor:
        number[]
):
    number[]
{
    const result:
        number[] =
        divisor.map(() => 0);

    for
    (
        const value of data
    )
    {
        const factor =
            value ^ (result.shift() as number);

        result.push(0);

        divisor.forEach
        (
            (coefficient, index) =>
            {
                result[index] ^= gfMultiply(coefficient, factor);
            }
        );
    }

    return result;
}

function addEccAndInterleave
(
    data:
        number[],
    version:
        number
):
    number[]
{
    const blockCount =
        ECC_BLOCKS[version];

    const eccLength =
        ECC_PER_BLOCK[version];

    const rawCodewords =
        Math.floor(rawDataModules(version) / 8);

    const shortBlocks =
        blockCount - rawCodewords % blockCount;

    const shortLength =
        Math.floor(rawCodewords / blockCount);

    const divisor =
        rsDivisor(eccLength);

    const blocks:
        number[][] =
        [];

    for
    (
        let i = 0, k = 0;
        i < blockCount;
        i++
    )
    {
        const length =
            shortLength - eccLength + (i < shortBlocks ? 0 : 1);

        const part =
            data.slice(k, k + length);

        k += length;

        const ecc =
            rsRemainder(part, divisor);

        if
        (
            i < shortBlocks
        )
        {
            part.push(0);
        }

        blocks.push(part.concat(ecc));
    }

    const result:
        number[] =
        [];

    for
    (
        let i = 0;
        i < blocks[0].length;
        i++
    )
    {
        blocks.forEach
        (
            (block, j) =>
            {
                // Skip the padding cell of the short blocks
                if
                (
                    i !== shortLength - eccLength
                    ||
                    j >= shortBlocks
                )
                {
                    result.push(block[i]);
                }
            }
        );
    }

    return result;
}


//---------------------------------------------------------------
// Drawing
//---------------------------------------------------------------

function grid
(
    size:
        number,
    value:
        boolean
):
    boolean[][]
{
    return Array.from(
        { length:size },
        () => new Array<boolean>(size).fill(value)
    );
}

function setFunction
(
    modules:
        boolean[][],
    isFunction:
        boolean[][],
    x:
        number,
    y:
        number,
    dark:
        boolean
):
    void
{
    modules[y][x] = dark;

    isFunction[y][x] = true;
}

function alignmentPositions
(
    version:
        number
):
    number[]
{
    if
    (
        version === 1
    )
    {
        return [];
    }

    const count =
        Math.floor(version / 7) + 2;

    const step =
        version === 32
            ? 26
            : Math.ceil((version * 4 + 4) / (count * 2 - 2)) * 2;

    const result:
        number[] =
        [6];

    for
    (
        let position = version * 4 + 17 - 7;
        result.length < count;
        position -= step
    )
    {
        result.splice(1, 0, position);
    }

    return result;
}

function drawFunctionPatterns
(
    modules:
        boolean[][],
    isFunction:
        boolean[][],
    version:
        number
):
    void
{
    const size =
        modules.length;

    // Timing patterns
    for
    (
        let i = 0;
        i < size;
        i++
    )
    {
        setFunction(modules, isFunction, 6, i, i % 2 === 0);

        setFunction(modules, isFunction, i, 6, i % 2 === 0);
    }

    // Finder patterns (with separators)
    const finder =
        (cx: number, cy: number): void =>
        {
            for
            (
                let dy = -4;
                dy <= 4;
                dy++
            )
            {
                for
                (
                    let dx = -4;
                    dx <= 4;
                    dx++
                )
                {
                    const x =
                        cx + dx;

                    const y =
                        cy + dy;

                    if
                    (
                        x >= 0 && x < size && y >= 0 && y < size
                    )
                    {
                        const distance =
                            Math.max(Math.abs(dx), Math.abs(dy));

                        setFunction(modules, isFunction, x, y, distance !== 2 && distance !== 4);
                    }
                }
            }
        };

    finder(3, 3);

    finder(size - 4, 3);

    finder(3, size - 4);

    // Alignment patterns
    const positions =
        alignmentPositions(version);

    const last =
        positions.length - 1;

    positions.forEach
    (
        (px, i) =>
        {
            positions.forEach
            (
                (py, j) =>
                {
                    if
                    (
                        (i === 0 && j === 0)
                        ||
                        (i === 0 && j === last)
                        ||
                        (i === last && j === 0)
                    )
                    {
                        return;
                    }

                    for
                    (
                        let dy = -2;
                        dy <= 2;
                        dy++
                    )
                    {
                        for
                        (
                            let dx = -2;
                            dx <= 2;
                            dx++
                        )
                        {
                            setFunction(modules, isFunction, px + dx, py + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
                        }
                    }
                }
            );
        }
    );

    // Reserve the format areas (real bits drawn per mask)
    drawFormatBits(modules, isFunction, 0);

    // Version information (version 7+)
    if
    (
        version >= 7
    )
    {
        let remainder =
            version;

        for
        (
            let i = 0;
            i < 12;
            i++
        )
        {
            remainder = (remainder << 1) ^ ((remainder >>> 11) * 0x1F25);
        }

        const value =
            (version << 12) | remainder;

        for
        (
            let i = 0;
            i < 18;
            i++
        )
        {
            const dark =
                ((value >>> i) & 1) !== 0;

            const a =
                size - 11 + i % 3;

            const b =
                Math.floor(i / 3);

            setFunction(modules, isFunction, a, b, dark);

            setFunction(modules, isFunction, b, a, dark);
        }
    }
}

function drawFormatBits
(
    modules:
        boolean[][],
    isFunction:
        boolean[][],
    mask:
        number
):
    void
{
    const size =
        modules.length;

    const data =
        (ECC_FORMAT_M << 3) | mask;

    let remainder =
        data;

    for
    (
        let i = 0;
        i < 10;
        i++
    )
    {
        remainder = (remainder << 1) ^ ((remainder >>> 9) * 0x537);
    }

    const value =
        ((data << 10) | remainder) ^ 0x5412;

    const bit =
        (i: number): boolean =>
            ((value >>> i) & 1) !== 0;

    // First copy
    for
    (
        let i = 0;
        i <= 5;
        i++
    )
    {
        setFunction(modules, isFunction, 8, i, bit(i));
    }

    setFunction(modules, isFunction, 8, 7, bit(6));

    setFunction(modules, isFunction, 8, 8, bit(7));

    setFunction(modules, isFunction, 7, 8, bit(8));

    for
    (
        let i = 9;
        i < 15;
        i++
    )
    {
        setFunction(modules, isFunction, 14 - i, 8, bit(i));
    }

    // Second copy
    for
    (
        let i = 0;
        i < 8;
        i++
    )
    {
        setFunction(modules, isFunction, size - 1 - i, 8, bit(i));
    }

    for
    (
        let i = 8;
        i < 15;
        i++
    )
    {
        setFunction(modules, isFunction, 8, size - 15 + i, bit(i));
    }

    // Always dark
    setFunction(modules, isFunction, 8, size - 8, true);
}

function drawCodewords
(
    modules:
        boolean[][],
    isFunction:
        boolean[][],
    codewords:
        number[]
):
    void
{
    const size =
        modules.length;

    let i =
        0;

    for
    (
        let right = size - 1;
        right >= 1;
        right -= 2
    )
    {
        if
        (
            right === 6
        )
        {
            right = 5;
        }

        for
        (
            let vertical = 0;
            vertical < size;
            vertical++
        )
        {
            for
            (
                let j = 0;
                j < 2;
                j++
            )
            {
                const x =
                    right - j;

                const upward =
                    ((right + 1) & 2) === 0;

                const y =
                    upward
                        ? size - 1 - vertical
                        : vertical;

                if
                (
                    !isFunction[y][x]
                    &&
                    i < codewords.length * 8
                )
                {
                    modules[y][x] =
                        ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;

                    i++;
                }
            }
        }
    }
}

function applyMask
(
    modules:
        boolean[][],
    isFunction:
        boolean[][],
    mask:
        number
):
    void
{
    const size =
        modules.length;

    for
    (
        let y = 0;
        y < size;
        y++
    )
    {
        for
        (
            let x = 0;
            x < size;
            x++
        )
        {
            let invert:
                boolean;

            switch
            (
                mask
            )
            {
                case 0: invert = (x + y) % 2 === 0; break;
                case 1: invert = y % 2 === 0; break;
                case 2: invert = x % 3 === 0; break;
                case 3: invert = (x + y) % 3 === 0; break;
                case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
                case 5: invert = (x * y) % 2 + (x * y) % 3 === 0; break;
                case 6: invert = ((x * y) % 2 + (x * y) % 3) % 2 === 0; break;
                default: invert = ((x + y) % 2 + (x * y) % 3) % 2 === 0; break;
            }

            if
            (
                !isFunction[y][x]
                &&
                invert
            )
            {
                modules[y][x] = !modules[y][x];
            }
        }
    }
}


//---------------------------------------------------------------
// Penalty (mask choice)
//---------------------------------------------------------------

function penaltyScore
(
    modules:
        boolean[][]
):
    number
{
    const size =
        modules.length;

    let result =
        0;

    const line =
        (get: (i: number) => boolean): void =>
        {
            // Rule 1 : runs of 5+ of one colour
            let run =
                1;

            for
            (
                let i = 1;
                i <= size;
                i++
            )
            {
                if
                (
                    i < size
                    &&
                    get(i) === get(i - 1)
                )
                {
                    run++;
                }
                else
                {
                    if
                    (
                        run >= 5
                    )
                    {
                        result += 3 + (run - 5);
                    }

                    run = 1;
                }
            }

            // Rule 3 : finder-like 1:1:3:1:1 with 4 light modules
            // on one side (light outside the symbol counts)
            const at =
                (i: number): boolean =>
                    i >= 0 && i < size ? get(i) : false;

            for
            (
                let i = -4;
                i < size;
                i++
            )
            {
                const core =
                    at(i) && !at(i + 1) && at(i + 2) && at(i + 3) && at(i + 4) && !at(i + 5) && at(i + 6);

                if
                (
                    !core
                )
                {
                    continue;
                }

                const lightBefore =
                    !at(i - 1) && !at(i - 2) && !at(i - 3) && !at(i - 4);

                const lightAfter =
                    !at(i + 7) && !at(i + 8) && !at(i + 9) && !at(i + 10);

                if
                (
                    lightBefore
                    ||
                    lightAfter
                )
                {
                    result += 40;
                }
            }
        };

    for
    (
        let y = 0;
        y < size;
        y++
    )
    {
        line(x => modules[y][x]);
    }

    for
    (
        let x = 0;
        x < size;
        x++
    )
    {
        line(y => modules[y][x]);
    }

    // Rule 2 : 2×2 blocks of one colour
    for
    (
        let y = 0;
        y < size - 1;
        y++
    )
    {
        for
        (
            let x = 0;
            x < size - 1;
            x++
        )
        {
            const color =
                modules[y][x];

            if
            (
                color === modules[y][x + 1]
                &&
                color === modules[y + 1][x]
                &&
                color === modules[y + 1][x + 1]
            )
            {
                result += 3;
            }
        }
    }

    // Rule 4 : balance of dark and light
    let dark =
        0;

    for
    (
        const row of modules
    )
    {
        for
        (
            const cell of row
        )
        {
            if
            (
                cell
            )
            {
                dark++;
            }
        }
    }

    const total =
        size * size;

    const k =
        Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;

    result += Math.max(0, k) * 10;

    return result;
}