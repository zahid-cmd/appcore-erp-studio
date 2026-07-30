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
    ToastService
}
from './toast.service';

/* =====================================================
   TOAST
===================================================== */

@Component(
{
    selector: 'app-toast',

    standalone: true,

    imports:
    [
        CommonModule
    ],

    templateUrl:
        './toast.html',

    styleUrl:
        './toast.css'
})
export class ToastComponent
{
    /* =====================================================
       INPUTS
    ====================================================== */

    @Input()
    previewMode = false;

    /* =====================================================
       SERVICES
    ====================================================== */

    readonly toastService =
        inject(
            ToastService
        );

    /* =====================================================
       REMOVE
    ====================================================== */

    remove(
        id: number
    ): void
    {
        if (this.previewMode)
        {
            return;
        }

        this.toastService.remove(
            id
        );
    }

    /* =====================================================
       CLEAR
    ====================================================== */

    clear(): void
    {
        if (this.previewMode)
        {
            return;
        }

        this.toastService.clear();
    }
}