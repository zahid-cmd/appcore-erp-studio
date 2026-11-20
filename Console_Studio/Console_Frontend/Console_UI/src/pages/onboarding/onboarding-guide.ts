//===============================================================
// Onboarding guide (read only, 2026-11-20)
// --------------------------------------------------------------
// Console > Clients > Onboarding : the whole process of bringing a
// new client live, step by step, as done for Moto Corner. Text
// only : no passwords, nothing is changed from here. When the
// automation steps are built (project doc
// design-onboarding-automation.md) the steps they remove are
// marked here and later the wizard takes this page's place.
//===============================================================

import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../ui/page-header';

interface GuideStep
{
    title: string;
    where: string;
    icon: string;
    link?: string;
    linkText?: string;
    lines: string[];
    check?: string;
    soonGone?: string;
}

interface GuidePhase
{
    key: string;
    title: string;
    note: string;
    steps: GuideStep[];
}

const PHASES: GuidePhase[] =
[
    {
        key: 'A',
        title: 'Before you start',
        note: 'Agree these with the client, then make the web address reachable.',
        steps:
        [
            {
                title: 'Know the client',
                where: 'With the client',
                icon: 'fas fa-handshake',
                lines:
                [
                    'Legal name, display name, address, BIN, TIN, the business phone and email (not your own).',
                    'Package (Starter / Standard / Professional), users and branches agreed.',
                    'Brand they sell. REVOO : ready. Any other brand : its brand pack must be exported from the Studio first.',
                    'A short code for the client : letters and digits only, e.g. MOTOCORNER. The address will be code.appcoretech.net.'
                ]
            },
            {
                title: 'Cloudflare route (first !)',
                where: 'Cloudflare > Tunnels > skyhost > Routes',
                icon: 'fas fa-cloud',
                lines:
                [
                    'Add route : subdomain = the code in small letters, domain appcoretech.net.',
                    'Service URL : http://localhost:8080 (the same as motozone).',
                    'Do this BEFORE anyone opens the address. A look-up made too early is remembered as "does not exist" for up to 30 minutes.'
                ],
                check: 'The route is listed next to motozone.appcoretech.net.'
            }
        ]
    },
    {
        key: 'B',
        title: 'Console',
        note: 'Customer, tenant, package, then the database. About five minutes.',
        steps:
        [
            {
                title: 'New customer',
                where: 'Console > Customers',
                icon: 'fas fa-building-user',
                link: '/customers',
                linkText: 'Open Customers',
                lines:
                [
                    'New customer : fill in the client\'s details, status Active, Save.',
                    'These details become the company in the client\'s ERP.'
                ],
                check: 'The customer appears with a CUS- code.'
            },
            {
                title: 'Register the tenant',
                where: 'Console > Tenants > Register tenant',
                icon: 'fas fa-server',
                link: '/tenants',
                linkText: 'Open Tenants',
                lines:
                [
                    'Customer, product AppCore Two Wheelers.',
                    'Type the tenant code, display name and web address yourself (grey text is only an example).',
                    'Branches allowed as agreed. Leave database server and database name empty.'
                ],
                check: 'The tenant page shows status Provisioning.'
            },
            {
                title: 'Package and users',
                where: 'Tenant page > Package, modules and users',
                icon: 'fas fa-cubes',
                lines:
                [
                    'Choose the package and type the users allowed.',
                    'Click Save : the button turns dim when saved.'
                ],
                check: 'The card says e.g. "17 of 17 modules on · 20 users".'
            },
            {
                title: 'Free the template',
                where: 'pgAdmin',
                icon: 'fas fa-plug-circle-xmark',
                lines:
                [
                    'Close any Query Tool tab on AppCoreTpl_TW (do not save).',
                    'Right-click AppCoreTpl_TW > Disconnect from database (the icon turns grey).'
                ],
                soonGone: 'Automation step 2 : the Console will do this itself.'
            },
            {
                title: 'Create the database',
                where: 'Tenant page > Create database',
                icon: 'fas fa-database',
                lines:
                [
                    'Financial year from July, Create database, confirm. Takes about a minute.',
                    'The window shows the admin password ONCE. On this PC it is also added to Password_Book.md.',
                    'It must say "stored sealed : nothing to paste". Nothing to change on the server, no deploy.'
                ],
                check: 'Status becomes Trial; the history says the database was created from AppCoreTpl_TW.'
            },
            {
                title: 'Check the address',
                where: 'Browser',
                icon: 'fas fa-globe',
                lines:
                [
                    'Open https://code.appcoretech.net.'
                ],
                check: 'The sign-in page shows the client\'s name.'
            }
        ]
    },
    {
        key: 'C',
        title: 'Client database',
        note: 'pgAdmin, Query Tool on AppCore_TW_<CODE>. Scripts in F:\\AppCore_ERP_Studio\\Backend_Studio\\Database.',
        steps:
        [
            {
                title: 'AppCore support login',
                where: 'pgAdmin > AppCore_TW_<CODE>',
                icon: 'fas fa-user-shield',
                lines:
                [
                    'Open Client_AppCore_Support_Account.sql.',
                    'Line 76 : type the appcore password between the quotes, then F5 (it saves itself).',
                    'Close the tab with Don\'t save, so the password does not stay in the file.'
                ],
                check: 'The last table shows appcore : has_password = true.',
                soonGone: 'Automation step 2 : ready in the template.'
            },
            {
                title: 'Remove Infrastructure Control',
                where: 'pgAdmin > AppCore_TW_<CODE>',
                icon: 'fas fa-eraser',
                lines:
                [
                    'Run Client_Remove_InfrastructureControl.sql (F5).',
                    'Then run Client_Fix_InfrastructureControl_Rows.sql (F5). Always these two last.'
                ],
                check: 'Both end with 0.',
                soonGone: 'Automation step 2 : done once in the template.'
            }
        ]
    },
    {
        key: 'D',
        title: 'ERP and hand-over',
        note: 'At https://code.appcoretech.net.',
        steps:
        [
            {
                title: 'Install the brand',
                where: 'ERP as appcore > Settings > Application Configuration > Brand Packs',
                icon: 'fas fa-box-open',
                lines:
                [
                    'Sign in as appcore. Install, choose the brand file (.acbrand, e.g. REVOO-20261120-1005.acbrand).',
                    'Already-there items are matched by name : nothing is duplicated, nothing deleted.'
                ],
                check: 'The report shows no line starting with "Stopped".',
                soonGone: 'Automation step 3 : brands installed at Create database.'
            },
            {
                title: 'Admin password',
                where: 'ERP as admin > profile menu > Change Password',
                icon: 'fas fa-key',
                lines:
                [
                    'Sign in as admin with the password from the Create database window.',
                    'Change it before handing over (or let the client\'s admin do it at first sign-in).'
                ],
                check: 'If refused, the reason shows in red in the panel.'
            },
            {
                title: 'Hand over',
                where: 'Client',
                icon: 'fas fa-flag-checkered',
                lines:
                [
                    'Give the address, the login admin and the password privately (in person or to their own WhatsApp, never a group or email).',
                    'Their admin then sets : the brand supplier (Brand Management), prices, stock levels, opening stock, own spare parts, branches and users.'
                ]
            }
        ]
    }
];

const TROUBLE: { sign: string; fix: string }[] =
[
    { sign: 'Browser : "This site can\'t be reached" (DNS_PROBE_FINISHED_NXDOMAIN)', fix: 'The Cloudflare route is missing, or the address was opened before the route existed. Add the route; then wait up to 30 minutes, or in Chrome use Secure DNS = Google and clear chrome://net-internals/#dns.' },
    { sign: 'ERP : "This address is not active"', fix: 'The tenant is not Trial / Active, has no database yet, or its login cannot be opened. Check the tenant page.' },
    { sign: 'Create database : "connection(s) are open on AppCoreTpl_TW"', fix: 'pgAdmin : close the AppCoreTpl_TW Query Tool and Disconnect it, then try again.' },
    { sign: 'Create database : "A database is created only for a tenant in Provisioning or Trial"', fix: 'Tenant page > Status : Provisioning (with a reason), then Create.' },
    { sign: 'Create database : "public key ... cannot be used"', fix: 'AppCore_Control.PlatformKeys must hold the whole key, with the -----BEGIN PUBLIC KEY----- and -----END PUBLIC KEY----- lines.' },
    { sign: 'Create database window shows an "ERP server setting" line', fix: 'The public key is missing in Control : the login was not sealed. Put the line into the server\'s appsettings and redeploy, then fix the key.' },
    { sign: 'Sign-in : "Login credentials are not configured"', fix: 'That user has no password : run the support login script again with v_password filled in.' },
    { sign: 'Brand install report : a line starting with "Stopped"', fix: 'Fix what it says (e.g. the brand\'s Motor Bikes category inactive) and Install again : finished steps are kept.' }
];

@Component({
    selector: 'ac-onboarding-guide',
    imports: [RouterLink, PageHeader],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'ac-page' },
    styles: [`
        .og-top { flex: none; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
        .og-fact { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
        .og-fact > i { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 40px; height: 40px; border-radius: 12px; background: var(--ac-accent-soft); color: var(--ac-accent); font-size: 16px; }
        .og-fact b { display: block; color: var(--ac-text); font-size: 15px; font-weight: 800; }
        .og-fact span { color: var(--ac-muted); font-size: 12px; }

        .og-body { display: grid; flex: 1; min-height: 0; grid-template-columns: 220px minmax(0, 1fr); gap: 16px; align-items: stretch; }
        /* the steps list scrolls; the navigation card stays full height beside it (2026-11-20) */
        .og-nav { display: flex; flex-direction: column; gap: 4px; min-height: 0; padding: 10px; overflow-y: auto; }
        .og-main { min-height: 0; overflow-y: auto; }
        .og-nav button { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border: 0; border-radius: 10px; background: transparent; color: var(--ac-muted); font: inherit; font-size: 13px; font-weight: 600; text-align: left; cursor: pointer; }
        .og-nav button:hover { background: var(--ac-hover); color: var(--ac-text); }
        .og-nav button.on { background: var(--ac-accent-soft); color: var(--ac-text); }
        .og-nav em { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 8px; background: var(--ac-gradient); color: #fff; font-size: 11.5px; font-style: normal; font-weight: 800; }

        .og-phases { display: flex; flex-direction: column; gap: 16px; }
        .og-phase-head { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-bottom: 1px solid var(--ac-border-2); }
        .og-phase-head em { display: inline-flex; flex: none; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 10px; background: var(--ac-gradient); color: #fff; font-style: normal; font-weight: 800; }
        .og-phase-head b { color: var(--ac-text); font-size: 15px; }
        .og-phase-head span { color: var(--ac-muted); font-size: 12.5px; }

        .og-steps { display: flex; flex-direction: column; padding: 6px 18px 12px; }
        .og-step { display: grid; grid-template-columns: 36px minmax(0, 1fr); gap: 14px; padding: 14px 0; border-bottom: 1px dashed var(--ac-border); }
        .og-step:last-child { border-bottom: 0; }
        .og-num { display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--ac-accent); color: var(--ac-accent); font-size: 13px; font-weight: 800; }
        .og-step-title { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; color: var(--ac-text); font-size: 14px; font-weight: 800; }
        .og-step-title i { color: var(--ac-accent); }
        .og-where { display: inline-flex; align-items: center; gap: 6px; margin: 6px 0 8px; padding: 3px 10px; border-radius: 999px; background: var(--ac-hover); color: var(--ac-muted); font-size: 11.5px; font-weight: 600; }
        .og-step ul { margin: 0; padding-left: 18px; color: var(--ac-text); font-size: 13px; line-height: 1.65; }
        .og-check { display: flex; gap: 8px; margin-top: 8px; padding: 7px 10px; border-radius: 9px; background: var(--ac-green-soft); color: var(--ac-text); font-size: 12.5px; }
        .og-check i { color: var(--ac-green); margin-top: 2px; }
        .og-soon { display: flex; gap: 8px; margin-top: 6px; color: var(--ac-muted); font-size: 12px; font-style: italic; }
        .og-soon i { color: var(--ac-gold); margin-top: 2px; }
        .og-link { margin-left: auto; font-size: 12px; font-weight: 700; color: var(--ac-accent); text-decoration: none; }
        .og-link:hover { text-decoration: underline; }

        .og-trouble { width: 100%; border-collapse: collapse; font-size: 12.5px; }
        .og-trouble td { padding: 10px 18px; border-top: 1px solid var(--ac-border-2); vertical-align: top; line-height: 1.55; }
        .og-trouble td:first-child { width: 38%; color: var(--ac-text); font-weight: 700; }
        .og-trouble td:last-child { color: var(--ac-muted); }

        @media (max-width: 1100px) { .og-top { grid-template-columns: repeat(2, minmax(0, 1fr)); } .og-body { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); } .og-nav { flex-direction: row; flex-wrap: wrap; overflow: visible; } }
        @media (max-width: 640px) { .og-top { grid-template-columns: minmax(0, 1fr); } .og-trouble td:first-child { width: auto; } }
    `],
    template: `
        <ac-page-header icon="fas fa-wand-magic-sparkles" eyebrow="Clients" title="Onboarding"
            subtitle="How to bring a new client live, step by step (read only)" />

        <div class="og-top">
            <div class="ac-card og-fact"><i class="fas fa-list-ol"></i><div><b>{{ stepCount }} steps</b><span>in 4 phases</span></div></div>
            <div class="ac-card og-fact"><i class="fas fa-stopwatch"></i><div><b>About 20 minutes</b><span>per client today</span></div></div>
            <div class="ac-card og-fact"><i class="fas fa-lock"></i><div><b>Sealed login</b><span>no server edit, no deploy</span></div></div>
            <div class="ac-card og-fact"><i class="fas fa-route"></i><div><b>Getting shorter</b><span>marked steps go with automation</span></div></div>
        </div>

        <div class="og-body">
                <nav class="ac-card og-nav">
                    @for (p of phases; track p.key)
                    {
                        <button type="button" [class.on]="active() === p.key" (click)="go(p.key)">
                            <em>{{ p.key }}</em> {{ p.title }}
                        </button>
                    }
                    <button type="button" [class.on]="active() === 'T'" (click)="go('T')">
                        <em><i class="fas fa-wrench"></i></em> If something goes wrong
                    </button>
                </nav>

                <div class="og-main ac-scroll">
                <div class="og-phases">
                    @for (p of phases; track p.key)
                    {
                        <section class="ac-card" [id]="'og-' + p.key">
                            <div class="og-phase-head">
                                <em>{{ p.key }}</em>
                                <div><b>{{ p.title }}</b><br><span>{{ p.note }}</span></div>
                            </div>
                            <div class="og-steps">
                                @for (s of p.steps; track s.title)
                                {
                                    <div class="og-step">
                                        <span class="og-num">{{ numberOf(s) }}</span>
                                        <div>
                                            <div class="og-step-title">
                                                <i [class]="s.icon"></i> {{ s.title }}
                                                @if (s.link) { <a class="og-link" [routerLink]="s.link">{{ s.linkText }} <i class="fas fa-arrow-right"></i></a> }
                                            </div>
                                            <span class="og-where"><i class="fas fa-location-dot"></i> {{ s.where }}</span>
                                            <ul>
                                                @for (l of s.lines; track $index) { <li>{{ l }}</li> }
                                            </ul>
                                            @if (s.check) { <div class="og-check"><i class="fas fa-circle-check"></i><span>{{ s.check }}</span></div> }
                                            @if (s.soonGone) { <div class="og-soon"><i class="fas fa-wand-magic-sparkles"></i><span>{{ s.soonGone }}</span></div> }
                                        </div>
                                    </div>
                                }
                            </div>
                        </section>
                    }

                    <section class="ac-card" id="og-T">
                        <div class="ac-card-title"><i class="fas fa-wrench"></i> If something goes wrong</div>
                        <table class="og-trouble">
                            @for (t of trouble; track $index)
                            {
                                <tr><td>{{ t.sign }}</td><td>{{ t.fix }}</td></tr>
                            }
                        </table>
                    </section>
                </div>
            </div>
        </div>
    `
})
export class OnboardingGuidePage
{
    readonly phases = PHASES;

    readonly trouble = TROUBLE;

    readonly stepCount = PHASES.reduce((n, p) => n + p.steps.length, 0);

    readonly active = signal('A');

    private readonly order = PHASES.flatMap(p => p.steps);

    numberOf(step: GuideStep): number
    {
        return this.order.indexOf(step) + 1;
    }

    go(key: string): void
    {
        this.active.set(key);
        document.getElementById('og-' + key)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}
