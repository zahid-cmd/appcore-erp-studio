import
{
    Component,
    EventEmitter,
    Input,
    Output
}
from '@angular/core';


@Component
(
    {
        selector:
            'app-confirmation-dialog',

        standalone:
            true,

        imports:
            [],

        templateUrl:
            './confirmation-dialog.html',

        styleUrl:
            './confirmation-dialog.css'
    }
)
export class ConfirmationDialogComponent
{
    @Input()
    fullName: string =
        '';

    @Input()
    displayName: string =
        '';

    @Input()
    mobileNo: string =
        '';

    @Input()
    loginId: string =
        '';

    @Output()
    okay:
        EventEmitter<void> =
        new EventEmitter<void>();


    //===========================================================
    // Okay
    //===========================================================

    onOkay(): void
    {
        this.okay.emit();
    }
}