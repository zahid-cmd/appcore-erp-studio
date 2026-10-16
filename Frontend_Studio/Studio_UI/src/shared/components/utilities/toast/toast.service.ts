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
   TOAST TYPE
===================================================== */

export type ToastType =
    | 'success'
    | 'error'
    | 'warning'
    | 'info';

/* =====================================================
   TOAST ITEM
===================================================== */

export interface ToastItem
{
    id: number;

    type: ToastType;

    title: string;

    message: string;

    duration: number;
}

/* =====================================================
   DISPLAY DURATION

   How long a toast stays on screen (milliseconds).
   Change this one value to adjust every toast in the
   app. A page can still pass its own duration, and
   0 keeps the toast open until it is closed manually.
===================================================== */

export const TOAST_DEFAULT_DURATION_MS: number =
    4000;

/* =====================================================
   TOAST SERVICE
===================================================== */

@Injectable(
{
    providedIn: 'root'
})
export class ToastService
{
    /* =====================================================
       STATE
    ====================================================== */

    readonly toasts:
        WritableSignal<ToastItem[]> =
            signal([]);

    /* =====================================================
       AUTO-CLOSE TIMERS (per toast)
    ====================================================== */

    private readonly timers =
        new Map<number, ReturnType<typeof setTimeout>>();

    /* =====================================================
       SHOW
    ====================================================== */

    show(
        type: ToastType,
        title: string,
        message: string,
        duration: number = TOAST_DEFAULT_DURATION_MS
    ): void
    {
        const toast: ToastItem =
        {
            id:
                Date.now()
                + Math.random(),

            type,

            title,

            message,

            duration
        };

        this.toasts.update(
            items =>
            [
                ...items,
                toast
            ]
        );

        if (duration > 0)
        {
            this.timers.set(
                toast.id,
                setTimeout(
                    () =>
                    {
                        this.remove(
                            toast.id
                        );
                    },
                    duration
                )
            );
        }
    }

    /* =====================================================
       SUCCESS
    ====================================================== */

    success(
        title: string,
        message: string,
        duration: number = TOAST_DEFAULT_DURATION_MS
    ): void
    {
        this.show(
            'success',
            title,
            message,
            duration
        );
    }

    /* =====================================================
       ERROR
    ====================================================== */

    error(
        title: string,
        message: string,
        duration: number = TOAST_DEFAULT_DURATION_MS
    ): void
    {
        this.show(
            'error',
            title,
            message,
            duration
        );
    }

    /* =====================================================
       WARNING
    ====================================================== */

    warning(
        title: string,
        message: string,
        duration: number = TOAST_DEFAULT_DURATION_MS
    ): void
    {
        this.show(
            'warning',
            title,
            message,
            duration
        );
    }

    /* =====================================================
       INFO
    ====================================================== */

    info(
        title: string,
        message: string,
        duration: number = TOAST_DEFAULT_DURATION_MS
    ): void
    {
        this.show(
            'info',
            title,
            message,
            duration
        );
    }

    /* =====================================================
       REMOVE
    ====================================================== */

    remove(
        id: number
    ): void
    {
        const timer =
            this.timers.get(id);

        if (timer !== undefined)
        {
            clearTimeout(timer);

            this.timers.delete(id);
        }

        this.toasts.update(
            items =>
                items.filter(
                    toast =>
                        toast.id !== id
                )
        );
    }

    /* =====================================================
       CLEAR
    ====================================================== */

    clear(): void
    {
        this.timers.forEach(
            timer =>
                clearTimeout(timer)
        );

        this.timers.clear();

        this.toasts.set([]);
    }
}