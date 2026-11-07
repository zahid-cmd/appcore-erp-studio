//===============================================================
// Branch Switch Dialog (user menu › Switch Branch, top bar Branch
// chip; 2026-11-07)
// --------------------------------------------------------------
// The user's branches as cards (code · wing · business lines,
// the current one marked). Pick one → Switch → the server issues
// a new token for it → the app reloads on the Dashboard.
//
// Also shows the notice when another tab switched the shared
// login ("Branch changed to … in another tab", then reload).
//
// One instance for the whole shell (in topbar-actions.html).
//===============================================================

import
{
    Component,
    HostListener,
    computed,
    inject,
    signal
}
from '@angular/core';

import
{
    HttpErrorResponse
}
from '@angular/common/http';

import
{
    OrbitLoaderComponent
}
from '../../utilities/orbit-loader/orbit-loader';

import
{
    BranchSwitchService,
    SwitchBranchOption
}
from '../../../../core/authentication/branch-switch.service';


// Business line colours (Motor Bikes / Spare Parts / Accessories /
// Services)
const LINE_COLORS: Record<string, string> =
{
    'Motor Bikes':'#2563EB',
    'Spare Parts':'#0D9488',
    'Accessories':'#7C3AED',
    'Services':'#EA580C'
};


@Component(
{
    selector:'app-branch-switch-dialog',
    standalone:true,
    imports:[OrbitLoaderComponent],
    templateUrl:'./branch-switch-dialog.html',
    styleUrls:['./branch-switch-dialog.css']
})
export class BranchSwitchDialogComponent
{
    readonly service =
        inject(BranchSwitchService);

    readonly open =
        this.service.dialogOpen;

    readonly data =
        this.service.myBranches;

    readonly notice =
        this.service.otherTabNotice;

    readonly selectedId =
        signal<number>(0);

    readonly busy =
        signal<boolean>(false);

    readonly error =
        signal<string>('');

    readonly done =
        signal<string>('');

    // The branch being switched to (the orbit loader's title)
    readonly switchingTo =
        signal<string>('');

    readonly branches =
        computed<SwitchBranchOption[]>(() => this.data()?.branches ?? []);

    readonly current =
        computed<SwitchBranchOption | null>(() => this.branches().find(x => x.isCurrent) ?? null);

    readonly selected =
        computed<SwitchBranchOption | null>(() => this.branches().find(x => x.branchId === this.selectedId()) ?? null);

    readonly canConfirm =
        computed<boolean>(
            () =>
                !this.busy()
                && !!this.data()?.canSwitch
                && !!this.selected()
                && !this.selected()!.isCurrent);


    lineColor(line: string): string
    {
        return LINE_COLORS[line] ?? '#64748B';
    }


    pick(branch: SwitchBranchOption): void
    {
        if (this.busy() || branch.isCurrent)
        {
            return;
        }

        this.selectedId.set(branch.branchId);

        this.error.set('');
    }


    close(): void
    {
        if (this.busy())
        {
            return;
        }

        this.selectedId.set(0);

        this.error.set('');

        this.service.close();
    }


    @HostListener('document:keydown.escape')
    onEscape(): void
    {
        if (this.open())
        {
            this.close();
        }
    }


    confirm(): void
    {
        const branch =
            this.selected();

        if (!branch || !this.canConfirm())
        {
            return;
        }

        this.busy.set(true);

        this.error.set('');

        this.switchingTo.set(branch.branchName);

        this.service
            .switchTo(branch.branchId)
            .subscribe(
            {
                next:(): void =>
                {
                    // The loader stays up until the page reloads
                    this.done.set(`Now working in ${branch.branchName}. Opening the Dashboard...`);

                    setTimeout(() => this.service.reloadToDashboard(), 600);
                },

                error:(error: unknown): void =>
                {
                    this.busy.set(false);

                    this.switchingTo.set('');

                    this.error.set(
                        error instanceof HttpErrorResponse
                            ? (error.error?.message ?? error.error?.Message ?? 'The branch could not be switched.')
                            : 'The branch could not be switched.');
                }
            });
    }
}
