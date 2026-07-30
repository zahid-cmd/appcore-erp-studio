import
{
  Component,
  Input,
  Output,
  EventEmitter
}
from '@angular/core';

import
{
  CommonModule
}
from '@angular/common';

@Component({
  selector: 'app-form-section',

  standalone: true,

  imports:
  [
    CommonModule
  ],

  templateUrl: './form-section.html',

  styleUrl: './form-section.css'
})
export class FormSectionComponent
{
  /* =====================================================
     INPUTS
  ====================================================== */

  @Input()
  title = '';

  @Input()
  subtitle = '';

  @Input()
  icon = '';

  @Input()
  showHeader = true;

  @Input()
  collapsible = false;

  @Input()
  collapsed = false;

  /* =====================================================
     OUTPUTS
  ====================================================== */

  @Output()
  collapsedChange =
    new EventEmitter<boolean>();

  /* =====================================================
     TOGGLE
  ====================================================== */

  toggleCollapse(): void
  {
    if (!this.collapsible)
    {
      return;
    }

    this.collapsed =
      !this.collapsed;

    this.collapsedChange.emit(
      this.collapsed
    );
  }
}