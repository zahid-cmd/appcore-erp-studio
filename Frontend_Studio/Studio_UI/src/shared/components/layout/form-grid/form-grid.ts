import
{
  Component,
  HostBinding,
  Input
}
from '@angular/core';

import
{
  CommonModule
}
from '@angular/common';

@Component({
  selector: 'app-form-grid',

  standalone: true,

  imports:
  [
    CommonModule
  ],

  templateUrl: './form-grid.html',

  styleUrl: './form-grid.css'
})
export class FormGridComponent
{
  /* =====================================================
     COLUMNS
  ====================================================== */

  @Input()
  columns = 4;

  /* =====================================================
     GAP
  ====================================================== */

  @Input()
  gap = '20px';

  /* =====================================================
     STRETCH HEIGHT
  ====================================================== */

  @Input()
  stretchHeight = false;

  /* =====================================================
     GRID TEMPLATE
  ====================================================== */

  get gridTemplateColumns(): string
  {
    return `repeat(${this.columns}, minmax(0, 1fr))`;
  }

  /* =====================================================
     HOST STYLE
  ====================================================== */

  @HostBinding('style.display')
  display = 'block';
}