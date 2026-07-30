//===============================================================
// Imports
//===============================================================

import
{
    CommonModule
}
from '@angular/common';

import
{
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    QueryList,
    ViewChildren
}
from '@angular/core';

//===============================================================
// Interface
//===============================================================

export interface ControlSegmentItem
{
    value: any;

    text: string;

    disabled?: boolean;
}

//===============================================================
// Component
//===============================================================

@Component
({
    selector: 'app-control-segment',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    templateUrl: './control-segment.html',

    styleUrls:
    [
        './control-segment.css'
    ]
})

export class ControlSegmentComponent implements AfterViewInit
{
    //===========================================================
    // View Children
    //===========================================================

    @ViewChildren('segmentButton')
    private segmentButtons!: QueryList<ElementRef<HTMLButtonElement>>;

    //===========================================================
    // Inputs
    //===========================================================

    @Input()
    items: ControlSegmentItem[] = [];

    @Input()
    value: any = null;

    @Input()
    disabled = false;

    @Input()
    name = '';

    //===========================================================
    // Outputs
    //===========================================================

    @Output()
    valueChange = new EventEmitter<any>();

    @Output()
    selectionChange = new EventEmitter<ControlSegmentItem>();

    //===========================================================
    // Lifecycle
    //===========================================================

    ngAfterViewInit(): void
    {
        this.focusSelectedSegment();
    }

    //===========================================================
    // Public Methods
    //===========================================================

    select(item: ControlSegmentItem): void
    {
        if (this.disabled || item.disabled)
        {
            return;
        }

        if (this.value === item.value)
        {
            return;
        }

        this.value = item.value;

        this.valueChange.emit(this.value);

        this.selectionChange.emit(item);

        queueMicrotask(() =>
        {
            this.focusSelectedSegment();
        });
    }

    //===========================================================

    isSelected(item: ControlSegmentItem): boolean
    {
        return this.value === item.value;
    }

    //===========================================================

    isDisabled(item: ControlSegmentItem): boolean
    {
        return this.disabled || !!item.disabled;
    }

    //===========================================================

    getTabIndex(item: ControlSegmentItem): number
    {
        return this.isSelected(item) ? 0 : -1;
    }

    //===========================================================

    onKeyDown(event: KeyboardEvent, index: number): void
    {
        if (this.disabled)
        {
            return;
        }

        switch (event.key)
        {
            case 'ArrowRight':

                event.preventDefault();

                this.moveSelection(index, 1);

                break;

            case 'ArrowLeft':

                event.preventDefault();

                this.moveSelection(index, -1);

                break;

            case 'Home':

                event.preventDefault();

                this.selectByIndex(0);

                break;

            case 'End':

                event.preventDefault();

                this.selectByIndex(this.items.length - 1);

                break;

            case ' ':

            case 'Enter':

                event.preventDefault();

                this.select(this.items[index]);

                break;
        }
    }

    //===========================================================
    // Private Methods
    //===========================================================

    private moveSelection(index: number, direction: number): void
    {
        let next = index;

        do
        {
            next += direction;

            if (next < 0)
            {
                next = this.items.length - 1;
            }

            if (next >= this.items.length)
            {
                next = 0;
            }

            if (!this.isDisabled(this.items[next]))
            {
                this.selectByIndex(next);

                return;
            }

        } while (next !== index);
    }

    //===========================================================

    private selectByIndex(index: number): void
    {
        const item = this.items[index];

        if (!item || this.isDisabled(item))
        {
            return;
        }

        this.select(item);
    }

    //===========================================================

    private focusSelectedSegment(): void
    {
        if (!this.segmentButtons)
        {
            return;
        }

        const index = this.items.findIndex
        (
            item => item.value === this.value
        );

        if (index < 0)
        {
            return;
        }

        const button = this.segmentButtons.get(index);

        button?.nativeElement.focus();
    }
}