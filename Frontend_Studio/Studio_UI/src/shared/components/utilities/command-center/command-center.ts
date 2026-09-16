import
{
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
implements OnChanges
{
  /* =====================================================
     PREVIEW MODE
  ====================================================== */

  @Input()
  previewMode =
    false;


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
     CHANGES
  ====================================================== */

  ngOnChanges
  (
    changes:
      SimpleChanges
  ):
    void
  {
    if
    (
      changes['previewMode']
      &&
      this.previewMode
    )
    {
      this.applyPreviewData();
    }
  }


  /* =====================================================
     PREVIEW DATA
  ====================================================== */

  private applyPreviewData():
    void
  {
    this.command1Text =
      'Add';

    this.command1Icon =
      'fas fa-plus';

    this.command1Visible =
      true;


    this.command2Text =
      'Refresh';

    this.command2Icon =
      'fas fa-rotate-right';

    this.command2Visible =
      true;


    this.command3Text =
      'Restore';

    this.command3Icon =
      'fas fa-trash-arrow-up';

    this.command3Visible =
      true;


    this.rightCommandIcon =
      'fas fa-clock-rotate-left';

    this.rightCommandVisible =
      true;
  }


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