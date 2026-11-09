//===============================================================
// Backdrop click guard (2026-11-09)
//
// Every pop-up closes when its backdrop / overlay is clicked. A
// text selection that starts inside the pop-up (selecting or
// copying a value, dragging in a text box) and ends over the
// backdrop makes the browser fire that click on the backdrop,
// so the pop-up closed by itself.
//
// This guard, installed once in main.ts, drops such a click : the
// mouse went down inside the pop-up and came up on its backdrop.
// A real click on the backdrop (down and up on it) still closes
// the pop-up. Works for every page, nothing to change in them.
//===============================================================

const BACKDROP_CLASS =
    /(backdrop|overlay)/i;

let downTarget:
    Node | null =
    null;

export function installBackdropClickGuard():
    void
{
    if (typeof document === 'undefined')
    {
        return;
    }

    document.addEventListener
    (
        'mousedown',
        event =>
        {
            downTarget =
                event.target as Node | null;
        },
        true
    );

    document.addEventListener
    (
        'click',
        event =>
        {
            const target =
                event.target as HTMLElement | null;

            const down =
                downTarget;

            downTarget =
                null;

            if
            (
                !target
                ||
                !down
                ||
                down === target
                ||
                !(target instanceof HTMLElement)
            )
            {
                return;
            }

            const classes =
                typeof target.className === 'string'
                    ? target.className
                    : target.getAttribute('class') ?? '';

            if (!BACKDROP_CLASS.test(classes))
            {
                return;
            }

            // Pressed inside the pop-up, released on its backdrop
            if (target.contains(down))
            {
                event.stopImmediatePropagation();

                event.preventDefault();
            }
        },
        true
    );
}
