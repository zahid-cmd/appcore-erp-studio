/* =====================================================
   IMPORTS
===================================================== */

import
{
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges
}
from '@angular/core';

import
{
  CommonModule
}
from '@angular/common';

import
{
    OrbitLoaderComponent
}
from '../../utilities/orbit-loader/orbit-loader';

import
{
  EmptyStateComponent
}
from '../empty-state/empty-state';


/* =====================================================
   COLUMN TYPES
===================================================== */

export type ListTableColumnType =
  | 'text'
  | 'serial'
  | 'status'
  | 'boolean'
  | 'operation'
  | 'actions';


/* =====================================================
   COLUMN ALIGNMENT
===================================================== */

export type ListTableAlign =
  | 'left'
  | 'center'
  | 'right';


/* =====================================================
   COLUMN
===================================================== */

export interface ListTableColumn
{
  header: string;

  field: string;

  width?: string;

  align?: ListTableAlign;

  type?: ListTableColumnType;

  sortable?: boolean;
}


/* =====================================================
   ACTIONS
===================================================== */

export interface ListTableActions
{
  view?: boolean;

  edit?: boolean;

  delete?: boolean;
}


/* =====================================================
   COMPONENT
===================================================== */

@Component(
{
  selector: 'app-list-table',

  standalone: true,

  imports:
  [
    CommonModule,
    EmptyStateComponent,
    OrbitLoaderComponent
  ],

  templateUrl: './list-table.html',

  styleUrl: './list-table.css',

  host:
  {
    class: 'list-table-host'
  },

  changeDetection:
    ChangeDetectionStrategy.OnPush
})
export class ListTableComponent
implements OnChanges
{

  /* =====================================================
     INPUTS
  ===================================================== */

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
  actions: ListTableActions =
  {
      view: true,

      edit: true,

      delete: true
  };


  /* =====================================================
     REGISTRATION VISIBILITY

     Default:
     Registration is hidden.

     Controls only the Register / Deregister button.
  ===================================================== */

  @Input()
  showRegistration = false;


  /* =====================================================
     MIGRATION VISIBILITY

     Default:
     Migration is hidden.

     Controls only the Create / Remove Migration button.
  ===================================================== */

  @Input()
  showMigration = false;


  /* =====================================================
     DATABASE VISIBILITY

     Default:
     Database is hidden.

     Controls only the Create / Remove Database button.
  ===================================================== */

  @Input()
  showDatabase = false;


  /* =====================================================
     REGISTRATION STATE

     Registration availability is determined only from
     the actual synchronization workflow state.

     A registration lock exists when another row is:

         1. Synchronized
         2. Registered
         3. Database table not yet created

     While that pending registration exists, all OTHER
     unregistered registration controls are disabled.

     IMPORTANT:

         migrationCreated

     has absolutely no effect on registration state.

     Creating or removing a migration must not enable,
     disable, register, deregister, or otherwise modify
     registration controls.

     IMPORTANT:

         A currently registered row is NEVER blocked by
         the global registration lock.

     The global lock applies only when the current row
     itself is attempting to become registered.
  ===================================================== */

  isRegistrationDisabled
  (
      row: any
  ):
      boolean
  {
      //=====================================================
      // A registered row is performing DEREGISTRATION.
      //
      // It must not be blocked by another pending row.
      //
      // Deregistration is allowed only when the database
      // table does not exist.
      //=====================================================

      if
      (
          row?.dbStatus
              ?.toLowerCase()
          ===
          'registered'
      )
      {
          return (
              row?.databaseCreated === true
          );
      }


      //=====================================================
      // An unregistered row with an existing database table
      // cannot be registered.
      //=====================================================

      if
      (
          row?.databaseCreated === true
      )
      {
          return true;
      }


      //=====================================================
      // GLOBAL REGISTRATION LOCK
      //
      // Only an UNREGISTERED row is subject to this lock.
      //
      // If another backend submenu is currently:
      //
      //     Synchronized
      //     +
      //     Registered
      //     +
      //     Database NOT Created
      //
      // registration of this unregistered row is blocked.
      //
      // Once that database is successfully created,
      // databaseCreated becomes true and the lock is
      // released for the other rows.
      //=====================================================

      return this.rows.some(
          currentRow =>
          {
              if
              (
                  this.isSameRow(
                      currentRow,
                      row
                  )
              )
              {
                  return false;
              }


              return this.isPendingRegistration(
                  currentRow
              );
          }
      );
  }


  /* =====================================================
     PENDING REGISTRATION

     A pending registration exists when a row is:

         1. Synchronized
         2. Registered
         3. Database table not yet created

     migrationCreated is intentionally not checked here.

     Migration state and Database state are completely
     independent.
  ===================================================== */

  private isPendingRegistration
  (
      row: any
  ):
      boolean
  {
      return (
          row?.status
              ?.toLowerCase()
          ===
          'synchronized'

          &&

          row?.dbStatus
              ?.toLowerCase()
          ===
          'registered'

          &&

          row?.databaseCreated
          !==
          true
      );
  }


  /* =====================================================
     SAME ROW

     Uses object reference first.

     If an ID is available, it is also used so the
     registration lock remains correct when row objects
     are refreshed or replaced.
  ===================================================== */

  private isSameRow
  (
      firstRow: any,

      secondRow: any
  ):
      boolean
  {
      if
      (
          firstRow === secondRow
      )
      {
          return true;
      }


      if
      (
          firstRow?.id !== undefined
          &&
          firstRow?.id !== null
          &&
          secondRow?.id !== undefined
          &&
          secondRow?.id !== null
      )
      {
          return (
              firstRow.id
              ===
              secondRow.id
          );
      }


      return false;
  }


  /* =====================================================
     OUTPUTS
  ===================================================== */

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
      new EventEmitter<
      {
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
     MIGRATION
  ===================================================== */

  @Output()
  migration =
      new EventEmitter<any>();


  /* =====================================================
     DATABASE

     Database execution is handled by the parent
     Code Synchronization component.

     This component only emits the selected row.

     Flow:

         Database Button
              ↓
         onDatabaseClick()
              ↓
         database.emit(row)
              ↓
         Parent database(row)
              ↓
         Confirm Dialog
              ↓
         Backend Database Creation / Removal
  ===================================================== */

  @Output()
  database =
      new EventEmitter<any>();


  @Output()
  commandCenter =
      new EventEmitter<any>();


  @Output()
  commandServer =
      new EventEmitter<any>();


  /* =====================================================
     CHANGES
  ===================================================== */

  ngOnChanges(
      changes: SimpleChanges
  ):
      void
  {
      if
      (
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


      if
      (
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


      if
      (
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
  ===================================================== */

  sortField = '';


  sortDirection:
      'asc'
      |
      'desc'
      =
      'asc';


  /* =====================================================
     SORT
  ===================================================== */

  sort
  (
      column: ListTableColumn
  ):
      void
  {
      if
      (
          column.type === 'serial'
          ||
          column.type === 'actions'
          ||
          column.type === 'operation'
      )
      {
          return;
      }


      if
      (
          this.sortField ===
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


      this.sortChange.emit(
      {
          field:
              this.sortField,

          direction:
              this.sortDirection
      });
  }


  /* =====================================================
     SERIAL
  ===================================================== */

  getSerial
  (
      index: number
  ):
      number
  {
      return this.serialOffset + index + 1;
  }


  /* =====================================================
     CELL VALUE
  ===================================================== */

  getCellValue
  (
      row: any,

      column: ListTableColumn
  ):
      any
  {
      return row[column.field];
  }


  /* =====================================================
     STATUS VALUE
  ===================================================== */

  getStatusValue
  (
      row: any,

      column: ListTableColumn
  ):
      string
  {
      const value =
          row[column.field];


      if
      (
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
  ===================================================== */

  getStatusClass
  (
      row: any,

      column: ListTableColumn
  ):
      string
  {
      const value =
          this.getStatusValue(
              row,
              column
          )
          .toLowerCase();


      switch
      (
          value
      )
      {
          case 'active':

          case 'completed':

          case 'success':

              return 'active';


          case 'pending':

          case 'running':

          case 'processing':

              return 'pending';


          case 'inactive':

          case 'failed':

          case 'error':

              return 'inactive';


          case 'not applicable':

              return 'neutral';


          default:

              return 'neutral';
      }
  }


  /* =====================================================
     BOOLEAN VALUE
  ===================================================== */

  getBooleanValue
  (
      row: any,

      column: ListTableColumn
  ):
      boolean
  {
      return !!row[column.field];
  }


  /* =====================================================
     BOOLEAN LABEL
  ===================================================== */

  getBooleanLabel
  (
      value: boolean
  ):
      string
  {
      return value
          ? 'Yes'
          : 'No';
  }


  /* =====================================================
     ACTION EVENTS
  ===================================================== */

  onViewClick
  (
      row: any,

      event: MouseEvent
  ):
      void
  {
      event.stopPropagation();


      console.log(
          'VIEW CLICK',
          row
      );


      this.view.emit(
          row
      );
  }


  /* =====================================================
     OPERATION CLICK
  ===================================================== */

  onOperationClick
  (
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
  ===================================================== */

  onRegistrationClick
  (
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
      //=====================================================

      if
      (
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
     MIGRATION CLICK

     Migration state is independent from:

         Registration
         Database Creation

     This method only emits the selected row.

     It does not modify:

         dbStatus
         registration state
         databaseCreated
  ===================================================== */

  onMigrationClick
  (
      row: any,

      event: MouseEvent
  ):
      void
  {
      event.stopPropagation();


      console.log(
          'MIGRATION CLICK',
          row
      );


      this.migration.emit(
          row
      );
  }


  /* =====================================================
     DATABASE CLICK

     Database state is controlled by the parent.

     This method only emits the selected row.

     The button itself remains protected by the template
     eligibility rule:

         synchronized
         +
         registered
         +
         migrationCreated === true

     Once the button is enabled, the event is emitted to
     the parent Code Synchronization component.

     The parent then decides whether to:

         Create Database
         or
         Remove Database

     and opens the Confirm Dialog before execution.
  ===================================================== */

  onDatabaseClick
  (
      row: any,

      event: MouseEvent
  ):
      void
  {
      event.stopPropagation();


      console.log(
          'DATABASE CLICK',
          row
      );


      this.database.emit(
          row
      );
  }


  /* =====================================================
     EDIT CLICK
  ===================================================== */

  onEditClick
  (
      row: any,

      event: MouseEvent
  ):
      void
  {
      event.stopPropagation();


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
  ===================================================== */

  onDeleteClick
  (
      row: any,

      event: MouseEvent
  ):
      void
  {
      event.stopPropagation();


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
  ===================================================== */

  trackRow
  (
      index:
          number,

      row:
          any
  ):
      any
  {
      return
          row?.id
          ??
          index;
  }

}