//===============================================================
// Form Modal (shared)
//
// A centred dialog that hosts any form content inside a page.
//
//   <app-form-modal
//       [opened]="locationModalOpened"
//       title="Add Storage Location"
//       icon="fas fa-warehouse"
//       saveText="Add"
//       [saveDisabled]="!canSave"
//       (save)="onSave()"
//       (closed)="onClose()">
//
//       ...form controls (default slot)...
//
//       <div modalFooterLeft> ...optional extra footer content... </div>
//   </app-form-modal>
//
// • The parent owns [opened]; the modal only emits (closed) when the
//   user presses Cancel, the X, Esc or the backdrop.
// • (save) is emitted on Save; the parent validates and closes.
// • [busy] disables both buttons and shows a spinner on Save.
//===============================================================

import
{
    Component,
    EventEmitter,
    HostListener,
    Input,
    Output
}
from '@angular/core';

import
{
    CommonModule
}
from '@angular/common';


@Component(
{
    selector:'app-form-modal',

    standalone:true,

    imports:
    [
        CommonModule
    ],

    templateUrl:'./form-modal.html',

    styleUrl:'./form-modal.css'
})


export class FormModalComponent
{
    //===========================================================
    // Inputs
    //===========================================================

    // Shown when true
    @Input()
    opened:
        boolean =
        false;


    @Input()
    title:
        string =
        '';


    @Input()
    subtitle:
        string =
        '';


    // Font Awesome classes, e.g. "fas fa-warehouse"
    @Input()
    icon:
        string =
        '';


    // CSS width of the dialog
    @Input()
    width:
        string =
        '520px';


    @Input()
    saveText:
        string =
        'Save';


    @Input()
    saveIcon:
        string =
        'fas fa-check';


    @Input()
    cancelText:
        string =
        'Cancel';


    // Hide the Save button (read-only use)
    @Input()
    showSave:
        boolean =
        true;


    @Input()
    saveDisabled:
        boolean =
        false;


    // A request is running : buttons disabled, spinner on Save
    @Input()
    busy:
        boolean =
        false;


    // Close when the dark backdrop is clicked
    @Input()
    closeOnBackdrop:
        boolean =
        true;



    //===========================================================
    // Outputs
    //===========================================================

    @Output()
    save =
        new EventEmitter<void>();


    // Cancel, X, Esc or backdrop
    @Output()
    closed =
        new EventEmitter<void>();



    //===========================================================
    // Actions
    //===========================================================

    onSave():
        void
    {
        if
        (
            this.busy
            ||
            this.saveDisabled
        )
        {
            return;
        }

        this.save.emit();
    }


    onClose():
        void
    {
        if
        (
            this.busy
        )
        {
            return;
        }

        this.closed.emit();
    }


    onBackdropClick
    (
        event:
            MouseEvent
    ):
        void
    {
        // Only a click on the backdrop itself, not inside the dialog
        if
        (
            this.closeOnBackdrop
            &&
            event.target === event.currentTarget
        )
        {
            this.onClose();
        }
    }



    //===========================================================
    // Esc closes the open modal
    //===========================================================

    @HostListener('document:keydown.escape')
    onEscape():
        void
    {
        if
        (
            this.opened
        )
        {
            this.onClose();
        }
    }
}