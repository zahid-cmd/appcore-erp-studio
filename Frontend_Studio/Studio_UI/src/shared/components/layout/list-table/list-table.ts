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
  SimpleChanges
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
  | 'actions';


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

  @Input()
  columns: ListTableColumn[] = [];

  @Input()
  rows: any[] = [];

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
    if (
      changes['loading']
    )
    {
      console.log(
        '=============================='
      );

      console.log(
        'LIST TABLE LOADING'
      );

      console.log(
        this.loading
      );

      console.log(
        '=============================='
      );
    }

    if (
      changes['error']
    )
    {
      console.log(
        '=============================='
      );

      console.log(
        'LIST TABLE ERROR'
      );

      console.log(
        this.error
      );

      console.log(
        '=============================='
      );
    }

    if (
      changes['rows']
    )
    {
      console.log(
        '=============================='
      );

      console.log(
        'LIST TABLE RECEIVED ROWS'
      );

      console.log(
        this.rows
      );

      console.log(
        'Rows Length:',
        this.rows.length
      );

      console.log(
        '=============================='
      );
    }
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
        return 'active';

      case 'pending':
      case 'running':
      case 'processing':
        return 'pending';

      case 'inactive':
      case 'failed':
      case 'error':
      case 'cancelled':
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