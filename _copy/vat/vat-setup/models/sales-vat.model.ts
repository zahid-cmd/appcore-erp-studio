/* ============================================================
   Sales VAT rules (VAT Management › VAT Setup)
   The VAT rate of a VAT Type from Effective From to Valid To
   (default 30 June). Same rate next period = Extend; a new rate
   = a new rule. Active rules of a type never overlap.
     VAT Type : Motor Bikes / Spare Parts / Lubricants / Accessories / Service Charges
     Price Includes VAT : Yes = the sale price already holds the VAT
     Ledger   : VAT Current Account (General Ledger code)
============================================================ */

export interface SalesVat
{
    SalesVatId:
        number;

    // SVT-0001
    VatCode:
        string;

    VatType:
        string;

    // 0 – 100
    VatRate:
        number;

    PriceIncludesVat:
        boolean;

    // yyyy-MM-dd
    EffectiveFrom:
        string;

    // yyyy-MM-dd
    ValidTo:
        string;

    // Current / Expiring / Expired / Upcoming / Old / Inactive
    RateState:
        string;

    // Days left to Valid To (negative once passed)
    DaysToExpiry:
        number;

    LedgerCode:
        string;

    LedgerName:
        string;

    Remarks:
        string;

    Status:
        boolean;
}


export interface CreateSalesVat
{
    VatType:
        string;

    VatRate:
        number;

    PriceIncludesVat:
        boolean;

    // yyyy-MM-dd
    EffectiveFrom:
        string;

    // yyyy-MM-dd
    ValidTo:
        string;

    LedgerCode:
        string;

    Remarks:
        string;

    Status:
        boolean;
}


export interface ExtendSalesVat
{
    SalesVatId:
        number;

    // yyyy-MM-dd (after the current Valid To)
    ValidTo:
        string;
}


export interface UpdateSalesVat
    extends CreateSalesVat
{
    SalesVatId:
        number;
}


export interface SalesVatLedgerOption
{
    LedgerCode:
        string;

    LedgerName:
        string;

    IsActive:
        boolean;
}


export interface SalesVatDefaults
{
    // Next code (preview)
    Code:
        string;

    VatTypes:
        string[];

    Ledgers:
        SalesVatLedgerOption[];

    // VAT Type → ledger code of its latest rule
    SuggestedLedgers:
        Record<string, string>;

    // yyyy-MM-dd (Asia/Dhaka)
    Today:
        string;

    // yyyy-MM-dd : 30 June ending the financial year
    DefaultValidTo:
        string;

    // "Expiring" starts this many days before Valid To
    ReminderDays:
        number;
}