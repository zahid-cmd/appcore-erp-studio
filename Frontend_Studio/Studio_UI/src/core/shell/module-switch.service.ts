//===============================================================
// Module Switch Service (2026-11-20)
// --------------------------------------------------------------
// Blueprint : claude\blueprint-module-isolation.md
//
// A module switched off for the company in the Console disappears
// from the pages of the OTHER modules too. A page asks :
//
//     readonly modules = inject(ModuleSwitchService);
//     @if (modules.isOn('warranty-management')) { ... }
//
// The off modules come with the shell context
// (api/platform/shell/context) after sign-in. Until it has
// loaded, every module counts as on; the API refuses and skips
// an off module by itself, so nothing wrong can be saved.
//===============================================================

import
{
    Injectable,
    computed,
    inject
}
from '@angular/core';

import
{
    ShellService
}
from './shell.service';


// The switchable modules' route keys (as in the sidebar address)
export const MODULE_KEYS =
{
    procurement: 'procurement',
    sales: 'sales-operations',
    service: 'service-operations',
    accessories: 'accessories-operations',
    enquiry: 'enquiry-management',
    registration: 'registration-management',
    membership: 'membership-management',
    humanResource: 'human-resource-manangement',
    warranty: 'warranty-management',
    vat: 'vat-management',
    fixedAssets: 'fixed-assets-management',
    emi: 'emi-management'
} as const;


@Injectable(
{
    providedIn:
        'root'
})
export class ModuleSwitchService
{
    private readonly shell =
        inject(ShellService);

    private readonly off =
        computed(
            () =>
            {
                const row =
                    this.shell.context() as unknown as Record<string, unknown> | null;

                const list =
                    (row?.['offModules'] ?? row?.['OffModules'] ?? []) as string[];

                return new Set<string>(
                    (Array.isArray(list) ? list : [])
                        .map(x => String(x).toLowerCase()));
            });

    isOff
    (
        routeKey:
            string
    ):
        boolean
    {
        return this.off().has(routeKey.toLowerCase());
    }

    isOn
    (
        routeKey:
            string
    ):
        boolean
    {
        return !this.isOff(routeKey);
    }
}
