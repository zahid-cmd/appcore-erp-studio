//===============================================================
// Imports
//===============================================================

import
{
    Injectable,
    inject
}
from '@angular/core';

import
{
    ProgressDialogService
}
from '../../../shared/components/utilities/progress-dialog/progress-dialog.service';


//===============================================================
// HR Progress (Human Resource Management pages)
//
// The progress dialog of the HR pages, with a bar that moves : it
// climbs towards 90 % while the server works (fast first, slower
// as it gets close), goes to 100 % when the work is done, stays
// there a moment and then closes. The same behaviour as the
// voucher pages.
//
//   show(title, message)   opens the dialog and starts the bar
//   finish(then)           100 %, a short hold, close, then()
//   fail()                 closes at once (an error)
//===============================================================

@Injectable(
{
    providedIn:'root'
})
export class HrProgressService
{
    private readonly dialog =
        inject(ProgressDialogService);

    private readonly CEILING = 90;

    private readonly TICK_MS = 80;

    private readonly HOLD_MS = 450;

    private value = 0;

    private timer:
        number | null = null;

    private holdTimer:
        number | null = null;

    private clear():
        void
    {
        if (this.timer !== null)
        {
            window.clearInterval(this.timer);
            this.timer = null;
        }

        if (this.holdTimer !== null)
        {
            window.clearTimeout(this.holdTimer);
            this.holdTimer = null;
        }
    }

    show(title: string, message: string, _indeterminate = false):
        void
    {
        this.clear();

        this.value = 0;

        this.dialog.show(title, message, false);

        this.timer =
            window.setInterval(
                () =>
                {
                    const step =
                        Math.max(0.4, (this.CEILING - this.value) * 0.06);

                    this.value =
                        Math.min(this.CEILING, this.value + step);

                    this.dialog.update(Math.round(this.value));
                },
                this.TICK_MS);
    }

    // Done : the bar fills, stays a moment, the dialog closes and
    // the page carries on
    finish(then: () => void):
        void
    {
        this.clear();

        this.dialog.update(100);

        this.holdTimer =
            window.setTimeout(
                () =>
                {
                    this.holdTimer = null;
                    this.dialog.close();
                    then();
                },
                this.HOLD_MS);
    }

    // An error : the dialog closes at once
    fail():
        void
    {
        this.clear();
        this.dialog.close();
    }

    // The same as fail (kept for a page that only closes)
    close():
        void
    {
        this.fail();
    }
}
