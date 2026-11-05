//===============================================================
// Text Guard
//
// The database stores text in Windows-1252 (English letters,
// digits, common symbols and Western accents). Anything else -
// Bangla, emoji, arrows such as "→" - cannot be saved, so the
// text controls drop it while the user types and show a short
// "English only" note.
//===============================================================

// Windows-1252 characters outside Latin-1 (0x80-0x9F block)
const WIN1252_EXTRA =
    new Set<string>(
        Array.from('€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ')
    );

export function isStorableChar(c: string): boolean
{
    const code =
        c.codePointAt(0) ?? 0;

    return code === 9
        || code === 10
        || code === 13
        || (code >= 0x20 && code <= 0x7E)
        || (code >= 0xA0 && code <= 0xFF)
        || WIN1252_EXTRA.has(c);
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
