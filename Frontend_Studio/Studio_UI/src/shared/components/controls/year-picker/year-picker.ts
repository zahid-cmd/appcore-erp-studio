//===============================================================
// Imports
//===============================================================

import
{
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    OnDestroy,
    Output,
    ViewChild,
    signal
}
from '@angular/core';


//===============================================================
// Year Picker (shared control)
//
// A compact year dropdown for tables and modals : the list is
// short (at most 200px, AppCore scrollbar), opens below or above
// the button to stay on screen, and is moved to <body> so a
// modal or a scrolling table never clips it.
//
//   <app-year-picker
//       [value]="row.Year"
//       (valueChange)="onYear(row, $event)">
//   </app-year-picker>
//===============================================================

@Component
({
    selector:'app-year-picker',

    standalone:true,

    templateUrl:'./year-picker.html',

    styleUrl:'./year-picker.css'
})

export class YearPickerComponent
    implements AfterViewInit, OnDestroy
{
    // Selected year (null / 0 = not set : shows the placeholder)
    @Input()
    value:
        number | null | undefined =
        null;

    @Input()
    min:
        number =
        2000;

    // Default : next year
    @Input()
    max:
        number =
        new Date().getFullYear() + 1;

    @Input()
    disabled:
        boolean =
        false;

    @Input()
    placeholder:
        string =
        '—';

    @Input()
    ariaLabel:
        string =
        'Year';

    @Output()
    readonly valueChange =
        new EventEmitter<number>();


    @ViewChild('trigger', { static:true })
    private trigger!:
        ElementRef<HTMLButtonElement>;

    @ViewChild('panel', { static:true })
    private panel!:
        ElementRef<HTMLDivElement>;


    readonly opened =
        signal(false);

    readonly top =
        signal(0);

    readonly left =
        signal(0);

    readonly width =
        signal(84);

    readonly maxHeight =
        signal(200);


    private readonly onScroll =
        (event: Event): void =>
        {
            // Scrolling the list itself keeps it open
            if (this.panel.nativeElement.contains(event.target as Node))
            {
                return;
            }

            this.close();
        };


    constructor
    (
        private readonly host:
            ElementRef<HTMLElement>
    )
    {
    }


    // Newest first
    get years():
        number[]
    {
        const list: number[] = [];

        for (let y = this.max; y >= this.min; y--)
        {
            list.push(y);
        }

        return list;
    }


    ngAfterViewInit():
        void
    {
        document.body.appendChild(this.panel.nativeElement);
    }


    ngOnDestroy():
        void
    {
        this.removeListeners();

        this.panel.nativeElement.remove();
    }


    toggle
    (
        event:
            Event
    ):
        void
    {
        event.stopPropagation();

        if (this.disabled)
        {
            return;
        }

        if (this.opened())
        {
            this.close();
        }
        else
        {
            this.open();
        }
    }


    private open():
        void
    {
        const rect =
            this.trigger.nativeElement.getBoundingClientRect();

        const wanted =
            200;

        const below =
            window.innerHeight - rect.bottom - 8;

        const above =
            rect.top - 8;

        if (below >= Math.min(wanted, 140) || below >= above)
        {
            const height =
                Math.max(96, Math.min(wanted, below));

            this.maxHeight.set(height);

            this.top.set(rect.bottom + 4);
        }
        else
        {
            const height =
                Math.max(96, Math.min(wanted, above));

            this.maxHeight.set(height);

            this.top.set(rect.top - 4 - height);
        }

        this.left.set(rect.left);

        this.width.set(Math.max(rect.width, 84));

        this.opened.set(true);

        window.addEventListener('scroll', this.onScroll, true);

        window.addEventListener('resize', this.closeListener);

        // The chosen year in view
        setTimeout(
            () =>
            {
                const chosen =
                    this.panel.nativeElement.querySelector('.yp-item.yp-on') as HTMLElement | null;

                chosen?.scrollIntoView({ block:'center' });
            });
    }


    private readonly closeListener =
        (): void => this.close();


    close():
        void
    {
        if (!this.opened())
        {
            return;
        }

        this.opened.set(false);

        this.removeListeners();
    }


    private removeListeners():
        void
    {
        window.removeEventListener('scroll', this.onScroll, true);

        window.removeEventListener('resize', this.closeListener);
    }


    pick
    (
        year:
            number,
        event:
            Event
    ):
        void
    {
        event.stopPropagation();

        this.close();

        if (year !== this.value)
        {
            this.valueChange.emit(year);
        }

        this.trigger.nativeElement.focus();
    }


    @HostListener('document:mousedown', ['$event'])
    onDocumentDown
    (
        event:
            MouseEvent
    ):
        void
    {
        const target =
            event.target as Node;

        if
        (
            this.opened()
            &&
            !this.host.nativeElement.contains(target)
            &&
            !this.panel.nativeElement.contains(target)
        )
        {
            this.close();
        }
    }


    @HostListener('document:keydown.escape')
    onEscape():
        void
    {
        this.close();
    }
}
