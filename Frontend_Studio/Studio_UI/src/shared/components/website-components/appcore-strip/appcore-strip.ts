//===============================================================
// Website : AppCore strip
// --------------------------------------------------------------
// The only AppCore mark on a dealer's website : one slim line
// under the footer.
//===============================================================

import
{
    Component
}
from '@angular/core';


@Component(
{
    selector:'app-appcore-strip',
    standalone:true,
    templateUrl:'./appcore-strip.html',
    styleUrl:'./appcore-strip.css'
})
export class AppcoreStripComponent
{
    readonly url =
        'https://www.appcoretechnologies.com';
}
