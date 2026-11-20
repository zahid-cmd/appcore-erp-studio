//===============================================================
// Imports
//===============================================================

import
{
    ChangeDetectorRef,
    Component,
    OnInit,
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
    FormsModule
}
from '@angular/forms';

import
{
    PageHeaderComponent
}
from '../../../../../shared/components/layout/page-header/page-header';

import
{
    CommandCenterComponent
}
from '../../../../../shared/components/utilities/command-center/command-center';

import
{
    ToastComponent
}
from '../../../../../shared/components/utilities/toast/toast';

import
{
    ToastService
}
from '../../../../../shared/components/utilities/toast/toast.service';

import
{
    ProgressDialogComponent
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog';

import
{
    ProgressDialogService
}
from '../../../../../shared/components/utilities/progress-dialog/progress-dialog.service';

import
{
    environment
}
from '../../../../../environments/environment';

import
{
    AccessRequestItem,
    AccessRequestOption,
    AccessRequestStatus
}
from '../../models/access-request.model';

import
{
    AccessRequestService
}
from '../../services/access-request.service';


//===============================================================
// Access Requests (Security & Permission > User Management,
// 2026-11-20)
//
// "Register Now" on the sign-in page sends a request; no user
// exists until it is approved here. Approve : pick the role and
// the branches, the user is made and can sign in at once with
// the password they chose. Reject : no user; kept 30 days.
//===============================================================

@Component(
{
    selector:'access-requests',

    standalone:true,

    imports:
    [
        CommonModule,
        FormsModule,
        PageHeaderComponent,
        CommandCenterComponent,
        ToastComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./access-requests.html',

    styleUrl:'./access-requests.css'
})
export class AccessRequestsPageComponent implements OnInit
{
    private readonly service =
        inject(AccessRequestService);

    private readonly toast =
        inject(ToastService);

    private readonly progressDialog =
        inject(ProgressDialogService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    readonly tabs:
        AccessRequestStatus[] =
        ['Pending', 'Approved', 'Rejected', 'All'];

    status:
        AccessRequestStatus =
        'Pending';

    items:
        AccessRequestItem[] = [];

    counts:
        Record<string, number> =
        { Pending: 0, Approved: 0, Rejected: 0, All: 0 };

    canDecide =
        false;

    loading =
        true;

    failed =
        '';

    // Approve dialog
    approving:
        AccessRequestItem | null =
        null;

    roles:
        AccessRequestOption[] = [];

    branches:
        AccessRequestOption[] = [];

    roleId:
        number | null =
        null;

    branchIds =
        new Set<number>();

    // Reject dialog
    rejecting:
        AccessRequestItem | null =
        null;

    reason =
        '';

    busy =
        false;


    ngOnInit():
        void
    {
        this.load();
    }


    //===========================================================
    // Load
    //===========================================================

    load():
        void
    {
        this.loading =
            true;

        this.failed =
            '';

        this.redraw();

        this.service
            .list(this.status)
            .subscribe(
            {
                next:
                    r =>
                    {
                        this.items = r.items;
                        this.canDecide = r.canDecide;
                        this.counts =
                        {
                            Pending: r.pending,
                            Approved: r.approved,
                            Rejected: r.rejected,
                            All: r.pending + r.approved + r.rejected
                        };
                        this.loading = false;
                        this.redraw();
                    },

                error:
                    err =>
                    {
                        this.items = [];
                        this.loading = false;
                        this.failed = AccessRequestsPageComponent.errorText(err);
                        this.redraw();
                    }
            });
    }

    show
    (
        status: AccessRequestStatus
    ):
        void
    {
        if (this.status === status)
        {
            return;
        }

        this.status =
            status;

        this.load();
    }


    //===========================================================
    // Approve
    //===========================================================

    openApprove
    (
        item: AccessRequestItem
    ):
        void
    {
        this.approving =
            item;

        this.roleId =
            null;

        this.branchIds =
            new Set<number>();

        this.redraw();

        if (this.roles.length > 0)
        {
            return;
        }

        this.service
            .options()
            .subscribe(
            {
                next:
                    o =>
                    {
                        this.roles = o.roles;
                        this.branches = o.branches;

                        // one branch only : ticked for you
                        if (this.branches.length === 1)
                        {
                            this.branchIds.add(this.branches[0].id);
                        }

                        this.redraw();
                    },

                error:
                    err =>
                    {
                        this.toast.error('Access Requests', AccessRequestsPageComponent.errorText(err));
                        this.approving = null;
                        this.redraw();
                    }
            });
    }

    toggleBranch
    (
        id: number
    ):
        void
    {
        if (this.branchIds.has(id))
        {
            this.branchIds.delete(id);
        }
        else
        {
            this.branchIds.add(id);
        }
    }

    toggleAllBranches():
        void
    {
        this.branchIds =
            this.branchIds.size === this.branches.length
                ? new Set<number>()
                : new Set<number>(this.branches.map(b => b.id));
    }

    get canApprove():
        boolean
    {
        return !this.busy && this.roleId != null && this.branchIds.size > 0;
    }

    approve():
        void
    {
        const item =
            this.approving;

        if (!item || !this.canApprove)
        {
            return;
        }

        this.busy =
            true;

        this.progressDialog.show(
            'Approving Request',
            'Making the user ' + item.userName + '...',
            false);

        this.progressDialog.update(30, 'Giving the role and branches...');

        this.service
            .approve(item.publicId, this.roleId!, [...this.branchIds])
            .subscribe(
            {
                next:
                    message =>
                    {
                        this.progressDialog.update(100, 'Done.');

                        setTimeout(() =>
                        {
                            this.progressDialog.close();
                            this.busy = false;
                            this.approving = null;
                            this.toast.success('Request approved', message);
                            this.load();
                        }, 300);
                    },

                error:
                    err =>
                    {
                        this.progressDialog.close();
                        this.busy = false;
                        this.toast.error('Not approved', AccessRequestsPageComponent.errorText(err));
                        this.redraw();
                    }
            });
    }


    //===========================================================
    // Reject
    //===========================================================

    openReject
    (
        item: AccessRequestItem
    ):
        void
    {
        this.rejecting =
            item;

        this.reason =
            '';

        this.redraw();
    }

    reject():
        void
    {
        const item =
            this.rejecting;

        if (!item || this.busy)
        {
            return;
        }

        this.busy =
            true;

        this.service
            .reject(item.publicId, this.reason.trim())
            .subscribe(
            {
                next:
                    message =>
                    {
                        this.busy = false;
                        this.rejecting = null;
                        this.toast.success('Request rejected', message);
                        this.load();
                    },

                error:
                    err =>
                    {
                        this.busy = false;
                        this.toast.error('Not rejected', AccessRequestsPageComponent.errorText(err));
                        this.redraw();
                    }
            });
    }

    closeDialogs():
        void
    {
        if (this.busy)
        {
            return;
        }

        this.approving = null;
        this.rejecting = null;
        this.redraw();
    }


    //===========================================================
    // Display helpers
    //===========================================================

    nameOf
    (
        item: AccessRequestItem
    ):
        string
    {
        return item.fullName || item.displayName || item.userName;
    }

    initials
    (
        item: AccessRequestItem
    ):
        string
    {
        const parts =
            this.nameOf(item).trim().split(/\s+/).filter(Boolean);

        return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
    }

    photo
    (
        item: AccessRequestItem
    ):
        string
    {
        const path =
            item.userPhotoPath;

        if (!path)
        {
            return '';
        }

        return /^https?:/i.test(path)
            ? path
            : environment.apiUrl.replace(/\/api\/?$/i, '') + path;
    }

    when
    (
        value: string | null
    ):
        string
    {
        if (!value)
        {
            return '';
        }

        const d =
            new Date(value);

        return isNaN(d.getTime())
            ? value
            : d.toLocaleString(undefined, { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
    }

    private redraw():
        void
    {
        this.cdr.markForCheck();

        try
        {
            this.cdr.detectChanges();
        }
        catch
        {
            // page closed meanwhile
        }
    }

    // the real reason, whatever shape the API answer has
    private static errorText(err: any):
        string
    {
        const e =
            err?.error;

        if (typeof e === 'string' && e.trim())
        {
            return e.length > 300 ? e.slice(0, 300) + '...' : e;
        }

        const text =
            e?.message ?? e?.Message ?? e?.detail ?? e?.title;

        if (text)
        {
            return String(text);
        }

        return err?.status
            ? `The server answered ${err.status} ${err.statusText ?? ''}`.trim()
            : 'The server could not be reached.';
    }
}
