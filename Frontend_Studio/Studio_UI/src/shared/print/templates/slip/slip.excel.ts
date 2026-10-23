//===============================================================
// Shared SLIP print : Excel sheet
//
// Company, title, header pairs (two per row), one row per mode,
// extra rows (charges …), total and amount in words.
//===============================================================

import
{
    ExcelCell,
    ExcelSheet,
    PrintKit
}
from '../../print.models';

import
{
    SlipSheet
}
from './slip-print.model';


export function slipDocumentSheet
(
    sheet:
        SlipSheet,
    kit:
        PrintKit
):
    ExcelSheet
{
    const label =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    const info:
        ExcelCell[][] =
        [];

    for
    (
        let i = 0;
        i < sheet.info.length;
        i += 2
    )
    {
        const left =
            sheet.info[i];

        const right =
            sheet.info[i + 1];

        info.push(
            right
                ? [label(left.label), left.value, null, label(right.label), right.value]
                : [label(left.label), left.value]
        );
    }

    const rows:
        ExcelCell[][] =
    [
        [{ v:kit.company?.CompanyName ?? '', s:'title' }],
        [{ v:sheet.title.toUpperCase(), s:'bold' }],
        [],
        ...info,
        [],
        [label('SL'), label('Mode'), label('Details'), label('Amount')],
        ...sheet.rows.map
        (
            (row, index) =>
            [
                index + 1,
                row.tag,
                row.detail,
                { v:row.amount, s:'money' }
            ] as ExcelCell[]
        ),
        ...sheet.extras.map
        (
            row =>
            [
                null,
                row.tag,
                row.detail,
                { v:row.amount, s:'money' }
            ] as ExcelCell[]
        ),
        [null, label(sheet.totalLabel), null, { v:sheet.total, s:'boldMoney' }],
        [],
        [label('In Words'), kit.words(sheet.total)]
    ];

    return {
        name:sheet.name || sheet.title,
        rows,
        columns:[16, 40, 60, 18],
        merges:['A1:D1', 'A2:D2']
    };
}