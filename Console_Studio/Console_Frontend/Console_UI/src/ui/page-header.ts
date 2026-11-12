//===============================================================
// Page header : icon + title + subtitle, actions on the right
// (same idea as Studio's app-page-header)
//
//   <ac-page-header icon="fas fa-server" title="Tenants" subtitle="...">
//       <button pageHeaderRight ...>New</button>
//   </ac-page-header>
//===============================================================

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
    selector: 'ac-page-header',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: [`
        :host { display: block; flex: none; }
        .ph { position: relative; display: flex; align-items: center; gap: 16px; padding: 16px 20px; border: 1px solid var(--ac-border); border-radius: var(--ac-radius); background: var(--ac-card); box-shadow: var(--ac-shadow); overflow: hidden; }
        .ph::after { position: absolute; top: -60px; right: -40px; width: 260px; height: 160px; background: radial-gradient(closest-side, var(--ac-accent-ring), transparent); content: ''; pointer-events: none; }
        .ph-icon { position: relative; display: inline-flex; flex: none; align-items: center; justify-content: center; width: 46px; height: 46px; border-radius: 13px; background: var(--ac-gradient); color: #fff; font-size: 18px; box-shadow: 0 10px 22px -12px rgba(20, 16, 12, 0.9); }
        .ph-icon::after { position: absolute; inset: 0; border-radius: inherit; box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35); content: ''; }
        .ph-text { display: flex; flex: 1; flex-direction: column; gap: 3px; min-width: 0; }
        .ph-eyebrow { color: var(--ac-gold); font-size: 10px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; }
        .ph-title { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; color: var(--ac-text); font-size: 19px; font-weight: 800; letter-spacing: -0.01em; }
        .ph-sub { overflow: hidden; color: var(--ac-muted); font-size: 12.5px; text-overflow: ellipsis; white-space: nowrap; }
        .ph-right { position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        @media (max-width: 720px) { .ph { flex-wrap: wrap; } .ph-sub { white-space: normal; } }
    `],
    template: `
        <div class="ph">
            <span class="ph-icon"><i [class]="icon()"></i></span>
            <div class="ph-text">
                @if (eyebrow()) { <span class="ph-eyebrow">{{ eyebrow() }}</span> }
                <div class="ph-title">{{ title() }}<ng-content select="[pageHeaderTitle]" /></div>
                @if (subtitle()) { <span class="ph-sub">{{ subtitle() }}</span> }
            </div>
            <div class="ph-right"><ng-content select="[pageHeaderRight]" /></div>
        </div>
    `
})
export class PageHeader
{
    readonly icon = input('fas fa-circle');

    readonly title = input('');

    readonly subtitle = input('');

    readonly eyebrow = input('');
}
