//===============================================================
// Imports
//===============================================================

import
{
    Component,
    AfterViewInit,
    OnDestroy,
    ElementRef,
    ViewChild,
    Injector,
    ChangeDetectorRef,
    inject
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';

import
{
    ActivatedRoute,
    Router
}
from '@angular/router';

import
{
    SearchDropdownComponent
}
from '../../components/controls/search-dropdown/search-dropdown';

import
{
    PrintEngineService
}
from '../print-engine.service';

import
{
    PRINT_SOURCES
}
from '../print-registry';

import
{
    ExcelSheet,
    PrintDocumentDef,
    PrintKit,
    PrintSourceDef
}
from '../print.models';


//===============================================================
// Local Types
//===============================================================

type ZoomMode =
    'custom' | 'fit-width' | 'fit-page';

// 'all' or a document key
type DocumentChoice =
    string;


//===============================================================
// Print Viewer
//
// Opens in its own browser tab :
//   /print-viewer/<source>/<id>?doc=<document key | all>
//
// Toolbar : thumbnails, document choice (All Documents + each
// document), page navigation, zoom (− / + / %, fit width, fit
// page), Refresh, Excel, PDF, Print.
// The preview is the real paper : what you see is what prints.
//===============================================================

@Component(
{
    selector:'app-print-viewer',

    standalone:true,

    imports:
    [
        CommonModule,
        SearchDropdownComponent
    ],

    templateUrl:'./print-viewer.html',

    styleUrls:
    [
        './print-viewer.css'
    ]
})

export class PrintViewerComponent
implements AfterViewInit, OnDestroy
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly route =
        inject(ActivatedRoute);

    private readonly router =
        inject(Router);

    private readonly injector =
        inject(Injector);

    private readonly engine =
        inject(PrintEngineService);

    private readonly cdr =
        inject(ChangeDetectorRef);


    //===========================================================
    // View
    //===========================================================

    @ViewChild('frame')
    private frameRef?:
        ElementRef<HTMLIFrameElement>;

    @ViewChild('thumbFrame')
    private thumbRef?:
        ElementRef<HTMLIFrameElement>;

    @ViewChild('stage')
    private stageRef?:
        ElementRef<HTMLElement>;


    //===========================================================
    // State
    //===========================================================

    source:
        PrintSourceDef | null =
        null;

    private data:
        any =
        null;

    private kit:
        PrintKit | null =
        null;

    private recordId:
        number =
        0;

    choice:
        DocumentChoice =
        'all';

    loading:
        boolean =
        true;

    busy:
        string =
        '';

    error:
        string =
        '';

    notice:
        string =
        '';

    pages:
        HTMLElement[] =
        [];

    currentPage:
        number =
        1;

    pageInput:
        string =
        '1';

    zoom:
        number =
        100;

    zoomMode:
        ZoomMode =
        'fit-width';

    readonly zoomSteps:
        number[] =
        [50, 75, 90, 100, 110, 125, 150, 175, 200];

    thumbsOpen:
        boolean =
        true;

    private observer:
        IntersectionObserver | null =
        null;

    private visible =
        new Map<number, number>();

    private resizeHandler =
        ():
            void =>
            this.applyZoomMode();

    private noticeTimer:
        ReturnType<typeof setTimeout> | null =
        null;


    //===========================================================
    // Derived
    //===========================================================

    // Documents of the source; once the record is loaded, the
    // ones it does not have (available() false) are left out
    get documents():
        PrintDocumentDef[]
    {
        return (this.source?.documents ?? []).filter
        (
            doc =>
                !doc.available
                ||
                !this.data
                ||
                doc.available(this.data)
        );
    }

    // Document choice : All Documents + each document.
    // Built once (a new array on every check would re-create the
    // dropdown options between mouse down and up, so the first
    // click would be lost).
    documentItems:
        { label: string; value: string }[] =
        [];

    get activeDocuments():
        PrintDocumentDef[]
    {
        return this.choice === 'all'
            ? this.documents
            : this.documents.filter
            (
                doc =>
                    doc.key === this.choice
            );
    }

    get pageCount():
        number
    {
        return this.pages.length;
    }

    get recordTitle():
        string
    {
        return this.source && this.data
            ? this.source.fileName(this.data)
            : '';
    }

    get canExcel():
        boolean
    {
        return this.activeDocuments.some
        (
            doc =>
                !!doc.excel
        );
    }

    get ready():
        boolean
    {
        return !this.loading
            &&
            !this.error
            &&
            this.pages.length > 0;
    }


    //===========================================================
    // Initialize
    //===========================================================

    ngAfterViewInit():
        void
    {
        window.addEventListener(
            'resize',
            this.resizeHandler
        );

        void this.start();
    }

    ngOnDestroy():
        void
    {
        window.removeEventListener(
            'resize',
            this.resizeHandler
        );

        this.observer?.disconnect();

        if
        (
            this.noticeTimer
        )
        {
            clearTimeout(
                this.noticeTimer
            );
        }
    }

    private async start():
        Promise<void>
    {
        const snapshot =
            this.route.snapshot;

        const key =
            snapshot.paramMap.get('source') ?? '';

        this.recordId =
            Number(
                snapshot.paramMap.get('id')
            )
            || 0;

        this.choice =
            snapshot.queryParamMap.get('doc') || 'all';

        const loader =
            PRINT_SOURCES[key];

        if
        (
            !loader
        )
        {
            this.fail(`Unknown print source '${key}'.`);

            return;
        }

        try
        {
            this.source =
                await loader();
        }
        catch
        {
            this.fail('The print templates could not be loaded.');

            return;
        }

        this.buildDocumentItems();

        await this.load(
            false
        );
    }


    //===========================================================
    // Document choice : All Documents + each document
    //===========================================================

    private buildDocumentItems():
        void
    {
        this.documentItems =
        [
            {
                label:'All Documents',
                value:'all'
            },
            ...this.documents.map
            (
                doc =>
                ({
                    label:doc.title,
                    value:doc.key
                })
            )
        ];

        if
        (
            this.choice !== 'all'
            &&
            !this.documents.some(doc => doc.key === this.choice)
        )
        {
            this.choice =
                'all';
        }
    }


    //===========================================================
    // Load + render
    //===========================================================

    private async load
    (
        reloadCompany:
            boolean
    ):
        Promise<void>
    {
        if
        (
            !this.source
        )
        {
            return;
        }

        this.loading =
            true;

        this.error =
            '';

        this.cdr.detectChanges();

        try
        {
            if
            (
                !(this.recordId > 0)
            )
            {
                throw new Error('Invalid record.');
            }

            const [data, kit] =
                await Promise.all(
                [
                    this.source.load(
                        this.injector,
                        this.recordId
                    ),
                    this.engine.kit(
                        reloadCompany
                    )
                ]);

            this.data =
                data;

            // Only the documents this record has
            this.buildDocumentItems();

            this.kit =
                kit;

            document.title =
                `${this.source.title} ${this.recordTitle}`.trim();

            const reason =
                this.source.denyReason(
                    data,
                    kit
                );

            if
            (
                reason
            )
            {
                this.fail(reason);

                return;
            }

            await this.render();

            if
            (
                !kit.switchesLoaded
            )
            {
                this.showNotice('System Configuration could not be read : default print settings are used.');
            }
        }
        catch
        {
            this.fail('The record could not be loaded. It may have been deleted, or the server is not reachable.');
        }
    }

    private fail
    (
        message:
            string
    ):
        void
    {
        this.loading =
            false;

        this.error =
            message;

        this.pages =
            [];

        this.cdr.detectChanges();
    }

    private async render():
        Promise<void>
    {
        const frame =
            this.frameRef?.nativeElement;

        const doc =
            frame?.contentDocument;

        if
        (
            !frame
            ||
            !doc
            ||
            !this.source
            ||
            !this.kit
        )
        {
            this.fail('The preview could not be opened.');

            return;
        }

        const documents =
            this.activeDocuments;

        const html =
            this.engine.buildHtml(
                `${this.source.title} ${this.recordTitle}`,
                documents.map(item => item.render(this.data, this.kit!)),
                documents.map(item => item.css ?? '')
            );

        this.loading =
            true;

        this.cdr.detectChanges();

        doc.open();
        doc.write(html);
        doc.close();

        const pages =
            await this.engine.paginate(
                doc
            );

        pages.forEach
        (
            (page, index) =>
            {
                page.dataset['no'] =
                    String(index + 1);
            }
        );

        this.pages =
            pages;

        this.loading =
            false;

        this.currentPage =
            1;

        this.pageInput =
            '1';

        this.cdr.detectChanges();

        this.applyZoomMode();

        this.watchPages();

        this.renderThumbs(
            doc
        );

        frame.contentWindow?.scrollTo(0, 0);
    }


    //===========================================================
    // Thumbnails (a second, small copy of the pages)
    //===========================================================

    private renderThumbs
    (
        source:
            Document
    ):
        void
    {
        const thumbs =
            this.thumbRef?.nativeElement;

        const doc =
            thumbs?.contentDocument;

        if
        (
            !thumbs
            ||
            !doc
        )
        {
            return;
        }

        const html =
            '<!doctype html>'
            +
            source.documentElement.outerHTML.replace(
                '</head>',
                `<style>${THUMB_CSS}</style></head>`
            );

        doc.open();
        doc.write(html);
        doc.close();

        // Scale the pages to the panel width (the copied body
        // carries the main preview's zoom : replace it)
        const widest =
            this.pages.some(page => page.classList.contains('pv-landscape'))
                ? MM_TO_PX * 297
                : MM_TO_PX * 210;

        (doc.body.style as any).zoom =
            String(
                Math.max(0.1, (THUMB_PANEL_WIDTH - 44) / widest)
            );

        doc.addEventListener
        (
            'click',
            event =>
            {
                const page =
                    (event.target as HTMLElement | null)?.closest?.('.pv-page') as HTMLElement | null;

                if
                (
                    page
                )
                {
                    this.goToPage(
                        Number(page.dataset['no']) || 1
                    );
                }
            }
        );

        this.markThumb();
    }

    private markThumb():
        void
    {
        const doc =
            this.thumbRef?.nativeElement.contentDocument;

        if
        (
            !doc
        )
        {
            return;
        }

        const pages =
            Array.from(
                doc.querySelectorAll<HTMLElement>('.pv-page')
            );

        pages.forEach
        (
            page =>
                page.classList.toggle(
                    'pv-current',
                    Number(page.dataset['no']) === this.currentPage
                )
        );

        pages[this.currentPage - 1]?.scrollIntoView(
        {
            block:'nearest'
        });
    }

    toggleThumbs():
        void
    {
        this.thumbsOpen =
            !this.thumbsOpen;

        this.cdr.detectChanges();

        // The stage width changed
        setTimeout(
            () =>
                this.applyZoomMode(),
            0
        );
    }


    //===========================================================
    // Current page (most visible page)
    //===========================================================

    private watchPages():
        void
    {
        this.observer?.disconnect();

        this.visible.clear();

        const win =
            this.frameRef?.nativeElement.contentWindow as (Window & typeof globalThis) | null;

        if
        (
            !win
            ||
            !win.IntersectionObserver
        )
        {
            return;
        }

        this.observer =
            new win.IntersectionObserver
            (
                entries =>
                {
                    for
                    (
                        const entry of entries
                    )
                    {
                        const no =
                            Number((entry.target as HTMLElement).dataset['no']) || 0;

                        this.visible.set(
                            no,
                            entry.intersectionRatio
                        );
                    }

                    let best =
                        this.currentPage;

                    let ratio =
                        -1;

                    for
                    (
                        const [no, value] of this.visible
                    )
                    {
                        if
                        (
                            value > ratio
                            ||
                            (value === ratio && no < best)
                        )
                        {
                            best =
                                no;

                            ratio =
                                value;
                        }
                    }

                    if
                    (
                        best !== this.currentPage
                        &&
                        ratio > 0
                    )
                    {
                        this.currentPage =
                            best;

                        this.pageInput =
                            String(best);

                        this.markThumb();

                        this.cdr.detectChanges();
                    }
                },
                {
                    threshold:[0, 0.1, 0.25, 0.5, 0.75, 1]
                }
            );

        for
        (
            const page of this.pages
        )
        {
            this.observer.observe(
                page
            );
        }
    }


    //===========================================================
    // Navigation
    //===========================================================

    goToPage
    (
        no:
            number
    ):
        void
    {
        if
        (
            this.pages.length === 0
        )
        {
            return;
        }

        const target =
            Math.min(
                Math.max(1, Math.floor(no) || 1),
                this.pages.length
            );

        this.currentPage =
            target;

        this.pageInput =
            String(target);

        this.pages[target - 1].scrollIntoView(
        {
            block:'start'
        });

        this.markThumb();

        this.cdr.detectChanges();
    }

    first():
        void
    {
        this.goToPage(1);
    }

    previous():
        void
    {
        this.goToPage(this.currentPage - 1);
    }

    next():
        void
    {
        this.goToPage(this.currentPage + 1);
    }

    last():
        void
    {
        this.goToPage(this.pages.length);
    }

    onPageInput
    (
        event:
            Event
    ):
        void
    {
        this.pageInput =
            (event.target as HTMLInputElement).value;
    }

    commitPageInput():
        void
    {
        this.goToPage(
            Number(this.pageInput)
        );
    }


    //===========================================================
    // Zoom
    //===========================================================

    zoomIn():
        void
    {
        const next =
            this.zoomSteps.find(step => step > this.zoom)
            ??
            this.zoomSteps[this.zoomSteps.length - 1];

        this.setZoom(next);
    }

    zoomOut():
        void
    {
        const previous =
            [...this.zoomSteps].reverse().find(step => step < this.zoom)
            ??
            this.zoomSteps[0];

        this.setZoom(previous);
    }

    onZoomSelect
    (
        event:
            Event
    ):
        void
    {
        const value =
            (event.target as HTMLSelectElement).value;

        if
        (
            value === 'fit-width'
            ||
            value === 'fit-page'
        )
        {
            this.zoomMode =
                value;

            this.applyZoomMode();

            return;
        }

        this.setZoom(
            Number(value) || 100
        );
    }

    fitWidth():
        void
    {
        this.zoomMode =
            'fit-width';

        this.applyZoomMode();
    }

    fitPage():
        void
    {
        this.zoomMode =
            'fit-page';

        this.applyZoomMode();
    }

    private setZoom
    (
        value:
            number
    ):
        void
    {
        this.zoomMode =
            'custom';

        this.applyZoom(
            value
        );
    }

    private applyZoomMode():
        void
    {
        if
        (
            this.zoomMode === 'custom'
            ||
            this.pages.length === 0
        )
        {
            this.applyZoom(
                this.zoom
            );

            return;
        }

        const stage =
            this.stageRef?.nativeElement;

        if
        (
            !stage
        )
        {
            return;
        }

        // Widest / tallest page at 100 % (CSS px)
        const pageWidth =
            this.pages.some(page => page.classList.contains('pv-landscape'))
                ? MM_TO_PX * 297
                : MM_TO_PX * 210;

        const pageHeight =
            MM_TO_PX * 297;

        const byWidth =
            (stage.clientWidth - 56) / pageWidth;

        const byHeight =
            (stage.clientHeight - 48) / pageHeight;

        const scale =
            this.zoomMode === 'fit-page'
                ? Math.min(byWidth, byHeight)
                : Math.min(byWidth, 1.5);

        this.applyZoom(
            Math.max(25, Math.round(scale * 100))
        );
    }

    private applyZoom
    (
        value:
            number
    ):
        void
    {
        this.zoom =
            Math.min(400, Math.max(25, Math.round(value)));

        const body =
            this.frameRef?.nativeElement.contentDocument?.body;

        if
        (
            body
        )
        {
            (body.style as any).zoom =
                String(this.zoom / 100);
        }

        // Keep the current page in view
        this.pages[this.currentPage - 1]?.scrollIntoView(
        {
            block:'start'
        });

        this.cdr.detectChanges();
    }

    get zoomSelectValue():
        string
    {
        return this.zoomMode === 'custom'
            ? String(this.zoom)
            : this.zoomMode;
    }

    get zoomIsStep():
        boolean
    {
        return this.zoomSteps.includes(this.zoom);
    }


    //===========================================================
    // Document choice
    //===========================================================

    choose
    (
        value:
            any
    ):
        void
    {
        const key:
            DocumentChoice =
            String(value ?? '');

        // Cleared / same / busy : keep the current choice
        if
        (
            !key
            ||
            this.choice === key
            ||
            this.busy
        )
        {
            this.cdr.detectChanges();

            return;
        }

        this.choice =
            key;

        this.cdr.detectChanges();

        // Keep the choice in the address (refresh / share) without
        // a router navigation
        const url =
            this.router.serializeUrl(
                this.router.createUrlTree(
                    [],
                    {
                        relativeTo:this.route,
                        queryParams:{ doc:key }
                    }
                )
            );

        window.history.replaceState(
            window.history.state,
            '',
            url
        );

        // Render after the dropdown has closed (same click)
        setTimeout(
            () =>
                void this.render(),
            0
        );
    }


    //===========================================================
    // Actions
    //===========================================================

    print():
        void
    {
        const win =
            this.frameRef?.nativeElement.contentWindow;

        if
        (
            !win
            ||
            !this.ready
        )
        {
            return;
        }

        win.focus();

        win.print();
    }

    async exportPdf():
        Promise<void>
    {
        if
        (
            !this.ready
            ||
            this.busy
            ||
            !this.source
        )
        {
            return;
        }

        const body =
            this.frameRef?.nativeElement.contentDocument?.body;

        this.busy =
            'Creating PDF...';

        this.cdr.detectChanges();

        // Capture at 100 %
        if
        (
            body
        )
        {
            (body.style as any).zoom =
                '1';
        }

        try
        {
            await this.engine.exportPdf(
                this.pages,
                this.fileBase()
            );

            this.showNotice('PDF downloaded.');
        }
        catch
        {
            this.showNotice('PDF could not be created. Check that jspdf and html2canvas are installed.');
        }
        finally
        {
            this.busy =
                '';

            this.applyZoom(
                this.zoom
            );
        }
    }

    exportExcel():
        void
    {
        if
        (
            !this.ready
            ||
            !this.source
            ||
            !this.kit
        )
        {
            return;
        }

        const sheets:
            ExcelSheet[] =
            this.activeDocuments
                .filter(doc => !!doc.excel)
                .map(doc => doc.excel!(this.data, this.kit!));

        if
        (
            sheets.length === 0
        )
        {
            this.showNotice('This document has no Excel layout.');

            return;
        }

        try
        {
            this.engine.exportExcel(
                sheets,
                this.fileBase()
            );

            this.showNotice('Excel file downloaded.');
        }
        catch
        {
            this.showNotice('The Excel file could not be created.');
        }
    }

    refresh():
        void
    {
        if
        (
            this.busy
        )
        {
            return;
        }

        void this.load(
            true
        );
    }

    closeTab():
        void
    {
        window.close();
    }

    private fileBase():
        string
    {
        const docName =
            this.choice === 'all'
                ? ''
                : ` ${this.activeDocuments[0]?.title ?? ''}`;

        return `${this.recordTitle}${docName}`.trim();
    }

    private showNotice
    (
        message:
            string
    ):
        void
    {
        this.notice =
            message;

        this.cdr.detectChanges();

        if
        (
            this.noticeTimer
        )
        {
            clearTimeout(
                this.noticeTimer
            );
        }

        this.noticeTimer =
            setTimeout
            (
                () =>
                {
                    this.notice =
                        '';

                    this.cdr.detectChanges();
                },
                3500
            );
    }
}


//===============================================================
// Constants
//===============================================================

// CSS px per mm (96 dpi)
const MM_TO_PX =
    96 / 25.4;

// Width of the thumbnail panel (keep in step with .pv-thumbs)
const THUMB_PANEL_WIDTH =
    300;

// Thumbnail copy : small pages, a number badge, click to open
const THUMB_CSS =
`
html { overflow-x: hidden; }
body { background: #000000 !important; }
.pv-doc { padding: 60px 0; }
.pv-page { margin: 0 auto 70px !important; cursor: pointer; box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08) !important; }
.pv-page::after { content: attr(data-no); position: absolute; right: 18px; bottom: 18px; z-index: 5;
                  min-width: 120px; padding: 10px 26px; border-radius: 40px; background: rgba(30, 41, 59, 0.85);
                  color: #fff; font: 700 64px/1 "Segoe UI", Arial, sans-serif; text-align: center; }
.pv-page.pv-current { outline: 12px solid #3b82f6 !important; outline-offset: 10px; }
`;