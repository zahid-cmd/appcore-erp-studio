//===============================================================
// Design 2 : token sheet
// --------------------------------------------------------------
// Nothing to show : its stylesheet (no view encapsulation)
// recolours the frame and every shared part while Design 2 is
// in use. Lives in this design's own chunk.
//===============================================================

import
{
    Component,
    ViewEncapsulation
}
from '@angular/core';


@Component(
{
    selector:'app-website-tokens-2',
    standalone:true,
    template:'',
    styleUrl:'./design-2-tokens.css',
    encapsulation:ViewEncapsulation.None
})
export class Design2Tokens
{
}
