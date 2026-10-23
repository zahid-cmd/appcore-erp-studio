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
    firstValueFrom,
    of,
    catchError
}
from 'rxjs';

import
{
    Company
}
from '../../features/settings/general-settings/models/company.model';

import
{
    CompanyService
}
from '../../features/settings/general-settings/services/company.service';

import
{
    amountInWords,
    formatMoney
}
from '../components/accounting/accounting.models';

import
{
    VoucherSwitchesService,
    switchOn
}
from '../components/accounting/voucher-switches';

import
{
    ExcelSheet,
    PrintHeaderOptions,
    PrintKit,
    PrintVoucherHead,
    PrintWorkflowStep
}
from './print.models';

import
{
    qrSvg
}
from './qr-code';

import
{
    buildXlsx
}
from './xlsx-writer';


//===============================================================
// Print Engine
//
// One place for everything every print needs:
//   kit()        company header, money, words, dates, signatures
//   buildHtml()  the full document (A4 pages, shared styles)
//   paginate()   cuts .pv-flow sections into numbered A4 pages
//   exportPdf()  pages → PDF (jsPDF + html2canvas, loaded on use)
//   exportExcel() sheets → .xlsx (built-in writer)
//===============================================================

@Injectable(
{
    providedIn:'root'
})

export class PrintEngineService
{
    //===========================================================
    // Injection
    //===========================================================

    private readonly companyService =
        inject(CompanyService);

    private readonly switchesService =
        inject(VoucherSwitchesService);

    // Company is read once per session (a refresh reloads it)
    private companyCache:
        Promise<Company | null> | null =
        null;

    // Logo as a data: URL, so the PDF (html2canvas) can draw it;
    // '' when it could not be read (the plain URL is used)
    private logoCache:
        Promise<string> | null =
        null;


    //===========================================================
    // Kit
    //===========================================================

    async kit
    (
        reloadCompany:
            boolean =
            false
    ):
        Promise<PrintKit>
    {
        const company =
            await this.loadCompany(
                reloadCompany
            );

        if
        (
            reloadCompany
            ||
            !this.logoCache
        )
        {
            this.logoCache =
                this.logoAsDataUrl(
                    this.logoUrl(company?.CompanyLogoPath)
                );
        }

        const logo =
            (await this.logoCache)
            ||
            this.logoUrl(company?.CompanyLogoPath);

        // Switches are read fresh on every load / Refresh
        const switches =
            await this.switchesService.load();

        const escape =
            (value: string | number | null | undefined): string =>
                String(value ?? '')
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');

        const date =
            (iso: string | null | undefined): string =>
                this.displayDate(iso);

        const kit:
            PrintKit =
        {
            company,

            logo,

            switches,

            switchesLoaded:
                this.switchesService.lastLoadOk,

            isOn:
                (code: string, fallback: boolean) =>
                    switchOn(switches, code.toUpperCase(), fallback),

            escape,

            money:
                (value: number) =>
                    formatMoney(value),

            words:
                (value: number) =>
                    amountInWords(value),

            date,

            dateTime:
                (value: string | null | undefined) =>
                {
                    if
                    (
                        !value
                    )
                    {
                        return '';
                    }

                    const parsed =
                        new Date(value);

                    return Number.isNaN(parsed.getTime())
                        ? date(value)
                        : this.formatLocal(parsed);
                },

            now:
                () =>
                    this.formatLocal(new Date()),

            header:
                (title: string, caption?: string, status?: string, options?: PrintHeaderOptions) =>
                    this.headerHtml(
                        company,
                        options?.logo === false ? '' : logo,
                        options?.legal !== false,
                        escape,
                        title,
                        caption,
                        status
                    ),

            signatures:
                (labels: string[]) =>
                    `<div class="pv-signs" style="grid-template-columns:repeat(${Math.max(1, labels.length)}, 1fr)">${labels
                        .map(label => `<div class="pv-sign">${escape(label)}</div>`)
                        .join('')}</div>`,

            voucherHead:
                (head: PrintVoucherHead) =>
                    this.voucherHeadHtml(
                        company,
                        head.logo === false ? '' : logo,
                        escape,
                        head
                    ),

            workflow:
                (steps: PrintWorkflowStep[]) =>
                    this.workflowHtml(
                        escape,
                        steps
                    ),

            qr:
                (text: string) =>
                    this.qrHtml(text)
        };

        return kit;
    }

    private loadCompany
    (
        reload:
            boolean
    ):
        Promise<Company | null>
    {
        if
        (
            reload
            ||
            !this.companyCache
        )
        {
            this.companyCache =
                firstValueFrom(
                    this.companyService
                        .getAll()
                        .pipe(
                            catchError(
                                () =>
                                    of([] as Company[])
                            )
                        )
                )
                .then
                (
                    companies =>
                        companies.find(company => company.IsActive)
                        ??
                        companies[0]
                        ??
                        null
                );
        }

        return this.companyCache;
    }

    private logoUrl
    (
        path:
            string | null | undefined
    ):
        string
    {
        const trimmed =
            (path ?? '').trim();

        if
        (
            !trimmed
        )
        {
            return '';
        }

        if
        (
            /^(https?:|data:|blob:)/i.test(trimmed)
        )
        {
            return trimmed;
        }

        const base =
            this.companyService.getApiBaseUrl();

        return trimmed.startsWith('/')
            ? `${base}${trimmed}`
            : `${base}/${trimmed}`;
    }

    // Reads the logo once and embeds it (data: URL). Needs the API
    // to send CORS headers for its static files; otherwise ''.
    private async logoAsDataUrl
    (
        url:
            string
    ):
        Promise<string>
    {
        if
        (
            !url
        )
        {
            return '';
        }

        if
        (
            url.startsWith('data:')
        )
        {
            return url;
        }

        try
        {
            const response =
                await fetch(
                    url,
                    {
                        mode:'cors',
                        cache:'no-cache'
                    }
                );

            if
            (
                !response.ok
            )
            {
                return '';
            }

            const blob =
                await response.blob();

            return await new Promise<string>
            (
                resolve =>
                {
                    const reader =
                        new FileReader();

                    reader.onload =
                        () =>
                            resolve(String(reader.result ?? ''));

                    reader.onerror =
                        () =>
                            resolve('');

                    reader.readAsDataURL(blob);
                }
            );
        }
        catch
        {
            return '';
        }
    }

    private headerHtml
    (
        company:
            Company | null,
        logo:
            string,
        legal:
            boolean,
        escape:
            (value: string | number | null | undefined) => string,
        title:
            string,
        caption?:
            string,
        status?:
            string
    ):
        string
    {
        const address =
            [company?.AddressLine1, company?.AddressLine2]
                .map(part => (part ?? '').trim())
                .filter(part => !!part)
                .join(', ');

        const contact =
            [
                company?.Phone ? `Phone : ${company.Phone}` : '',
                company?.Mobile ? `Mobile : ${company.Mobile}` : '',
                company?.Email ? `Email : ${company.Email}` : '',
                legal && company?.BINNo ? `BIN : ${company.BINNo}` : '',
                legal && company?.TINNo ? `TIN : ${company.TINNo}` : ''
            ]
            .filter(part => !!part)
            .join(' · ');

        // Status (when given) on its own line under the title
        const tag =
            status
                ? `<div class="pv-status"><span class="pv-tag pv-tag-${escape(status.toLowerCase())}">${escape(status)}</span></div>`
                : '';

        return `<header class="pv-head">
  <div class="pv-brand">
    ${logo ? `<img class="pv-logo" src="${escape(logo)}" alt="">` : ''}
    <div>
      ${company?.CompanyName ? `<div class="pv-company">${escape(company.CompanyName)}</div>` : ''}
      ${address ? `<div class="pv-line">${escape(address)}</div>` : ''}
      ${contact ? `<div class="pv-line">${escape(contact)}</div>` : ''}
    </div>
  </div>
  <div class="pv-title-box">
    ${caption ? `<div class="pv-caption">${escape(caption)}</div>` : ''}
    <div class="pv-title">${escape(title)}</div>
    ${tag}
  </div>
</header>`;
    }


    //===========================================================
    // Voucher header (all vouchers)
    //
    //   [copy label]                                   top right
    //   logo | company name, address, contacts, BIN/TIN |  QR
    //   ┌ TITLE ······························ No [number] ┐
    //   │ info strip ……………………………………………………… [STAMP] │
    //   └─────────────────────────────────────────────────────┘
    //===========================================================

    private voucherHeadHtml
    (
        company:
            Company | null,
        logo:
            string,
        escape:
            (value: string | number | null | undefined) => string,
        head:
            PrintVoucherHead
    ):
        string
    {
        const legal =
            head.legal !== false;

        const address =
            [company?.AddressLine1, company?.AddressLine2]
                .map(part => (part ?? '').trim())
                .filter(part => !!part)
                .join(', ');

        const contact =
            [
                company?.Phone ? `Phone : ${company.Phone}` : '',
                company?.Mobile ? `Mobile : ${company.Mobile}` : '',
                company?.Email ? company.Email : ''
            ]
            .filter(part => !!part)
            .join(' · ');

        const tax =
            legal
                ? [
                    company?.BINNo ? `BIN : ${company.BINNo}` : '',
                    company?.TINNo ? `TIN : ${company.TINNo}` : ''
                ]
                .filter(part => !!part)
                .join(' · ')
                : '';

        const qr =
            head.qr
                ? `<div class="pv-vh-qr">${this.qrHtml(head.qr)}</div>`
                : '';

        const status =
            (head.status ?? '').trim();

        const meta =
            head.meta
                .map
                (
                    item =>
                        `<div class="pv-vh-cell"><div class="pv-vh-k">${escape(item.label)}</div><div class="pv-vh-v">${escape(item.value || '—')}</div></div>`
                )
                .join('');

        return `<div class="pv-vh">
  ${head.copy ? `<div class="pv-vh-copy"><span>${escape(head.copy)}</span></div>` : '<div class="pv-vh-copy pv-vh-copy-none"></div>'}
  <div class="pv-vh-top${logo ? '' : ' pv-vh-nologo'}${qr ? '' : ' pv-vh-noqr'}">
    ${logo ? `<img class="pv-vh-logo" src="${escape(logo)}" alt=""><div class="pv-vh-sep"></div>` : ''}
    <div class="pv-vh-co">
      ${company?.CompanyName ? `<div class="pv-vh-name">${escape(company.CompanyName)}</div>` : ''}
      ${address ? `<div class="pv-vh-line">${escape(address)}</div>` : ''}
      ${contact ? `<div class="pv-vh-line">${escape(contact)}</div>` : ''}
      ${tax ? `<div class="pv-vh-line">${escape(tax)}</div>` : ''}
    </div>
    ${qr}
  </div>
  <div class="pv-vh-ribbon">
    <div class="pv-vh-title">${escape(head.title)}</div>
    <div class="pv-vh-no"><span>${escape(head.numberLabel ?? 'Voucher No')}</span><b>${escape(head.number)}</b></div>
  </div>
  <div class="pv-vh-meta" style="grid-template-columns:${head.meta.map(() => 'minmax(0,1fr)').join(' ')}${status ? ' 26mm' : ''}">
    ${meta}
    ${status ? `<div class="pv-vh-stamp-cell"><span class="pv-vh-stamp pv-vh-stamp-${escape(status.toLowerCase())}">${escape(status)}</span></div>` : ''}
  </div>
</div>`;
    }

    private workflowHtml
    (
        escape:
            (value: string | number | null | undefined) => string,
        steps:
            PrintWorkflowStep[]
    ):
        string
    {
        const shown =
            steps.filter
            (
                step =>
                    !!step.value
            );

        if
        (
            shown.length === 0
        )
        {
            return '';
        }

        return `<div class="pv-flowline">${shown
            .map
            (
                step =>
                    `<div class="pv-fl-step pv-fl-${step.tone ?? 'done'}"><span class="pv-fl-dot"></span><div><b>${escape(step.label)}</b>${escape(step.value)}</div></div>`
            )
            .join('<div class="pv-fl-bar"></div>')}</div>`;
    }

    private qrHtml
    (
        text:
            string
    ):
        string
    {
        try
        {
            return qrSvg(
                text,
                '#0b2a5b'
            );
        }
        catch
        {
            // Too long for a QR : leave it out
            return '';
        }
    }


    //===========================================================
    // Build the whole document
    //===========================================================

    buildHtml
    (
        title:
            string,
        bodies:
            string[],
        css:
            string[]
    ):
        string
    {
        const escaped =
            title
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;');

        return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${escaped}</title>
<style>${BASE_CSS}${css.join('\n')}</style>
</head>
<body>
<div class="pv-doc">
${bodies.join('\n')}
</div>
</body>
</html>`;
    }


    //===========================================================
    // Pagination (.pv-flow → A4 pages)
    //===========================================================

    async paginate
    (
        doc:
            Document
    ):
        Promise<HTMLElement[]>
    {
        // Measure with real fonts and images
        try
        {
            await (doc as any).fonts?.ready;
        }
        catch
        {
            // ignore
        }

        await this.waitForImages(
            doc
        );

        const flows =
            Array.from(
                doc.querySelectorAll<HTMLElement>('.pv-flow')
            );

        for
        (
            const flow of flows
        )
        {
            const pages =
                this.paginateFlow(
                    doc,
                    flow
                );

            for
            (
                const page of pages
            )
            {
                flow.parentNode?.insertBefore(
                    page,
                    flow
                );
            }

            flow.remove();
        }

        const all =
            Array.from(
                doc.querySelectorAll<HTMLElement>('.pv-page')
            );

        all.forEach
        (
            (page, index) =>
            {
                page.dataset['index'] =
                    String(index);
            }
        );

        return all;
    }

    private paginateFlow
    (
        doc:
            Document,
        flow:
            HTMLElement
    ):
        HTMLElement[]
    {
        const head =
            flow.querySelector<HTMLElement>(':scope > .pv-run-head');

        const body =
            flow.querySelector<HTMLElement>(':scope > .pv-body');

        const end =
            flow.querySelector<HTMLElement>(':scope > .pv-end');

        const watermark =
            flow.dataset['watermark'] ?? '';

        const landscape =
            flow.classList.contains('pv-landscape');

        const pages:
            HTMLElement[] =
            [];

        // Pages are built in place (visible) so they can be
        // measured, then moved before the flow
        const host =
            doc.createElement('div');

        flow.parentNode?.insertBefore(
            host,
            flow
        );

        let current:
            HTMLElement;

        const newPage =
            ():
                HTMLElement =>
            {
                const page =
                    doc.createElement('section');

                page.className =
                    `pv-page${landscape ? ' pv-landscape' : ''}`;

                const inner =
                    doc.createElement('div');

                inner.className =
                    'pv-page-inner';

                if
                (
                    watermark
                )
                {
                    const mark =
                        doc.createElement('div');

                    mark.className =
                        'pv-watermark';

                    mark.textContent =
                        watermark;

                    page.appendChild(mark);
                }

                if
                (
                    head
                )
                {
                    inner.appendChild(
                        head.cloneNode(true)
                    );
                }

                const area =
                    doc.createElement('div');

                area.className =
                    'pv-page-body';

                inner.appendChild(area);

                const number =
                    doc.createElement('div');

                number.className =
                    'pv-page-no';

                inner.appendChild(number);

                page.appendChild(inner);

                host.appendChild(page);

                pages.push(page);

                current =
                    area;

                return area;
            };

        const overflows =
            (area: HTMLElement): boolean =>
                area.scrollHeight > area.clientHeight + 1;

        newPage();

        const blocks =
            body
                ? Array.from(body.children) as HTMLElement[]
                : [];

        for
        (
            const block of blocks
        )
        {
            current!.appendChild(block);

            if
            (
                !overflows(current!)
            )
            {
                continue;
            }

            if
            (
                block.tagName === 'TABLE'
                &&
                block.classList.contains('pv-split')
            )
            {
                this.splitTable(
                    block as HTMLTableElement,
                    () => current!,
                    newPage,
                    overflows
                );

                continue;
            }

            // Move the whole block to a new page (unless it is
            // alone on the page : then it stays, clipped)
            if
            (
                current!.children.length > 1
            )
            {
                current!.removeChild(block);

                newPage().appendChild(block);
            }
        }

        // End block (signatures) at the bottom of the last page
        if
        (
            end
        )
        {
            const block =
                end.cloneNode(true) as HTMLElement;

            current!.appendChild(block);

            if
            (
                overflows(current!)
                &&
                current!.children.length > 1
            )
            {
                current!.removeChild(block);

                newPage().appendChild(block);
            }
        }

        // Page x of y (this document)
        pages.forEach
        (
            (page, index) =>
            {
                const number =
                    page.querySelector<HTMLElement>('.pv-page-no');

                if
                (
                    number
                )
                {
                    number.textContent =
                        pages.length > 1
                            ? `Page ${index + 1} of ${pages.length}`
                            : '';
                }
            }
        );

        for
        (
            const page of pages
        )
        {
            host.parentNode?.insertBefore(
                page,
                host
            );
        }

        host.remove();

        return pages;
    }

    // Moves rows into the page until it is full, then continues
    // on a new page with the same header; the footer (totals)
    // goes with the last part
    private splitTable
    (
        table:
            HTMLTableElement,
        area:
            () => HTMLElement,
        newPage:
            () => HTMLElement,
        overflows:
            (area: HTMLElement) => boolean
    ):
        void
    {
        const rows =
            Array.from(
                table.tBodies[0]?.rows ?? []
            );

        const foot =
            table.tFoot;

        const shell =
            ():
                HTMLTableElement =>
            {
                const copy =
                    table.cloneNode(false) as HTMLTableElement;

                const colgroup =
                    table.querySelector('colgroup');

                if
                (
                    colgroup
                )
                {
                    copy.appendChild(
                        colgroup.cloneNode(true)
                    );
                }

                if
                (
                    table.tHead
                )
                {
                    copy.appendChild(
                        table.tHead.cloneNode(true)
                    );
                }

                copy.appendChild(
                    table.ownerDocument.createElement('tbody')
                );

                return copy;
            };

        // Start with the part on the current page
        table.remove();

        let part =
            shell();

        area().appendChild(part);

        // Nothing fits on this page (only the header) : start on a
        // new page when the page already has other blocks
        if
        (
            overflows(area())
            &&
            area().children.length > 1
        )
        {
            part.remove();

            newPage().appendChild(part);
        }

        for
        (
            const row of rows
        )
        {
            part.tBodies[0].appendChild(row);

            if
            (
                overflows(area())
                &&
                part.tBodies[0].rows.length > 1
            )
            {
                part.tBodies[0].removeChild(row);

                part =
                    shell();

                newPage().appendChild(part);

                part.tBodies[0].appendChild(row);
            }
        }

        if
        (
            foot
        )
        {
            const footCopy =
                foot.cloneNode(true) as HTMLTableSectionElement;

            part.appendChild(footCopy);

            if
            (
                overflows(area())
                &&
                part.tBodies[0].rows.length > 1
            )
            {
                // Carry the last row with the totals
                const last =
                    part.tBodies[0].rows[part.tBodies[0].rows.length - 1];

                part.removeChild(footCopy);

                part.tBodies[0].removeChild(last);

                part =
                    shell();

                newPage().appendChild(part);

                part.tBodies[0].appendChild(last);

                part.appendChild(footCopy);
            }
        }
    }

    private waitForImages
    (
        doc:
            Document
    ):
        Promise<void>
    {
        const pending =
            Array.from(doc.images).filter
            (
                image =>
                    !image.complete
            );

        if
        (
            pending.length === 0
        )
        {
            return Promise.resolve();
        }

        return new Promise<void>
        (
            resolve =>
            {
                let left =
                    pending.length;

                const done =
                    ():
                        void =>
                    {
                        left--;

                        if
                        (
                            left <= 0
                        )
                        {
                            resolve();
                        }
                    };

                for
                (
                    const image of pending
                )
                {
                    image.addEventListener('load', done, { once:true });

                    image.addEventListener
                    (
                        'error',
                        () =>
                        {
                            // A broken logo is hidden; printing goes on
                            image.style.display = 'none';

                            done();
                        },
                        { once:true }
                    );
                }

                setTimeout(resolve, 3000);
            }
        );
    }


    //===========================================================
    // PDF : one image per page (exact copy of the preview)
    //   needs : npm i jspdf@2.5.2 html2canvas@1.4.1
    //===========================================================

    async exportPdf
    (
        pages:
            HTMLElement[],
        fileName:
            string
    ):
        Promise<void>
    {
        const [{ jsPDF }, html2canvasModule] =
            await Promise.all(
            [
                import('jspdf'),
                import('html2canvas')
            ]);

        const html2canvas =
            html2canvasModule.default;

        let pdf:
            InstanceType<typeof jsPDF> | null =
            null;

        for
        (
            const page of pages
        )
        {
            const landscape =
                page.classList.contains('pv-landscape');

            const width =
                landscape ? 297 : 210;

            const height =
                landscape ? 210 : 297;

            const canvas =
                await html2canvas(
                    page,
                    {
                        scale:2,
                        useCORS:true,
                        backgroundColor:'#ffffff',
                        logging:false
                    }
                );

            const image =
                canvas.toDataURL(
                    'image/jpeg',
                    0.92
                );

            if
            (
                !pdf
            )
            {
                pdf =
                    new jsPDF(
                    {
                        orientation:landscape ? 'landscape' : 'portrait',
                        unit:'mm',
                        format:'a4',
                        compress:true
                    });
            }
            else
            {
                pdf.addPage(
                    'a4',
                    landscape ? 'landscape' : 'portrait'
                );
            }

            pdf.addImage(
                image,
                'JPEG',
                0,
                0,
                width,
                height,
                undefined,
                'FAST'
            );
        }

        pdf?.save(
            `${this.safeFileName(fileName)}.pdf`
        );
    }


    //===========================================================
    // Excel
    //===========================================================

    exportExcel
    (
        sheets:
            ExcelSheet[],
        fileName:
            string
    ):
        void
    {
        this.download(
            buildXlsx(sheets),
            `${this.safeFileName(fileName)}.xlsx`
        );
    }

    private download
    (
        blob:
            Blob,
        name:
            string
    ):
        void
    {
        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement('a');

        link.href =
            url;

        link.download =
            name;

        document.body.appendChild(link);

        link.click();

        link.remove();

        setTimeout(
            () =>
                URL.revokeObjectURL(url),
            2000
        );
    }

    private safeFileName
    (
        name:
            string
    ):
        string
    {
        return (name || 'document')
            .replace(/[\\/:*?"<>|]+/g, '-')
            .trim();
    }


    //===========================================================
    // Dates
    //===========================================================

    private displayDate
    (
        iso:
            string | null | undefined
    ):
        string
    {
        const text =
            (iso ?? '').slice(0, 10);

        const match =
            /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);

        if
        (
            !match
        )
        {
            return text;
        }

        return `${match[3]}-${MONTHS[Number(match[2]) - 1]}-${match[1]}`;
    }

    private formatLocal
    (
        date:
            Date
    ):
        string
    {
        const pad =
            (value: number): string =>
                String(value).padStart(2, '0');

        return `${pad(date.getDate())}-${MONTHS[date.getMonth()]}-${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }
}


//===============================================================
// Constants
//===============================================================

const MONTHS:
    string[] =
[
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Shared print styles : screen (viewer canvas) + paper
const BASE_CSS =
`
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { background: #e3e6eb; font-family: "Segoe UI", Arial, sans-serif; color: #111827; font-size: 10pt;
       -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pv-doc { padding: 16px 0 24px; }

/* Paper */
.pv-page { position: relative; width: 210mm; height: 297mm; margin: 0 auto 16px; background: #ffffff;
           box-shadow: 0 1px 3px rgba(15, 23, 42, 0.12), 0 8px 24px -8px rgba(15, 23, 42, 0.28); overflow: hidden; }
.pv-page.pv-landscape { width: 297mm; height: 210mm; }
.pv-page-inner { position: absolute; inset: 0; padding: 12mm 14mm 9mm; display: flex; flex-direction: column; }
.pv-page-body { flex: 1 1 auto; min-height: 0; overflow: hidden; display: flex; flex-direction: column; }
.pv-page-body > * { flex: 0 0 auto; }
.pv-page-body > .pv-end { margin-top: auto; }
.pv-page-no { flex: 0 0 auto; min-height: 4mm; padding-top: 1.5mm; font-size: 7.5pt; color: #6b7280; text-align: center; }
.pv-flow { width: 210mm; margin: 0 auto; background: #fff; }
.pv-current { outline: 3px solid #3b82f6; outline-offset: 2px; }

/* AppCore scrollbar (preview + thumbnails) */
html { scrollbar-width: thin; scrollbar-color: #2563eb transparent; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; margin: 4px 0; }
::-webkit-scrollbar-thumb { background: #2563eb; border-radius: 999px; border: 1px solid transparent; background-clip: padding-box; }
::-webkit-scrollbar-thumb:hover { background: #1d4ed8; }

/* Watermark */
.pv-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-28deg);
                font-size: 72pt; font-weight: 800; letter-spacing: 8pt; color: rgba(220, 38, 38, 0.12);
                white-space: nowrap; pointer-events: none; z-index: 0; }

/* Company header */
.pv-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 6mm;
           padding-bottom: 2.5mm; border-bottom: 1.5px solid #1e3a8a; }
.pv-brand { display: flex; gap: 3.5mm; align-items: center; min-width: 0; }
.pv-logo { max-height: 15mm; max-width: 32mm; object-fit: contain; }
.pv-company { font-size: 13.5pt; font-weight: 700; color: #1e3a8a; }
.pv-line { font-size: 8pt; line-height: 1.35; color: #4b5563; }
.pv-title-box { text-align: right; flex: 0 0 auto; }
.pv-caption { font-size: 7.5pt; font-weight: 700; letter-spacing: 1pt; color: #6b7280; text-transform: uppercase; }
.pv-title { font-size: 15pt; font-weight: 800; letter-spacing: 1pt; color: #111827; }
.pv-status { margin-top: 1.2mm; }
.pv-tag { display: inline-block; padding: 0.5mm 3mm; border: 1px solid #9ca3af; border-radius: 3mm;
          font-size: 8pt; font-weight: 700; letter-spacing: 0.3pt; text-transform: uppercase; color: #4b5563; }
.pv-tag-approved { border-color: #93c5fd; background: #eff6ff; color: #1d4ed8; }
.pv-tag-posted { border-color: #86efac; background: #f0fdf4; color: #15803d; }
.pv-tag-cancelled { border-color: #fca5a5; background: #fef2f2; color: #b91c1c; }

/* Voucher header (kit.voucherHead) */
.pv-vh { position: relative; margin-bottom: 3.5mm; }
.pv-vh-copy { display: flex; justify-content: flex-end; min-height: 5mm; }
.pv-vh-copy span { font-size: 7pt; font-weight: 800; letter-spacing: 2.4pt; text-transform: uppercase; color: #1d4ed8;
                   padding: 0.8mm 3mm; border: 1px solid #c7d5f0; border-radius: 3mm; background: #f3f7fe; }
.pv-vh-top { display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto; gap: 6mm; align-items: center; padding: 3mm 0 5mm; }
.pv-vh-top.pv-vh-nologo { grid-template-columns: minmax(0, 1fr) auto; }
.pv-vh-logo { display: block; height: 22mm; max-width: 62mm; object-fit: contain; }
.pv-vh-sep { width: 0.4mm; align-self: stretch; margin: 1mm 0;
             background: linear-gradient(180deg, rgba(29,78,216,0) 0%, #b9cbeb 18%, #1d4ed8 50%, #b9cbeb 82%, rgba(29,78,216,0) 100%); }
.pv-vh-co { min-width: 0; }
.pv-vh-name { font-size: 16pt; font-weight: 800; color: #0b2a5b; letter-spacing: 0.2pt; line-height: 1.2; }
.pv-vh-line { font-size: 8pt; color: #64748b; line-height: 1.45; }
.pv-vh-qr { width: 24mm; height: 24mm; padding: 1.2mm; border: 1px solid #cdd9ee; border-radius: 2mm; background: #fff; }
.pv-vh-qr svg { display: block; width: 100%; height: 100%; }
.pv-vh-ribbon { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 6mm;
                padding: 3mm 5mm 3mm 7mm; border: 1px solid #cdd9ee; border-bottom: 0; border-radius: 2.5mm 2.5mm 0 0; overflow: hidden;
                background: radial-gradient(120% 180% at 100% 0%, rgba(29,78,216,0.10) 0%, rgba(29,78,216,0) 55%),
                            linear-gradient(90deg, #f7f9fe 0%, #edf2fc 55%, #e3ebfa 100%); }
.pv-vh-ribbon::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 2.2mm;
                        background: linear-gradient(180deg, #0b2a5b, #1d4ed8); }
.pv-vh-ribbon::after { content: ""; position: absolute; left: 2.2mm; right: 0; bottom: 0; height: 0.5mm; opacity: 0.55;
                       background: linear-gradient(90deg, #0b2a5b 0%, #1d4ed8 45%, rgba(29,78,216,0) 100%); }
.pv-vh-title { font-size: 15pt; font-weight: 800; letter-spacing: 3pt; color: #0b2a5b; text-transform: uppercase; }
.pv-vh-no { display: flex; align-items: center; gap: 2.5mm; }
.pv-vh-no span { font-size: 6.8pt; font-weight: 700; letter-spacing: 1.2pt; text-transform: uppercase; color: #64748b; }
.pv-vh-no b { font-size: 11pt; font-weight: 800; letter-spacing: 0.4pt; color: #0b2a5b; padding: 1mm 3.2mm; border-radius: 1.6mm;
              background: #ffffff; border: 1px solid #b9cbeb; box-shadow: 0 0.4mm 1.2mm rgba(11,42,91,0.10); white-space: nowrap; }
.pv-vh-meta { display: grid; border: 1px solid #cdd9ee; border-radius: 0 0 2.5mm 2.5mm; overflow: hidden; }
.pv-vh-cell { padding: 2.4mm 2.6mm; border-right: 1px solid #e2e8f0; background: #f5f7fb; min-width: 0; }
.pv-vh-k { font-size: 6.4pt; font-weight: 700; letter-spacing: 0.6pt; white-space: nowrap; text-transform: uppercase; color: #64748b; }
.pv-vh-v { margin-top: 0.6mm; font-size: 9.2pt; font-weight: 700; color: #0f172a; line-height: 1.25; overflow-wrap: anywhere; }
.pv-vh-stamp-cell { display: grid; place-items: center; background: #ffffff; }
.pv-vh-stamp { border: 1.6px solid #64748b; color: #64748b; border-radius: 1.6mm; padding: 0.8mm 2.4mm; font-weight: 800;
               letter-spacing: 1.2pt; font-size: 8pt; text-transform: uppercase; transform: rotate(-5deg); }
.pv-vh-stamp-approved { border-color: #1d4ed8; color: #1d4ed8; }
.pv-vh-stamp-posted { border-color: #15803d; color: #15803d; }
.pv-vh-stamp-cancelled { border-color: #b91c1c; color: #b91c1c; }

/* Workflow line (kit.workflow) */
.pv-flowline { display: flex; align-items: center; }
.pv-fl-step { display: flex; align-items: center; gap: 2mm; font-size: 7.8pt; color: #334155; white-space: nowrap; }
.pv-fl-step b { display: block; font-size: 6.8pt; letter-spacing: 0.9pt; text-transform: uppercase; color: #64748b; }
.pv-fl-dot { width: 3mm; height: 3mm; border-radius: 50%; background: #1d4ed8; box-shadow: 0 0 0 1mm #dbe6fb; flex: 0 0 auto; }
.pv-fl-final .pv-fl-dot { background: #15803d; box-shadow: 0 0 0 1mm #dcfce7; }
.pv-fl-cancel .pv-fl-dot { background: #b91c1c; box-shadow: 0 0 0 1mm #fee2e2; }
.pv-fl-bar { flex: 1 1 auto; border-top: 1.2px solid #cbd5e1; margin: 0 3mm; }

/* Common table */
table.pv-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.pv-table th { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.4pt; color: #374151; text-align: left;
               padding: 2mm; background: #eef2f9; border-top: 1px solid #cbd5e1; border-bottom: 1px solid #cbd5e1; }
.pv-table td { padding: 1.8mm 2mm; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
.pv-table tfoot td { border-top: 1.5px solid #1e3a8a; border-bottom: 1.5px solid #1e3a8a; font-weight: 700; font-size: 10.5pt; }
.pv-c { text-align: center; }
.pv-r { text-align: right; font-variant-numeric: tabular-nums; }
.pv-code { font-weight: 400; color: #6b7280; font-size: 8.5pt; }
.pv-nowrap { white-space: nowrap; }

/* Signatures */
.pv-signs { display: grid; gap: 8mm; padding-top: 16mm; }
.pv-sign { border-top: 1px solid #6b7280; padding-top: 1mm; text-align: center; font-size: 8.5pt; color: #374151; }
.pv-printed { margin-top: 1mm; font-size: 7pt; color: #9ca3af; text-align: right; }

/* Paper output */
@media print
{
    body { background: #ffffff; zoom: 1 !important; }
    .pv-doc { padding: 0; }
    .pv-page { margin: 0; box-shadow: none; break-after: page; page-break-after: always; }
    .pv-page:last-child { break-after: auto; page-break-after: auto; }
    .pv-current { outline: none; }
}
`;