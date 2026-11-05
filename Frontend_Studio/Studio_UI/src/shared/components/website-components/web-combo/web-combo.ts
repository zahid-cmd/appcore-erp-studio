//===============================================================
// Website : searchable picker (combobox)
// --------------------------------------------------------------
// Type to filter, arrows / Enter to choose, Esc to close. Rows
// may show a small photo (bike models) and a second line.
// Used by the Enquire form for the area and the bike.
//===============================================================

import
{
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    Input,
    Output,
    ViewChild,
    computed,
    inject,
    signal
}
from '@angular/core';


export interface WebComboItem
{
    value:string;

    label:string;

    // Second line (brand, area type …)
    sub?:string;

    // Small photo on the left
    img?:string;
}


let nextId =
    0;


@Component(
{
    selector:'app-web-combo',
    standalone:true,
    templateUrl:'./web-combo.html',
    styleUrl:'./web-combo.css'
})
export class WebComboComponent
{
    private readonly host =
        inject<ElementRef<HTMLElement>>(ElementRef);

    @ViewChild('box')
    private box?:
        ElementRef<HTMLInputElement>;


    readonly listId =
        `web-combo-${++nextId}`;


    private readonly itemList =
        signal<WebComboItem[]>([]);

    private readonly selected =
        signal<string>('');


    @Input()
    set items
    (
        value:
            WebComboItem[] | null
    )
    {
        this.itemList.set(value ?? []);
    }


    @Input()
    set value
    (
        value:
            string | null
    )
    {
        this.selected.set(value ?? '');
    }


    @Input()
    placeholder =
        'Search…';

    @Input()
    inputId =
        '';

    @Input()
    invalid =
        false;

    // Rows shown at most (more = keep typing)
    @Input()
    limit =
        60;


    @Output()
    valueChange =
        new EventEmitter<string>();


    readonly open =
        signal(false);

    readonly query =
        signal('');

    readonly active =
        signal(0);


    readonly current =
        computed(
            () =>
                this.itemList().find(x => x.value === this.selected()) ?? null
        );


    readonly filtered =
        computed(
            () =>
            {
                const q =
                    this.query().trim().toLowerCase();

                const list =
                    q
                        ? this.itemList().filter(
                            x =>
                                x.label.toLowerCase().includes(q)
                                ||
                                (x.sub ?? '').toLowerCase().includes(q)
                        )
                        : this.itemList();

                return list.slice(0, this.limit);
            }
        );


    // Text in the box : what is typed while open, else the choice
    readonly boxText =
        computed(
            () =>
                this.open()
                    ? this.query()
                    : this.current()?.label ?? ''
        );


    openList():
        void
    {
        if
        (
            this.open()
        )
        {
            return;
        }

        this.query.set('');

        const index =
            this.filtered().findIndex(x => x.value === this.selected());

        this.active.set(Math.max(0, index));

        this.open.set(true);
    }


    close():
        void
    {
        this.open.set(false);

        this.query.set('');
    }


    onInput
    (
        event:
            Event
    ):
        void
    {
        this.query.set((event.target as HTMLInputElement).value);

        this.active.set(0);

        this.open.set(true);
    }


    choose
    (
        item:
            WebComboItem
    ):
        void
    {
        this.selected.set(item.value);

        this.valueChange.emit(item.value);

        this.close();
    }


    onKey
    (
        event:
            KeyboardEvent
    ):
        void
    {
        const list =
            this.filtered();

        switch
        (
            event.key
        )
        {
            case 'ArrowDown':

                event.preventDefault();

                this.openList();

                this.active.set(Math.min(list.length - 1, this.active() + 1));

                this.scrollActive();

                break;


            case 'ArrowUp':

                event.preventDefault();

                this.active.set(Math.max(0, this.active() - 1));

                this.scrollActive();

                break;


            case 'Enter':

                if
                (
                    this.open()
                    &&
                    list[this.active()]
                )
                {
                    event.preventDefault();

                    this.choose(list[this.active()]);
                }

                break;


            case 'Escape':

                if
                (
                    this.open()
                )
                {
                    event.preventDefault();

                    this.close();
                }

                break;


            case 'Tab':

                this.close();

                break;
        }
    }


    private scrollActive():
        void
    {
        setTimeout(
            () =>
                this.host.nativeElement
                    .querySelector(`#${this.listId}-${this.active()}`)
                    ?.scrollIntoView({ block:'nearest' })
        );
    }


    toggle():
        void
    {
        if
        (
            this.open()
        )
        {
            this.close();

            return;
        }

        this.box?.nativeElement.focus();

        this.openList();
    }


    // A click anywhere else closes the list
    @HostListener('document:pointerdown', ['$event'])
    onOutside
    (
        event:
            PointerEvent
    ):
        void
    {
        if
        (
            this.open()
            &&
            !this.host.nativeElement.contains(event.target as Node)
        )
        {
            this.close();
        }
    }
}
