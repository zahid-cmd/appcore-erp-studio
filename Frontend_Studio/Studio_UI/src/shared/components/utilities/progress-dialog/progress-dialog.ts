import {
  Component,
  Input,
  inject,
  OnInit,
  OnDestroy
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import
{
    ProgressDialogService
}
from './progress-dialog.service';

@Component({
  selector: 'app-progress-dialog',

  standalone: true,

  imports: [
    CommonModule
  ],

  templateUrl:
    './progress-dialog.html',

  styleUrl:
    './progress-dialog.css'
})
export class ProgressDialogComponent
  implements OnInit, OnDestroy
{
  /* =====================================================
     INPUTS
  ====================================================== */

  @Input()
  previewMode = false;

  /* =====================================================
     INJECTION
  ====================================================== */

  progressService =
    inject(ProgressDialogService);

  /* =====================================================
     PREVIEW PROGRESS
  ====================================================== */

  previewProgress = 65;

  private direction = 1;

  private timer?: number;

  /* =====================================================
     INIT
  ====================================================== */

  ngOnInit(): void
  {
    if (!this.previewMode)
    {
      return;
    }

    this.timer =
      window.setInterval(() =>
      {
        this.previewProgress +=
          this.direction;

        if (
          this.previewProgress >= 95
        )
        {
          this.direction = -1;
        }

        if (
          this.previewProgress <= 45
        )
        {
          this.direction = 1;
        }

      }, 80);
  }

  /* =====================================================
     DESTROY
  ====================================================== */

  ngOnDestroy(): void
  {
    if (this.timer)
    {
      clearInterval(
        this.timer
      );
    }
  }
}