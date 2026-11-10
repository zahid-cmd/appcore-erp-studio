import
{
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    ViewChild,
    computed,
    signal
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';


/* =====================================================
   CONTROL TAB MODEL
===================================================== */

export interface ControlTab
{
    id: string;

    label: string;

    disabled?: boolean;
}


/* =====================================================
   CONTROL TABS
   -----------------------------------------------------
   Every tab the same width (the widest label). When
   they do not all fit, the last ones move into a
   "More" menu (2026-11-10); the More button shows the
   chosen tab's name when it is one of them.
===================================================== */

@Component({

    selector: 'app-control-tabs',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './control-tabs.html',

    styleUrl:
        './control-tabs.css'
})
export class ControlTabsComponent implements AfterViewInit, OnChanges, OnDestroy
{
    /* =====================================================
       INPUTS
    ====================================================== */

    @Input()
    tabs: ControlTab[] = [];

    @Input()
    selectedTab = '';


    /* =====================================================
       OUTPUTS
    ====================================================== */

    @Output()
    selectedTabChange =
        new EventEmitter<string>();

    @Output()
    tabChanged =
        new EventEmitter<ControlTab>();


    /* =====================================================
       OVERFLOW ("More")
    ====================================================== */

    @ViewChild('measure', { static: true })
    measure?: ElementRef<HTMLElement>;

    // How many tabs show in the row (the rest go to More)
    readonly visibleCount =
        signal(Number.MAX_SAFE_INTEGER);

    readonly menuOpen =
        signal(false);

    // The menu floats above the page (the toolbar clips what hangs
    // below it) : fixed, under the More button, right edges lined up
    readonly menuTop =
        signal(0);

    readonly menuRight =
        signal(0);

    private readonly tabList =
        signal<ControlTab[]>([]);

    private readonly selected =
        signal('');

    readonly shownTabs =
        computed(() => this.tabList().slice(0, this.visibleCount()));

    readonly moreTabs =
        computed(() => this.tabList().slice(this.visibleCount()));

    // The chosen tab sits in More : the button shows its name
    readonly moreActive =
        computed(() => this.moreTabs().find(x => x.id === this.selected()) ?? null);

    private observer?: ResizeObserver;

    private frame = 0;

    constructor
    (
        private readonly host: ElementRef<HTMLElement>
    )
    {
    }

    ngOnChanges(): void
    {
        this.tabList.set(this.tabs ?? []);

        this.selected.set(this.selectedTab);

        this.scheduleFit();
    }

    ngAfterViewInit(): void
    {
        if (typeof ResizeObserver !== 'undefined')
        {
            this.observer =
                new ResizeObserver(() => this.scheduleFit());

            this.observer.observe(this.host.nativeElement);

            // the space around the tabs (toolbar) : grows / shrinks
            // with the window, the sidebar and the layout mode
            const room =
                this.roomElement();

            if (room)
            {
                this.observer.observe(room);
            }
        }

        this.scheduleFit();
    }

    ngOnDestroy(): void
    {
        this.observer?.disconnect();

        cancelAnimationFrame(this.frame);
    }

    // How many equal tabs (+ the More button) fit the width
    private scheduleFit(): void
    {
        cancelAnimationFrame(this.frame);

        this.frame =
            requestAnimationFrame(() => this.fit());
    }

    // The box the tabs sit in : the toolbar's left part, else the
    // parent
    private roomElement(): HTMLElement | null
    {
        const host =
            this.host.nativeElement;

        return (host.closest('.page-toolbar-left') as HTMLElement | null)
            ?? host.parentElement;
    }

    // Width the tabs may use = their own width + the free space
    // left in that box (negative when its content overflows). The
    // tab bar is sized by its content, so its own width alone would
    // never grow back after tabs went into More.
    private availableWidth(): number
    {
        const host =
            this.host.nativeElement;

        const room =
            this.roomElement();

        const own =
            host.getBoundingClientRect().width;

        if (!room)
        {
            return own;
        }

        const box =
            room.getBoundingClientRect();

        const style =
            getComputedStyle(room);

        const inner =
            box.right - (parseFloat(style.paddingRight) || 0);

        let contentRight =
            box.left + (parseFloat(style.paddingLeft) || 0);

        for (const child of Array.from(room.children))
        {
            const r =
                (child as HTMLElement).getBoundingClientRect();

            if (r.width > 0)
            {
                contentRight = Math.max(contentRight, r.right);
            }
        }

        return Math.floor(own + (inner - contentRight));
    }

    private fit(): void
    {
        const count =
            this.tabList().length;

        const box =
            this.measure?.nativeElement;

        const width =
            this.availableWidth();

        if (!box || count === 0 || width <= 0)
        {
            this.visibleCount.set(count);

            return;
        }

        const items =
            Array.from(box.querySelectorAll<HTMLElement>('.control-tab'));

        const tabWidth =
            Math.max(96, ...items.slice(0, count).map(x => x.offsetWidth));

        const moreWidth =
            items[count]?.offsetWidth ?? 110;

        const gap = 8;

        // all of them fit
        if (count * tabWidth + (count - 1) * gap <= width)
        {
            this.visibleCount.set(count);

            this.menuOpen.set(false);

            return;
        }

        const fit =
            Math.floor((width - moreWidth - gap + gap) / (tabWidth + gap));

        this.visibleCount.set(Math.max(1, Math.min(count - 1, fit)));
    }


    /* =====================================================
       SELECT TAB
    ====================================================== */

    selectTab(
        tab: ControlTab
    ): void
    {
        this.menuOpen.set(false);

        if (tab.disabled)
        {
            return;
        }

        if (this.selectedTab === tab.id)
        {
            return;
        }

        this.selectedTab =
            tab.id;

        this.selected.set(tab.id);

        this.selectedTabChange.emit(
            this.selectedTab
        );

        this.tabChanged.emit(
            tab
        );
    }

    toggleMenu(event: MouseEvent): void
    {
        if (this.menuOpen())
        {
            this.menuOpen.set(false);

            return;
        }

        const button =
            (event.currentTarget as HTMLElement).getBoundingClientRect();

        this.menuTop.set(Math.round(button.bottom + 6));

        this.menuRight.set(Math.max(8, Math.round(window.innerWidth - button.right)));

        this.menuOpen.set(true);
    }

    // The page moved : the menu would stay behind, so close it
    @HostListener('window:resize')
    @HostListener('window:scroll')
    onMove(): void
    {
        this.menuOpen.set(false);
    }

    // Click outside / Escape : close the More menu
    @HostListener('document:click', ['$event'])
    onDocumentClick(event: MouseEvent): void
    {
        if (this.menuOpen() && !this.host.nativeElement.contains(event.target as Node))
        {
            this.menuOpen.set(false);
        }
    }

    @HostListener('document:keydown.escape')
    onEscape(): void
    {
        this.menuOpen.set(false);
    }
}
