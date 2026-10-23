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
    FT_MAX_LINES:             'CFG-MOD-004-0036'
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