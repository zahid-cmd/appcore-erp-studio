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
       SHOW
    ====================================================== */

    show(
        type: ToastType,
        title: string,
        message: string,
        duration = 3000
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
            setTimeout(
                () =>
                {
                    this.remove(
                        toast.id
                    );
                },
                duration
            );
        }
    }

    /* =====================================================
       SUCCESS
    ====================================================== */

    success(
        title: string,
        message: string,
        duration = 3000
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
        duration = 3000
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
        duration = 3000
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
        duration = 3000
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
        this.toasts.set([]);
    }
}