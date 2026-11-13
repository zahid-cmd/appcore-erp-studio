//===============================================================
// Text Guard
//
// The database is UTF8 (2026-11-13) : Bangla, emoji and every
// language are stored as typed. Only control characters (which
// the database refuses) are dropped while the user types; the
// short note then shows "Not allowed".
//===============================================================

export function isStorableChar(c: string): boolean
{
    const code =
        c.codePointAt(0) ?? 0;

    return code === 9
        || code === 10
        || code === 13
        || (code >= 0x20 && code !== 0x7F);
}

// The text without the characters that cannot be saved
export function storableText(text: string): string
{
    let result = '';

    for (const c of text)
    {
        if (isStorableChar(c))
        {
            result += c;
        }
    }

    return result;
}

// Removes them from an input / textarea in place, keeping the
// cursor where the user is typing; true when something was removed
export function guardElement(element: HTMLInputElement | HTMLTextAreaElement): boolean
{
    const original =
        element.value;

    const cleaned =
        storableText(original);

    if (cleaned === original)
    {
        return false;
    }

    const caret =
        element.selectionStart ?? cleaned.length;

    // characters removed before the caret
    const before =
        original.slice(0, caret);

    const kept =
        storableText(before).length;

    element.value =
        cleaned;

    try
    {
        element.setSelectionRange(kept, kept);
    }
    catch
    {
        // number / email inputs have no selection
    }

    return true;
}
