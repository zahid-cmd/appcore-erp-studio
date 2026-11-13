//===============================================================
// Imports
//===============================================================

import {
  ChangeDetectionStrategy,
  Component,
  ChangeDetectorRef,
  DestroyRef,
  inject,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  ContentChild,
  TemplateRef,
  ElementRef,
  afterNextRender
} from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import {
  CommonModule
} from '@angular/common';

import {
  OrbitLoaderComponent
} from '../../utilities/orbit-loader/orbit-loader';

import {
  EmptyStateComponent
} from '../empty-state/empty-state';

import {
  SidebarService
} from '../../../../core/sidebar/sidebar.service';

import {
  EffectiveAccessService
} from '../../../../core/effective-access/effective-access.service';


//===============================================================
// COLUMN TYPES
//===============================================================

export type ListTableColumnType =
  | 'text'
  | 'serial'
  | 'status'
  | 'boolean'
  | 'image'
  | 'operation'
  | 'actions'
  // The page's own cell : <ng-template #cellTemplate let-row
  // let-column="column"> inside <app-list-table>
  | 'template';


//===============================================================
// COLUMN ALIGNMENT
//===============================================================

export type ListTableAlign =
  | 'left'
  | 'center'
  | 'right';


//===============================================================
// COLUMN
//===============================================================

export interface ListTableColumn
{
  header: string;
  field: string;
  width?: string;
  align?: ListTableAlign;
  // Rows only (the header keeps align); missing = align
  cellAlign?: ListTableAlign;
  type?: ListTableColumnType;
  sortable?: boolean;
  // Text cells : a small pill after the value when row[flagField]
  // is true (e.g. 'Edited'); its tooltip is row[flagTitleField]
  flagField?: string;
  flagText?: string;
  flagTitleField?: string;
  // Text cells : the value is a link; a click emits
  // (cellClick) with { field, row } (e.g. open a detail row)
  link?: boolean;
  linkTitle?: string;
  // Text cells : a small dot before the value, coloured by
  // row[dotField] (a CSS colour; no dot when empty). Thin style
  // for classes such as the Movement Class (no filled chips).
  dotField?: string;
  // Text cells : show only this icon (e.g. 'fas fa-motorcycle')
  // painted in row[dotField]; the value moves to the icon's
  // tooltip. Sorting stays on field.
  dotIcon?: string;
  // Image cells : the hover preview's tiny header (title =
  // row[previewTitleField]) and footer ("label value" chips)
  previewTitleField?: string;
  previewDetails?: { label: string; field: string }[];
  // Image cells : a big round number at the top left of the
  // hover preview (e.g. the stock), value = row[previewBadgeField]
  previewBadgeField?: string;
  // Image cells : a colour tag at the top right of the hover
  // preview (swatch + name) and a colour bar under the picture;
  // name = row[previewColorField], swatch = a CSS colour in
  // row[previewColorSwatchField] (empty = grey dot)
  previewColorField?: string;
  previewColorSwatchField?: string;
  // Page canvas across monitors : which columns give way when
  // the table is narrow. 1 (or none) = always shown, 2 = hidden
  // under 900px of table width, 3 = hidden under 1200px.
  priority?: 1 | 2 | 3;
}


//===============================================================
// CELL CLICK (link columns)
//===============================================================

export interface ListTableCellClickEvent
{
  field: string;
  row: any;
}


//===============================================================
// ACTIONS
//===============================================================

export interface ListTableActions
{
  view?: boolean;
  edit?: boolean;
  delete?: boolean;
}


//===============================================================
// ROW ACTIONS (optional, page specific)
//
// Extra buttons in the Actions column, before View / Edit /
// Delete. The page decides per row with visible(); a click
// emits (rowAction) with { key, row }.
//
//   [rowActions]="[{ key:'print', icon:'fas fa-print',
//                    title:'Print Preview', tone:'primary' }]"
//   (rowAction)="onRowAction($event)"
//
// Pages without rowActions are unchanged.
//===============================================================

export type ListTableRowActionTone =
  | 'default'
  | 'primary'
  | 'success'
  | 'danger';

export interface ListTableRowAction
{
  key: string;
  icon: string;
  title: string;
  tone?: ListTableRowActionTone;
  visible?: (row: any) => boolean;
}

export interface ListTableRowActionEvent
{
  key: string;
  row: any;
}


//===============================================================
// COMPONENT
//===============================================================

@Component({
  selector: 'app-list-table',
  standalone: true,
  imports: [
    CommonModule,
    EmptyStateComponent,
    OrbitLoaderComponent
  ],
  templateUrl: './list-table.html',
  styleUrl: './list-table.css',
  host: {
    class: 'list-table-host'
  },
  changeDetection:
    ChangeDetectionStrategy.OnPush
})

export class ListTableComponent
implements OnChanges
{
  /* =====================================================
     DEPENDENCIES
  ====================================================== */

  private readonly sidebarService =
    inject(SidebarService);

  private readonly effectiveAccessService =
    inject(EffectiveAccessService);

  private readonly cdr =
    inject(ChangeDetectorRef);

  private readonly destroyRef =
    inject(DestroyRef);

  private readonly hostRef =
    inject(ElementRef<HTMLElement>);


  /* =====================================================
     FIT TO THE CANVAS (page canvas across monitors)
     -----------------------------------------------------
     Watches the table's own size :
       - width  : host classes lt-hide-p3 (< 1200px) and
                  lt-hide-p2 (< 900px) hide the columns with
                  priority 3 / 2 (header and rows together);
       - height : (fitRowsChange) emits how many rows fit in
                  the body at the current row height, for an
                  Auto page size. Emitted only when it changes.
  ====================================================== */

  static readonly HIDE_P3_BELOW = 1200;

  static readonly HIDE_P2_BELOW = 900;

  private fitFrame = 0;

  private lastFitRows = -1;

  private readonly fitSetup =
    afterNextRender(
      () =>
      {
        if (typeof ResizeObserver === 'undefined')
        {
          return;
        }

        const host =
          this.hostRef.nativeElement as HTMLElement;

        const observer =
          new ResizeObserver(() => this.scheduleFit());

        observer.observe(host);

        const body =
          host.querySelector('.list-table-body');

        if (body)
        {
          observer.observe(body);
        }

        this.scheduleFit();

        this.destroyRef.onDestroy(
          () =>
          {
            observer.disconnect();

            if (this.fitFrame)
            {
              cancelAnimationFrame(this.fitFrame);
            }
          });
      });


  private scheduleFit(): void
  {
    if (this.fitFrame)
    {
      return;
    }

    this.fitFrame =
      requestAnimationFrame(
        () =>
        {
          this.fitFrame = 0;

          this.fitToCanvas();
        });
  }


  /* =====================================================
     COLUMN WIDTHS (no clipping at any zoom, 2026-11-13)
     -----------------------------------------------------
     The page's widths are treated as proportions :
       - small fixed columns (#, status, yes / no, image,
         operation, actions) keep their width;
       - the other columns share what is left, in the same
         proportions, so the table always fits its frame;
         long text ends with "..." (full text on hover).
     When even the minimum widths do not fit (big zoom, small
     window) the body scrolls sideways (lt-scroll); the #
     column stays at the left and Actions at the right, and
     the header / totals follow the scroll.
  ====================================================== */

  private static readonly FIXED_TYPES =
    new Set<string>(['serial', 'status', 'boolean', 'image', 'operation', 'actions']);

  // A flexible column never gets narrower than this
  private static readonly MIN_FLEX = 72;

  // Computed px width per column (same order as columns);
  // empty = the page's own width
  colWidths: number[] = [];

  // Table width in px ; null = 100% of the frame
  tableWidth: number | null = null;

  scrollMode = false;

  colWidth(index: number, column: ListTableColumn): string | null
  {
    const px =
      this.colWidths[index];

    return px > 0 ? `${px}px` : (column.width ?? null);
  }

  isStickLeft(index: number, column: ListTableColumn): boolean
  {
    return index === 0 && column.type === 'serial';
  }

  isStickRight(index: number, column: ListTableColumn): boolean
  {
    return index === this.columns.length - 1 && (column.type === 'actions' || column.type === 'operation');
  }

  private basePx(column: ListTableColumn): number
  {
    const text =
      String(column.width ?? '').trim();

    const value =
      parseFloat(text);

    if (text.endsWith('px') && value > 0)
    {
      return value;
    }

    // % or no width : an average text column
    return 150;
  }

  // The status pill is 110px wide plus the cell's 6px sides :
  // a narrower status column cuts the pill off
  private static readonly MIN_STATUS = 124;

  private fitColumns(host: HTMLElement, body: HTMLElement): void
  {
    const avail =
      body.clientWidth;

    if (avail <= 0 || !this.columns?.length)
    {
      return;
    }

    const hidden =
      (c: ListTableColumn) =>
        (c.priority === 3 && host.classList.contains('lt-hide-p3'))
        ||
        ((c.priority === 2 || c.priority === 3) && host.classList.contains('lt-hide-p2'));

    let fixedSum = 0;
    let flexSum = 0;
    let flexMinSum = 0;

    const info =
      this.columns.map(c =>
      {
        const base =
          c.type === 'status'
            ? Math.max(this.basePx(c), ListTableComponent.MIN_STATUS)
            : this.basePx(c);
        const fixed = ListTableComponent.FIXED_TYPES.has(c.type ?? 'text');
        const off = hidden(c);
        const min = Math.max(ListTableComponent.MIN_FLEX, Math.round(base * 0.6));

        if (!off)
        {
          if (fixed)
          {
            fixedSum += base;
          }
          else
          {
            flexSum += base;
            flexMinSum += min;
          }
        }

        return { base, fixed, off, min };
      });

    const scroll =
      fixedSum + flexMinSum > avail;

    const room =
      Math.max(0, avail - fixedSum);

    let used = 0;
    let lastFlex = -1;

    const widths =
      info.map((x, i) =>
      {
        if (x.off)
        {
          return 0;
        }

        const w =
          x.fixed
            ? x.base
            : scroll
              ? x.min
              : Math.floor(room * x.base / (flexSum || 1));

        if (!x.fixed)
        {
          lastFlex = i;
        }

        used += w;

        return w;
      });

    // rounding : the last flexible column takes the few px left
    if (!scroll && lastFlex >= 0 && used < avail)
    {
      widths[lastFlex] += avail - used;
      used = avail;
    }

    const table =
      scroll ? used : avail;

    const same =
      this.scrollMode === scroll
      && this.tableWidth === table
      && widths.length === this.colWidths.length
      && widths.every((w, i) => w === this.colWidths[i]);

    host.classList.toggle('lt-scroll', scroll);

    if (same)
    {
      return;
    }

    this.colWidths = widths;
    this.tableWidth = table;
    this.scrollMode = scroll;

    if (!scroll)
    {
      body.scrollLeft = 0;
      this.syncScroll(body);
    }

    this.cdr.markForCheck();
  }

  // Header and totals follow the body's sideways scroll
  syncScroll(body: HTMLElement): void
  {
    const host =
      this.hostRef.nativeElement as HTMLElement;

    host.querySelectorAll<HTMLElement>('.list-table-header, .list-table-foot')
      .forEach(el => el.scrollLeft = body.scrollLeft);
  }

  private fitToCanvas(): void
  {
    const host =
      this.hostRef.nativeElement as HTMLElement;

    const width =
      host.clientWidth;

    if (width > 0)
    {
      host.classList.toggle('lt-hide-p3', width < ListTableComponent.HIDE_P3_BELOW);

      host.classList.toggle('lt-hide-p2', width < ListTableComponent.HIDE_P2_BELOW);
    }

    const body =
      host.querySelector('.list-table-body') as HTMLElement | null;

    if (body)
    {
      this.fitColumns(host, body);
    }

    if (!body || !this.fitRowsChange.observed)
    {
      return;
    }

    const rowHeight =
      parseFloat(getComputedStyle(body).getPropertyValue('--list-row-height')) || 40;

    const rows =
      Math.max(1, Math.floor(body.clientHeight / rowHeight));

    if (body.clientHeight > 0 && rows !== this.lastFitRows)
    {
      this.lastFitRows = rows;

      this.fitRowsChange.emit(rows);
    }
  }

//===============================================================
// Permission / Navigation Refresh
//===============================================================

private readonly permissionsSubscription =
    this.effectiveAccessService.permissionsLoaded$
        .pipe(
            takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(
            () =>
            {
                this.cdr.markForCheck();
            }
        );


private readonly navigationContextSubscription =
    this.sidebarService.currentNavigationContext$
        .pipe(
            takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(
            () =>
            {
                this.cdr.markForCheck();
            }
        );

  /* =====================================================
     INPUTS
  ====================================================== */

  // Hover preview of 'image' cells (a page turns it off by a
  // System Configuration switch)
  @Input()
  imagePreview = true;

  @Input()
  columns: ListTableColumn[] = [];

  @Input()
  rows: any[] = [];

  // Total rows pinned under the body, above the pager (e.g. Page
  // Total / Grand Total). Each row : { field : text } per column
  // (missing = empty cell); grand : true = the stronger style.
  @Input()
  footerRows: any[] = [];

  @Input()
  serialOffset = 0;

  @Input()
  loading = false;

  @Input()
  error = false;

  @Input()
  actions: ListTableActions = {
    view: true,
    edit: true,
    delete: true
  };


  /* =====================================================
     REGISTRATION VISIBILITY

     Default:

     Registration is hidden.

     Controls only the Register / Deregister button.
  ====================================================== */

  @Input()
  showRegistration = false;


  /* =====================================================
     RESTORE POINT VISIBILITY

     Default:

     Restore Point is hidden.

     The Save Restore Point button is displayed only by
     pages that explicitly enable it.

     Code Synchronization page:

         showRestorePoint = true

     All other list pages:

         showRestorePoint = false
  ====================================================== */

  @Input()
  showRestorePoint = false;


  /* =====================================================
     REGISTRATION STATE

     Registration does not depend on the Database Engine.

     The Register / Deregister button is disabled only
     while the row's code is not synchronized. Any number
     of rows may be registered at the same time, and a
     registered row can always be deregistered.
  ====================================================== */

  isRegistrationDisabled(
    row: any
  ):
    boolean
  {
    return (
      row?.status
        ?.toLowerCase()
      !==
      'synchronized'
    );
  }


  /* =====================================================
     OUTPUTS
  ====================================================== */

  // Rows that fit in the body (page canvas across monitors;
  // see FIT TO THE CANVAS)
  @Output()
  fitRowsChange =
    new EventEmitter<number>();

  @Output()
  view =
    new EventEmitter<any>();

  @Output()
  edit =
    new EventEmitter<any>();

  @Output()
  delete =
    new EventEmitter<any>();

  @Output()
  sortChange =
    new EventEmitter<{
      field: string;
      direction:
        'asc'
        |
        'desc';
    }>();

  @Output()
  operation =
    new EventEmitter<any>();

  @Output()
  registration =
    new EventEmitter<any>();


  /* =====================================================
     RESTORE POINT

     Save Restore Point is handled by the parent
     Code Synchronization component.

     This component only emits the selected row.

     The restore point operation belongs to the
     individual record / submenu.

     Visibility is controlled separately through:

         showRestorePoint

     This keeps the generic List Table reusable without
     displaying the Code Synchronization-specific action
     on every list page.
  ====================================================== */

  @Output()
  saveRestorePoint =
    new EventEmitter<any>();

  @Output()
  commandCenter =
    new EventEmitter<any>();

  @Output()
  commandServer =
    new EventEmitter<any>();


  /* =====================================================
     ROW ACTIONS (optional)
  ====================================================== */

  @Input()
  rowActions: ListTableRowAction[] = [];


  /* =====================================================
     LINK CELLS + DETAIL ROW (optional, page specific)

     A column with link:true shows its value as a link; a
     click emits (cellClick). The page may give a detail
     template; it opens as a full-width row under the row
     whose row[detailKey] equals detailValue :

       <app-list-table
           detailKey="ProductId"
           [detailValue]="openId"
           [detailContext]="detailData"
           (cellClick)="onCellClick($event)">
           <ng-template #rowDetail let-row let-data="data">
               …
           </ng-template>
       </app-list-table>

     detailContext reaches the template as "data"; give a
     new object when it changes (the table is OnPush).
     Pages without these are unchanged.
  ====================================================== */

  @ContentChild('rowDetail')
  detailTemplate?: TemplateRef<any>;

  // Cells of columns with type 'template' (e.g. a dropdown per
  // row); context : $implicit = row, column = the column
  @ContentChild('cellTemplate')
  cellTemplate?: TemplateRef<any>;

  @Input()
  detailKey = '';

  @Input()
  detailValue: any = null;

  @Input()
  detailContext: any = null;

  @Output()
  cellClick =
    new EventEmitter<ListTableCellClickEvent>();

  // The row under the mouse ({ row, rect }); null when the mouse
  // leaves it. Only sent when a page listens (e.g. the item
  // summary card of the purchase lists).
  @Output()
  rowHover =
    new EventEmitter<{ row: any; rect: DOMRect } | null>();

  onRowEnter(
    row: any,
    event: MouseEvent
  ):
    void
  {
    if (!this.rowHover.observed)
    {
      return;
    }

    const target =
      event.currentTarget as HTMLElement | null;

    if (!target)
    {
      return;
    }

    this.rowHover.emit({
      row,
      rect: target.getBoundingClientRect()
    });
  }

  onRowLeave():
    void
  {
    if (this.rowHover.observed)
    {
      this.rowHover.emit(null);
    }
  }

  isDetailOpen(
    row: any
  ):
    boolean
  {
    return (
      !!this.detailTemplate
      &&
      !!this.detailKey
      &&
      this.detailValue !== null
      &&
      this.detailValue !== undefined
      &&
      row?.[this.detailKey] === this.detailValue
    );
  }

  onCellClick(
    row: any,
    column: ListTableColumn,
    event: Event
  ):
    void
  {
    event.stopPropagation();

    this.cellClick.emit({
      field: column.field,
      row
    });
  }

  @Output()
  rowAction =
    new EventEmitter<ListTableRowActionEvent>();

  isRowActionVisible(
    action: ListTableRowAction,
    row: any
  ):
    boolean
  {
    return !action.visible || action.visible(row);
  }

  onRowActionClick(
    action: ListTableRowAction,
    row: any,
    event: MouseEvent
  ):
    void
  {
    event.stopPropagation();

    this.rowAction.emit({
      key: action.key,
      row
    });
  }


  /* =====================================================
     CHANGES
  ====================================================== */

  ngOnChanges(
    changes: SimpleChanges
  ):
    void
  {
    // new columns (or rows after loading) : widths again
    if (changes['columns'] || changes['rows'] || changes['loading'])
    {
      this.scheduleFit();
    }

    // (debug logging of loading / error / rows removed : it ran
    // on every load and slowed big lists down)
  }


  /* =====================================================
     SORT STATE
  ====================================================== */

  sortField = '';

  sortDirection:
    'asc'
    |
    'desc'
    =
    'asc';


  /* =====================================================
     SORT
  ====================================================== */

  sort(
    column: ListTableColumn
  ):
    void
  {
    if (
      column.type === 'serial'
      ||
      column.type === 'actions'
      ||
      column.type === 'operation'
      ||
      column.type === 'image'
    )
    {
      return;
    }

    if (
      this.sortField
      ===
      column.field
    )
    {
      this.sortDirection =
        this.sortDirection === 'asc'
          ? 'desc'
          : 'asc';
    }
    else
    {
      this.sortField =
        column.field;

      this.sortDirection =
        'asc';
    }

    this.sortChange.emit({
      field:
        this.sortField,
      direction:
        this.sortDirection
    });
  }


  /* =====================================================
     SERIAL
  ====================================================== */

  getSerial(
    index: number
  ):
    number
  {
    return this.serialOffset + index + 1;
  }


  /* =====================================================
     CELL VALUE
  ====================================================== */

  getCellValue(
    row: any,
    column: ListTableColumn
  ):
    any
  {
    return row[column.field];
  }


  /* =====================================================
     CELL TOOLTIP
     Text cells show their full value on hover, so a value
     cut short (…) by a narrow column can still be read.
  ====================================================== */

  getCellTitle(
    row: any,
    column: ListTableColumn
  ):
    string | null
  {
    if
    (
      (column.type && column.type !== 'text')
      ||
      column.link
    )
    {
      return null;
    }

    const value =
      this.getCellValue(
        row,
        column
      );

    const text =
      value === null || value === undefined
        ? ''
        : String(value).trim();

    return text || null;
  }


  /* =====================================================
     CELL FLAG (optional pill after a text value)
  ====================================================== */

  hasFlag(
    row: any,
    column: ListTableColumn
  ):
    boolean
  {
    return !!column.flagField
      && !!row?.[column.flagField];
  }


  getDotColor(
    row: any,
    column: ListTableColumn
  ):
    string
  {
    return column.dotField
      ? String(row?.[column.dotField] ?? '')
      : '';
  }


  getFlagTitle(
    row: any,
    column: ListTableColumn
  ):
    string | null
  {
    return column.flagTitleField
      ? String(row?.[column.flagTitleField] ?? '') || null
      : null;
  }


  /* =====================================================
     IMAGE VALUE

     'image' columns : the row field holds a full image URL.
     Empty / broken images fall back to a placeholder icon.
  ====================================================== */

  private readonly brokenImages =
    new Set<string>();


  getImageValue(
    row: any,
    column: ListTableColumn
  ):
    string
  {
    const value =
      String(row?.[column.field] ?? '').trim();

    return value && !this.brokenImages.has(value)
      ? value
      : '';
  }


  onImageError(
    row: any,
    column: ListTableColumn
  ):
    void
  {
    const value =
      String(row?.[column.field] ?? '').trim();

    if (value)
    {
      this.brokenImages.add(value);

      this.cdr.markForCheck();
    }
  }


  /* =====================================================
     IMAGE PREVIEW : a larger copy of the thumbnail while
     the pointer is over it (left of the cell, or right of
     it near the window edge), with an optional tiny header
  ====================================================== */

  previewImageSrc: string | null = null;

  previewImageTitle = '';

  previewImageDetails: { label: string; value: string }[] = [];

  previewImageBadge = '';

  // Colour tag of the preview (name + CSS colour)
  previewImageColor = '';

  previewImageSwatch = '';

  previewImageX = 0;

  previewImageY = 0;

  private readonly previewWidth = 280;

  private readonly previewHeight = 270;

  showImagePreview(
    event: MouseEvent,
    src: string,
    row: any = null,
    column: ListTableColumn | null = null
  ):
    void
  {
    if (!src || !this.imagePreview)
    {
      return;
    }

    this.previewImageTitle =
      column?.previewTitleField
        ? String(row?.[column.previewTitleField] ?? '')
        : '';

    this.previewImageBadge =
      column?.previewBadgeField
        ? String(row?.[column.previewBadgeField] ?? '')
        : '';

    this.previewImageColor =
      column?.previewColorField
        ? String(row?.[column.previewColorField] ?? '').trim()
        : '';

    this.previewImageSwatch =
      column?.previewColorSwatchField
        ? String(row?.[column.previewColorSwatchField] ?? '').trim()
        : '';

    if (this.previewImageColor === '—' || this.previewImageColor === '-')
    {
      this.previewImageColor = '';
    }

    this.previewImageDetails =
      (column?.previewDetails ?? [])
        .map(
          d =>
          ({
            label: d.label,
            value: String(row?.[d.field] ?? '')
          })
        );

    const rect =
      (event.currentTarget as HTMLElement).getBoundingClientRect();

    const gap = 12;

    // Left of the cell; right of it only when there is no room
    let x =
      rect.left - gap - this.previewWidth;

    if (x < 8)
    {
      x = rect.right + gap;
    }

    let y =
      rect.top + rect.height / 2 - this.previewHeight / 2;

    y = Math.max(8, Math.min(y, window.innerHeight - this.previewHeight - 8));

    this.previewImageX = Math.max(8, x);

    this.previewImageY = y;

    this.previewImageSrc = src;

    this.cdr.markForCheck();
  }

  hideImagePreview():
    void
  {
    if (this.previewImageSrc)
    {
      this.previewImageSrc = null;

      this.cdr.markForCheck();
    }
  }


  /* =====================================================
     STATUS VALUE
  ====================================================== */

  getStatusValue(
    row: any,
    column: ListTableColumn
  ):
    string
  {
    const value =
      row[column.field];

    if (
      typeof value === 'boolean'
    )
    {
      return value
        ? 'Active'
        : 'Inactive';
    }

    return value ?? '';
  }


  /* =====================================================
     STATUS CLASS
  ====================================================== */

  getStatusClass(
    row: any,
    column: ListTableColumn
  ):
    string
  {
    // "Settled · Auto" → settled (the part before " · ")
    const value =
      this.getStatusValue(
        row,
        column
      )
      .split(' · ')[0]
      .trim()
      .toLowerCase();

    switch (
      value
    )
    {
      case 'active':
      case 'completed':
      case 'success':
      case 'posted':
      // Servers : last Test Connection
      case 'online':
      // Deployment Center
      case 'succeeded':
      case 'live':
        return 'active';

      case 'pending':
      case 'running':
      case 'rolled back':
      case 'processing':
        return 'pending';

      case 'inactive':
      case 'failed':
      case 'error':
      case 'cancelled':
      case 'offline':
      case 'token rejected':
      case 'not configured':
        return 'inactive';

      // Vouchers : Draft → Approved → Posted / Cancelled
      case 'draft':
        return 'draft';

      case 'approved':
        return 'approved';

      // Purchase orders : Placed (purple), Closed Short (orange);
      // Completed uses .active, Cancelled uses .inactive
      case 'placed':
        return 'placed';

      case 'closed short':
        return 'closed';

      // Checks : Pending → Deposited → Cleared / Dishonoured, Void
      case 'deposited':
        return 'approved';

      case 'cleared':
        return 'active';

      case 'dishonoured':
        return 'inactive';

      case 'void':
        return 'neutral';

      // MFS : Pending → Settled / Rejected; Direct (personal)
      case 'settled':
        return 'active';

      case 'rejected':
        return 'inactive';

      case 'direct':
        return 'approved';

      case 'not applicable':
        return 'neutral';

      // Inventory Status : stock of a product / a bike
      case 'in stock':
        return 'active';

      case 'low stock':
        return 'pending';

      case 'critical':
        return 'closed';

      case 'out of stock':
        return 'inactive';

      case 'in transit':
      case 'partly received':
        return 'approved';

      default:
        return 'neutral';
    }
  }


  /* =====================================================
     BOOLEAN VALUE
  ====================================================== */

  getBooleanValue(
    row: any,
    column: ListTableColumn
  ):
    boolean
  {
    return !!row[column.field];
  }


  /* =====================================================
     BOOLEAN LABEL
  ====================================================== */

  getBooleanLabel(
    value: boolean
  ):
    string
  {
    return value
      ? 'Yes'
      : 'No';
  }


  /* =====================================================
     CURRENT SUBMENU ID
  ====================================================== */

  private getCurrentSubMenuId():
    number | null
  {
    return this.sidebarService
      .getCurrentNavigationContext()
      .subMenuId;
  }


  /* =====================================================
     VIEW PERMISSION
  ====================================================== */

  canViewRow():
    boolean
  {
    if (
      this.actions.view === false
    )
    {
      return false;
    }

    const subMenuId =
      this.getCurrentSubMenuId();

    if (
      subMenuId === null
    )
    {
      return false;
    }

    return this.effectiveAccessService
      .canView(
        subMenuId
      );
  }


  /* =====================================================
     UPDATE PERMISSION
  ====================================================== */

  canEditRow():
    boolean
  {
    if (
      this.actions.edit === false
    )
    {
      return false;
    }

    const subMenuId =
      this.getCurrentSubMenuId();

    if (
      subMenuId === null
    )
    {
      return false;
    }

    return this.effectiveAccessService
      .canUpdate(
        subMenuId
      );
  }


  /* =====================================================
     DELETE PERMISSION
  ====================================================== */

  canDeleteRow():
    boolean
  {
    if (
      this.actions.delete === false
    )
    {
      return false;
    }

    const subMenuId =
      this.getCurrentSubMenuId();

    if (
      subMenuId === null
    )
    {
      return false;
    }

    return this.effectiveAccessService
      .canDelete(
        subMenuId
      );
  }


  /* =====================================================
     ACTION EVENTS
  ====================================================== */

  onViewClick(
    row: any,
    event: MouseEvent
  ):
    void
  {
    event.stopPropagation();

    if (
      !this.canViewRow()
    )
    {
      return;
    }

    console.log(
      'VIEW CLICK',
      row
    );

    this.view.emit(
      row
    );
  }


  /* =====================================================
     SAVE RESTORE POINT CLICK
  ====================================================== */

  onSaveRestorePointClick(
    row: any,
    event: MouseEvent
  ):
    void
  {
    event.stopPropagation();

    console.log(
      'SAVE RESTORE POINT CLICK',
      row
    );

    this.saveRestorePoint.emit(
      row
    );
  }


  /* =====================================================
     OPERATION CLICK
  ====================================================== */

  onOperationClick(
    row: any,
    event: MouseEvent
  ):
    void
  {
    event.stopPropagation();

    console.log(
      'OPERATION CLICK',
      row
    );

    this.operation.emit(
      row
    );
  }


  /* =====================================================
     REGISTRATION CLICK
  ====================================================== */

  onRegistrationClick(
    row: any,
    event: MouseEvent
  ):
    void
  {
    event.stopPropagation();

    //=====================================================
    // A registered row must always be allowed to emit
    // the registration event.
    //
    // The parent component decides whether this event
    // means Register or Deregister.
    //
    // The registration lock applies only to an
    // unregistered row attempting registration.
    //
    // Database state does not block deregistration.
    //=====================================================

    if (
      row?.dbStatus
        ?.toLowerCase()
      !==
      'registered'
      &&
      this.isRegistrationDisabled(
        row
      )
    )
    {
      return;
    }

    console.log(
      'REGISTRATION CLICK',
      row
    );

    this.registration.emit(
      row
    );
  }


  /* =====================================================
     EDIT CLICK
  ====================================================== */

  onEditClick(
    row: any,
    event: MouseEvent
  ):
    void
  {
    event.stopPropagation();

    if (
      !this.canEditRow()
    )
    {
      return;
    }

    console.log(
      'EDIT CLICK',
      row
    );

    this.edit.emit(
      row
    );
  }


  /* =====================================================
     DELETE CLICK
  ====================================================== */

  onDeleteClick(
    row: any,
    event: MouseEvent
  ):
    void
  {
    event.stopPropagation();

    if (
      !this.canDeleteRow()
    )
    {
      return;
    }

    console.log(
      'DELETE CLICK',
      row
    );

    this.delete.emit(
      row
    );
  }


  /* =====================================================
     TRACK ROW
  ====================================================== */

  trackRow(
    index: number,
    row: any
  ):
    any
  {
    return
      row?.id
      ??
      index;
  }
}
