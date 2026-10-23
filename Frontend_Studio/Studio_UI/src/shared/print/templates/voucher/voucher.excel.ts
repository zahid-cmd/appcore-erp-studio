//===============================================================
// Shared VOUCHER print : Excel sheet
//
// Company, title, header pairs (two per row), the Dr / Cr lines,
// total and amount in words.
//===============================================================

import
{
    roundMoney
}
from '../../../components/accounting/accounting.models';

import
{
    ExcelCell,
    ExcelSheet,
    PrintKit
}
from '../../print.models';

import
{
    VoucherPrintModel
}
from './voucher-print.model';


export function voucherDocumentSheet
(
    model:
        VoucherPrintModel,
    kit:
        PrintKit
):
    ExcelSheet
{
    const totalDebit =
        roundMoney(model.lines.reduce((sum, line) => sum + line.debit, 0));

    const totalCredit =
        roundMoney(model.lines.reduce((sum, line) => sum + line.credit, 0));

    const label =
        (text: string): ExcelCell =>
            ({ v:text, s:'bold' });

    // Header pairs, two per row
    const info:
        ExcelCell[][] =
        [];

    for
    (
        let i = 0;
        i < model.sheetInfo.length;
        i += 2
    )
    {
        const left =
            model.sheetInfo[i];

        const right =
            model.sheetInfo[i + 1];

        info.push(
            right
                ? [label(left.label), left.value, null, label(right.label), right.value]
                : [label(left.label), left.value]
        );
    }

    let serial =
        0;

    const rows:
        ExcelCell[][] =
    [
        [{ v:kit.company?.CompanyName ?? '', s:'title' }],
        [{ v:model.title.toUpperCase(), s:'bold' }],
        [],
        ...info,
        [label('Narration'), model.narration],
        [],
        [label('SL'), label('Account'), label('Code'), label('Details'), label('Short Notes'), label('Debit'), label('Credit')],
        ...model.lines.map
        (
            line =>
            [
                line.system ? null : ++serial,
                line.name,
                line.code,
                line.details,
                line.notes,
                line.debit ? { v:line.debit, s:'money' } : null,
                line.credit ? { v:line.credit, s:'money' } : null
            ] as ExcelCell[]
        ),
        [null, label('Total'), null, null, null, { v:totalDebit, s:'boldMoney' }, { v:totalCredit, s:'boldMoney' }],
        [],
        [label('In Words'), kit.words(model.total)]
    ];

    const narrationRow =
        3 + info.length + 1;

    return {
        name:model.sheetName || model.title,
        rows,
        columns:[8, 42, 26, 40, 24, 16, 16],
        merges:['A1:G1', 'A2:G2', `B${narrationRow}:G${narrationRow}`]
    };
}