//===============================================================
// Website Configuration : models
// (Settings › General Settings › Website Configuration)
//
// The same shape as the API (camelCase). One record : the public
// website's switches and texts, with its lists.
//===============================================================

export type WebsiteTheme =
    'auto'
    | 'light'
    | 'deep';

export type WebsiteItemKind =
    'tag'
    | 'why-point'
    | 'why-stat'
    | 'service'
    | 'faq'
    | 'payment'
    | 'text';

export type WebsitePolicyKey =
    'warranty'
    | 'terms'
    | 'privacy';


export interface WebsiteHour
{
    days:string;

    // "HH:mm", empty when closed
    opensAt:string;

    closesAt:string;

    isClosed:boolean;
}


export interface WebsiteItem
{
    kind:WebsiteItemKind;

    title:string;

    text:string;

    photoPath:string;
}


export interface WebsiteBrandSetting
{
    brandManagementId:number;

    brandCode:string;

    brandName:string;

    logoPath:string;

    bikeModels:number;

    showOnWebsite:boolean;

    showBrandPage:boolean;

    about:string;
}


export interface WebsiteBranchSetting
{
    branchId:number;

    branchName:string;

    wingName:string;

    brandIds:number[];
}


export interface WebsitePolicySection
{
    heading:string;

    text:string;
}


export interface WebsitePolicy
{
    policyKey:WebsitePolicyKey;

    // 0 = general part
    brandManagementId:number;

    brandName:string;

    title:string;

    // "yyyy-MM-dd" or null
    updatedOn:string | null;

    sections:WebsitePolicySection[];
}


// One bike model on the Bikes tab. Editable : showOnWebsite,
// isFeatured, tagline, description and the order of the list
// (saved to Bike Models). The rest is read-only.
export interface WebsiteBike
{
    bikeModelId:number;
    modelCode:string;
    modelName:string;
    bikeType:string;
    brandManagementId:number;
    brandName:string;
    photoPath:string;
    showOnWebsite:boolean;
    isFeatured:boolean;
    tagline:string;
    description:string;
    // Motor Bike Specifications record : exists / shown on the website
    hasSpecs:boolean;
    showSpecs:boolean;
}

export interface WebsiteCompanyInfo
{
    name:string;

    logoPath:string;

    phone:string;

    mobile:string;

    email:string;

    address:string;
}


export interface WebsiteConfiguration
{
    exists:boolean;

    isEnabled:boolean;

    defaultTheme:WebsiteTheme;

    template:string;

    currencySymbol:string;

    offerTitle:string;

    offerText:string;

    // "yyyy-MM-dd" or null
    offerEndsOn:string | null;

    tagline:string;

    about:string;

    hotline:string;

    whatsApp:string;

    email:string;

    // the pin : "lat,lng" or a place name (read from mapLink on save)
    mapQuery:string;

    // link pasted from Google Maps (Share › Copy link)
    mapLink:string;

    facebookUrl:string;

    youtubeUrl:string;

    instagramUrl:string;

    tiktokUrl:string;

    showBrandsMenu:boolean;

    showOfferRibbon:boolean;

    showMovingStrip:boolean;

    // Moving strip speed : 1 slowest … 10 fastest
    stripSpeed:number;

    // Hero photo (showroom picture) : empty = the hero as before
    heroPhotoPath:string;

    heroWelcome:boolean;

    heroBackground:boolean;

    // 1 subtle … 5 strong
    heroStrength:number;

    heroTitle:string;

    heroText:string;

    heroShowAddress:boolean;

    // Round image in the hero's circle ('' = off), 1 subtle … 5 strong
    heroRoundOn:boolean;

    heroRoundPath:string;

    heroRoundStrength:number;

    showWhyUs:boolean;

    showEmi:boolean;

    showService:boolean;

    showBranches:boolean;

    showFaq:boolean;

    whyPhotoPath:string;

    emiExamplePrice:number;

    emiDownPercents:number[];

    emiMonths:number[];

    emiNote:string;

    openingHours:WebsiteHour[];

    items:WebsiteItem[];

    brands:WebsiteBrandSetting[];

    branches:WebsiteBranchSetting[];

    policies:WebsitePolicy[];
    // Bikes tab : website fields of Bike Models, in website order
    bikes:WebsiteBike[];

    company:WebsiteCompanyInfo;

    modifiedDate:string | null;
}
