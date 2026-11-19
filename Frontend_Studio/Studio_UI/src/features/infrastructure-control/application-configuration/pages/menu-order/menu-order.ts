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
    ToastService
}
from '../../../../../shared/components/utilities/toast/toast.service';

import
{
    MenuOrderModule,
    MenuOrderPage,
    MenuOrderSaveItem
}
from '../../models/menu-order.model';

import
{
    MenuOrderService
}
from '../../services/menu-order.service';


//===============================================================
// Menu Order (Settings > Application Configuration, 2026-11-20)
//
// Moves modules, menus and pages up / down and shows / hides
// them. Nothing else (names, codes, routes : Navigation
// Management on AppCore's development PC). Saved with one click;
// users see the new sidebar after signing in again.
// Locked rows (Security & Permission, Settings, Application
// Configuration, this page) can move but never be hidden.
//===============================================================

@Component(
{
    selector:'menu-order',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        ToastComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./menu-order.html',

    styleUrl:'./menu-order.css'
})
export class MenuOrderPageComponent implements OnInit
{
    private readonly service =
        inject(MenuOrderService);

    private readonly toast =
        inject(ToastService);

    private readonly cdr =
        inject(ChangeDetectorRef);

    private readonly progressDialog =
        inject(ProgressDialogService);

    modules:
        MenuOrderModule[] = [];

    canUpdate =
        false;

    loading =
        true;

    saving =
        false;

    dirty =
        false;

    private discardArmed =
        false;

    // the module shown on the right
    selectedIndex =
        0;


    ngOnInit():
        void
    {
        this.load();
    }


    load():
        void
    {
        this.loading =
            true;

        this.service
            .get()
            .subscribe(
            {
                next:
                    tree =>
                    {
                        this.modules =
                            tree.modules;

                        this.selectedIndex =
                            Math.min(this.selectedIndex, Math.max(0, tree.modules.length - 1));

                        this.canUpdate =
                            tree.canUpdate;

                        this.dirty =
                            false;

                        this.loading =
                            false;

                        this.cdr.detectChanges();
                    },

                error:
                    err =>
                    {
                        this.loading =
                            false;

                        this.toast.error(
                            'Menu Order',
                            err?.error?.message ?? 'The menu could not be loaded.');

                        this.cdr.detectChanges();
                    }
            });
    }


    refresh():
        void
    {
        // no browser dialog : the first click warns, the second
        // discards the changes that are not saved
        if (this.dirty && !this.discardArmed)
        {
            this.discardArmed =
                true;

            this.toast.warning(
                'Not saved',
                'Click Refresh again to throw away the changes, or Save to keep them.');

            return;
        }

        this.discardArmed =
            false;

        this.load();
    }


    //===========================================================
    // The module shown on the right
    //===========================================================

    get selected():
        MenuOrderModule | null
    {
        return this.modules[this.selectedIndex] ?? null;
    }

    select(index: number):
        void
    {
        this.selectedIndex =
            index;
    }

    // moving the selected module keeps it selected
    moveModule(index: number, step: number):
        void
    {
        const before =
            this.modules[this.selectedIndex];

        this.move(this.modules, index, step);

        const after =
            this.modules.indexOf(before);

        if (after >= 0)
        {
            this.selectedIndex =
                after;
        }
    }


    //===========================================================
    // Move up / down, show / hide
    //===========================================================

    move<T>(list: T[], index: number, step: number):
        void
    {
        const target =
            index + step;

        if (!this.canUpdate || target < 0 || target >= list.length)
        {
            return;
        }

        [list[index], list[target]] = [list[target], list[index]];

        this.dirty =
            true;
    }

    flip(node: MenuOrderPage):
        void
    {
        if (!this.canUpdate)
        {
            return;
        }

        if (node.locked)
        {
            this.toast.warning(
                'Always shown',
                `"${node.name}" cannot be hidden : without it nobody could reach these settings.`);

            return;
        }

        node.isActive =
            !node.isActive;

        this.dirty =
            true;
    }


    //===========================================================
    // Save : the order is the position in each list
    //===========================================================

    save():
        void
    {
        if (!this.canUpdate)
        {
            this.toast.warning(
                'Menu Order',
                'Saving needs the "Update" permission on Menu Order.');

            return;
        }

        if (!this.dirty || this.saving)
        {
            this.toast.info('Menu Order', 'Nothing to save.');

            return;
        }

        const items: MenuOrderSaveItem[] = [];

        this.modules.forEach((m, i) =>
        {
            items.push({ Kind:'module', Id:m.id, DisplayOrder:i + 1, IsActive:m.isActive });

            m.menus.forEach((x, j) =>
            {
                items.push({ Kind:'menu', Id:x.id, DisplayOrder:j + 1, IsActive:x.isActive });

                x.pages.forEach((p, k) =>
                    items.push({ Kind:'page', Id:p.id, DisplayOrder:k + 1, IsActive:p.isActive }));
            });
        });

        this.saving =
            true;

        this.progressDialog.show(
            'Saving Menu Order',
            'Preparing the new order...',
            false);

        this.progressDialog.update(20, 'Saving ' + items.length + ' items...');

        this.service
            .save(items)
            .subscribe(
            {
                next:
                    r =>
                    {
                        this.progressDialog.update(100, 'Saved.');

                        setTimeout(() =>
                        {
                            this.progressDialog.close();

                            this.saving =
                                false;

                            this.toast.success('Menu Order', r.message || 'Saved.');

                            this.load();
                        }, 300);
                    },

                error:
                    err =>
                    {
                        console.error('Menu Order save error', err);

                        this.progressDialog.close();

                        this.saving =
                            false;

                        this.toast.error(
                            'Menu Order not saved',
                            MenuOrderPageComponent.errorText(err));

                        this.cdr.detectChanges();
                    }
            });
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
