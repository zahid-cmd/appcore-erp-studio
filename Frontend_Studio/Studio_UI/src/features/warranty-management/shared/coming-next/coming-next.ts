//===============================================================
// Coming Next (Warranty Management placeholder page)
//
// Shown for a submenu whose page is not built yet, so the menu
// never opens a blank page. The route gives the texts :
//
//   data : { breadcrumb, title, icon, text, waitsFor }
//
// When the real page is built (Submenu Sync / hand-written),
// REMOVE its "coming next" route from the menu routes file, or
// it keeps showing this page.
//===============================================================


//===============================================================
// Imports
//===============================================================

import
{
    Component,
    inject
}
from '@angular/core';

import
{
    ActivatedRoute,
    RouterLink
}
from '@angular/router';

import
{
    PageHeaderComponent
}
from '../../../../shared/components/layout/page-header/page-header';


//===============================================================
// Component
//===============================================================

@Component(
{
    selector:'warranty-coming-next',

    standalone:true,

    imports:
    [
        PageHeaderComponent,
        RouterLink
    ],

    template:`
        <div class="app-list-page cn-page">

            <app-page-header

                [title]="title"

                subtitle="Coming next"

                [icon]="icon">

            </app-page-header>

            <div class="cn-card">

                <span class="cn-icon">

                    <i [class]="icon"></i>

                </span>

                <h2 class="cn-title">{{ title }} is coming next</h2>

                <p class="cn-text">{{ text }}</p>

                @if (waitsFor)
                {
                    <p class="cn-wait">

                        <i class="fas fa-link"></i>

                        Waits for : {{ waitsFor }}

                    </p>
                }

                <a

                    class="cn-link"

                    routerLink="/warranty-management/warranty-control/warranty-configuration">

                    <i class="fas fa-gear"></i>

                    Open Warranty Configuration

                </a>

            </div>

        </div>
    `,

    styles:[`
        .cn-page
        {
            display:flex;

            flex-direction:column;

            gap:14px;
        }

        .cn-card
        {
            display:flex;

            flex-direction:column;

            align-items:center;

            gap:12px;

            padding:56px 24px;

            border:1px solid #e7edf5;

            border-radius:16px;

            background:#ffffff;

            box-shadow:0 2px 8px rgba(15, 23, 42, .04);

            text-align:center;
        }

        .cn-icon
        {
            display:inline-flex;

            align-items:center;

            justify-content:center;

            width:76px;

            height:76px;

            border-radius:999px;

            background:#eef2ff;

            color:#1e3a8a;

            font-size:30px;
        }

        .cn-title
        {
            margin:6px 0 0;

            color:#0f172a;

            font-size:22px;

            font-weight:700;
        }

        .cn-text
        {
            max-width:620px;

            margin:0;

            color:#475569;

            font-size:15px;

            line-height:1.6;
        }

        .cn-wait
        {
            display:inline-flex;

            align-items:center;

            gap:8px;

            margin:0;

            padding:6px 14px;

            border:1px solid #fde68a;

            border-radius:999px;

            background:#fffbeb;

            color:#92400e;

            font-size:13px;

            font-weight:600;
        }

        .cn-link
        {
            display:inline-flex;

            align-items:center;

            gap:8px;

            margin-top:8px;

            padding:9px 16px;

            border:1px solid #c7d2fe;

            border-radius:10px;

            background:#eef2ff;

            color:#1e3a8a;

            font-size:14px;

            font-weight:600;

            text-decoration:none;
        }

        .cn-link:hover
        {
            background:#e0e7ff;
        }
    `]
})


//===============================================================
// Coming Next
//===============================================================

export class WarrantyComingNext
{
    private readonly data =
        inject(ActivatedRoute).snapshot.data;

    readonly title:
        string =
        String(this.data['title'] ?? 'This page');

    readonly icon:
        string =
        String(this.data['icon'] ?? 'fas fa-hourglass-half');

    readonly text:
        string =
        String(this.data['text'] ?? '');

    readonly waitsFor:
        string =
        String(this.data['waitsFor'] ?? '');
}
