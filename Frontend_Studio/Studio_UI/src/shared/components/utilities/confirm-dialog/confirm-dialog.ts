/* =====================================================
   IMPORTS
===================================================== */

import
{
    Component,
    Input,
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
    ConfirmDialogService
}
from './confirm-dialog.service';

/* =====================================================
   CONFIRM DIALOG
===================================================== */

@Component(
{
    selector: 'app-confirm-dialog',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './confirm-dialog.html',

    styleUrl:
        './confirm-dialog.css'
})
export class ConfirmDialogComponent
{
    /* =====================================================
       INPUTS
    ====================================================== */

    @Input()
    previewMode = false;

    /* =====================================================
       SERVICES
    ====================================================== */

    readonly dialogService =
        inject(
            ConfirmDialogService
        );

    /* =====================================================
       CONFIRM
    ====================================================== */

    onConfirm(): void
    {
        if (this.previewMode)
        {
            return;
        }

        this.dialogService.confirm();
    }

    /* =====================================================
       CANCEL
    ====================================================== */

    onCancel(): void
    {
        if (this.previewMode)
        {
            return;
        }

        this.dialogService.cancel();
    }
}