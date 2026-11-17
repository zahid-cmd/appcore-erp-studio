//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectionStrategy,
    Component,
    Input
}
from '@angular/core';

import
{
    WorkspaceArtComponent
}
from '../workspace-art/workspace-art';


//===============================================================
// Summary Line (2026-11-15, tiles 2026-11-16) : the summary under
// a list's canvas, one shared look for every list page.
//
//   <app-summary-line
//       [items]="summaryItems"
//       noun="companies"
//       art="company"
//       note="All records">
//   </app-summary-line>
//
// The FIRST item is the total : a light blue tile with the page's line
// drawing. Every other item is a white tile with an icon, the
// number, its share of the total (%) and a thin bar.
//
// item.tone : 'ok' green, 'bad' red, 'warn' amber, empty blue
// item.icon : a Font Awesome class to use instead of the tone's
//===============================================================

export interface SummaryLineItem
{
    label: string;
    value: string | number;
    tone?: 'ok' | 'bad' | 'warn' | '';
    icon?: string;
    // false : no % and bar (a count that is not part of the total)
    share?: boolean;
}

@Component(
{
    selector:'app-summary-line',

    standalone:true,

    imports:
    [
        WorkspaceArtComponent
    ],

    changeDetection:ChangeDetectionStrategy.OnPush,

    template:`
        <div class="sl">

            @for (item of items; track item.label; let first = $first)
            {
                @if (first)
                {
                    <div class="sl-tile sl-total">

                        @if (art)
                        {
                            <app-workspace-art
                                class="sl-art"
                                size="tile"
                                [theme]="art">
                            </app-workspace-art>
                        }

                        <span class="sl-icon">
                            <i [class]="item.icon || 'fas fa-layer-group'"></i>
                        </span>

                        <span class="sl-text">
                            <span class="sl-label">{{ item.label }}</span>
                            <span class="sl-value">
                                {{ item.value }}
                                @if (noun)
                                {
                                    <small>{{ noun }}</small>
                                }
                            </span>
                        </span>

                    </div>
                }
                @else
                {
                    <div
                        class="sl-tile"
                        [attr.data-tone]="item.tone || 'info'">

                        <span class="sl-icon">
                            <i [class]="item.icon || iconOf(item.tone)"></i>
                        </span>

                        <span class="sl-text">

                            <span class="sl-label">{{ item.label }}</span>

                            <span class="sl-value">
                                {{ item.value }}
                                @if (share(item) !== null)
                                {
                                    <small>{{ share(item) }}%</small>
                                }
                            </span>

                            @if (share(item) !== null)
                            {
                                <span class="sl-bar">
                                    <i [style.width.%]="share(item)"></i>
                                </span>
                            }

                        </span>

                    </div>
                }
            }

            @if (note)
            {
                <div class="sl-note">
                    <b>{{ note }}</b>
                    <span>{{ noteDetail }}</span>
                </div>
            }

        </div>
    `,

    styles:[`
        :host
        {
            display: block;
            flex: 0 0 auto;
            /* room above the shell footer (owner 2026-11-16) */
            margin-bottom: 10px;
        }

        .sl
        {
            display: flex;
            align-items: stretch;
            gap: 12px;
        }

        .sl-tile
        {
            position: relative;
            display: flex;
            flex: 1 1 0;
            align-items: center;
            gap: 12px;
            min-width: 0;
            padding: 6px 14px;
            overflow: hidden;
            border: 1px solid #e3e9f3;
            border-radius: 12px;
            background: #ffffff;
            box-shadow: 0 1px 2px rgba(15, 23, 42, .04), 0 10px 22px -18px rgba(30, 58, 138, .4);
            box-sizing: border-box;
        }

        .sl-icon
        {
            display: inline-flex;
            flex: 0 0 auto;
            align-items: center;
            justify-content: center;
            width: 30px;
            height: 30px;
            border-radius: 9px;
            background: #e8f0fe;
            color: #1f6bff;
            font-size: 14px;
        }

        .sl-text
        {
            display: flex;
            flex: 1 1 auto;
            flex-direction: column;
            gap: 0;
            min-width: 0;
        }

        .sl-label
        {
            overflow: hidden;
            color: #64748b;
            font-size: 10.5px;
            font-weight: 700;
            letter-spacing: .06em;
            text-overflow: ellipsis;
            text-transform: uppercase;
            white-space: nowrap;
        }

        .sl-value
        {
            color: #0f2a44;
            font-size: 18px;
            font-weight: 800;
            font-variant-numeric: tabular-nums;
            line-height: 1.1;
            white-space: nowrap;
        }

        .sl-value > small
        {
            margin-left: 5px;
            color: #94a3b8;
            font-size: 13px;
            font-weight: 600;
        }

        .sl-bar
        {
            display: block;
            height: 4px;
            margin-top: 3px;
            overflow: hidden;
            border-radius: 3px;
            background: #eef2f7;
        }

        .sl-bar > i
        {
            display: block;
            height: 100%;
            border-radius: 3px;
            background: #1f6bff;
            transition: width .3s ease;
        }

        /* tones */

        .sl-tile[data-tone='ok'] .sl-icon { background: #dcfce7; color: #047857; }
        .sl-tile[data-tone='ok'] .sl-value { color: #047857; }
        .sl-tile[data-tone='ok'] .sl-bar > i { background: #10b981; }

        .sl-tile[data-tone='bad'] .sl-icon { background: #fee2e2; color: #be123c; }
        .sl-tile[data-tone='bad'] .sl-value { color: #be123c; }
        .sl-tile[data-tone='bad'] .sl-bar > i { background: #f43f5e; }

        .sl-tile[data-tone='warn'] .sl-icon { background: #fef3c7; color: #b45309; }
        .sl-tile[data-tone='warn'] .sl-value { color: #b45309; }
        .sl-tile[data-tone='warn'] .sl-bar > i { background: #f59e0b; }

        /* the total : light blue (owner 2026-11-16), the page's
           drawing faint behind */

        .sl-total
        {
            flex: 1.15 1 0;
            border-color: #c9dbfb;
            background: linear-gradient(135deg, #f5f9ff 0%, #e8f0fe 100%);
        }

        .sl-total .sl-icon
        {
            background: #1f6bff;
            color: #ffffff;
            box-shadow: 0 8px 16px -8px rgba(31, 107, 255, .6);
        }

        .sl-total .sl-label
        {
            color: #3b5b9a;
        }

        .sl-total .sl-value
        {
            color: #1e3a8a;
        }

        .sl-total .sl-value > small
        {
            color: #64748b;
        }

        .sl-total .sl-art
        {
            --wa-ink: #1e3a8a;
            --wa-pane: #c9dbfb;
            --wa-accent: #c8703a;
            --wa-soft: transparent;
            --wa-paper: transparent;

            position: absolute;
            right: -6px;
            bottom: -12px;
            width: 90px;
            height: 62px;
            opacity: .22;
            pointer-events: none;
        }

        /* the note */

        .sl-note
        {
            display: flex;
            flex: 0 0 270px;
            flex-direction: column;
            justify-content: center;
            gap: 0;
            padding: 5px 14px;
            border: 1px dashed #c9daf5;
            border-radius: 12px;
            background: #f8fbff;
            color: #475569;
            font-size: 12px;
            line-height: 1.3;
            box-sizing: border-box;
        }

        .sl-note > b
        {
            color: #1e3a8a;
            font-size: 13.5px;
        }

        @media (max-width: 1100px)
        {
            .sl
            {
                flex-wrap: wrap;
            }

            .sl-tile
            {
                flex: 1 1 200px;
            }

            .sl-note
            {
                flex: 1 1 100%;
            }
        }
    `]
})
export class SummaryLineComponent
{
    @Input()
    items:
        SummaryLineItem[] = [];

    // what the total counts, e.g. "companies"
    @Input()
    noun =
        '';

    // the page's drawing (workspace-art theme) behind the total
    @Input()
    art =
        '';

    @Input()
    note =
        '';

    @Input()
    noteDetail =
        'Counts the whole list, not just this page';

    iconOf(tone?: string): string
    {
        switch (tone)
        {
            case 'ok':   return 'fas fa-circle-check';
            case 'bad':  return 'fas fa-circle-pause';
            case 'warn': return 'fas fa-triangle-exclamation';
            default:     return 'fas fa-chart-simple';
        }
    }

    // the item's share of the total (the first item), 0 - 100;
    // null when either is not a number
    share(item: SummaryLineItem): number | null
    {
        if (item.share === false)
        {
            return null;
        }

        const total = this.toNumber(this.items[0]?.value);
        const value = this.toNumber(item.value);

        if (total === null || value === null || total <= 0)
        {
            return null;
        }

        return Math.round(Math.min(100, Math.max(0, value / total * 100)));
    }

    private toNumber(value: string | number | undefined): number | null
    {
        if (typeof value === 'number')
        {
            return value;
        }

        const n = Number(String(value ?? '').replace(/,/g, ''));

        return value !== '' && value !== undefined && Number.isFinite(n) ? n : null;
    }
}
