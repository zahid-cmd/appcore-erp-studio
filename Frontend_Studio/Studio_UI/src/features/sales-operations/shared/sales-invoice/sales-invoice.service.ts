//===============================================================
// Imports
//===============================================================

import
{
    inject
}
from '@angular/core';

import
{
    HttpClient
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
from '../../../../environments/environment';

import
{
    PagedQuery,
    PagedResult,
    toPagedParams,
    toPagedResult
}
from '../../../../shared/paging/paged-result.model';

import
{
    VoucherDebitLine,
    PaymentMode,
    ChargeBorneBy
}
from '../../../../shared/components/accounting/accounting.models';

import
{
    SalesInvoice,
    SalesInvoiceBikeUnit,
    SalesInvoiceLine,
    SalesInvoiceAllocation,
    SalesInvoiceListItem,
    SalesInvoiceDefaults,
    SalesInvoiceSwitches,
    SalesInvoiceMembership,
    SalesInvoiceCustomer,
    SalesInvoiceCustomerSearchItem,
    SalesInvoiceProduct,
    SalesInvoiceCategory,
    SalesInvoiceQuote,
    SalesInvoiceSaved,
    SalesInvoiceWalkIn,
    SalesInvoiceSpecialType,
    CreateSalesInvoice,
    UpdateSalesInvoice
}
from './sales-invoice.model';


//===============================================================
// Sales Invoices Service (shared by SP / AC / MB)
//
// Each page has its own small service (SalesInvoicesSpService
// / ...Ac / ...Mb) that only gives its API path. The server always
// uses the page's own type. The API answers in PascalCase; every
// response is read in PascalCase or camelCase (pick) so either
// works.
//===============================================================

export abstract class SalesInvoiceService
{
    private readonly http =
        inject(HttpClient);


    // sales-operations/<menu>/sales-invoices-<type>
    protected abstract readonly apiPath:
        string;


    private get apiUrl():
        string
    {
        return `${environment.apiUrl}/${this.apiPath}`;
    }


    //===========================================================
    // Read a value in PascalCase or camelCase
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
        return String(this.pick(item, name) ?? '');
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
        return Number(this.pick(item, name) ?? 0) || 0;
    }


    private bool
    (
        item:
            any,
        name:
            string,
        fallback:
            boolean =
            false
    ):
        boolean
    {
        const value =
            this.pick(item, name);

        return value == null
            ? fallback
            : Boolean(value);
    }


    // Optional id : null when missing or 0
    private optionalId
    (
        item:
            any,
        name:
            string
    ):
        number | null
    {
        return Number(this.pick(item, name) ?? 0) || null;
    }


    // Optional number : null when missing (a switch Value that
    // means "no limit")
    private optionalNum
    (
        item:
            any,
        name:
            string
    ):
        number | null
    {
        const value =
            this.pick(item, name);

        if
        (
            value === null
            ||
            value === undefined
            ||
            value === ''
        )
        {
            return null;
        }

        const parsed =
            Number(value);

        return Number.isFinite(parsed)
            ? parsed
            : null;
    }


    private date
    (
        item:
            any,
        name:
            string
    ):
        string
    {
        return this.text(item, name).substring(0, 10);
    }


    private list
    (
        item:
            any,
        name:
            string
    ):
        any[]
    {
        const value =
            this.pick(item, name);

        return Array.isArray(value)
            ? value
            : [];
    }


    private strings
    (
        item:
            any,
        name:
            string
    ):
        string[]
    {
        return this.list(item, name)
            .map(x => String(x ?? '').trim())
            .filter(x => !!x);
    }


    private specialType
    (
        value:
            string
    ):
        SalesInvoiceSpecialType
    {
        return value === 'Percent' || value === 'Amount'
            ? value
            : 'None';
    }


    //===========================================================
    // Normalize
    //===========================================================

    private normalizeAllocation
    (
        item:
            any
    ):
        SalesInvoiceAllocation
    {
        return {
            StockBatchId:this.num(item, 'StockBatchId'),
            BatchNo:this.text(item, 'BatchNo'),
            Quantity:this.num(item, 'Quantity'),
            Mrp:this.num(item, 'Mrp'),
            UnitPrice:this.num(item, 'UnitPrice'),
            UnitCost:this.num(item, 'UnitCost'),
            Value:this.num(item, 'Value'),
            VatRate:this.num(item, 'VatRate'),
            BaseVatPerUnit:this.num(item, 'BaseVatPerUnit')
        };
    }


    private normalizeLine
    (
        item:
            any
    ):
        SalesInvoiceLine
    {
        return {
            SalesInvoiceLineId:this.num(item, 'SalesInvoiceLineId'),
            LineNo:this.num(item, 'LineNo'),
            ProductType:this.text(item, 'ProductType'),
            ProductId:this.num(item, 'ProductId'),
            ProductCode:this.text(item, 'ProductCode'),
            PartNumber:this.text(item, 'PartNumber'),
            ProductName:this.text(item, 'ProductName'),
            Unit:this.text(item, 'Unit'),
            Quantity:this.num(item, 'Quantity'),
            Mrp:this.num(item, 'Mrp'),
            MrpText:this.text(item, 'MrpText'),
            HasMixedMrp:this.bool(item, 'HasMixedMrp'),
            MrpCount:this.num(item, 'MrpCount'),
            PriceEdited:this.bool(item, 'PriceEdited'),
            UnitPrice:this.num(item, 'UnitPrice'),
            GrossAmount:this.num(item, 'GrossAmount'),
            DiscountSource:this.text(item, 'DiscountSource') || 'None',
            DiscountLabel:this.text(item, 'DiscountLabel'),
            CampaignMembershipPercent:this.num(item, 'CampaignMembershipPercent'),
            CampaignMembershipAmount:this.num(item, 'CampaignMembershipAmount'),
            SpecialDiscountPercent:this.num(item, 'SpecialDiscountPercent'),
            SpecialAmount:this.num(item, 'SpecialAmount'),
            NetAmount:this.num(item, 'NetAmount'),
            FractionalShare:this.num(item, 'FractionalShare'),
            LineTotal:this.num(item, 'LineTotal'),
            VatRate:this.num(item, 'VatRate'),
            VatInside:this.num(item, 'VatInside'),
            BaseVat:this.num(item, 'BaseVat'),
            CostAmount:this.num(item, 'CostAmount'),
            PriceAdjustmentShare:this.num(item, 'PriceAdjustmentShare'),
            NetExclVat:this.num(item, 'NetExclVat'),
            BelowCost:this.bool(item, 'BelowCost'),
            BelowCostMessage:this.text(item, 'BelowCostMessage'),
            StockShort:this.bool(item, 'StockShort'),
            OnHand:this.num(item, 'OnHand'),
            UnallocatedQuantity:this.num(item, 'UnallocatedQuantity'),
            ReturnedQuantity:this.num(item, 'ReturnedQuantity'),
            Allocations:this.list(item, 'Allocations').map(x => this.normalizeAllocation(x)),
            MotorBikeUnitId:this.num(item, 'MotorBikeUnitId') || null,
            ChassisNo:this.text(item, 'ChassisNo'),
            EngineNo:this.text(item, 'EngineNo'),
            ColorName:this.text(item, 'ColorName'),
            ManufactureYear:this.num(item, 'ManufactureYear') || null,
            CkdStatus:this.text(item, 'CkdStatus'),
            DeliveryStatus:this.text(item, 'DeliveryStatus'),
            DeliveredDate:this.text(item, 'DeliveredDate')
        };
    }


    private normalizeMembership
    (
        item:
            any
    ):
        SalesInvoiceMembership | null
    {
        if
        (
            item == null
            ||
            !(this.num(item, 'MembershipId') > 0)
        )
        {
            return null;
        }

        return {
            MembershipId:this.num(item, 'MembershipId'),
            MembershipNo:this.text(item, 'MembershipNo'),
            CardName:this.text(item, 'CardName'),
            SpDiscountPercent:this.num(item, 'SpDiscountPercent'),
            DiscountLedgerCode:this.text(item, 'DiscountLedgerCode'),
            ExpiryDate:this.date(item, 'ExpiryDate')
        };
    }


    // A saved Payment Desk row (= the Receipt Voucher debit row);
    // saved rows load as verified (as on the RV page)
    normalizePayment
    (
        item:
            any
    ):
        VoucherDebitLine
    {
        return {
            Mode:(this.text(item, 'Mode') || 'Cash') as PaymentMode,
            LedgerType:this.text(item, 'LedgerType'),
            SubGroupCode:this.text(item, 'SubGroupCode'),
            SubGroupName:this.text(item, 'SubGroupName'),
            LedgerCode:this.text(item, 'LedgerCode'),
            LedgerName:this.text(item, 'LedgerName'),
            AccountId:this.num(item, 'AccountId'),
            Amount:this.num(item, 'Amount'),
            ShortNotes:this.text(item, 'ShortNotes'),
            ChargePercent:this.num(item, 'ChargePercent'),
            ChargeAmount:this.num(item, 'ChargeAmount'),
            ChargeBorneBy:this.text(item, 'ChargeBorneBy') as ChargeBorneBy | '',
            CardSetupId:this.num(item, 'CardSetupId'),
            CardName:this.text(item, 'CardName'),
            TransactionRef:this.text(item, 'TransactionRef'),
            TenureMonths:this.num(item, 'TenureMonths'),
            InterestPercent:this.num(item, 'InterestPercent'),
            InterestAmount:this.num(item, 'InterestAmount'),
            TotalCharged:this.num(item, 'TotalCharged'),
            CheckNo:this.text(item, 'CheckNo'),
            CheckDate:this.date(item, 'CheckDate'),
            CheckBank:this.text(item, 'CheckBank'),
            PayeeName:'',
            PayeeAccount:'',
            CheckStatus:this.text(item, 'CheckStatus'),
            ClearedVoucherNo:this.text(item, 'ClearedVoucherNo'),
            Verified:true
        };
    }


    normalize
    (
        item:
            any
    ):
        SalesInvoice
    {
        return {
            SalesInvoiceId:this.num(item, 'SalesInvoiceId'),
            PublicId:this.text(item, 'PublicId'),
            PageType:this.text(item, 'PageType'),
            InvoiceNo:this.text(item, 'InvoiceNo'),
            InvoiceDate:this.date(item, 'InvoiceDate'),
            BranchId:this.num(item, 'BranchId'),
            BranchCode:this.text(item, 'BranchCode'),
            BranchName:this.text(item, 'BranchName'),
            FinancialYearId:this.num(item, 'FinancialYearId'),
            WarehouseId:this.num(item, 'WarehouseId'),
            WarehouseName:this.text(item, 'WarehouseName'),
            SalesPersonId:this.optionalId(item, 'SalesPersonId'),
            SalesPersonName:this.text(item, 'SalesPersonName'),
            CustomerId:this.num(item, 'CustomerId'),
            CustomerCode:this.text(item, 'CustomerCode'),
            CustomerName:this.text(item, 'CustomerName'),
            CustomerPhone:this.text(item, 'CustomerPhone'),
            CustomerAddress:this.text(item, 'CustomerAddress'),
            CustomerType:this.text(item, 'CustomerType'),
            CustomerIsWalkIn:this.bool(item, 'CustomerIsWalkIn'),
            CustomerTag:this.text(item, 'CustomerTag'),
            SaleType:this.text(item, 'SaleType'),
            ReceivableLedgerCode:this.text(item, 'ReceivableLedgerCode'),
            MembershipId:this.optionalId(item, 'MembershipId'),
            MembershipNo:this.text(item, 'MembershipNo'),
            MembershipCardName:this.text(item, 'MembershipCardName'),
            MembershipDiscountPercent:this.num(item, 'MembershipDiscountPercent'),
            VatApplicable:this.bool(item, 'VatApplicable', true),
            InvoiceSpecialType:this.specialType(this.text(item, 'InvoiceSpecialType')),
            InvoiceSpecialValue:this.num(item, 'InvoiceSpecialValue'),
            TotalQuantity:this.num(item, 'TotalQuantity'),
            GrossAmount:this.num(item, 'GrossAmount'),
            CampaignDiscount:this.num(item, 'CampaignDiscount'),
            MembershipDiscount:this.num(item, 'MembershipDiscount'),
            CampaignMembershipDiscount:this.num(item, 'CampaignMembershipDiscount'),
            SpecialDiscount:this.num(item, 'SpecialDiscount'),
            FractionalDiscount:this.num(item, 'FractionalDiscount'),
            InvoiceTotal:this.num(item, 'InvoiceTotal'),
            TotalVatInside:this.num(item, 'TotalVatInside'),
            TotalBaseVat:this.num(item, 'TotalBaseVat'),
            CostAmount:this.num(item, 'CostAmount'),
            PaidAmount:this.num(item, 'PaidAmount'),
            DueAmount:this.num(item, 'DueAmount'),
            Narration:this.text(item, 'Narration'),
            Status:this.text(item, 'Status') || 'Draft',
            JournalNo:this.text(item, 'JournalNo'),
            ReceiptVoucherId:this.optionalId(item, 'ReceiptVoucherId'),
            ReceiptVoucherNo:this.text(item, 'ReceiptVoucherNo'),
            CancelReason:this.text(item, 'CancelReason'),
            CreatedBy:this.num(item, 'CreatedBy'),
            CreatedByName:this.text(item, 'CreatedByName'),
            CreatedDate:this.text(item, 'CreatedDate'),
            ModifiedBy:this.optionalId(item, 'ModifiedBy'),
            ModifiedDate:this.text(item, 'ModifiedDate'),
            ApprovedBy:this.optionalId(item, 'ApprovedBy'),
            ApprovedByName:this.text(item, 'ApprovedByName'),
            ApprovedDate:this.text(item, 'ApprovedDate'),
            PostedBy:this.optionalId(item, 'PostedBy'),
            PostedByName:this.text(item, 'PostedByName'),
            PostedDate:this.text(item, 'PostedDate'),
            CancelledBy:this.optionalId(item, 'CancelledBy'),
            CancelledByName:this.text(item, 'CancelledByName'),
            CancelledDate:this.text(item, 'CancelledDate'),
            Lines:this.list(item, 'Lines').map(x => this.normalizeLine(x)),
            Payments:this.list(item, 'Payments').map(x => this.normalizePayment(x))
        };
    }


    private normalizeListItem
    (
        item:
            any
    ):
        SalesInvoiceListItem
    {
        return {
            SalesInvoiceId:this.num(item, 'SalesInvoiceId'),
            PublicId:this.text(item, 'PublicId'),
            PageType:this.text(item, 'PageType'),
            InvoiceNo:this.text(item, 'InvoiceNo'),
            InvoiceDate:this.date(item, 'InvoiceDate'),
            BranchName:this.text(item, 'BranchName'),
            WarehouseName:this.text(item, 'WarehouseName'),
            CustomerCode:this.text(item, 'CustomerCode'),
            CustomerName:this.text(item, 'CustomerName'),
            CustomerPhone:this.text(item, 'CustomerPhone'),
            CustomerTag:this.text(item, 'CustomerTag'),
            SaleType:this.text(item, 'SaleType'),
            LineCount:this.num(item, 'LineCount'),
            InvoiceTotal:this.num(item, 'InvoiceTotal'),
            PaidAmount:this.num(item, 'PaidAmount'),
            DueAmount:this.num(item, 'DueAmount'),
            Status:this.text(item, 'Status') || 'Draft',
            CreatedDate:this.text(item, 'CreatedDate')
        };
    }


    private normalizeSwitches
    (
        item:
            any
    ):
        SalesInvoiceSwitches
    {
        // A missing switch = its default (SPEC)
        return {
            PostOnApproval:this.bool(item, 'PostOnApproval', false),
            AllowCreditSale:this.bool(item, 'AllowCreditSale', false),
            EnforceCreditLimit:this.bool(item, 'EnforceCreditLimit', true),
            AllowPriceEdit:this.bool(item, 'AllowPriceEdit', false),
            MaxPriceEditPercent:this.optionalNum(item, 'MaxPriceEditPercent'),
            AllowDiscount:this.bool(item, 'AllowDiscount', false),
            MaxDiscountPercent:this.optionalNum(item, 'MaxDiscountPercent'),
            BlockSaleBelowCost:this.bool(item, 'BlockSaleBelowCost', true),
            AllowSaleWithoutStock:this.bool(item, 'AllowSaleWithoutStock', false),
            BackDatedSales:this.bool(item, 'BackDatedSales', false),
            AllowCancelPosted:this.bool(item, 'AllowCancelPosted', false),
            CancelWithinDays:this.optionalNum(item, 'CancelWithinDays'),
            PrintAfterPosting:this.bool(item, 'PrintAfterPosting', true),
            AllowWalkInCustomers:this.bool(item, 'AllowWalkInCustomers', true),
            SellAtBatchMrp:this.bool(item, 'SellAtBatchMrp', true),
            RoundDownWholeTaka:this.bool(item, 'RoundDownWholeTaka', true),
            AllowCorporateSale:this.bool(item, 'AllowCorporateSale', false),
            CorporateSaleFrom:this.text(item, 'CorporateSaleFrom').substring(0, 10),
            CorporateSaleUntil:this.text(item, 'CorporateSaleUntil').substring(0, 10)
        };
    }


    private normalizeDefaults
    (
        item:
            any
    ):
        SalesInvoiceDefaults
    {
        const branch =
            this.pick(item, 'Branch');

        const switches =
            this.normalizeSwitches(
                this.pick(item, 'Switches')
            );

        return {
            PageType:this.text(item, 'PageType'),
            NextNumberPreview:this.text(item, 'NextNumberPreview'),
            Today:this.date(item, 'Today'),
            InvoiceDate:this.date(item, 'InvoiceDate'),
            Message:this.text(item, 'Message'),
            Branch:
            {
                BranchId:this.num(branch, 'BranchId'),
                BranchCode:this.text(branch, 'BranchCode'),
                BranchName:this.text(branch, 'BranchName')
            },
            FinancialYearId:this.num(item, 'FinancialYearId'),
            FinancialYearName:this.text(item, 'FinancialYearName'),
            FinancialYearCode:this.text(item, 'FinancialYearCode'),
            Warehouses:
                this.list(item, 'Warehouses').map
                (
                    row =>
                    ({
                        WarehouseId:this.num(row, 'WarehouseId'),
                        WarehouseCode:this.text(row, 'WarehouseCode'),
                        WarehouseName:this.text(row, 'WarehouseName'),
                        IsDefault:this.bool(row, 'IsDefault'),
                        HasStock:this.bool(row, 'HasStock', true)
                    })
                ),
            DefaultWarehouseId:this.optionalId(item, 'DefaultWarehouseId'),
            BusinessLine:this.text(item, 'BusinessLine'),
            UserAllottedToBranch:this.bool(item, 'UserAllottedToBranch'),
            BranchRunsLine:this.bool(item, 'BranchRunsLine'),
            BranchLineMessage:this.text(item, 'BranchLineMessage'),
            SalesPersons:
                this.list(item, 'SalesPersons').map
                (
                    row =>
                    ({
                        UserProfileId:this.num(row, 'UserProfileId'),
                        DisplayName:this.text(row, 'DisplayName'),
                        UserName:this.text(row, 'UserName')
                    })
                ),
            DefaultSalesPersonId:this.num(item, 'DefaultSalesPersonId'),
            Categories:
                this.list(item, 'Categories').map(row => this.normalizeCategory(row)),
            SubCategories:
                this.list(item, 'SubCategories').map(row => this.normalizeCategory(row)),
            Switches:switches,
            CanGiveSpecialDiscount:this.bool(item, 'CanGiveSpecialDiscount'),
            CanApprove:this.bool(item, 'CanApprove'),
            CanReturn:this.bool(item, 'CanReturn'),
            CanPost:this.bool(item, 'CanPost'),
            CanCancel:this.bool(item, 'CanCancel'),
            CanPrint:this.bool(item, 'CanPrint'),
            VatApplicable:this.bool(item, 'VatApplicable', true),
            VatApplicableSince:this.date(item, 'VatApplicableSince'),
            // Top level first; the switch block as a fallback
            MaxPriceEditPercent:this.optionalNum(item, 'MaxPriceEditPercent') ?? switches.MaxPriceEditPercent,
            MaxDiscountPercent:this.optionalNum(item, 'MaxDiscountPercent') ?? switches.MaxDiscountPercent
        };
    }


    normalizeCustomer
    (
        item:
            any
    ):
        SalesInvoiceCustomer
    {
        const walkIn =
            this.bool(item, 'IsWalkIn');

        const type =
            this.text(item, 'CustomerType');

        return {
            Found:this.bool(item, 'Found', this.num(item, 'CustomerId') > 0),
            CustomerId:this.num(item, 'CustomerId'),
            CustomerCode:this.text(item, 'CustomerCode'),
            DisplayName:this.text(item, 'DisplayName'),
            Name:this.text(item, 'Name'),
            Phone:this.text(item, 'Phone'),
            Address:this.text(item, 'Address'),
            CustomerType:type,
            IsWalkIn:walkIn,
            CustomerTag:this.text(item, 'CustomerTag') || (walkIn ? 'Walk-in' : type),
            IsCorporate:this.bool(item, 'IsCorporate', false),
            IsActive:this.bool(item, 'IsActive', true),
            ReceivableLedgerCode:this.text(item, 'ReceivableLedgerCode'),
            Balance:this.num(item, 'Balance'),
            BalanceSide:this.text(item, 'BalanceSide'),
            CreditLimit:this.num(item, 'CreditLimit'),
            Membership:this.normalizeMembership(this.pick(item, 'Membership')),
            CanAddWalkIn:this.bool(item, 'CanAddWalkIn'),
            Message:this.text(item, 'Message')
        };
    }


    private normalizeProduct
    (
        item:
            any
    ):
        SalesInvoiceProduct
    {
        return {
            ProductId:this.num(item, 'ProductId'),
            ProductCode:this.text(item, 'ProductCode'),
            PartNumber:this.text(item, 'PartNumber'),
            PartName:this.text(item, 'PartName'),
            ProductName:this.text(item, 'ProductName'),
            ProductType:this.text(item, 'ProductType'),
            Unit:this.text(item, 'Unit'),
            OnHand:this.num(item, 'OnHand'),
            Mrp:this.num(item, 'Mrp'),
            LatestMrp:this.num(item, 'LatestMrp'),
            HasMixedMrp:this.bool(item, 'HasMixedMrp'),
            MrpCount:this.num(item, 'MrpCount'),
            ScannedBatchId:this.optionalId(item, 'ScannedBatchId'),
            IsActive:this.bool(item, 'IsActive', true)
        };
    }


    private normalizeQuote
    (
        item:
            any
    ):
        SalesInvoiceQuote
    {
        const errors =
            this.strings(item, 'Errors');

        return {
            Lines:this.list(item, 'Lines').map(x => this.normalizeLine(x)),
            TotalQuantity:this.num(item, 'TotalQuantity'),
            GrossAmount:this.num(item, 'GrossAmount'),
            CampaignDiscount:this.num(item, 'CampaignDiscount'),
            MembershipDiscount:this.num(item, 'MembershipDiscount'),
            CampaignMembershipDiscount:this.num(item, 'CampaignMembershipDiscount'),
            SpecialDiscount:this.num(item, 'SpecialDiscount'),
            FractionalDiscount:this.num(item, 'FractionalDiscount'),
            InvoiceTotal:this.num(item, 'InvoiceTotal'),
            TotalVatInside:this.num(item, 'TotalVatInside'),
            TotalBaseVat:this.num(item, 'TotalBaseVat'),
            CostAmount:this.num(item, 'CostAmount'),
            PaidAmount:this.num(item, 'PaidAmount'),
            DueAmount:this.num(item, 'DueAmount'),
            VatApplicable:this.bool(item, 'VatApplicable', true),
            Membership:this.normalizeMembership(this.pick(item, 'Membership')),
            CustomerBalance:this.num(item, 'CustomerBalance'),
            CreditLimit:this.num(item, 'CreditLimit'),
            Warnings:this.strings(item, 'Warnings'),
            Errors:errors,
            CanSave:this.bool(item, 'CanSave', errors.length === 0)
        };
    }


    private normalizeSaved
    (
        item:
            any
    ):
        SalesInvoiceSaved
    {
        return {
            SalesInvoiceId:this.num(item, 'SalesInvoiceId'),
            PublicId:this.text(item, 'PublicId'),
            InvoiceNo:this.text(item, 'InvoiceNo'),
            Status:this.text(item, 'Status'),
            Posted:this.bool(item, 'Posted', this.text(item, 'Status') === 'Posted'),
            ReceiptVoucherNo:this.text(item, 'ReceiptVoucherNo'),
            Warnings:this.strings(item, 'Warnings')
        };
    }


    //===========================================================
    // Read
    //===========================================================

    // status : Draft / Approved / Posted / Cancelled; '' = all
    getAll
    (
        status:
            string =
            ''
    ):
        Observable<SalesInvoiceListItem[]>
    {
        const params:
            Record<string, string> =
            {};

        if
        (
            status
            &&
            status !== 'All'
        )
        {
            params['status'] =
                status;
        }

        return this.http
            .get<any[]>(
                this.apiUrl,
                { params }
            )
            .pipe(
                map(response => (Array.isArray(response) ? response : []).map(item => this.normalizeListItem(item)))
            );
    }


    // One page of the list plus the tab counts (server paging)
    getPaged
    (
        query:
            PagedQuery & { tab?:string }
    ):
        Observable<PagedResult<SalesInvoiceListItem> & { dueTotal:number }>
    {
        return this.http
            .get<any>(`${this.apiUrl}/paged`, { params:toPagedParams({ ...query }) })
            .pipe(
                map
                (
                    raw =>
                    ({
                        ...toPagedResult(raw, item => this.normalizeListItem(item)),
                        // Due of the posted invoices that match
                        dueTotal:Number(raw?.DueTotal ?? raw?.dueTotal ?? 0) || 0
                    })
                )
            );
    }


    getById
    (
        id:
            string
    ):
        Observable<SalesInvoice>
    {
        return this.http
            .get<any>(`${this.apiUrl}/${id}`)
            .pipe(
                map(item => this.normalize(item))
            );
    }


    // date : yyyy-MM-dd ('' = today)
    getDefaults
    (
        date:
            string =
            ''
    ):
        Observable<SalesInvoiceDefaults>
    {
        const params:
            Record<string, string> =
            {};

        if
        (
            date
        )
        {
            params['date'] =
                date;
        }

        return this.http
            .get<any>(
                `${this.apiUrl}/defaults`,
                { params }
            )
            .pipe(
                map(item => this.normalizeDefaults(item))
            );
    }


    private normalizeCategory
    (
        row:
            any
    ):
        SalesInvoiceCategory
    {
        return {
            Id:this.num(row, 'Id'),
            ParentId:this.num(row, 'ParentId'),
            Code:this.text(row, 'Code'),
            Name:this.text(row, 'Name')
        };
    }


    // MB : the bikes in stock in the warehouse (oldest first); the
    // invoice's own bikes are not shown as taken
    getBikeUnits
    (
        warehouseId:
            number,
        invoiceId:
            number
    ):
        Observable<SalesInvoiceBikeUnit[]>
    {
        return this.http
            .get<any[]>(
                `${this.apiUrl}/bike-units`,
                { params:{ warehouseId:String(warehouseId), invoiceId:String(invoiceId || 0) } }
            )
            .pipe(
                map
                (
                    response =>
                        (Array.isArray(response) ? response : []).map
                        (
                            x =>
                            ({
                                MotorBikeUnitId:this.num(x, 'MotorBikeUnitId'),
                                ProductId:this.num(x, 'ProductId'),
                                ProductCode:this.text(x, 'ProductCode'),
                                ProductName:this.text(x, 'ProductName'),
                                ProductSubCategoryId:this.num(x, 'ProductSubCategoryId'),
                                ModelName:this.text(x, 'ModelName'),
                                ColorName:this.text(x, 'ColorName'),
                                ChassisNo:this.text(x, 'ChassisNo'),
                                EngineNo:this.text(x, 'EngineNo'),
                                KeyNo:this.text(x, 'KeyNo'),
                                BatteryNo:this.text(x, 'BatteryNo'),
                                ManufactureYear:this.num(x, 'ManufactureYear') || null,
                                CkdStatus:this.text(x, 'CkdStatus') === 'Yes' ? 'Yes' : 'No',
                                StockInDate:this.text(x, 'StockInDate').slice(0, 10),
                                Mrp:this.num(x, 'Mrp'),
                                OnInvoiceNo:this.text(x, 'OnInvoiceNo'),
                                ImageUrl:this.imageUrl(this.text(x, 'ImagePath'))
                            })
                        )
                )
            );
    }


    // MB : change a chassis' CKD status (Yes -> No needs a reason)
    setBikeCkd
    (
        motorBikeUnitId:
            number,
        ckdStatus:
            string,
        remarks:
            string
    ):
        Observable<any>
    {
        return this.http.put<any>(
            `${this.apiUrl}/bike-units/${motorBikeUnitId}/ckd`,
            { CkdStatus:ckdStatus, Remarks:remarks ?? '' });
    }


    // Saved image path (/uploads/...) -> full URL, served from
    // the API root (apiUrl without /api)
    private imageUrl
    (
        path:
            string
    ):
        string
    {
        const value =
            (path ?? '').trim();

        if
        (
            !value
            ||
            /^(https?:|blob:|data:)/i.test(value)
        )
        {
            return value;
        }

        const root =
            environment.apiUrl
                .replace(/\/+$/, '')
                .replace(/\/api$/i, '');

        return `${root}/${value.replace(/^\/+/, '')}`;
    }


    // Code / part number / name (contains) or a scanned barcode,
    // optionally within a category / sub category
    searchProducts
    (
        warehouseId:
            number,
        search:
            string,
        categoryId:
            number | null = null,
        subCategoryId:
            number | null = null,
        browse:
            boolean = false
    ):
        Observable<SalesInvoiceProduct[]>
    {
        const params:
            Record<string, string> =
            {
                warehouseId:String(warehouseId),
                search
            };

        if (categoryId)
        {
            params['categoryId'] = String(categoryId);
        }

        if (subCategoryId)
        {
            params['subCategoryId'] = String(subCategoryId);
        }

        if (browse)
        {
            params['browse'] = 'true';
        }

        return this.http
            .get<any[]>(
                `${this.apiUrl}/products`,
                { params }
            )
            .pipe(
                map(response => (Array.isArray(response) ? response : []).map(item => this.normalizeProduct(item)))
            );
    }


    // Phone : 11 digits starting 01; date : membership date
    // Live search : phone 1 / 2, name or code (3+ characters)
    searchCustomers
    (
        text:
            string
    ):
        Observable<SalesInvoiceCustomerSearchItem[]>
    {
        return this.http
            .get<any>(
                `${this.apiUrl}/customer-search`,
                { params:{ q:text } })
            .pipe(
                map(
                    response =>
                        ((response ?? []) as any[]).map
                        (
                            row =>
                            ({
                                CustomerId:this.num(row, 'CustomerId'),
                                CustomerCode:this.text(row, 'CustomerCode'),
                                CustomerName:this.text(row, 'CustomerName'),
                                DisplayName:this.text(row, 'DisplayName'),
                                Phone1:this.text(row, 'Phone1'),
                                Phone2:this.text(row, 'Phone2'),
                                CustomerType:this.text(row, 'CustomerType'),
                                IsWalkIn:this.bool(row, 'IsWalkIn'),
                                IsCorporate:this.bool(row, 'IsCorporate', false),
                                MatchedOn:this.text(row, 'MatchedOn')
                            })
                        )
                )
            );
    }

    lookupCustomer
    (
        phone:
            string,
        date:
            string
    ):
        Observable<SalesInvoiceCustomer>
    {
        const params:
            Record<string, string> =
            { phone };

        if
        (
            date
        )
        {
            params['date'] =
                date;
        }

        return this.http
            .get<any>(
                `${this.apiUrl}/customer-lookup`,
                { params }
            )
            .pipe(
                map(item => this.normalizeCustomer(item))
            );
    }


    // Add Customer : an Outside customer tagged Walk-in
    createWalkIn
    (
        model:
            SalesInvoiceWalkIn
    ):
        Observable<SalesInvoiceCustomer>
    {
        return this.http
            .post<any>(`${this.apiUrl}/walk-in-customer`, model)
            .pipe(
                map(item => this.normalizeCustomer(item))
            );
    }


    // Server pricing of the page's lines (never 400 for a rule)
    quote
    (
        model:
            CreateSalesInvoice
    ):
        Observable<SalesInvoiceQuote>
    {
        return this.http
            .post<any>(`${this.apiUrl}/quote`, model)
            .pipe(
                map(item => this.normalizeQuote(item))
            );
    }


    //===========================================================
    // Save (with 0021 OFF the server posts at once)
    //===========================================================

    create
    (
        model:
            CreateSalesInvoice
    ):
        Observable<SalesInvoiceSaved>
    {
        return this.http
            .post<any>(this.apiUrl, model)
            .pipe(
                map(item => this.normalizeSaved(item))
            );
    }


    // Saved by the uuid (the server ignores the id in the body)
    update
    (
        publicId:
            string,
        model:
            UpdateSalesInvoice
    ):
        Observable<SalesInvoiceSaved>
    {
        return this.http
            .put<any>(`${this.apiUrl}/${publicId}`, model)
            .pipe(
                map(item => this.normalizeSaved(item))
            );
    }


    delete
    (
        id:
            string
    ):
        Observable<void>
    {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }


    restore():
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/restore`, {});
    }


    //===========================================================
    // Workflow
    //===========================================================

    approve
    (
        publicId:
            string
    ):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${publicId}/approve`, {});
    }


    returnToDraft
    (
        publicId:
            string
    ):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${publicId}/return-to-draft`, {});
    }


    post
    (
        publicId:
            string
    ):
        Observable<SalesInvoiceSaved>
    {
        return this.http
            .put<any>(`${this.apiUrl}/${publicId}/post`, {})
            .pipe(
                map(item => this.normalizeSaved(item ?? { Status:'Posted' }))
            );
    }


    cancel
    (
        publicId:
            string,
        reason:
            string
    ):
        Observable<void>
    {
        return this.http.put<void>(`${this.apiUrl}/${publicId}/cancel`, { Reason:reason });
    }


    //===========================================================
    // History (this page)
    //===========================================================

    getHistory():
        Observable<any[]>
    {
        return this.http.get<any[]>(`${this.apiUrl}/history`);
    }
}
