//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    Output,
    ViewChild
}
from '@angular/core';


//===============================================================
// Note Pad (2026-11-15) : a remarks box drawn as a lined note
// pad (cream paper, red margin) with a counter and two quick
// helpers : stamp today's date, start a bullet line.
//
//   <app-note-pad
//       placeholder="Anything to remember about the company"
//       note="Only for your team, never printed"
//       [(value)]="entity.Remarks"
//       (valueChange)="onValueChange()"
//       [disabled]="isViewMode">
//   </app-note-pad>
//
// It fills the height its parent gives it; the text scrolls
// inside the paper when it is longer.
//===============================================================

@Component(
{
    selector:'app-note-pad',

    standalone:true,

    changeDetection:ChangeDetectionStrategy.OnPush,

    templateUrl:'./note-pad.html',

    styleUrl:'./note-pad.css'
})
export class NotePadComponent
{
    @ViewChild('paper')
    private paper?: ElementRef<HTMLTextAreaElement>;

    @Input()
    value: string | null | undefined =
        '';

    @Input()
    placeholder =
        'Write a note...';

    // a short line under the pad, e.g. "Only for your team, never printed"
    @Input()
    note =
        '';

    @Input()
    maxLength =
        500;

    @Input()
    disabled =
        false;

    @Output()
    readonly valueChange =
        new EventEmitter<string>();

    get length(): number
    {
        return (this.value ?? '').length;
    }

    get nearFull(): boolean
    {
        return this.maxLength > 0 && this.length >= this.maxLength * 0.9;
    }

    onInput(text: string):
        void
    {
        this.value = text;

        this.valueChange.emit(text);
    }

    // today's date, e.g. "15 Nov 2026 : "
    stampDate():
        void
    {
        const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

        this.insert(`${today} : `, true);
    }

    bullet():
        void
    {
        this.insert('• ', true);
    }

    // puts the text at the cursor, on a new line when asked
    private insert(text: string, ownLine: boolean):
        void
    {
        if (this.disabled)
        {
            return;
        }

        const box = this.paper?.nativeElement;
        const current = this.value ?? '';
        const start = box ? box.selectionStart : current.length;
        const end = box ? box.selectionEnd : current.length;

        const before = current.slice(0, start);
        const after = current.slice(end);
        const lead = ownLine && before.length > 0 && !before.endsWith('\n') ? '\n' : '';

        let next = before + lead + text + after;

        if (this.maxLength > 0 && next.length > this.maxLength)
        {
            return;
        }

        this.onInput(next);

        if (box)
        {
            const caret = before.length + lead.length + text.length;

            box.value = next;
            box.focus();
            box.setSelectionRange(caret, caret);
        }
    }
}
