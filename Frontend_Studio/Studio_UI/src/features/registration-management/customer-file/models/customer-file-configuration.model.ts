/* ============================================================
   Customer File Configuration (hand-written page, no Code Sync)

   Two tabs; each shows its Rules (dated) or its Required
   Documents (switch on the toolbar) :
     Name Transfer   NTR-001 rules · NTD-001 documents
     File Delivery   FDR-001 rules · FDD-001 documents
============================================================ */

export type CustomerFileTab =
    | 'NameTransfer'
    | 'FileDelivery';

export type CustomerFileView =
    | 'Rules'
    | 'Documents';

export type CustomerFileRateState =
    | 'Current'
    | 'Upcoming'
    | 'Old';


export interface NameTransferRule
{
    NameTransferRuleId:number;
    PublicId:string;
    Code:string;
    // yyyy-MM-dd
    EffectiveFrom:string;
    TransfersAllowed:number;
    FeePerTransfer:number;
    RateState:CustomerFileRateState;
    Remarks:string;
    IsActive:boolean;
}


export interface DeliveryRule
{
    DeliveryRuleId:number;
    PublicId:string;
    Code:string;
    EffectiveFrom:string;
    FreeDays:number;
    FirstYearAmount:number;
    SecondYearAmount:number;
    PerYearAmount:number;
    RateState:CustomerFileRateState;
    Remarks:string;
    IsActive:boolean;
}


export interface CustomerFileDocument
{
    CustomerFileDocumentId:number;
    PublicId:string;
    DocumentFor:CustomerFileTab;
    Code:string;
    Name:string;
    IsRequired:boolean;
    DisplayOrder:number;
    Remarks:string;
    IsActive:boolean;
}


export interface CustomerFileConfiguration
{
    NameTransferRules:NameTransferRule[];
    DeliveryRules:DeliveryRule[];
    Documents:CustomerFileDocument[];
    Today:string;
}


export interface CustomerFileConfigurationDefaults
{
    NameTransferRuleCode:string;
    DeliveryRuleCode:string;
    NameTransferDocumentCode:string;
    FileDeliveryDocumentCode:string;
    NextNameTransferDocumentOrder:number;
    NextFileDeliveryDocumentOrder:number;
}


export interface SaveNameTransferRule
{
    EffectiveFrom:string;
    TransfersAllowed:number;
    FeePerTransfer:number;
    Remarks:string;
    IsActive:boolean;
}


export interface SaveDeliveryRule
{
    EffectiveFrom:string;
    FreeDays:number;
    FirstYearAmount:number;
    SecondYearAmount:number;
    PerYearAmount:number;
    Remarks:string;
    IsActive:boolean;
}


export interface SaveCustomerFileDocument
{
    DocumentFor:string;
    Name:string;
    IsRequired:boolean;
    DisplayOrder:number;
    Remarks:string;
    IsActive:boolean;
}


// Custody charge of a file collected late (same rule as the
// server's CustodyCharge) : within free days 0; then up to one
// year : first amount; second year : + second amount; beyond two
// years : + years x per-year amount (a part year = a full year)
export function custodyCharge
(
    ready:Date,
    collected:Date,
    rule:{ FreeDays:number; FirstYearAmount:number; SecondYearAmount:number; PerYearAmount:number }
):
    number
{
    const addDays =
        (d:Date, n:number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

    const addYears =
        (d:Date, n:number) => new Date(d.getFullYear() + n, d.getMonth(), d.getDate());

    if (collected <= addDays(ready, rule.FreeDays))
    {
        return 0;
    }

    let charge = rule.FirstYearAmount;

    if (collected <= addYears(ready, 1))
    {
        return charge;
    }

    charge += rule.SecondYearAmount;

    if (collected <= addYears(ready, 2))
    {
        return charge;
    }

    let years = 1;

    while (collected > addYears(ready, 2 + years))
    {
        years++;
    }

    return charge + years * rule.PerYearAmount;
}


export interface CustomerFileTabInfo
{
    tab:CustomerFileTab;
    tabLabel:string;
    ruleNoun:string;
    docNoun:string;
    icon:string;
    ruleHint:string;
    docHint:string;
    rulePath:string;
}


export const CUSTOMER_FILE_TABS:
    CustomerFileTabInfo[] =
[
    {
        tab:'NameTransfer',
        tabLabel:'Name Transfer',
        ruleNoun:'Name Transfer Policy',
        docNoun:'Name Transfer Document',
        icon:'fas fa-people-arrows',
        ruleHint:'Transfers allowed before registration and the fee per transfer. A change is a new row with its own Effective From.',
        docHint:'Documents needed for a name transfer before registration.',
        rulePath:'name-transfer-rules'
    },
    {
        tab:'FileDelivery',
        tabLabel:'File Delivery',
        ruleNoun:'File Delivery Policy',
        docNoun:'File Delivery Document',
        icon:'fas fa-box-archive',
        ruleHint:'Free days and the custody charge of a registration file collected late. A change is a new row with its own Effective From.',
        docHint:'Documents needed to collect the registration file.',
        rulePath:'delivery-rules'
    }
];
