//===============================================================
// Website : models
// --------------------------------------------------------------
// The company's public website (Phase 1 : content from
// public/assets/website/site-content.json; Phase 2 : the ERP).
// The JSON uses the same names as these interfaces.
//===============================================================

export type WebsiteTheme =
    'light'
    | 'deep';

export type WebsiteStock =
    'in-stock'
    | 'few-left'
    | 'pre-order'
    | '';

export type WebsitePolicyKey =
    'warranty'
    | 'terms'
    | 'privacy';

export interface WebsiteCompany
{
    name:string;

    tagline:string;

    // Short paragraph for the footer
    about:string;

    brand:string;

    logoLight:string;

    logoDeep:string;

    address:string;

    hotline:string;

    whatsApp:string;

    email:string;

    // One line, e.g. "Sat–Thu 10 am – 8 pm"
    hours:string;

    // Day by day (optional); shown in the Visit us section
    openingHours:WebsiteHoursRow[];

    // What the map looks up : a place name, an address or
    // "lat,lng". Empty = company name + address.
    mapQuery:string;
}


export interface WebsiteHoursRow
{
    days:string;

    // e.g. "10:00 am – 8:00 pm" or "Closed"
    time:string;
}

export interface WebsiteSocial
{
    facebook:string;

    youtube:string;

    instagram:string;

    tiktok:string;
}

export interface WebsitePayment
{
    name:string;

    // Optional logo; empty = the name as a chip
    logo:string;
}

export interface WebsiteSpecRow
{
    label:string;

    value:string;
}

export interface WebsiteSpecGroup
{
    title:string;

    rows:WebsiteSpecRow[];
}

export interface WebsiteColour
{
    name:string;

    // Swatch colour, e.g. "#c81e1e"
    hex:string;

    // Photo of the bike in this colour (optional)
    photo:string;
}

export interface WebsiteBike
{
    // Web address part : /bikes/<slug> (made from the model when empty)
    slug:string;

    // ERP model code (sub category); empty = not from the ERP
    // (the Enquire form needs it)
    code?:string;

    model:string;

    // The bike's own brand (Brand Management via its category)
    brand:string;

    brandLogo:string;

    category:string;

    tagline:string;

    engine:string;

    mileage:string;

    topSpeed:string;

    // null = no price shown
    price:number | null;

    // Shown instead of the price, e.g. "Call for price"
    priceText:string;

    stock:WebsiteStock;

    // Main (cut-out) photo
    photo:string;

    // Shown in the top slider
    featured:boolean;

    colours:WebsiteColour[];

    gallery:string[];

    highlights:string[];

    specs:WebsiteSpecGroup[];
}

export interface WebsiteBrand
{
    name:string;

    // Brand Code in the ERP (empty in the JSON fallback)
    code:string;

    // Brand page on (Website Configuration › Brands)
    page:boolean;

    // Short text for the brand page
    about:string;

    // Web address part : /brands/<slug>
    slug:string;

    logo:string;
}


export type WebsitePartStock =
    'in-stock'
    | 'order';


// One line of a brand's parts catalogue (from the ERP)
export interface WebsitePart
{
    // Spare Parts / Lubricants / Accessories
    kind:string;

    partNumber:string;

    name:string;

    unit:string;

    // null = no price yet
    price:number | null;

    stock:WebsitePartStock;
}


export interface WebsiteOffer
{
    title:string;

    text:string;

    // yyyy-MM-dd, empty = no end date
    endsOn:string;
}

export interface WebsiteCard
{
    title:string;

    text:string;

    photo:string;
}

export interface WebsiteStat
{
    value:string;

    label:string;
}

export interface WebsiteWhy
{
    photo:string;

    points:WebsiteCard[];

    stats:WebsiteStat[];
}

export interface WebsiteFaq
{
    q:string;

    a:string;
}

export interface WebsiteEmi
{
    enabled:boolean;

    // Used when no bike has a price
    examplePrice:number;

    downPercents:number[];

    months:number[];

    note:string;
}

export interface WebsiteBranch
{
    name:string;

    type:string;

    address:string;

    phone:string;

    hours:string;

    mapUrl:string;

    // Brands this branch sells (Website Configuration)
    brands:string[];
}

export interface WebsitePolicySection
{
    heading:string;

    text:string;
}

export interface WebsitePolicy
{
    title:string;

    updatedOn:string;

    sections:WebsitePolicySection[];
}

export interface WebsiteContent
{
    // false = the site is off : "/" opens the login page
    enabled:boolean;

    template:string;

    defaultTheme:'auto' | WebsiteTheme;

    currency:string;

    company:WebsiteCompany;

    social:WebsiteSocial;

    payments:WebsitePayment[];

    // Selling points in the moving strip
    tags:string[];

    bikes:WebsiteBike[];

    // Brands : those with bikes first (bike order), then brands
    // with parts only. 2 or more with bikes = multi-brand company
    // (brand tabs in the hero, brand filter, brand on cards).
    brands:WebsiteBrand[];

    // Header "Brands" menu on / off
    brandsMenu:boolean;

    // Moving strip speed : 1 slowest … 10 fastest (5 = default)
    stripSpeed:number;

    // Showroom photo in the hero (Website Configuration › Hero)
    hero:WebsiteHero;

    // Section wording by key ("why.title" …); missing keys use
    // DEFAULT_TEXTS (website-data.service.ts)
    texts:Record<string, string>;

    offer:WebsiteOffer | null;

    why:WebsiteWhy;

    emi:WebsiteEmi;

    // Service, parts and care cards
    services:WebsiteCard[];

    branches:WebsiteBranch[];

    faq:WebsiteFaq[];

    policies:Record<WebsitePolicyKey, WebsitePolicy | null>;
}


// Hero photo : no photo (or both switches off) = the hero as before
export interface WebsiteHero
{
    photo:string;

    // First slide : photo + welcome text, address, directions
    welcome:boolean;

    // Photo behind the bike slides
    background:boolean;

    // Background visibility : 1 subtle … 5 strong
    strength:number;

    // Welcome wording (empty = company name / tagline)
    title:string;

    text:string;

    showAddress:boolean;

    // Round image in the circle behind the bike ('' = off)
    round:string;

    // Round image visibility : 1 subtle … 5 strong
    roundStrength:number;
}
