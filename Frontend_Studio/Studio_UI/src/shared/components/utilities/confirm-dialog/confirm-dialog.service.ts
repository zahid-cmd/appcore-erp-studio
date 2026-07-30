/* =====================================================
   IMPORTS
===================================================== */

import
{
    Injectable,
    signal,
    WritableSignal
}
from '@angular/core';

/* =====================================================
   CONFIRM DIALOG SERVICE
===================================================== */

@Injectable(
{
    providedIn: 'root'
})
export class ConfirmDialogService
{
    /* =====================================================
       STATE
    ====================================================== */

    readonly isOpen:
        WritableSignal<boolean> =
            signal(false);

    readonly title:
        WritableSignal<string> =
            signal('Confirmation');

    readonly message:
        WritableSignal<string> =
            signal('');

    readonly cancelText:
        WritableSignal<string> =
            signal('Cancel');

    readonly confirmText:
        WritableSignal<string> =
            signal('Delete');

    readonly confirmStyle:
        WritableSignal<'primary' | 'danger'> =
            signal('danger');

    /* =====================================================
       CALLBACK
    ====================================================== */

    private confirmCallback:
        (() => void) | null = null;

    /* =====================================================
       OPEN
    ====================================================== */

    open(
        title: string,
        message: string,
        callback: () => void,
        confirmText: string = 'Delete',
        cancelText: string = 'Cancel',
        confirmStyle:
            'primary'
            | 'danger'
            = 'danger'
    ): void
    {
        this.title.set(
            title
        );

        this.message.set(
            message
        );

        this.confirmText.set(
            confirmText
        );

        this.cancelText.set(
            cancelText
        );

        this.confirmStyle.set(
            confirmStyle
        );

        this.confirmCallback =
            callback;

        this.isOpen.set(
            true
        );
    }

    /* =====================================================
       CONFIRM
    ====================================================== */

    confirm(): void
    {
        const callback =
            this.confirmCallback;

        this.close();

        callback?.();
    }

    /* =====================================================
       CANCEL
    ====================================================== */

    cancel(): void
    {
        this.close();
    }

    /* =====================================================
       CLOSE
    ====================================================== */

    close(): void
    {
        this.isOpen.set(
            false
        );

        this.confirmCallback =
            null;
    }
}