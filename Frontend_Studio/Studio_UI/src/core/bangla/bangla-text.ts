//===============================================================
// Bangla text in a WIN1252 database (2026-11-10)
//
// The database cannot hold Bangla, so the few fields that need it
// (PDI templates, PDI sheets) are stored escaped : every letter
// outside ASCII becomes ক ... . Pages decode on reading and
// encode before sending. Plain English passes unchanged.
//===============================================================

// ক... -> real letters
export function decodeBn
(
    value:
        string | null | undefined
):
    string
{
    return String(value ?? '')
        .replace(
            /\\u([0-9a-fA-F]{4})/g,
            (_match: string, hex: string) =>
                String.fromCharCode(parseInt(hex, 16))
        );
}

// Real letters -> ক... (ASCII only)
export function encodeBn
(
    value:
        string | null | undefined
):
    string
{
    let out =
        '';

    for (const ch of String(value ?? '').trim())
    {
        const code =
            ch.charCodeAt(0);

        out +=
            code < 128
                ? ch
                : '\\u' + code.toString(16).padStart(4, '0');
    }

    return out;
}
