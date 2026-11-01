//===============================================================
// Imports
//===============================================================

import
{
    Observable
}
from 'rxjs';

import
{
    ProgressDialogService
}
from './progress-dialog.service';


//===============================================================
// Progress Runner : the AppCore progress dialog around one save /
// post / delete / restore / cancel call (the same behaviour as the
// voucher pages, in one place for every CRUD page).
//
//   private readonly progress =
//       new ProgressRunner(inject(ProgressDialogService), () => this.refreshView());
//
//   this.progress
//       .run('Saving Opening Stock', 'Please wait…', 'Opening stock saved.', this.service.create(dto))
//       .subscribe({ next: saved => …, error: err => … });
//
// The bar creeps towards 90 % while the call runs, stays open at
// least MinimumMs, jumps to 100 % with the done message, then
// closes and only then hands the result (or the error) on. The page
// still puts <app-progress-dialog> in its template.
//===============================================================

export class ProgressRunner
{
    // A call is running (block a second click)
    busy:
        boolean = false;

    private timer?:
        number;

    private value:
        number = 0;

    private static readonly MinimumMs = 1500;

    private static readonly TickMs = 100;

    private static readonly Ceiling = 90;

    private static readonly HoldMs = 600;


    constructor
    (
        private readonly dialog:
            ProgressDialogService,
        private readonly changed:
            () => void = () => {}
    )
    {
    }


    run<T>
    (
        title:
            string,
        message:
            string,
        doneMessage:
            string,
        source$:
            Observable<T>
    ):
        Observable<T>
    {
        return new Observable<T>
        (
            subscriber =>
            {
                const startedAt =
                    Date.now();

                const remaining =
                    () =>
                        Math.max(0, ProgressRunner.MinimumMs - (Date.now() - startedAt));

                const timeouts:
                    number[] = [];

                let result:
                    T | undefined;

                this.start(title, message);

                const subscription =
                    source$.subscribe
                    ({
                        next:
                            value =>
                            {
                                result = value;
                            },

                        error:
                            error =>
                            {
                                timeouts.push(
                                    window.setTimeout(
                                        () =>
                                        {
                                            this.finish();

                                            subscriber.error(error);
                                        },
                                        remaining()));
                            },

                        complete:
                            () =>
                            {
                                timeouts.push(
                                    window.setTimeout(
                                        () =>
                                        {
                                            this.stopTimer();

                                            this.dialog.update(100, doneMessage);

                                            timeouts.push(
                                                window.setTimeout(
                                                    () =>
                                                    {
                                                        this.finish();

                                                        subscriber.next(result as T);

                                                        subscriber.complete();
                                                    },
                                                    ProgressRunner.HoldMs));
                                        },
                                        remaining()));
                            }
                    });

                // Page left mid-call : nothing stays open
                return () =>
                {
                    subscription.unsubscribe();

                    timeouts.forEach(x => clearTimeout(x));

                    if
                    (
                        this.busy
                    )
                    {
                        this.finish();
                    }
                };
            }
        );
    }


    private start
    (
        title:
            string,
        message:
            string
    ):
        void
    {
        this.busy = true;

        this.value = 0;

        this.dialog.show(title, message, false);

        this.stopTimer();

        this.timer =
            window.setInterval
            (
                () =>
                {
                    const step =
                        Math.max(0.4, (ProgressRunner.Ceiling - this.value) * 0.06);

                    this.value =
                        Math.min(ProgressRunner.Ceiling, this.value + step);

                    this.dialog.update(Math.round(this.value));
                },
                ProgressRunner.TickMs
            );

        this.changed();
    }


    private finish():
        void
    {
        this.stopTimer();

        this.dialog.close();

        this.busy = false;

        this.changed();
    }


    private stopTimer():
        void
    {
        if
        (
            this.timer
        )
        {
            clearInterval(this.timer);

            this.timer = undefined;
        }
    }
}
