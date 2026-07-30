import
{
  Component,
  EventEmitter,
  Input,
  Output
}
from '@angular/core';

import
{
  CommonModule
}
from '@angular/common';

@Component(
{
  selector:'app-command-center',

  standalone:true,

  imports:
  [
    CommonModule
  ],

  templateUrl:
    './command-center.html',

  styleUrl:
    './command-center.css'
})

export class CommandCenterComponent
{
  /* =====================================================
     LEFT COMMAND 1
  ====================================================== */

  @Input() command1Text = '';

  @Input() command1Icon = '';

  @Input() command1Visible = true;

  @Output() command1Click =
    new EventEmitter<void>();

  /* =====================================================
     LEFT COMMAND 2
  ====================================================== */

  @Input() command2Text = '';

  @Input() command2Icon = '';

  @Input() command2Visible = true;

  @Output() command2Click =
    new EventEmitter<void>();

  /* =====================================================
     LEFT COMMAND 3
  ====================================================== */

  @Input() command3Text = '';

  @Input() command3Icon = '';

  @Input() command3Visible = true;

  @Output() command3Click =
    new EventEmitter<void>();

  /* =====================================================
     RIGHT COMMAND
  ====================================================== */

  @Input() rightCommandIcon = '';

  @Input() rightCommandVisible = true;

  @Output() rightCommandClick =
    new EventEmitter<void>();

  /* =====================================================
     LEFT COMMAND 1 CLICK
  ====================================================== */

  onCommand1Click():
    void
  {
    this.command1Click.emit();
  }

  /* =====================================================
     LEFT COMMAND 2 CLICK
  ====================================================== */

  onCommand2Click():
    void
  {
    this.command2Click.emit();
  }

  /* =====================================================
     LEFT COMMAND 3 CLICK
  ====================================================== */

  onCommand3Click():
    void
  {
    this.command3Click.emit();
  }

  /* =====================================================
     RIGHT COMMAND CLICK
  ====================================================== */

  onRightCommandClick():
    void
  {
    this.rightCommandClick.emit();
  }
}