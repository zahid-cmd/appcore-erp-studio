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
    HttpClient,
    HttpParams
}
from '@angular/common/http';

import
{
    Observable,
    map
}
from 'rxjs';

import
{
    environment
}
from '../../../environments/environment';

import
{
    VoucherLedger,
    VoucherPeriod,
    BranchOption,
    PartyOption,
    CardOption,
    BankOption,
    CardChargeRate,
    VoucherNumberPreview
}
from './accounting.models';


//===============================================================
// Accounting Lookup Service (shared)
//
// Read-only look-ups for the Voucher Master Data and Payment Desk
// components and the voucher pages. Every value is read in PascalCase or camelCase.
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class AccountingLookupService
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly http =
        inject(HttpClient);

    private readonly api =
        environment.apiUrl;


    //===========================================================
    // Readers
    //===========================================================

    private pick
    (
        item:
            any,
        name:
            string
    ):
        any
    {
        if
        (
            item == null
        )
        {
            return undefined;
        }

        const camel =
            name.charAt(0).toLowerCase() + name.slice(1);

        return item[name] ?? item[camel];
    }

    private text
    (
        item:
            any,
        name:
            string
    ):
        string
    {
        return String(
            this.pick(item, name) ?? ''
        ).trim();
    }

    private num
    (
        item:
            any,
        name:
            string
    ):
        number
    {
        const value =
            Number(
                this.pick(item, name) ?? 0
            );

        return Number.isFinite(value)
            ? value
            : 0;
    }

    private bool
    (
        item:
            any,
        name:
            string,
        fallback:
            boolean
    ):
        boolean
    {
        const value =
            this.pick(item, name);

        return value == null
            ? fallback
            : Boolean(value);
    }

    private list
    (
        response:
            any
    ):
        any[]
    {
        return Array.isArray(response)
            ? response
            : [];
    }


    //===========================================================
    // Ledgers (GL + Cash / Bank / MFS / POS / EMI)
    //===========================================================

    getLedgers
    (
        activeOnly:
            boolean =
            true
    ):
        Observable<VoucherLedger[]>
    {
        const params =
            new HttpParams()
                .set(
                    'activeOnly',
                    String(activeOnly)
                );

        return this.http
            .get<any[]>(
                `${this.api}/platform/accounting/ledgers`,
                {
                    params
                }
            )
            .pipe(
                map(
                    response =>
                        this.list(response).map
                        (
                            x =>
                            ({
                                AccountId:this.num(x, 'AccountId'),
                                LedgerCode:this.text(x, 'LedgerCode'),
                                LedgerName:this.text(x, 'LedgerName'),
                                LedgerType:this.text(x, 'LedgerType'),
                                ClassCode:this.text(x, 'ClassCode'),
                                GroupCode:this.text(x, 'GroupCode'),
                                SubGroupCode:this.text(x, 'SubGroupCode'),
                                SubGroupName:this.text(x, 'SubGroupName'),
                                Branch:this.text(x, 'Branch'),
                                BranchExclusive:this.bool(x, 'BranchExclusive', false),
                                CollectionAccount:this.bool(x, 'CollectionAccount', false),
                                PaymentAccount:this.bool(x, 'PaymentAccount', false),
                                IsMoneyLedger:this.bool(x, 'IsMoneyLedger', false),
                                ChargePercent:this.num(x, 'ChargePercent'),
                                IsActive:this.bool(x, 'IsActive', true)
                            })
                        )
                )
            );
    }


    //===========================================================
    // Period (branch digits + open financial year of a date)
    // Errors come back as HTTP 400 with the reason as text.
    //===========================================================

    getPeriod
    (
        branchId:
            number,
        date:
            string
    ):
        Observable<VoucherPeriod>
    {
        const params =
            new HttpParams()
                .set('branchId', String(branchId))
                .set('date', date);

        return this.http
            .get<any>(
                `${this.api}/platform/accounting/period`,
                {
                    params
                }
            )
            .pipe(
                map(
                    x =>
                    ({
                        BranchId:this.num(x, 'BranchId'),
                        BranchCode:this.text(x, 'BranchCode'),
                        BranchName:this.text(x, 'BranchName'),
                        BranchDigits:this.text(x, 'BranchDigits'),
                        FinancialYearId:this.num(x, 'FinancialYearId'),
                        FinancialYearName:this.text(x, 'FinancialYearName'),
                        FinancialYearCode:this.text(x, 'FinancialYearCode'),
                        PeriodMonth:this.num(x, 'PeriodMonth'),
                        VoucherDate:this.text(x, 'VoucherDate')
                    })
                )
            );
    }


    //===========================================================
    // Next voucher number (preview : nothing is reserved; the
    // number actually taken on save may be higher)
    //===========================================================

    getNextVoucherNo
    (
        prefix:
            string,
        branchId:
            number,
        date:
            string
    ):
        Observable<VoucherNumberPreview>
    {
        const params =
            new HttpParams()
                .set('prefix', prefix)
                .set('branchId', String(branchId))
                .set('date', date);

        return this.http
            .get<any>(
                `${this.api}/platform/accounting/next-number`,
                {
                    params
                }
            )
            .pipe(
                map(
                    x =>
                    ({
                        BranchId:this.num(x, 'BranchId'),
                        BranchCode:this.text(x, 'BranchCode'),
                        BranchName:this.text(x, 'BranchName'),
                        BranchDigits:this.text(x, 'BranchDigits'),
                        FinancialYearId:this.num(x, 'FinancialYearId'),
                        FinancialYearName:this.text(x, 'FinancialYearName'),
                        FinancialYearCode:this.text(x, 'FinancialYearCode'),
                        PeriodMonth:this.num(x, 'PeriodMonth'),
                        VoucherDate:this.text(x, 'VoucherDate'),
                        VoucherNo:this.text(x, 'VoucherNo')
                    })
                )
            );
    }


    //===========================================================
    // Auto-generated ledger codes (UPPER)
    //
    // General Ledgers created by other pages (Product Category,
    // Motor Bikes, Service Settings, Membership, ...) from
    // settings/account-settings/auto-accounts/codes. Vouchers
    // never offer them in the General Ledger list.
    //===========================================================

    getAutoLedgerCodes():
        Observable<Set<string>>
    {
        return this.http
            .get<any>(
                `${this.api}/settings/account-settings/auto-accounts/codes`
            )
            .pipe(
                map(
                    response =>
                    {
                        const read =
                            (name: string): string[] =>
                            {
                                const value =
                                    this.pick(response, name);

                                return Array.isArray(value)
                                    ? value.map(item => String(item ?? '').trim().toUpperCase())
                                    : [];
                            };

                        return new Set<string>(
                            [
                                ...read('InventoryLedgerCodes'),
                                ...read('FinancialLedgerCodes')
                            ]
                            .filter
                            (
                                code =>
                                    code.length > 0
                            )
                        );
                    }
                )
            );
    }


    //===========================================================
    // Branches
    //===========================================================

    getBranches():
        Observable<BranchOption[]>
    {
        return this.http
            .get<any[]>(
                `${this.api}/settings/general-settings/branches`
            )
            .pipe(
                map(
                    response =>
                        this.list(response).map
                        (
                            x =>
                            ({
                                BranchId:this.num(x, 'BranchId'),
                                BranchCode:this.text(x, 'BranchCode'),
                                BranchName:this.text(x, 'BranchName'),
                                IsActive:this.bool(x, 'IsActive', true)
                            })
                        )
                )
            );
    }


    //===========================================================
    // Customers (receivable ledgers)
    //===========================================================

    getCustomers():
        Observable<PartyOption[]>
    {
        return this.http
            .get<any[]>(
                `${this.api}/settings/client-settings/customer-profiles`
            )
            .pipe(
                map(
                    response =>
                        this.list(response).map
                        (
                            x =>
                            ({
                                Code:this.text(x, 'CustomerCode'),
                                Name:this.text(x, 'DisplayName') || this.text(x, 'CustomerName'),
                                LedgerCode:this.text(x, 'ReceivableLedgerCode'),
                                LedgerName:this.text(x, 'ReceivableLedgerName'),
                                IsActive:this.bool(x, 'IsActive', true)
                            })
                        )
                )
            );
    }


    //===========================================================
    // Suppliers (payable ledgers)
    //===========================================================

    getSuppliers():
        Observable<PartyOption[]>
    {
        return this.http
            .get<any[]>(
                `${this.api}/settings/client-settings/supplier-profiles`
            )
            .pipe(
                map(
                    response =>
                        this.list(response).map
                        (
                            x =>
                            ({
                                Code:this.text(x, 'SupplierCode'),
                                Name:this.text(x, 'DisplayName') || this.text(x, 'SupplierName'),
                                LedgerCode:this.text(x, 'PayableLedgerCode'),
                                LedgerName:this.text(x, 'PayableLedgerName'),
                                IsActive:this.bool(x, 'IsActive', true)
                            })
                        )
                )
            );
    }


    //===========================================================
    // Cards (Card Setup)
    //===========================================================

    getCards():
        Observable<CardOption[]>
    {
        return this.http
            .get<any[]>(
                `${this.api}/settings/account-settings/card-setup`
            )
            .pipe(
                map(
                    response =>
                        this.list(response).map
                        (
                            x =>
                            ({
                                CardSetupId:this.num(x, 'CardSetupId'),
                                CardCode:this.text(x, 'CardCode'),
                                CardName:this.text(x, 'CardName'),
                                IssuingBank:this.text(x, 'IssuingBank'),
                                IsActive:this.bool(x, 'Status', this.bool(x, 'IsActive', true))
                            })
                        )
                )
            );
    }


    //===========================================================
    // Banks (Bank Setup) : cheque issuing bank
    //===========================================================

    getBanks():
        Observable<BankOption[]>
    {
        return this.http
            .get<any[]>(
                `${this.api}/settings/account-settings/bank-setup`
            )
            .pipe(
                map(
                    response =>
                        this.list(response).map
                        (
                            x =>
                            ({
                                BankName:this.text(x, 'BankName'),
                                ShortName:this.text(x, 'ShortName'),
                                IsActive:this.bool(x, 'Status', this.bool(x, 'IsActive', true))
                            })
                        )
                )
            );
    }


    //===========================================================
    // Card Charges (POS account + card → charge %)
    //===========================================================

    getCardCharges():
        Observable<CardChargeRate[]>
    {
        return this.http
            .get<any[]>(
                `${this.api}/settings/account-settings/card-charges`
            )
            .pipe(
                map(
                    response =>
                    {
                        const rates:
                            CardChargeRate[] =
                            [];

                        for
                        (
                            const pos
                            of this.list(response)
                        )
                        {
                            const posAccountId =
                                this.num(pos, 'POSAccountId');

                            const details:
                                any[] =
                                this.list(
                                    this.pick(pos, 'Details')
                                );

                            for
                            (
                                const line
                                of details
                            )
                            {
                                rates.push
                                ({
                                    POSAccountId:posAccountId,
                                    CardSetupId:this.num(line, 'CardSetupId'),
                                    ChargePercent:this.num(line, 'ChargePercent')
                                });
                            }
                        }

                        return rates;
                    }
                )
            );
    }


    //===========================================================
    // Card charges of ONE POS account
    // (card-charges/{posAccountId} : the list call may not carry
    // the card lines)
    //===========================================================

    getCardChargesForPos
    (
        posAccountId:
            number
    ):
        Observable<CardChargeRate[]>
    {
        return this.http
            .get<any>(
                `${this.api}/settings/account-settings/card-charges/${posAccountId}`
            )
            .pipe(
                map(
                    response =>
                        this.list(
                            this.pick(response, 'Details')
                        )
                        .map
                        (
                            line =>
                            ({
                                POSAccountId:
                                    posAccountId,

                                CardSetupId:
                                    this.num(line, 'CardSetupId'),

                                ChargePercent:
                                    this.num(line, 'ChargePercent')
                            })
                        )
                )
            );
    }
}