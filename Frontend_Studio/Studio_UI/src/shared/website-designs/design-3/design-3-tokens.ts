//===============================================================
// Design 3 : token sheet
// --------------------------------------------------------------
// Nothing to show : its stylesheet (no view encapsulation)
// recolours the frame and every shared part while Design 3 is
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
    selector:'app-website-tokens-3',
    standalone:true,
    template:'',
    styleUrl:'./design-3-tokens.css',
    encapsulation:ViewEncapsulation.None
})
export class Design3Tokens
{
}
