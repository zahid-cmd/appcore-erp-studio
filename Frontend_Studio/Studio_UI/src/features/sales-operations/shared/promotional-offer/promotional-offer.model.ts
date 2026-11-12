//===============================================================
// Business Promotions : Promotional Offers (shared by Sales
// Center / Service Center / Accessory Shop)
//===============================================================

export type PromotionalOfferChannel =
    'SalesCenter' | 'ServiceCenter' | 'AccessoryShop';

export type PromotionalOfferStatus =
    'Draft' | 'Active' | 'Closed' | 'Cancelled';

// Model : a Service Campaign's eligible bike model; ProductType :
// all Spare Parts (1) / all Lubricants (2) (2026-11-13)
export type PromotionalTargetType =
    'All' | 'Category' | 'SubCategory' | 'Product' | 'Model' | 'ProductType';


export interface PromotionalOfferTarget
{
    TargetType:PromotionalTargetType;
    TargetId:number;
    TargetName:string;
    // '' = the offer's discount
    DiscountType:string;
    DiscountValue:number | null;
    // Exception : left out of the offer (no discount)
    IsExcluded:boolean;
}


export interface PromotionalOfferPrize
{
    PrizeName:string;
    PrizeKind:string;
    PrizeValue:number;
    Quantity:number;
    GivenQuantity:number;
}


export interface SavePromotionalOffer
{
    OfferName:string;
    OfferType:string;
    BrandManagementId:number | null;
    FundedBy:string;
    StartDate:string;
    EndDate:string;
    AllBranches:boolean;
    BranchIds:number[];
    DiscountType:string;
    DiscountValue:number;
    FreeServiceCount:number;
    ClaimDays:number;
    Terms:string;
    Targets:PromotionalOfferTarget[];
    Prizes:PromotionalOfferPrize[];
}


export interface PromotionalOffer extends SavePromotionalOffer
{
    PromotionalOfferId:number;
    PublicId:string;
    Channel:string;
    OfferNo:string;
    BrandName:string;
    Status:string;
    Phase:string;
    StatusReason:string;
    // The offer's own ledger (created on save)
    LedgerCode:string;
    LedgerName:string;
    CreatedByName:string;
    CreatedDate:string;
}


export interface PromotionalOfferListItem
{
    PromotionalOfferId:number;
    PublicId:string;
    OfferNo:string;
    OfferName:string;
    OfferType:string;
    BrandName:string;
    FundedBy:string;
    StartDate:string;
    EndDate:string;
    BenefitText:string;
    TargetsText:string;
    BranchesText:string;
    Status:string;
    Phase:string;
}


export interface PromotionalOfferOption
{
    Id:number;
    Name:string;
    ParentId:number | null;
    BrandId:number | null;
    Note:string;
}


export interface PromotionalOfferDefaults
{
    Channel:string;
    NextOfferNo:string;
    Today:string;
    // Business Configuration line(s) of the page : only branches
    // running it are listed
    BusinessLine:string;
    OfferTypes:string[];
    Brands:PromotionalOfferOption[];
    Branches:PromotionalOfferOption[];
    Categories:PromotionalOfferOption[];
    SubCategories:PromotionalOfferOption[];
    Products:PromotionalOfferOption[];
    BikeModels:PromotionalOfferOption[];
}


// List page query (server paging)
export interface PromotionalOfferPageQuery
{
    page:number;
    pageSize:number;
    search?:string;
    sort?:string;
    dir?:'asc' | 'desc';
    // all / Draft / Active / Closed / Cancelled
    tab?:string;
    brandId?:number | null;
}


export interface PromotionalOfferSaved
{
    PublicId:string;
    OfferNo:string;
    Status:string;
}
