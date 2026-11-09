//===============================================================
// Website Data Service
// --------------------------------------------------------------
// Two sources, read together :
//
//   1. The ERP : GET api/public/website (anonymous)
//        company name, logo, address, phone, email;
//        active branches (wing = type);
//        bike models with their colours, colour images,
//        MRP and a stock badge.
//      When the ERP answers, bikes and branches come ONLY from
//      it (the JSON's sample bikes are never shown).
//   2. public/assets/website/site-content.json : the text the
//      ERP does not hold yet (tagline, WhatsApp, hours, social,
//      FAQ, policies, EMI, why-us, bike specs by model name).
//      Moves to the ERP's Website Settings and Bike
//      Specifications pages later.
//
// Either one alone still makes a website; with neither, the
// site is treated as off (→ /login). Pages and components never
// fetch : they read this service.
//===============================================================

import
{
    Injectable,
    inject,
    signal
}
from '@angular/core';

import
{
    HttpClient
}
from '@angular/common/http';

import
{
    WebsiteBike,
    WebsiteBrand,
    WebsiteCard,
    WebsitePart,
    WebsiteContent,
    WebsitePolicy,
    WebsiteStock
}
from './website.models';

import
{
    slugify
}
from './website-links';

import
{
    environment
}
from '../../environments/environment';


// Section wording when Website Configuration › Texts & Offer
// leaves a key empty
export const DEFAULT_TEXTS:
    Record<string, string> =
{
    'bikes.kicker':'Our bikes',
    'bikes.title':'Find your ride',
    'why.kicker':'Why buy from us',
    'why.title':'More than a bike company',
    'emi.kicker':'Easy payment',
    'emi.title':'Ride now, pay monthly',
    'emi.lead':'Bank card EMI and company instalments. Pick a down payment and months to see an estimate.',
    'service.kicker':'After you buy',
    'service.title':'Service, parts & care',
    'branches.kicker':'Visit us',
    'branches.title':'Our branches',
    'faq.kicker':'Any questions?',
    'faq.title':'Before you buy',
    'faq.lead':'Still not sure? Message us and a sales adviser will reply.',
    'ride.title':'Feel it before you buy it',
    'ride.text':'Book a free test ride at your nearest branch. Bring your driving licence; we\'ll handle the rest.',
    'visit.kicker':'Visit us',
    'visit.title':'Opening hours & location',
    'prices.note':'MRP includes VAT. Prices can change without notice; please confirm at the branch.'
};


const CONTENT_URL =
    'assets/website/site-content.json';

const ERP_URL =
    `${environment.apiUrl}/public/website`;

// Uploaded files (logos, bike images) are served by the API host
const FILE_ROOT =
    environment.apiUrl.replace(/\/api\/?$/, '');


@Injectable(
{
    providedIn:'root'
})
export class WebsiteDataService
{
    private readonly http =
        inject(HttpClient);

    private requested =
        false;

    readonly content =
        signal<WebsiteContent | null>(null);

    readonly loaded =
        signal(false);

    readonly failed =
        signal(false);

    load():
        void
    {
        if
        (
            this.requested
        )
        {
            return;
        }

        this.requested =
            true;

        let json:
            any = undefined;

        let erp:
            any = undefined;

        let pending =
            2;

        const done =
            () =>
            {
                pending--;

                if
                (
                    pending > 0
                )
                {
                    return;
                }

                if
                (
                    json === null
                    &&
                    erp === null
                )
                {
                    this.failed.set(true);
                    this.loaded.set(true);

                    return;
                }

                const base =
                    normalize(json ?? {});

                this.content.set(
                    erp
                        ? fromErp(base, erp)
                        : base
                );

                this.loaded.set(true);
            };

        this.http
            .get<any>(
                CONTENT_URL,
                {
                    params:
                    {
                        v:String(Date.now())
                    }
                }
            )
            .subscribe(
                {
                    next:
                        raw =>
                        {
                            json = raw ?? {};
                            done();
                        },
                    error:
                        () =>
                        {
                            json = null;
                            done();
                        }
                }
            );

        // Time stamp : never a cached copy, so a Website
        // Configuration Update shows on the next page load
        this.http
            .get<any>(
                ERP_URL,
                {
                    params:
                    {
                        v:String(Date.now())
                    }
                }
            )
            .subscribe(
                {
                    next:
                        raw =>
                        {
                            erp = raw ?? null;
                            done();
                        },
                    error:
                        () =>
                        {
                            erp = null;
                            done();
                        }
                }
            );
    }

    // Section wording : the configuration's, else the default
    text
    (
        key:
            string
    ):
        string
    {
        return this.content()?.texts?.[key] || DEFAULT_TEXTS[key] || '';
    }

    // A brand by its web address part
    brand
    (
        slug:
            string
    ):
        WebsiteBrand | null
    {
        return this.content()?.brands.find(x => x.slug === slug) ?? null;
    }

    // Parts catalogues by Brand Code : loaded once per brand
    readonly parts =
        signal<Record<string, WebsitePart[] | 'loading' | 'failed'>>({});

    loadParts
    (
        code:
            string
    ):
        void
    {
        if
        (
            !code
            ||
            this.parts()[code]
        )
        {
            return;
        }

        this.parts.update(x => ({ ...x, [code]:'loading' }));

        this.http
            .get<any>(
                `${ERP_URL}/parts`,
                {
                    params:
                    {
                        brand:code
                    }
                }
            )
            .subscribe(
                {
                    next:
                        rows =>
                            this.parts.update(x => ({ ...x, [code]:list(rows).map(part).filter(p => p.name) })),
                    error:
                        () =>
                            this.parts.update(x => ({ ...x, [code]:'failed' }))
                }
            );
    }

    // A bike by its web address part
    bike
    (
        slug:
            string
    ):
        WebsiteBike | null
    {
        return this.content()?.bikes.find(x => x.slug === slug) ?? null;
    }
}


//===============================================================
// Defaults
//===============================================================

function text
(
    value:
        any
):
    string
{
    return value === null || value === undefined
        ? ''
        : String(value).trim();
}

function list
(
    value:
        any
):
    any[]
{
    return Array.isArray(value)
        ? value
        : [];
}

function numbers
(
    value:
        any,
    fallback:
        number[]
):
    number[]
{
    const result =
        list(value)
            .map(Number)
            .filter(x => isFinite(x) && x > 0);

    return result.length
        ? result
        : fallback;
}

function stock
(
    value:
        any
):
    WebsiteStock
{
    const key =
        text(value).toLowerCase();

    return key === 'in-stock' || key === 'few-left' || key === 'pre-order'
        ? key
        : '';
}

function part
(
    x:
        any
):
    WebsitePart
{
    return {
        kind:text(x?.kind),
        partNumber:text(x?.partNumber),
        name:text(x?.name),
        unit:text(x?.unit),
        price:typeof x?.price === 'number' && x.price > 0 ? x.price : null,
        stock:text(x?.stock) === 'in-stock' ? 'in-stock' : 'order'
    };
}


function card
(
    x:
        any
):
    WebsiteCard
{
    return {
        title:text(x?.title),
        text:text(x?.text),
        photo:text(x?.photo)
    };
}

function policy
(
    x:
        any
):
    WebsitePolicy | null
{
    if
    (
        !x
    )
    {
        return null;
    }

    const sections =
        list(x.sections)
            .map
            (
                s =>
                ({
                    heading:text(s?.heading),
                    text:text(s?.text)
                })
            )
            .filter(s => s.heading || s.text);

    return sections.length
        ? {
            title:text(x.title),
            updatedOn:text(x.updatedOn),
            sections
        }
        : null;
}

function bike
(
    x:
        any,
    used:
        Set<string>
):
    WebsiteBike
{
    let slug =
        slugify(text(x?.slug) || text(x?.model)) || 'bike';

    // Two bikes must never share an address
    let unique =
        slug;

    let n =
        2;

    while (used.has(unique))
    {
        unique = `${slug}-${n++}`;
    }

    used.add(unique);

    slug = unique;

    return {
        slug,
        code:text(x?.code),
        model:text(x?.model),
        brand:text(x?.brand),
        brandLogo:text(x?.brandLogo),
        category:text(x?.category),
        tagline:text(x?.tagline),
        description:text(x?.description),
        engine:text(x?.engine),
        mileage:text(x?.mileage),
        topSpeed:text(x?.topSpeed),
        price:typeof x?.price === 'number' && x.price > 0 ? x.price : null,
        priceText:text(x?.priceText),
        stock:stock(x?.stock),
        photo:text(x?.photo),
        featured:x?.featured === true,
        colours:list(x?.colours)
            .map
            (
                c =>
                ({
                    name:text(c?.name),
                    hex:text(c?.hex) || '#94a3b8',
                    photo:text(c?.photo)
                })
            )
            .filter(c => c.name),
        gallery:list(x?.gallery).map(text).filter(Boolean),
        highlights:list(x?.highlights).map(text).filter(Boolean),
        specs:list(x?.specs)
            .map
            (
                g =>
                ({
                    title:text(g?.title),
                    rows:list(g?.rows)
                        .map
                        (
                            r =>
                            ({
                                label:text(r?.label),
                                value:text(r?.value)
                            })
                        )
                        .filter(r => r.label)
                })
            )
            .filter(g => g.title && g.rows.length)
    };
}

function normalize
(
    raw:
        any
):
    WebsiteContent
{
    const company =
        raw?.company ?? {};

    const social =
        raw?.social ?? {};

    const why =
        raw?.why ?? {};

    const emi =
        raw?.emi ?? {};

    const offer =
        raw?.offer;

    const policies =
        raw?.policies ?? {};

    const theme =
        text(raw?.defaultTheme).toLowerCase();

    const used =
        new Set<string>();

    const bikes =
        list(raw?.bikes)
            .filter(x => text(x?.model))
            .map(x => bike(x, used));

    return {
        enabled:raw?.enabled !== false,
        template:text(raw?.template) || 'website-page-1',
        defaultTheme:theme === 'light' || theme === 'deep' ? theme : 'auto',
        currency:text(raw?.currency) || '৳',
        company:
        {
            name:text(company.name) || 'Our Company',
            tagline:text(company.tagline),
            about:text(company.about),
            brand:text(company.brand),
            logoLight:text(company.logoLight) || text(company.logoDeep),
            logoDeep:text(company.logoDeep) || text(company.logoLight),
            address:text(company.address),
            hotline:text(company.hotline),
            whatsApp:text(company.whatsApp) || text(company.hotline),
            email:text(company.email),
            hours:text(company.hours),
            openingHours:list(company.openingHours)
                .map
                (
                    h =>
                    ({
                        days:text(h?.days),
                        time:text(h?.time)
                    })
                )
                .filter(h => h.days && !/^\[.*\]$/.test(h.days)),
            mapQuery:text(company.mapQuery)
        },
        social:
        {
            facebook:text(social.facebook),
            youtube:text(social.youtube),
            instagram:text(social.instagram),
            tiktok:text(social.tiktok)
        },
        payments:list(raw?.payments)
            .map
            (
                p =>
                    typeof p === 'string'
                        ? { name:text(p), logo:'' }
                        : { name:text(p?.name), logo:text(p?.logo) }
            )
            .filter(p => p.name),
        tags:list(raw?.tags).map(text).filter(Boolean),
        bikes,
        brands:brandsOf(bikes),
        brandsMenu:raw?.brandsMenu !== false,
        stripSpeed:speedOf(raw?.stripSpeed),
        hero:{ photo:'', welcome:false, background:false, strength:2, title:'', text:'', showAddress:true, round:'', roundStrength:2 },
        texts:Object.fromEntries(
            Object.entries(raw?.texts ?? {})
                .map(([k, v]) => [k, text(v)])
                .filter(([, v]) => v)),
        offer:offer && text(offer.title)
            ? {
                title:text(offer.title),
                text:text(offer.text),
                endsOn:text(offer.endsOn)
            }
            : null,
        why:
        {
            photo:text(why.photo),
            points:list(why.points).map(card).filter(x => x.title),
            stats:list(why.stats)
                .map
                (
                    s =>
                    ({
                        value:text(s?.value),
                        label:text(s?.label)
                    })
                )
                .filter(s => s.value)
        },
        emi:
        {
            enabled:emi.enabled !== false,
            examplePrice:Number(emi.examplePrice) > 0 ? Number(emi.examplePrice) : 0,
            downPercents:numbers(emi.downPercents, [10, 20, 30, 50]),
            months:numbers(emi.months, [3, 6, 12, 18, 24]),
            note:text(emi.note) || 'Estimate only. The final instalment depends on the bank, card and charges.'
        },
        services:list(raw?.services).map(card).filter(x => x.title),
        branches:list(raw?.branches)
            .map
            (
                x =>
                ({
                    name:text(x?.name),
                    type:text(x?.type),
                    address:text(x?.address),
                    phone:text(x?.phone),
                    hours:text(x?.hours),
                    mapUrl:text(x?.mapUrl),
                    brands:list(x?.brands).map(text).filter(Boolean)
                })
            )
            .filter(x => x.name),
        faq:list(raw?.faq)
            .map
            (
                f =>
                ({
                    q:text(f?.q),
                    a:text(f?.a)
                })
            )
            .filter(f => f.q),
        policies:
        {
            warranty:policy(policies.warranty),
            terms:policy(policies.terms),
            privacy:policy(policies.privacy)
        }
    };
}


//===============================================================
// ERP data over the JSON
//===============================================================

// "[PHONE]"-style placeholders count as empty
function real
(
    value:
        any
):
    string
{
    const v =
        text(value);

    return /^\[.*\]$/.test(v)
        ? ''
        : v;
}


// Upload path from the ERP → full address on the API host
function fileUrl
(
    path:
        any
):
    string
{
    const p =
        text(path);

    if
    (
        !p
    )
    {
        return '';
    }

    if
    (
        /^(https?:)?\/\//i.test(p)
        ||
        p.startsWith('data:')
    )
    {
        return p;
    }

    return `${FILE_ROOT}${p.startsWith('/') ? '' : '/'}${p}`;
}


// Swatch from the colour's name (Color Management has no code)
const SWATCHES:
    [RegExp, string][] =
[
    [/maroon|wine|burgundy/, '#7f1d1d'],
    [/red/, '#c81e1e'],
    [/black/, '#111827'],
    [/white|pearl/, '#f1f5f9'],
    [/navy/, '#1e3a8a'],
    [/blue|cyan/, '#1d4ed8'],
    [/silver/, '#c0c4cc'],
    [/grey|gray|ash/, '#6b7280'],
    [/green|olive/, '#15803d'],
    [/yellow/, '#eab308'],
    [/orange/, '#ea580c'],
    [/gold|golden/, '#b8860b'],
    [/brown|bronze|copper/, '#78350f'],
    [/purple|violet/, '#7e22ce'],
    [/pink/, '#db2777']
];


function swatch
(
    name:
        string
):
    string
{
    const key =
        name.toLowerCase();

    return SWATCHES.find(([test]) => test.test(key))?.[1] ?? '#94a3b8';
}


function fromErp
(
    base:
        WebsiteContent,
    erp:
        any
):
    WebsiteContent
{
    const c =
        erp?.company ?? {};

    const logo =
        fileUrl(c.logoPath);

    const phone =
        text(c.mobile) || text(c.phone);

    // Bikes tab (Website Configuration): hidden ones are left out,
    // the rest follow the tab's order (0 = no order, goes last)
    const order =
        (x:any) =>
            typeof x?.displayOrder === 'number' && x.displayOrder > 0
                ? x.displayOrder
                : Number.MAX_SAFE_INTEGER;

    const models =
        list(erp?.models)
            .filter(x => text(x?.model))
            .filter(x => x?.showOnWebsite !== false)
            .map((x, i) => ({ x, i }))
            .sort((a, b) => order(a.x) - order(b.x) || a.i - b.i)
            .map(a => a.x);

    const brandNames =
        [...new Set(models.map(x => text(x?.brand)).filter(Boolean))];

    const company =
    {
        ...base.company,
        name:text(c.name) || base.company.name,
        brand:joinNames(brandNames) || real(base.company.brand),
        logoLight:logo || base.company.logoLight,
        logoDeep:logo || base.company.logoDeep,
        address:text(c.address) || real(base.company.address),
        hotline:phone || real(base.company.hotline),
        whatsApp:real(base.company.whatsApp) || phone,
        email:text(c.email) || real(base.company.email),
        hours:real(base.company.hours),
        mapQuery:real(base.company.mapQuery)
    };

    // Hours and map link by branch name, until Branches has them
    const extras =
        new Map(base.branches.map(b => [b.name.toLowerCase(), b]));

    const branches =
        list(erp?.branches)
            .filter(x => text(x?.name))
            .map
            (
                x =>
                {
                    const name =
                        text(x.name);

                    const more =
                        extras.get(name.toLowerCase());

                    return {
                        name,
                        type:text(x.type),
                        address:text(x.address),
                        phone:text(x.mobile) || phone,
                        hours:real(more?.hours) || real(company.hours),
                        mapUrl:real(more?.mapUrl),
                        brands:[] as string[]
                    };
                }
            );

    // Specs and texts by model name, until Bike Specifications
    const specs =
        new Map<string, WebsiteBike>();

    for (const b of base.bikes)
    {
        specs.set(slugify(b.model), b);
        specs.set(b.slug, b);
    }

    const used =
        new Set<string>();

    const bikes =
        models.map
        (
            m =>
            {
                const full =
                    text(m.model);

                // Shown as "REVOO - A04" : the category in front of the
                // sub category name ("Motor Bikes - ") is not shown
                const model =
                    full.replace(/^motor\s*bikes?\s*-\s*/i, '') || full;

                const extra =
                    specs.get(slugify(full)) ?? specs.get(slugify(model));

                const colours =
                    list(m.colours)
                        .filter(x => text(x?.colour))
                        .map
                        (
                            x =>
                            ({
                                name:text(x.colour),
                                hex:swatch(text(x.colour)),
                                photo:fileUrl(x.imagePath)
                            })
                        );

                const photos =
                    colours.map(x => x.photo).filter(Boolean);

                const price =
                    typeof m.price === 'number' && m.price > 0
                        ? m.price
                        : null;

                const made =
                    bike(
                        {
                            ...(extra ?? {}),
                            slug:'',
                            code:text(m.modelCode),
                            model,
                            brand:text(m.brand),
                            brandLogo:fileUrl(m.brandLogoPath),
                            category:real(extra?.category),
                            tagline:text(m.tagline) || real(extra?.tagline),
                            description:text(m.description) || real((extra as any)?.description),
                            engine:text(m.engine) || real(extra?.engine),
                            mileage:text(m.mileage) || real(extra?.mileage),
                            topSpeed:text(m.topSpeed) || real(extra?.topSpeed),
                            price,
                            priceText:price === null ? (real(extra?.priceText) || 'Call for price') : '',
                            stock:text(m.stock),
                            photo:photos[0] || real(extra?.photo),
                            featured:typeof m.featured === 'boolean' ? m.featured : extra?.featured === true,
                            colours,
                            gallery:(extra?.gallery?.length ? extra.gallery : photos.slice(1)),
                            highlights:extra?.highlights ?? [],
                            // Motor Bike Specifications : switched off = no sheet;
                            // no record yet = the website's own sheet
                            specs:m.showSpecs === false
                                ? []
                                : (list(m.specs).length ? list(m.specs) : (extra?.specs ?? []))
                        },
                        used
                    );

                return made;
            }
        );

    // ERP brands, those with bikes first in bike order
    const fromBikes =
        brandsOf(bikes);

    const erpBrands =
        list(erp?.brands)
            .filter(x => text(x?.name))
            .map
            (
                x =>
                ({
                    name:text(x.name),
                    code:text(x.code),
                    slug:slugify(text(x.name)) || slugify(text(x.code)),
                    logo:fileUrl(x.logoPath),
                    page:true,
                    about:''
                })
            );

    const byName =
        new Map(erpBrands.map(x => [x.name.toLowerCase(), x]));

    const brands:
        WebsiteBrand[] = [];

    for (const b of fromBikes)
    {
        const erpBrand =
            byName.get(b.name.toLowerCase());

        brands.push(
            erpBrand
                ? { ...erpBrand, logo:erpBrand.logo || b.logo }
                : b
        );
    }

    for (const b of erpBrands)
    {
        if
        (
            !brands.some(x => x.name.toLowerCase() === b.name.toLowerCase())
        )
        {
            brands.push(b);
        }
    }

    const merged:
        WebsiteContent =
    {
        ...base,
        company,
        branches,
        bikes,
        brands
    };

    return erp?.configuration
        ? withConfiguration(merged, erp.configuration)
        : merged;
}


//===============================================================
// Website Configuration page (ERP) over everything else : once it
// is saved, the JSON's texts and lists are no longer used.
//===============================================================

function withConfiguration
(
    site:
        WebsiteContent,
    c:
        any
):
    WebsiteContent
{
    const items =
        list(c.items);

    const ofKind =
        (kind:string) =>
            items.filter(x => text(x?.kind) === kind);

    // Brands : the page's order and switches; hidden brands and
    // their bikes leave the website
    const settings =
        list(c.brands);

    const settingOf =
        (name:string) =>
            settings.find(s => text(s?.name).toLowerCase() === name.toLowerCase());

    const hidden =
        new Set(
            settings
                .filter(s => s?.showOnWebsite === false)
                .map(s => text(s?.name).toLowerCase()));

    const rank =
        (name:string) =>
        {
            const i =
                settings.findIndex(s => text(s?.name).toLowerCase() === name.toLowerCase());

            return i < 0 ? 9999 : i;
        };

    const brands =
        site.brands
            .filter(b => !hidden.has(b.name.toLowerCase()))
            .map
            (
                b =>
                {
                    const s =
                        settingOf(b.name);

                    return {
                        ...b,
                        page:s ? s.showBrandPage !== false : true,
                        about:text(s?.about)
                    };
                }
            )
            .sort((a, b) => rank(a.name) - rank(b.name));

    const bikes =
        site.bikes
            .filter(b => !b.brand || !hidden.has(b.brand.toLowerCase()))
            .sort((a, b) => rank(a.brand) - rank(b.brand));

    // Opening hours : one line per row, and a short one for cards
    const hours =
        list(c.openingHours)
            .filter(h => text(h?.days))
            .map
            (
                h =>
                ({
                    days:text(h.days),
                    time:h.isClosed
                        ? 'Closed'
                        : `${clock(text(h.opensAt))} – ${clock(text(h.closesAt))}`
                })
            );

    const firstOpen =
        hours.find(h => h.time !== 'Closed');

    const oneLine =
        firstOpen ? `${firstOpen.days} ${firstOpen.time}` : '';

    // Branch brands by branch name
    const branchBrands =
        new Map<string, string[]>(
            list(c.branchBrands).map(x => [text(x?.branch).toLowerCase(), list(x?.brands).map(text).filter(Boolean)]));

    const policy =
        (key:string) =>
        {
            const parts =
                list(c.policies).filter(p => text(p?.key) === key);

            const general =
                parts.find(p => !text(p?.brand));

            const sections =
            [
                ...list(general?.sections),
                ...parts
                    .filter(p => text(p?.brand) && !hidden.has(text(p.brand).toLowerCase()))
                    .flatMap
                    (
                        p =>
                            list(p.sections).map
                            (
                                (s:any, i:number) =>
                                ({
                                    heading:i === 0
                                        ? `${text(p.brand)} · ${text(s?.heading) || 'Warranty'}`
                                        : text(s?.heading),
                                    text:text(s?.text)
                                })
                            )
                    )
            ]
                .map((s:any) => ({ heading:text(s?.heading), text:text(s?.text) }))
                .filter(s => s.heading || s.text);

            return sections.length
                ? {
                    title:text(general?.title) || text(parts[0]?.title) || (key === 'warranty' ? 'Warranty' : key === 'terms' ? 'Terms' : 'Privacy'),
                    updatedOn:text(general?.updatedOn) || text(parts[0]?.updatedOn),
                    sections
                }
                : null;
        };

    const phone =
        text(c.hotline) || site.company.hotline;

    // Offer ribbon : from the configuration only,
    // hidden after its "ends on" date
    const offerEnds =
        text(c.offerEndsOn);

    const now =
        new Date();

    const today =
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const offerTitle =
        offerEnds && offerEnds < today ? '' : text(c.offerTitle);

    const texts:
        Record<string, string> = {};

    for (const x of ofKind('text'))
    {
        const key =
            text(x?.title);

        const value =
            text(x?.text);

        if
        (
            key && value
        )
        {
            texts[key] = value;
        }
    }

    return {
        ...site,
        enabled:c.isEnabled !== false,
        currency:text(c.currencySymbol) || '৳',
        texts,
        payments:ofKind('payment')
            .map(x => ({ name:text(x.title), logo:fileUrl(x.photoPath) }))
            .filter(x => x.name),
        defaultTheme:['light', 'deep'].includes(text(c.defaultTheme)) ? text(c.defaultTheme) as 'light' | 'deep' : 'auto',
        company:
        {
            ...site.company,
            tagline:text(c.tagline),
            about:text(c.about),
            hotline:phone,
            whatsApp:text(c.whatsApp) || phone,
            email:text(c.email) || site.company.email,
            hours:oneLine,
            openingHours:hours,
            mapQuery:text(c.mapQuery)
        },
        social:
        {
            facebook:text(c.facebookUrl),
            youtube:text(c.youtubeUrl),
            instagram:text(c.instagramUrl),
            tiktok:text(c.tiktokUrl)
        },
        brands,
        bikes,
        brandsMenu:c.showBrandsMenu !== false,
        stripSpeed:speedOf(c.stripSpeed),
        hero:
        {
            photo:fileUrl(c.heroPhotoPath),
            welcome:c.heroWelcome !== false,
            background:c.heroBackground !== false,
            strength:Math.min(5, Math.max(1, Math.round(Number(c.heroStrength) || 2))),
            title:text(c.heroTitle),
            text:text(c.heroText),
            showAddress:c.heroShowAddress !== false,
            round:c.heroRoundOn === false ? '' : fileUrl(c.heroRoundPath),
            roundStrength:Math.min(5, Math.max(1, Math.round(Number(c.heroRoundStrength) || 2)))
        },
        offer:c.showOfferRibbon !== false && offerTitle
            ? { title:offerTitle, text:text(c.offerText), endsOn:offerEnds }
            : null,
        tags:c.showMovingStrip === false ? [] : ofKind('tag').map(x => text(x.title)).filter(Boolean),
        why:
        {
            photo:fileUrl(c.whyPhotoPath),
            points:c.showWhyUs === false
                ? []
                : ofKind('why-point').map(x => ({ title:text(x.title), text:text(x.text), photo:fileUrl(x.photoPath) })).filter(x => x.title),
            stats:ofKind('why-stat').map(x => ({ value:text(x.title), label:text(x.text) })).filter(x => x.value)
        },
        emi:
        {
            enabled:c.showEmi !== false,
            examplePrice:Number(c.emiExamplePrice) > 0 ? Number(c.emiExamplePrice) : 0,
            downPercents:numbers(c.emiDownPercents, [10, 20, 30, 50]),
            months:numbers(c.emiMonths, [3, 6, 12, 18, 24]),
            note:text(c.emiNote) || 'Estimate only. The final instalment depends on the bank, card and charges.'
        },
        services:c.showService === false
            ? []
            : ofKind('service').map(x => ({ title:text(x.title), text:text(x.text), photo:fileUrl(x.photoPath) })).filter(x => x.title),
        branches:c.showBranches === false
            ? []
            : site.branches.map
            (
                b =>
                ({
                    ...b,
                    // Not the sample file's : one-line company hours
                    // until the Branches page has its own
                    hours:oneLine,
                    mapUrl:'',
                    brands:(branchBrands.get(b.name.toLowerCase()) ?? []).filter(n => !hidden.has(n.toLowerCase()))
                })
            ),
        faq:c.showFaq === false
            ? []
            : ofKind('faq').map(x => ({ q:text(x.title), a:text(x.text) })).filter(x => x.q),
        policies:
        {
            warranty:policy('warranty'),
            terms:policy('terms'),
            privacy:policy('privacy')
        }
    };
}


// "18:30" → "6:30 PM"
function clock
(
    value:
        string
):
    string
{
    const m =
        /^(\d{1,2}):(\d{2})$/.exec(value);

    if
    (
        !m
    )
    {
        return value;
    }

    const h =
        Number(m[1]);

    return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}


// Unique brands of the bikes, first logo found
function brandsOf
(
    bikes:
        WebsiteBike[]
):
    WebsiteBrand[]
{
    const map =
        new Map<string, WebsiteBrand>();

    for (const b of bikes)
    {
        const name =
            real(b.brand);

        if
        (
            !name
        )
        {
            continue;
        }

        const found =
            map.get(name.toLowerCase());

        if
        (
            !found
        )
        {
            map.set(name.toLowerCase(), { name, code:'', slug:slugify(name), logo:b.brandLogo, page:true, about:'' });
        }
        else if
        (
            !found.logo
            &&
            b.brandLogo
        )
        {
            found.logo = b.brandLogo;
        }
    }

    return [...map.values()];
}


// "A" · "A & B" · "A, B & C"
function joinNames
(
    names:
        string[]
):
    string
{
    return names.length < 3
        ? names.join(' & ')
        : `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

// Moving strip speed : a whole number 1 … 10, else 5
function speedOf(value:unknown):number
{
    const n =
        Math.round(Number(value));

    return Number.isFinite(n) && n >= 1 && n <= 10 ? n : 5;
}
