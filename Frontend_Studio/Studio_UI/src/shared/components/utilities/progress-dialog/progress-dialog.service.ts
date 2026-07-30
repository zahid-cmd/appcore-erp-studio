/* =====================================================
   IMPORTS
===================================================== */

import
{
    Injectable,
    WritableSignal,
    signal
}
from '@angular/core';

/* =====================================================
   PROGRESS DIALOG SERVICE
===================================================== */

@Injectable(
{
    providedIn: 'root'
})
export class ProgressDialogService
{
    /* =====================================================
       STATE
    ====================================================== */

    readonly isOpen:
        WritableSignal<boolean> =
            signal(false);

    readonly title:
        WritableSignal<string> =
            signal('Processing');

    readonly message:
        WritableSignal<string> =
            signal('Please wait...');

    readonly progress:
        WritableSignal<number> =
            signal(0);

    readonly indeterminate:
        WritableSignal<boolean> =
            signal(false);

    /* =====================================================
       SHOW
    ====================================================== */

    show
    (
        title: string,
        message: string,
        indeterminate = false
    ):
        void
    {
        this.title.set(
            title
        );

        this.message.set(
            message
        );

        this.progress.set(
            0
        );

        this.indeterminate.set(
            indeterminate
        );

        this.isOpen.set(
            true
        );
    }

    /* =====================================================
       UPDATE
    ====================================================== */

    update
    (
        progress: number,
        message?: string
    ):
        void
    {
        const value =
            Math.max(
                0,
                Math.min(
                    100,
                    progress
                )
            );

        this.progress.set(
            value
        );

        if (message)
        {
            this.message.set(
                message
            );
        }
    }

    /* =====================================================
       CLOSE
    ====================================================== */

    close():
        void
    {
        this.isOpen.set(
            false
        );

        this.progress.set(
            0
        );

        this.indeterminate.set(
            false
        );

        this.title.set(
            'Processing'
        );

        this.message.set(
            'Please wait...'
        );
    }
}