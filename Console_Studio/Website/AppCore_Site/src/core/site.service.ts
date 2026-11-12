//===============================================================
// Website data : settings + products from the Console API
// (api/public). The content is edited in the Console at
// Settings > Website settings. Built-in text is used until the
// API answers (or if it is down), so the site never shows empty.
//===============================================================

import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { environment } from '../environments/environment';

export interface SitePlan
{
    Code: string;
    Name: string;
    Tagline: string | null;
    MonthlyPrice: number | null;
    SetupFee: number | null;
    Branches: string | null;
    Users: string | null;
    Highlight: boolean;
    Features: string[];
}

export interface SiteSettings
{
    CompanyName: string;
    Tagline: string;
    Phone: string | null;
    WhatsApp: string | null;
    Email: string | null;
    Address: string | null;
    OfficeHours: string | null;
    MapUrl: string | null;
    Facebook: string | null;
    LinkedIn: string | null;
    YouTube: string | null;
    HeroEyebrow: string;
    HeroTitle: string;
    HeroText: string;
    AnnouncementOn: boolean;
    AnnouncementText: string | null;
    Stats: { Value: string; Label: string }[];
    AcceptRequests: boolean;
    DemoEnabled: boolean;
    PurchaseEnabled: boolean;
    RequestThanks: string;
    ShowPricing: boolean;
    Currency: string;
    PricingNote: string | null;
    Plans: SitePlan[];
    AboutTitle: string;
    AboutText: string;
}

export interface SiteProduct
{
    ProductCode: string;
    ProductName: string;
    Industry: string;
    Description: string | null;
    Status: 'Planned' | 'Active' | 'Retired';
}

export interface RequestSubmit
{
    RequestType: 'Demo' | 'Purchase';
    ProductCode: string;
    LegalName: string;
    DisplayName: string | null;
    BinNo: string | null;
    TinNo: string | null;
    Address: string | null;
    City: string | null;
    Country: string;
    ContactName: string;
    Designation: string | null;
    Phone: string;
    Email: string;
    Branches: number | null;
    Users: number | null;
    PreferredSubdomain: string | null;
    PreferredDate: string | null;
    PreferredTime: string | null;
    Message: string | null;
    HeardFrom: string | null;
    Consent: boolean;
    Website: string;
}

// Shown until the Console answers (same as the Console defaults)
const DEFAULT_SETTINGS: SiteSettings =
{
    CompanyName: 'AppCore Technologies',
    Tagline: 'Business software for dealers and growing companies',
    Phone: null,
    WhatsApp: null,
    Email: null,
    Address: null,
    OfficeHours: null,
    MapUrl: null,
    Facebook: null,
    LinkedIn: null,
    YouTube: null,
    HeroEyebrow: 'AppCore Technologies',
    HeroTitle: 'Run your whole business from one seat.',
    HeroText: 'Business software for automobile and two-wheeler dealers, real estate companies and consulting firms : every branch, one system, on your own web address.',
    AnnouncementOn: false,
    AnnouncementText: null,
    Stats:
    [
        { Value: 'Multi-branch', Label: 'Every branch in one system' },
        { Value: 'Tax ready', Label: 'Local VAT / sales tax rules built in' },
        { Value: '4 industries', Label: 'One proven platform' },
        { Value: 'Your address', Label: 'yourname.appcoretech.net' }
    ],
    AcceptRequests: true,
    DemoEnabled: true,
    PurchaseEnabled: true,
    RequestThanks: 'Thank you. Our team will call you within one working day.',
    ShowPricing: true,
    Currency: 'USD',
    PricingNote: 'Prices exclude local taxes. Setup includes data migration and staff training.',
    Plans: [],
    AboutTitle: 'Software built inside real businesses',
    AboutText: 'AppCore Technologies builds business software for dealers and growing companies.'
};

const DEFAULT_PRODUCTS: SiteProduct[] =
[
    { ProductCode: 'AUTOMOBILE', ProductName: 'AppCore Automobiles', Industry: 'Automobile Dealership', Description: 'Full automobile business management.', Status: 'Planned' },
    { ProductCode: 'TWO-WHEELER', ProductName: 'AppCore Two Wheelers', Industry: 'Two Wheeler Dealership', Description: 'Sales, bookings, stock, spare parts, registration, accounts and tax for two-wheeler dealers.', Status: 'Active' },
    { ProductCode: 'REAL-ESTATE', ProductName: 'AppCore Real Estate', Industry: 'Real Estate', Description: 'Real estate project, sales and property management.', Status: 'Planned' },
    { ProductCode: 'CONSULTANCY', ProductName: 'AppCore Consultancy', Industry: 'Consultancy', Description: 'Consultancy practice and client management.', Status: 'Planned' }
];

@Injectable({ providedIn: 'root' })
export class SiteService
{
    private readonly http = inject(HttpClient);
    private readonly api = environment.apiUrl;

    readonly settings = signal<SiteSettings>(DEFAULT_SETTINGS);
    readonly products = signal<SiteProduct[]>(DEFAULT_PRODUCTS);
    readonly ready = signal(false);

    // products on sale now (the others are not offered on this website)
    readonly liveProducts = computed(() => this.products().filter(p => p.Status === 'Active'));

    readonly year = new Date().getFullYear();

    readonly whatsAppUrl = computed(() =>
    {
        const n = (this.settings().WhatsApp ?? '').replace(/\D/g, '');

        return n ? `https://wa.me/${n}` : null;
    });

    readonly phoneUrl = computed(() =>
    {
        const p = (this.settings().Phone ?? '').replace(/[^\d+]/g, '');

        return p ? `tel:${p}` : null;
    });

    constructor()
    {
        void this.load();
    }

    async load(): Promise<void>
    {
        try
        {
            const [settings, products] = await Promise.all([
                firstValueFrom(this.http.get<SiteSettings>(`${this.api}/public/site`)),
                firstValueFrom(this.http.get<SiteProduct[]>(`${this.api}/public/products`))
            ]);

            this.settings.set({ ...DEFAULT_SETTINGS, ...settings });

            if (products.length)
            {
                this.products.set(products);
            }
        }
        catch
        {
            // the Console is not reachable : built-in text stays
        }
        finally
        {
            this.ready.set(true);
        }
    }

    checkSubdomain(name: string): Promise<{ Name: string; Host: string; Available: boolean; Reason: string | null }>
    {
        return firstValueFrom(this.http.get<{ Name: string; Host: string; Available: boolean; Reason: string | null }>(`${this.api}/public/subdomain/${encodeURIComponent(name)}`));
    }

    submit(body: RequestSubmit): Promise<{ RequestNo: string }>
    {
        return firstValueFrom(this.http.post<{ RequestNo: string }>(`${this.api}/public/requests`, body));
    }

    price(value: number | null): string
    {
        if (value === null || value === undefined)
        {
            return 'On request';
        }

        return `${this.settings().Currency} ${Number(value).toLocaleString('en-US')}`;
    }
}

// The API's message from an HttpErrorResponse
export function errorMessage(e: unknown, fallback = 'Something went wrong. Please try again.'): string
{
    const err = e as { status?: number; error?: { message?: string } };

    if (err?.status === 0)
    {
        return 'We could not reach our server. Please check your connection, or call us.';
    }

    return err?.error?.message || fallback;
}
