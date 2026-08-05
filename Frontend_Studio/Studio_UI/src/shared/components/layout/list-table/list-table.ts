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
     OUTPUTS
  ===================================================== */

  @Output()
  view = new EventEmitter<any>();

  @Output()
  edit = new EventEmitter<any>();

  @Output()
  delete = new EventEmitter<any>();

  @Output()
  sortChange =
      new EventEmitter<
      {
          field: string;
          direction: 'asc' | 'desc';
      }>();

  @Output()
  operation = new EventEmitter<any>();

  @Output()
  commandCenter = new EventEmitter<any>();

  @Output()
  commandServer = new EventEmitter<any>();


  /* =====================================================
    CHANGES
  ===================================================== */

  ngOnChanges(
      changes: SimpleChanges
  ): void
  {
      if (changes['loading'])
      {
          console.log('==============================');
          console.log('LIST TABLE LOADING');
          console.log(this.loading);
          console.log('==============================');
      }

      if (changes['error'])
      {
          console.log('==============================');
          console.log('LIST TABLE ERROR');
          console.log(this.error);
          console.log('==============================');
      }

      if (changes['rows'])
      {
          console.log('==============================');
          console.log('LIST TABLE RECEIVED ROWS');
          console.log(this.rows);
          console.log('Rows Length:', this.rows.length);
          console.log('==============================');
      }
  }

  /* =====================================================
     SORT STATE
  ===================================================== */

  sortField = '';

  sortDirection:
    'asc' | 'desc' = 'asc';


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
          column.type === 'serial' ||
          column.type === 'actions' ||
          column.type === 'operation'
      )
      {
          return;
      }

      if
      (
          this.sortField === column.field
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
          field: this.sortField,
          direction: this.sortDirection
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

      switch (value)
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

  onViewClick(
    row:any,

    event:MouseEvent
  ):
    void
  {
    event.stopPropagation();

    console.log(
      'VIEW CLICK',
      row
    );

    this.view.emit(row);
  }

  /* =====================================================
     OPERATION CLICK
  ===================================================== */

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

    this.operation.emit(row);
  }

  //===========================================================
  // EDIT CLICK
  //===========================================================

  onEditClick(
    row:any,

    event:MouseEvent
  ):
    void
  {
    event.stopPropagation();

    console.log(
      'EDIT CLICK',
      row
    );

    this.edit.emit(row);
  }



  //===========================================================
  // DELETE CLICK
  //===========================================================

  onDeleteClick(
    row:any,

    event:MouseEvent
  ):
    void
  {
    event.stopPropagation();

    console.log(
      'DELETE CLICK',
      row
    );

    this.delete.emit(row);
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
    return row?.id ?? index;
  }
}