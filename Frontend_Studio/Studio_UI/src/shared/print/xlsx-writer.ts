//===============================================================
// XLSX Writer (no library)
//
// Builds a real .xlsx (Office Open XML) workbook in the browser:
// a ZIP (stored, no compression) of the minimum XML parts.
// Cells : text, number, empty; styles : normal, bold, money
// (#,##0.00), bold money, title. Column widths, merged cells.
//===============================================================

import
{
    ExcelCell,
    ExcelSheet
}
from './print.models';


//===============================================================
// Public : workbook → Blob
//===============================================================

export function buildXlsx
(
    sheets:
        ExcelSheet[]
):
    Blob
{
    const list =
        sheets.length > 0
            ? sheets
            : [{ name:'Sheet1', rows:[] } as ExcelSheet];

    const names =
        uniqueSheetNames(
            list.map(sheet => sheet.name)
        );

    const files:
        { path: string; data: string }[] =
    [
        {
            path:'[Content_Types].xml',
            data:contentTypes(list.length)
        },
        {
            path:'_rels/.rels',
            data:rootRels()
        },
        {
            path:'xl/workbook.xml',
            data:workbook(names)
        },
        {
            path:'xl/_rels/workbook.xml.rels',
            data:workbookRels(list.length)
        },
        {
            path:'xl/styles.xml',
            data:styles()
        },
        ...list.map
        (
            (sheet, index) =>
            ({
                path:`xl/worksheets/sheet${index + 1}.xml`,
                data:worksheet(sheet)
            })
        )
    ];

    return new Blob(
        [zipStore(files) as BlobPart],
        {
            type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
    );
}


//===============================================================
// Styles : 0 normal, 1 bold, 2 money, 3 bold money, 4 title,
//          5 muted (italic grey)
//===============================================================

const STYLE_INDEX:
    Record<string, number> =
{
    normal:0,
    bold:1,
    money:2,
    boldMoney:3,
    title:4,
    muted:5
};

function styles():
    string
{
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="1"><numFmt numFmtId="164" formatCode="#,##0.00"/></numFmts>
<fonts count="4">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="14"/><color rgb="FF1E3A8A"/><name val="Calibri"/></font>
<font><i/><sz val="10"/><color rgb="FF6B7280"/><name val="Calibri"/></font>
</fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}


//===============================================================
// Worksheet
//===============================================================

function worksheet
(
    sheet:
        ExcelSheet
):
    string
{
    const rows =
        sheet.rows
            .map
            (
                (row, rowIndex) =>
                {
                    const cells =
                        row
                            .map
                            (
                                (cell, colIndex) =>
                                    cellXml(
                                        cell,
                                        `${columnName(colIndex)}${rowIndex + 1}`
                                    )
                            )
                            .join('');

                    return `<row r="${rowIndex + 1}">${cells}</row>`;
                }
            )
            .join('');

    const cols =
        (sheet.columns ?? []).length > 0
            ? `<cols>${(sheet.columns ?? [])
                .map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`)
                .join('')}</cols>`
            : '';

    const merges =
        (sheet.merges ?? []).length > 0
            ? `<mergeCells count="${(sheet.merges ?? []).length}">${(sheet.merges ?? [])
                .map(range => `<mergeCell ref="${xmlEscape(range)}"/>`)
                .join('')}</mergeCells>`
            : '';

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
${cols}<sheetData>${rows}</sheetData>${merges}
</worksheet>`;
}

function cellXml
(
    cell:
        ExcelCell,
    ref:
        string
):
    string
{
    if
    (
        cell === null
        ||
        cell === undefined
        ||
        cell === ''
    )
    {
        return '';
    }

    const value =
        typeof cell === 'object'
            ? cell.v
            : cell;

    const style =
        typeof cell === 'object'
            ? STYLE_INDEX[cell.s ?? 'normal'] ?? 0
            : 0;

    const s =
        style
            ? ` s="${style}"`
            : '';

    if
    (
        typeof value === 'number'
        &&
        Number.isFinite(value)
    )
    {
        return `<c r="${ref}"${s}><v>${value}</v></c>`;
    }

    if
    (
        value === null
        ||
        value === undefined
        ||
        value === ''
    )
    {
        return '';
    }

    return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${xmlEscape(String(value))}</t></is></c>`;
}

// 0 → A, 25 → Z, 26 → AA
function columnName
(
    index:
        number
):
    string
{
    let n =
        index + 1;

    let name =
        '';

    while
    (
        n > 0
    )
    {
        const rest =
            (n - 1) % 26;

        name =
            String.fromCharCode(65 + rest) + name;

        n =
            Math.floor((n - 1) / 26);
    }

    return name;
}


//===============================================================
// Package parts
//===============================================================

function contentTypes
(
    count:
        number
):
    string
{
    const sheets =
        Array.from
        (
            { length:count },
            (_, index) =>
                `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
        )
        .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${sheets}
</Types>`;
}

function rootRels():
    string
{
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function workbook
(
    names:
        string[]
):
    string
{
    const sheets =
        names
            .map
            (
                (name, index) =>
                    `<sheet name="${xmlEscape(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`
            )
            .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets>${sheets}</sheets>
</workbook>`;
}

function workbookRels
(
    count:
        number
):
    string
{
    const sheets =
        Array.from
        (
            { length:count },
            (_, index) =>
                `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
        )
        .join('');

    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
${sheets}
<Relationship Id="rId${count + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

// Excel : max 31 chars, no : \ / ? * [ ], unique
function uniqueSheetNames
(
    names:
        string[]
):
    string[]
{
    const used =
        new Set<string>();

    return names.map
    (
        (raw, index) =>
        {
            let base =
                (raw || `Sheet${index + 1}`)
                    .replace(/[:\\/?*[\]]/g, ' ')
                    .trim()
                    .slice(0, 31)
                ||
                `Sheet${index + 1}`;

            let name =
                base;

            let n =
                2;

            while
            (
                used.has(name.toLowerCase())
            )
            {
                const suffix =
                    ` (${n++})`;

                name =
                    base.slice(0, 31 - suffix.length) + suffix;
            }

            used.add(
                name.toLowerCase()
            );

            return name;
        }
    );
}

function xmlEscape
(
    value:
        string
):
    string
{
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        // Control characters are not allowed in XML
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}


//===============================================================
// ZIP (stored entries, CRC-32)
//===============================================================

let crcTable:
    Uint32Array | null =
    null;

function crc32
(
    bytes:
        Uint8Array
):
    number
{
    if
    (
        !crcTable
    )
    {
        crcTable =
            new Uint32Array(256);

        for
        (
            let n = 0;
            n < 256;
            n++
        )
        {
            let c =
                n;

            for
            (
                let k = 0;
                k < 8;
                k++
            )
            {
                c =
                    c & 1
                        ? 0xEDB88320 ^ (c >>> 1)
                        : c >>> 1;
            }

            crcTable[n] =
                c >>> 0;
        }
    }

    let crc =
        0xFFFFFFFF;

    for
    (
        let i = 0;
        i < bytes.length;
        i++
    )
    {
        crc =
            crcTable[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    }

    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function zipStore
(
    files:
        { path: string; data: string }[]
):
    Uint8Array
{
    const encoder =
        new TextEncoder();

    const chunks:
        Uint8Array[] =
        [];

    const central:
        Uint8Array[] =
        [];

    let offset =
        0;

    // DOS date / time : fixed (1980-01-01 00:00)
    const dosTime =
        0;

    const dosDate =
        (0 << 9) | (1 << 5) | 1;

    for
    (
        const file of files
    )
    {
        const name =
            encoder.encode(file.path);

        const data =
            encoder.encode(file.data);

        const crc =
            crc32(data);

        const local =
            new Uint8Array(30 + name.length);

        const lv =
            new DataView(local.buffer);

        lv.setUint32(0, 0x04034B50, true);
        lv.setUint16(4, 20, true);
        lv.setUint16(6, 0x0800, true);
        lv.setUint16(8, 0, true);
        lv.setUint16(10, dosTime, true);
        lv.setUint16(12, dosDate, true);
        lv.setUint32(14, crc, true);
        lv.setUint32(18, data.length, true);
        lv.setUint32(22, data.length, true);
        lv.setUint16(26, name.length, true);
        lv.setUint16(28, 0, true);
        local.set(name, 30);

        chunks.push(local, data);

        const entry =
            new Uint8Array(46 + name.length);

        const cv =
            new DataView(entry.buffer);

        cv.setUint32(0, 0x02014B50, true);
        cv.setUint16(4, 20, true);
        cv.setUint16(6, 20, true);
        cv.setUint16(8, 0x0800, true);
        cv.setUint16(10, 0, true);
        cv.setUint16(12, dosTime, true);
        cv.setUint16(14, dosDate, true);
        cv.setUint32(16, crc, true);
        cv.setUint32(20, data.length, true);
        cv.setUint32(24, data.length, true);
        cv.setUint16(28, name.length, true);
        cv.setUint16(30, 0, true);
        cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true);
        cv.setUint16(36, 0, true);
        cv.setUint32(38, 0, true);
        cv.setUint32(42, offset, true);
        entry.set(name, 46);

        central.push(entry);

        offset +=
            local.length + data.length;
    }

    const centralSize =
        central.reduce((sum, part) => sum + part.length, 0);

    const end =
        new Uint8Array(22);

    const ev =
        new DataView(end.buffer);

    ev.setUint32(0, 0x06054B50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);

    const all =
        [...chunks, ...central, end];

    const total =
        all.reduce((sum, part) => sum + part.length, 0);

    const result =
        new Uint8Array(new ArrayBuffer(total));

    let position =
        0;

    for
    (
        const part of all
    )
    {
        result.set(part, position);

        position +=
            part.length;
    }

    return result;
}