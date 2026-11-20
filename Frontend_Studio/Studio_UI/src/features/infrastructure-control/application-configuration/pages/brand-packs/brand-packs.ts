//===============================================================
// Imports
//===============================================================

import
{
    Component,
    OnInit,
    computed,
    inject,
    signal
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
    BrandPackBrandRow,
    BrandPackReport,
    BrandPacksService
}
from '../../services/brand-packs.service';


//===============================================================
// Brand Packs (AppCore only, 2026-11-20)
//
// Left  : the brands of this database; Export downloads the
//         chosen brand as a .acbrand file.
// Right : Install reads a .acbrand file into this database and
//         shows what was created / updated / kept.
// Opened by its address only (no menu entry); the server allows
// developers and AppCore Admin only.
//===============================================================

@Component(
{
    selector:'brand-packs',

    standalone:true,

    imports:
    [
        CommonModule,
        PageHeaderComponent,
        CommandCenterComponent,
        ToastComponent,
        ProgressDialogComponent
    ],

    templateUrl:'./brand-packs.html',

    styleUrl:'./brand-packs.css'
})
export class BrandPacksPageComponent implements OnInit
{
    private readonly service =
        inject(BrandPacksService);

    private readonly toast =
        inject(ToastService);

    private readonly progressDialog =
        inject(ProgressDialogService);


    readonly brands =
        signal<BrandPackBrandRow[]>([]);

    readonly selected =
        signal<string>('');

    readonly loading =
        signal(true);

    readonly refused =
        signal('');

    readonly busy =
        signal(false);

    readonly fileName =
        signal('');

    readonly report =
        signal<BrandPackReport | null>(null);


    // the report in blocks : a main line with its indented lines,
    // and the kind of change for its icon / colour
    readonly blocks =
        computed(() =>
        {
            const r =
                this.report();

            const blocks: { kind: string; title: string; subs: string[] }[] = [];

            for (const line of r?.lines ?? [])
            {
                if (line.startsWith('  ') && blocks.length)
                {
                    blocks[blocks.length - 1].subs.push(line.trim());
                    continue;
                }

                if (line.startsWith('Done'))
                {
                    continue;
                }

                blocks.push({ kind: BrandPacksPageComponent.kindOf(line), title: line, subs: [] });
            }

            return blocks;
        });

    private static kindOf(line: string):
        string
    {
        const t =
            line.toLowerCase();

        if (t.startsWith('stopped'))
        {
            return 'bad';
        }

        if (t.includes(' created'))
        {
            return 'new';
        }

        if (t.includes('updated') || t.includes('refreshed'))
        {
            return 'upd';
        }

        return 'kept';
    }


    ngOnInit():
        void
    {
        this.load();
    }


    load():
        void
    {
        this.loading.set(true);

        this.service
            .brands()
            .subscribe(
            {
                next:
                    rows =>
                    {
                        this.brands.set(rows);
                        this.refused.set('');

                        if (!rows.some(r => r.name === this.selected()))
                        {
                            this.selected.set(rows[0]?.name ?? '');
                        }

                        this.loading.set(false);
                    },

                error:
                    err =>
                    {
                        this.loading.set(false);
                        this.refused.set(BrandPacksPageComponent.errorText(err));
                    }
            });
    }


    //===========================================================
    // Export
    //===========================================================

    exportSelected():
        void
    {
        const brand =
            this.selected();

        if (!brand || this.busy())
        {
            this.toast.info('Brand Packs', 'Choose a brand on the left first.');
            return;
        }

        this.busy.set(true);

        this.progressDialog.show('Exporting ' + brand, 'Collecting the catalogue and pictures...', false);
        this.progressDialog.update(30, 'Building the pack...');

        this.service
            .export(brand)
            .subscribe(
            {
                next:
                    f =>
                    {
                        this.progressDialog.update(100, 'Ready.');

                        const url =
                            URL.createObjectURL(f.blob);

                        const a =
                            document.createElement('a');

                        a.href = url;
                        a.download = f.fileName;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();

                        setTimeout(() => URL.revokeObjectURL(url), 5000);

                        setTimeout(() =>
                        {
                            this.progressDialog.close();
                            this.busy.set(false);

                            if (f.missingImages > 0)
                            {
                                this.toast.warning(
                                    'Exported',
                                    `${f.fileName} saved. ${f.missingImages} picture(s) were not found on this PC and are left out.`);
                            }
                            else
                            {
                                this.toast.success('Exported', `${f.fileName} saved to your Downloads.`);
                            }
                        }, 300);
                    },

                error:
                    async err =>
                    {
                        this.progressDialog.close();
                        this.busy.set(false);
                        this.toast.error('Export failed', await BrandPacksPageComponent.blobErrorText(err));
                    }
            });
    }


    //===========================================================
    // Install
    //===========================================================

    picked(event: Event):
        void
    {
        const input =
            event.target as HTMLInputElement;

        const file =
            input.files?.[0];

        input.value = '';

        if (!file || this.busy())
        {
            return;
        }

        if (!file.name.toLowerCase().endsWith('.acbrand'))
        {
            this.toast.warning('Brand Packs', 'Choose a brand pack file (.acbrand).');
            return;
        }

        this.busy.set(true);
        this.fileName.set(file.name);
        this.report.set(null);

        this.progressDialog.show('Installing ' + file.name, 'Uploading the pack...', false);
        this.progressDialog.update(25, 'Creating the brand, models and their accounts... this can take a minute.');

        this.service
            .install(file)
            .subscribe(
            {
                next:
                    r =>
                    {
                        this.progressDialog.update(100, 'Finished.');

                        setTimeout(() =>
                        {
                            this.progressDialog.close();
                            this.busy.set(false);
                            this.report.set(r);

                            if (r.success)
                            {
                                this.toast.success('Installed', `${r.brand} : ${r.created} created, ${r.updated} updated, ${r.kept} kept.`);
                            }
                            else
                            {
                                this.toast.error('Install stopped', r.error || 'See the report.');
                            }

                            this.load();
                        }, 300);
                    },

                error:
                    err =>
                    {
                        this.progressDialog.close();
                        this.busy.set(false);
                        this.toast.error('Install failed', BrandPacksPageComponent.errorText(err));
                    }
            });
    }


    //===========================================================
    // Errors
    //===========================================================

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

    // export asks for a blob, so an error answer arrives as a blob
    private static async blobErrorText(err: any):
        Promise<string>
    {
        if (err?.error instanceof Blob)
        {
            try
            {
                const text =
                    await err.error.text();

                const json =
                    JSON.parse(text);

                return String(json?.message ?? json?.Message ?? text);
            }
            catch
            {
            }
        }

        return BrandPacksPageComponent.errorText(err);
    }
}
