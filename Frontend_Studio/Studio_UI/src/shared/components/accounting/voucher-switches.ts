//===============================================================
// Imports
//===============================================================

import
{
    Injectable,
    inject
}
from '@angular/core';

import
{
    firstValueFrom,
    of,
    catchError
}
from 'rxjs';

import
{
    SystemConfiguration
}
from '../../../features/settings/general-settings/models/system-configurations.model';

import
{
    SystemConfigurationsService
}
from '../../../features/settings/general-settings/services/system-configurations.service';


//===============================================================
// Voucher switches (Settings › System Configuration,
// module Accounts & Finance)
//
// Always read BY CODE, never by name. A switch that does not
// exist (or cannot be read) uses its fallback = the behaviour
// before the switch existed.
//===============================================================

export const VOUCHER_SWITCH =
{
    // Receipt Voucher
    RV_MULTI_MODE:            'CFG-MOD-004-0001',
    MR_MULTI_MODE:            'CFG-MOD-004-0002',
    RV_POST_ON_APPROVAL:      'CFG-MOD-004-0003',
    RV_PRINT_LEDGER_CODES:    'CFG-MOD-004-0004',
    RV_PRINT_WORKFLOW_DATES:  'CFG-MOD-004-0005',
    RV_PRINT_ON_APPROVAL:     'CFG-MOD-004-0006',
    MR_OFFICE_COPY:           'CFG-MOD-004-0007',
    MR_PARTY_CODE:            'CFG-MOD-004-0008',
    MR_CHARGES_LINE:          'CFG-MOD-004-0009',

    // Payment Voucher
    PV_MULTI_MODE:            'CFG-MOD-004-0010',
    PS_MULTI_MODE:            'CFG-MOD-004-0011',
    PV_POST_ON_APPROVAL:      'CFG-MOD-004-0012',
    PV_PRINT_LEDGER_CODES:    'CFG-MOD-004-0013',
    PV_PRINT_WORKFLOW_DATES:  'CFG-MOD-004-0014',
    PV_PRINT_ON_APPROVAL:     'CFG-MOD-004-0015',
    PS_OFFICE_COPY:           'CFG-MOD-004-0016',
    PS_PARTY_CODE:            'CFG-MOD-004-0017',
    PS_CHARGES_LINE:          'CFG-MOD-004-0018',

    // Journal Voucher
    JV_POST_ON_APPROVAL:      'CFG-MOD-004-0019',
    JV_PRINT_LEDGER_CODES:    'CFG-MOD-004-0020',
    JV_PRINT_WORKFLOW_DATES:  'CFG-MOD-004-0021',
    JV_PRINT_ON_APPROVAL:     'CFG-MOD-004-0022',

    // Fund Transfer
    FT_MULTI_MODE:            'CFG-MOD-004-0023',
    FT_POST_ON_APPROVAL:      'CFG-MOD-004-0024',
    FT_PRINT_LEDGER_CODES:    'CFG-MOD-004-0025',
    FT_PRINT_WORKFLOW_DATES:  'CFG-MOD-004-0026',
    FT_PRINT_ON_APPROVAL:     'CFG-MOD-004-0027',

    // Every voucher print
    PRINT_LOGO:               'CFG-MOD-004-0028',
    PRINT_BIN_TIN:            'CFG-MOD-004-0029',
    PRINT_STAMP:              'CFG-MOD-004-0030',

    // One receipt / slip per customer, supplier or ledger
    MR_PER_PARTY:             'CFG-MOD-004-0031',
    PS_PER_PARTY:             'CFG-MOD-004-0032',

    // Max Lines (Value = most debit + credit rows; OFF = no limit)
    RV_MAX_LINES:             'CFG-MOD-004-0033',
    PV_MAX_LINES:             'CFG-MOD-004-0034',
    JV_MAX_LINES:             'CFG-MOD-004-0035',
    FT_MAX_LINES:             'CFG-MOD-004-0036',

    // Voucher date window (Value = most days back / ahead; empty
    // = no limit). OFF = today or later / today or earlier.
    RV_BACK_DATED:            'CFG-MOD-004-0037',
    RV_POST_DATED:            'CFG-MOD-004-0038',
    PV_BACK_DATED:            'CFG-MOD-004-0039',
    PV_POST_DATED:            'CFG-MOD-004-0040',
    JV_BACK_DATED:            'CFG-MOD-004-0041',
    JV_POST_DATED:            'CFG-MOD-004-0042',
    FT_BACK_DATED:            'CFG-MOD-004-0043',
    FT_POST_DATED:            'CFG-MOD-004-0044',

    // Journal Voucher : several balanced groups (OFF = one group)
    JV_MULTI_GROUP:           'CFG-MOD-004-0045',

    // Fund Transfer Advice : one advice per To account
    FTA_PER_TO:               'CFG-MOD-004-0046',

    // Check Reconciliation : deposit / clear / dishonour several
    // checks at once from the cart (OFF = one check at a time)
    CHECK_MULTI:              'CFG-MOD-004-0047',

    // Check Reconciliation : ask to print the slip / voucher after
    // an action (OFF = no prompt)
    CHECK_PRINT_PROMPT:       'CFG-MOD-004-0048',

    // Check Reconciliation : ON = one RRV / RRP per bank account
    // per Save; OFF = one per source Receipt / Payment Voucher
    CHECK_ONE_VOUCHER_PER_BATCH: 'CFG-MOD-004-0049',

    // Check Reconciliation : a dishonour recovers its bank charges
    // from the payer (read-only Recovery column); OFF = no recovery
    CHECK_DISHONOUR_RECOVERY: 'CFG-MOD-004-0050',

    // MFS Reconciliation : nightly Auto Settlement of the due
    // Merchant wallet receipts; Value = working days after the
    // receipt date (Friday / Saturday skipped)
    MFS_AUTO_SETTLEMENT:      'CFG-MOD-004-0051',

    // MFS Reconciliation : the fee may be changed per transaction
    // in the MFS Settlement Center (OFF = the wallet's % only)
    MFS_EDIT_CHARGES:         'CFG-MOD-004-0052',

    // MFS Reconciliation : ask to print the voucher after a
    // settlement / reject (OFF = no prompt)
    MFS_PRINT_PROMPT:         'CFG-MOD-004-0053',

    // POS Reconciliation : nightly Auto Settlement of the due card
    // receipts; Value = working days after the receipt date
    POS_AUTO_SETTLEMENT:      'CFG-MOD-004-0054',

    // POS Reconciliation : the bank charges may be changed per
    // transaction (OFF = the charge saved on the Receipt Voucher)
    POS_EDIT_CHARGES:         'CFG-MOD-004-0055',

    // POS Reconciliation : ask to print the voucher after a
    // settlement / reject (OFF = no prompt)
    POS_PRINT_PROMPT:         'CFG-MOD-004-0056'
} as const;

// Code → enabled
export type SwitchMap =
    Record<string, boolean>;

// Code → Value (text; '' when none)
export type SwitchValueMap =
    Record<string, string>;

// A whole-number setting : the Value when the switch is ON and
// the Value is a positive whole number, otherwise 0 (= no limit)
export function switchNumber
(
    switches:
        SwitchMap | null | undefined,
    values:
        SwitchValueMap | null | undefined,
    code:
        string
):
    number
{
    if
    (
        !switchOn(switches, code, false)
    )
    {
        return 0;
    }

    const value =
        Number(
            (values?.[code] ?? '').trim()
        );

    return Number.isInteger(value) && value > 0
        ? value
        : 0;
}

export function switchOn
(
    switches:
        SwitchMap | null | undefined,
    code:
        string,
    fallback:
        boolean
):
    boolean
{
    const value =
        switches?.[code];

    return typeof value === 'boolean'
        ? value
        : fallback;
}


//===============================================================
// Loader (all switches, any module)
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class VoucherSwitchesService
{
    private readonly configurations =
        inject(SystemConfigurationsService);

    // false when the last load could not read the list (every
    // switch then uses its fallback)
    lastLoadOk:
        boolean =
        true;

    // Values of the last load (code → Value)
    lastValues:
        SwitchValueMap =
        {};

    // Code → enabled; {} when the list cannot be read
    async load():
        Promise<SwitchMap>
    {
        let failed =
            false;

        const rows =
            await firstValueFrom(
                this.configurations
                    .getAll()
                    .pipe(
                        catchError(
                            error =>
                            {
                                failed =
                                    true;

                                console.warn(
                                    '[Voucher switches] System Configuration could not be read; defaults are used.',
                                    error
                                );

                                return of([] as SystemConfiguration[]);
                            }
                        )
                    )
            );

        this.lastLoadOk =
            !failed;

        const result:
            SwitchMap =
            {};

        const values:
            SwitchValueMap =
            {};

        for
        (
            const row of rows
        )
        {
            const code =
                (row.ConfigurationCode ?? '').trim().toUpperCase();

            if
            (
                code
            )
            {
                result[code] =
                    !!row.IsEnabled;

                values[code] =
                    String((row as { Value?: string }).Value ?? '').trim();
            }
        }

        this.lastValues =
            values;

        console.info(
            '[Voucher switches]',
            result,
            values
        );

        return result;
    }
}


//===============================================================
// Voucher date window (Back Dated / Post Dated Entry)
//
//   Back Dated ON  : earlier dates allowed (Value = most days
//                    back; empty = any day of the open year)
//   Back Dated OFF : nothing before today
//   Post Dated ON  : later dates allowed (Value = most days ahead)
//   Post Dated OFF : nothing after today
// A missing switch = allowed (today's behaviour).
//===============================================================

export interface VoucherDateWindow
{
    // Earliest / latest allowed date; null = no limit
    min: Date | null;

    max: Date | null;
}

function startOfToday():
    Date
{
    const now =
        new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );
}

function addDays
(
    value:
        Date,
    days:
        number
):
    Date
{
    return new Date(
        value.getFullYear(),
        value.getMonth(),
        value.getDate() + days
    );
}

// Positive whole number of the Value, else 0 (no limit)
function switchDays
(
    values:
        SwitchValueMap | null | undefined,
    code:
        string
):
    number
{
    const value =
        Number(
            (values?.[code] ?? '').trim()
        );

    return Number.isInteger(value) && value > 0
        ? value
        : 0;
}

export function voucherDateWindow
(
    switches:
        SwitchMap | null | undefined,
    values:
        SwitchValueMap | null | undefined,
    backCode:
        string,
    postCode:
        string
):
    VoucherDateWindow
{
    const today =
        startOfToday();

    const backOn =
        switchOn(switches, backCode, true);

    const postOn =
        switchOn(switches, postCode, true);

    const backDays =
        switchDays(values, backCode);

    const postDays =
        switchDays(values, postCode);

    return {
        min:
            !backOn
                ? today
                : backDays > 0
                    ? addDays(today, -backDays)
                    : null,

        max:
            !postOn
                ? today
                : postDays > 0
                    ? addDays(today, postDays)
                    : null
    };
}

// '' when the date (yyyy-MM-dd) is inside the window
export function voucherDateIssue
(
    isoDate:
        string,
    window:
        VoucherDateWindow
):
    string
{
    const parts =
        (isoDate ?? '').substring(0, 10).split('-').map(Number);

    if
    (
        parts.length !== 3
        ||
        parts.some(part => !Number.isFinite(part))
    )
    {
        return '';
    }

    const date =
        new Date(parts[0], parts[1] - 1, parts[2]);

    const today =
        startOfToday();

    const show =
        (value: Date): string =>
            value.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }).replace(/ /g, '-');

    if
    (
        window.min
        &&
        date < window.min
    )
    {
        return window.min.getTime() === today.getTime()
            ? 'Back dated entry is not allowed : the voucher date cannot be before today.'
            : `Back dated entry is allowed up to ${show(window.min)} only.`;
    }

    if
    (
        window.max
        &&
        date > window.max
    )
    {
        return window.max.getTime() === today.getTime()
            ? 'Post dated entry is not allowed : the voucher date cannot be after today.'
            : `Post dated entry is allowed up to ${show(window.max)} only.`;
    }

    return '';
}