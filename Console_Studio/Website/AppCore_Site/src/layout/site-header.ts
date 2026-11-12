import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';

import { PRODUCTS } from '../core/products';
import { SiteService } from '../core/site.service';

@Component({
    selector: 'site-header',
    imports: [RouterLink, RouterLinkActive, FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { '(window:scroll)': 'onScroll()', '(document:keydown.escape)': 'loginOpen.set(false); prodOpen.set(false)', '(document:click)': 'onDocClick($event)' },
    styles: [`
        :host { position: sticky; top: 0; z-index: 30; display: block; }
        .hd { border-bottom: 1px solid transparent; background: rgba(246, 245, 242, 0.75); backdrop-filter: blur(14px) saturate(1.4); transition: border-color 0.2s, box-shadow 0.2s, background 0.2s; }
        .hd.scrolled { border-color: var(--s-line); background: rgba(246, 245, 242, 0.92); box-shadow: 0 10px 30px -24px rgba(17, 19, 23, 0.5); }
        .hd-in { display: flex; align-items: center; gap: 28px; height: 72px; }
        .brand { display: flex; flex-shrink: 0; align-items: center; }
        .brand img { display: block; width: auto; height: 44px; }
        @media (max-width: 520px) { .brand img { height: 36px; } }
        nav { display: flex; flex: 1; align-items: center; gap: 4px; }
        nav a { position: relative; padding: 8px 13px; border-radius: 10px; color: var(--s-text-2); font-size: 14.5px; font-weight: 600; transition: color 0.15s, background 0.15s; }
        nav a:hover { background: rgba(17, 19, 23, 0.04); color: var(--s-text); }
        nav a.on { color: var(--s-text); }
        nav a.on::after { position: absolute; left: 13px; right: 13px; bottom: 2px; height: 2px; border-radius: 2px; background: var(--s-brand); content: ''; }
        .pm { position: relative; }
        .pm-btn { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border: 0; border-radius: 10px; background: none; color: var(--s-text-2); font: inherit; font-size: 14.5px; font-weight: 600; cursor: pointer; transition: color 0.15s, background 0.15s; }
        .pm-btn:hover, .pm-btn.open { background: rgba(17, 19, 23, 0.04); color: var(--s-text); }
        .pm-btn.on { color: var(--s-text); }
        .pm-btn i { font-size: 10px; transition: transform 0.2s; }
        .pm-btn.open i { transform: rotate(180deg); }
        .pm-panel { position: absolute; top: calc(100% + 12px); left: -14px; display: grid; grid-template-columns: repeat(2, 300px); gap: 6px; padding: 10px; border: 1px solid var(--s-line); border-radius: 18px; background: var(--s-card); box-shadow: var(--s-shadow-lg); animation: s-rise 0.18s ease-out; }
        .pm-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-radius: 12px; color: inherit; transition: background 0.15s; }
        .pm-item:hover, .pm-item.on { background: var(--s-copper-soft); }
        .pm-item .icon-tile { flex-shrink: 0; }
        .pm-item b { display: block; color: var(--s-text); font-size: 14.5px; font-weight: 800; }
        .pm-item small { color: var(--s-muted); font-size: 12.5px; line-height: 1.4; }
        .mobile .m-label { padding: 12px 10px 4px; color: var(--s-faint); font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; }
        .mobile .m-prod { display: flex; align-items: center; gap: 10px; }
        .mobile .m-prod i { width: 18px; color: var(--s-copper); text-align: center; }
        .cta { display: flex; align-items: center; gap: 10px; }
        .tel { display: inline-flex; align-items: center; gap: 8px; color: var(--s-text-2); font-size: 14px; font-weight: 700; }
        .tel i { color: var(--s-copper); }
        .burger { display: none; width: 44px; height: 44px; border: 1px solid var(--s-line); border-radius: 12px; background: var(--s-card); color: var(--s-text); font-size: 16px; cursor: pointer; }
        .mobile { display: none; }
        @media (max-width: 980px)
        {
            nav, .cta .tel, .cta .btn-ghost { display: none; }
            .hd-in { justify-content: space-between; }
            .burger { display: inline-flex; align-items: center; justify-content: center; }
            .mobile.open { display: flex; flex-direction: column; gap: 4px; padding: 10px 16px 18px; border-top: 1px solid var(--s-line); background: var(--s-bg); }
            .mobile a { padding: 12px 10px; border-radius: 10px; color: var(--s-text); font-weight: 700; }
            .mobile a.on { background: var(--s-copper-soft); color: var(--s-copper); }
            .mobile .btn { margin-top: 8px; }
        }
        @media (max-width: 520px) { .cta .btn-primary { display: none; } }

        .login-btn { display: inline-flex; align-items: center; gap: 8px; height: 40px; padding: 0 14px; border: 1px solid var(--s-line); border-radius: 12px; background: var(--s-card); color: var(--s-text); font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; }
        .login-btn:hover { border-color: var(--s-faint); }
        .login-btn i { color: var(--s-copper); }
        .lg-back { position: fixed; inset: 0; z-index: 60; display: flex; align-items: flex-start; justify-content: center; padding: 110px 16px 16px; background: rgba(17, 19, 23, 0.55); backdrop-filter: blur(4px); }
        .lg-box { display: flex; flex-direction: column; gap: 16px; width: min(440px, 100%); padding: 28px; border-radius: 20px; background: var(--s-card); box-shadow: var(--s-shadow-lg); animation: s-rise 0.25s ease-out; }
        .lg-box h3 { color: var(--s-text); font-size: 20px; font-weight: 800; }
        .lg-box p { color: var(--s-muted); font-size: 14px; }
        .lg-addr { display: flex; align-items: stretch; border: 1px solid var(--s-line); border-radius: 12px; overflow: hidden; }
        .lg-addr:focus-within { border-color: var(--s-copper); box-shadow: 0 0 0 4px var(--s-copper-ring); }
        .lg-addr input { flex: 1; min-width: 0; height: 48px; padding: 0 14px; border: 0; outline: none; font: inherit; font-family: var(--s-mono); font-size: 14.5px; }
        .lg-addr span { display: inline-flex; align-items: center; padding: 0 14px; border-left: 1px solid var(--s-line); background: var(--s-card-2); color: var(--s-muted); font-family: var(--s-mono); font-size: 13.5px; }
        .lg-row { display: flex; justify-content: flex-end; gap: 10px; }
        @media (max-width: 980px) { .login-btn span { display: none; } }
    `],
    template: `
        <header class="hd" [class.scrolled]="scrolled()">
            <div class="container hd-in">
                <a class="brand" routerLink="/" (click)="open.set(false)" aria-label="AppCore Technologies : home">
                    <img src="/brand/appcore-logo.svg" alt="AppCore Technologies" width="239" height="44">
                </a>

                <nav>
                    <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }">Home</a>
                    <div class="pm">
                        <button class="pm-btn" type="button" [class.open]="prodOpen()" [class.on]="onProduct()" (click)="prodOpen.set(!prodOpen())" aria-haspopup="true" [attr.aria-expanded]="prodOpen()">Products <i class="fas fa-chevron-down"></i></button>
                        @if (prodOpen())
                        {
                            <div class="pm-panel">
                                @for (p of products; track p.slug)
                                {
                                    <a class="pm-item" [routerLink]="'/' + p.slug" routerLinkActive="on" (click)="prodOpen.set(false)">
                                        <span class="icon-tile"><i [class]="p.icon"></i></span>
                                        <span><b>{{ p.name }}</b><small>{{ p.industry }}</small></span>
                                    </a>
                                }
                            </div>
                        }
                    </div>
                    @if (site.settings().ShowPricing) { <a routerLink="/pricing" routerLinkActive="on">Pricing</a> }
                    <a routerLink="/about" routerLinkActive="on">About</a>
                    <a routerLink="/contact" routerLinkActive="on">Contact</a>
                </nav>

                <div class="cta">
                    @if (site.phoneUrl(); as tel) { <a class="tel" [href]="tel"><i class="fas fa-phone"></i>{{ site.settings().Phone }}</a> }
                    <button class="login-btn" type="button" (click)="openLogin()"><i class="fas fa-right-to-bracket"></i><span>Client login</span></button>
                    @if (site.settings().AcceptRequests)
                    {
                        <a class="btn btn-primary btn-sm" routerLink="/request"><i class="fas fa-calendar-check"></i> Book a demo</a>
                    }
                    <button class="burger" type="button" aria-label="Menu" (click)="open.set(!open())"><i class="fas" [class.fa-bars]="!open()" [class.fa-xmark]="open()"></i></button>
                </div>
            </div>

            <div class="mobile" [class.open]="open()">
                <a routerLink="/" routerLinkActive="on" [routerLinkActiveOptions]="{ exact: true }" (click)="open.set(false)">Home</a>
                <span class="m-label">Products</span>
                @for (p of products; track p.slug)
                {
                    <a class="m-prod" [routerLink]="'/' + p.slug" routerLinkActive="on" (click)="open.set(false)"><i [class]="p.icon"></i>{{ p.name }}</a>
                }
                <span class="m-label">Company</span>
                @if (site.settings().ShowPricing) { <a routerLink="/pricing" routerLinkActive="on" (click)="open.set(false)">Pricing</a> }
                <a routerLink="/about" routerLinkActive="on" (click)="open.set(false)">About</a>
                <a routerLink="/contact" routerLinkActive="on" (click)="open.set(false)">Contact</a>
                @if (site.settings().AcceptRequests)
                {
                    <a class="btn btn-primary" routerLink="/request" (click)="open.set(false)"><i class="fas fa-calendar-check"></i> Book a demo</a>
                }
            </div>
        </header>

        @if (loginOpen())
        {
            <div class="lg-back" (click)="loginOpen.set(false)">
                <form class="lg-box" (click)="$event.stopPropagation()" (ngSubmit)="goLogin()">
                    <h3>Client login</h3>
                    <p>Enter your company's AppCore address. You'll sign in there with your own user name and password.</p>
                    <div class="lg-addr">
                        <input #addr name="addr" [(ngModel)]="address" placeholder="yourcompany" autocomplete="off" spellcheck="false">
                        <span>.appcoretech.net</span>
                    </div>
                    <span class="hint">Don't know it? Ask your administrator, or <a routerLink="/contact" (click)="loginOpen.set(false)">contact us</a>.</span>
                    <div class="lg-row">
                        <button class="btn btn-sm" type="button" (click)="loginOpen.set(false)">Cancel</button>
                        <button class="btn btn-dark btn-sm" type="submit" [disabled]="!clean()">Continue <i class="fas fa-arrow-right"></i></button>
                    </div>
                </form>
            </div>
        }
    `
})
export class SiteHeader
{
    readonly site = inject(SiteService);

    readonly open = signal(false);
    readonly scrolled = signal(false);

    readonly loginOpen = signal(false);

    readonly prodOpen = signal(false);

    readonly products = PRODUCTS;

    private readonly router = inject(Router);

    private readonly url = toSignal(
        this.router.events.pipe(filter(e => e instanceof NavigationEnd), map(e => (e as NavigationEnd).urlAfterRedirects)),
        { initialValue: this.router.url });

    // "Products" looks active on a product page
    readonly onProduct = computed(() =>
    {
        const path = this.url().replace(/^\/+/, '').split(/[/?#]/)[0];

        return this.products.some(p => p.slug === path);
    });

    address = '';

    private readonly addr = viewChild<ElementRef<HTMLInputElement>>('addr');

    openLogin(): void
    {
        this.open.set(false);
        this.loginOpen.set(true);

        setTimeout(() => this.addr()?.nativeElement.focus(), 50);
    }

    // letters, digits and '-' only : the address is built here, never taken from a link
    clean(): string
    {
        return this.address.trim().toLowerCase().replace(/\.appcoretech\.net.*$/, '').replace(/[^a-z0-9-]/g, '');
    }

    goLogin(): void
    {
        const sub = this.clean();

        if (sub.length >= 2)
        {
            window.location.href = `https://${sub}.appcoretech.net/`;
        }
    }


    onDocClick(e: Event): void
    {
        if (this.prodOpen() && !(e.target as HTMLElement)?.closest?.('.pm'))
        {
            this.prodOpen.set(false);
        }
    }

    onScroll(): void
    {
        this.scrolled.set(window.scrollY > 12);
    }
}
