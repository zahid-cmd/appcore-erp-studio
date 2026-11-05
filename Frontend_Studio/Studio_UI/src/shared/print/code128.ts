//===============================================================
// Code-128 barcode (built in, no package)
//
// Subset B (every printable ASCII character, 32 – 126) with the
// modulo-103 check symbol. Returns the bar / space widths or an
// inline SVG that stretches to its box (the quiet zone is inside
// the SVG), for the label templates.
//
//   code128Svg('SP00100100002B1234')
//
// Symbol : Start B (104) · data · check · Stop (106, 13 modules).
// Check  : (104 + Σ value × position) mod 103, position from 1.
//===============================================================


//---------------------------------------------------------------
// Patterns : the widths of bar, space, bar, space, bar, space
// (11 modules) of symbols 0 – 105; 106 is the stop (bar, space,
// bar, space, bar, space, bar : 13 modules)
//---------------------------------------------------------------

const PATTERNS:
    string[] =
[
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
    '114131', '311141', '411131', '211412', '211214', '211232', '2331112'
];

const START_B =
    104;

const STOP =
    106;

// Quiet zone each side (modules) : the standard asks for 10
const QUIET_ZONE =
    10;


//---------------------------------------------------------------
// Symbol values : Start B, data, check, Stop. A character outside
// subset B (below 32, above 126, non-ASCII) is sent as '?'.
//---------------------------------------------------------------

export function code128Values
(
    text:
        string
):
    number[]
{
    const values:
        number[] =
        [START_B];

    for
    (
        const ch of String(text ?? '')
    )
    {
        let code =
            ch.charCodeAt(0);

        if
        (
            ch.length !== 1 || code < 32 || code > 126
        )
        {
            code = 63;
        }

        values.push(code - 32);
    }

    let sum =
        START_B;

    for
    (
        let i = 1;
        i < values.length;
        i++
    )
    {
        sum += values[i] * i;
    }

    values.push(sum % 103);

    values.push(STOP);

    return values;
}


//---------------------------------------------------------------
// Widths : bar, space, bar, space ... (starts and ends with a bar)
//---------------------------------------------------------------

export function code128Widths
(
    text:
        string
):
    number[]
{
    const widths:
        number[] = [];

    code128Values(text).forEach
    (
        value =>
        {
            for
            (
                const digit of PATTERNS[value]
            )
            {
                widths.push(Number(digit));
            }
        }
    );

    return widths;
}

// Modules of the symbol (without the quiet zones)
export function code128Modules
(
    text:
        string
):
    number
{
    return code128Widths(text).reduce((sum, x) => sum + x, 0);
}


//---------------------------------------------------------------
// Inline SVG : stretches to its box (width × height of the
// container); bars are whole modules, quiet zone included
//---------------------------------------------------------------

export function code128Svg
(
    text:
        string,
    color:
        string =
        '#000000',
    quietZone:
        number =
        QUIET_ZONE
):
    string
{
    const widths =
        code128Widths(text);

    const modules =
        widths.reduce((sum, x) => sum + x, 0);

    const full =
        modules + quietZone * 2;

    let x =
        quietZone;

    let path =
        '';

    widths.forEach
    (
        (width, index) =>
        {
            // Even positions are bars
            if
            (
                index % 2 === 0
            )
            {
                path += `M${x},0h${width}v1h-${width}z`;
            }

            x += width;
        }
    );

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${full} 1" width="100%" height="100%" preserveAspectRatio="none" shape-rendering="crispEdges"><rect width="${full}" height="1" fill="#ffffff"/><path d="${path}" fill="${color}"/></svg>`;
}
