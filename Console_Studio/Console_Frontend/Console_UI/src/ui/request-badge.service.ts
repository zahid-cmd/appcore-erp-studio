//===============================================================
// Count of New website requests (the badge on the Requests menu)
//===============================================================

import { Injectable, inject, signal } from '@angular/core';

import { ConsoleApi } from '../core/console-api.service';

@Injectable({ providedIn: 'root' })
export class RequestBadge
{
    private readonly api = inject(ConsoleApi);

    readonly count = signal(0);

    async refresh(): Promise<void>
    {
        try
        {
            this.count.set((await this.api.requestNewCount()).Count);
        }
        catch
        {
            // keep the last number (API down or table not created yet)
        }
    }
}
