import {
  Component,
  Input,
  inject,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef
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

  /* =====================================================
     CENTRE OVER THE PAGE AREA

     The overlay is position:fixed and skips the sidebar with
     padding. When a page wrapper creates its own containing
     block (transform / filter), the overlay already starts at
     the page area : the padding would push the dialog right of
     the centre, so it is dropped (class in-page-area).
  ====================================================== */

  @ViewChild('overlay')
  set overlay(ref: ElementRef<HTMLElement> | undefined)
  {
    const el =
      ref?.nativeElement;

    if (!el || this.previewMode)
    {
      return;
    }

    el.classList.toggle(
      'in-page-area',
      el.getBoundingClientRect().left > 1
    );
  }

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