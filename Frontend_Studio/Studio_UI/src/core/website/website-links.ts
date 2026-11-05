//===============================================================
// Website : link and format helpers
//===============================================================

// "+880 1812-114911" → "tel:+8801812114911"
export function telLink
(
    phone:
        string
):
    string
{
    const digits =
        (phone || '').replace(/[^\d+]/g, '');

    return digits
        ? `tel:${digits}`
        : '';
}

// WhatsApp chat link with an optional first message
export function whatsAppLink
(
    number:
        string,
    message:
        string = ''
):
    string
{
    let digits =
        (number || '').replace(/\D/g, '');

    // Local Bangladeshi number (01…) → country code 880
    if
    (
        digits.length === 11
        &&
        digits.startsWith('01')
    )
    {
        digits = '88' + digits;
    }

    if
    (
        !digits
    )
    {
        return '';
    }

    return message
        ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
        : `https://wa.me/${digits}`;
}

export function mailLink
(
    email:
        string
):
    string
{
    return (email || '').trim()
        ? `mailto:${email.trim()}`
        : '';
}

// A map link, else a map search for the address
export function mapLink
(
    mapUrl:
        string,
    address:
        string
):
    string
{
    if
    (
        (mapUrl || '').trim()
    )
    {
        return mapUrl.trim();
    }

    return (address || '').trim()
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address.trim())}`
        : '';
}

// 245000 → "2,45,000"
export function formatPrice
(
    value:
        number
):
    string
{
    return new Intl.NumberFormat(
        'en-IN',
        {
            maximumFractionDigits:0
        }
    )
    .format(value);
}

// Smooth scroll to a section of the page.
// Not scrollIntoView : that also scrolls html / body, which the
// ERP keeps at overflow:hidden; the whole app then stays pushed
// up (the website header, and later the ERP header, clipped).
// Only the nearest scrolling frame moves, minus the section's
// scroll-margin-top (room for the sticky header).
export function scrollToSection
(
    id:
        string
):
    void
{
    const element =
        document.getElementById(id);

    if
    (
        !element
    )
    {
        return;
    }

    const frame =
        scrollFrame(element);

    const margin =
        parseFloat(getComputedStyle(element).scrollMarginTop) || 0;

    if
    (
        frame
    )
    {
        const top =
            frame.scrollTop
            + element.getBoundingClientRect().top
            - frame.getBoundingClientRect().top
            - margin;

        frame.scrollTo({ top:Math.max(top, 0), behavior:'smooth' });
    }
    else
    {
        window.scrollTo(
            {
                top:Math.max(window.scrollY + element.getBoundingClientRect().top - margin, 0),
                behavior:'smooth'
            }
        );
    }

    resetDocumentScroll();
}


// Nearest ancestor that scrolls vertically (overflow auto / scroll)
function scrollFrame
(
    element:
        HTMLElement
):
    HTMLElement | null
{
    let current =
        element.parentElement;

    while
    (
        current
        &&
        current !== document.body
        &&
        current !== document.documentElement
    )
    {
        const overflow =
            getComputedStyle(current).overflowY;

        if
        (
            (overflow === 'auto' || overflow === 'scroll')
            &&
            current.scrollHeight > current.clientHeight
        )
        {
            return current;
        }

        current =
            current.parentElement;
    }

    return null;
}


// html / body must stay at the top : the ERP layout relies on it
export function resetDocumentScroll():
    void
{
    document.documentElement.scrollTop = 0;

    document.body.scrollTop = 0;
}

// Back to the top. The page may scroll in the window or in
// an element of the app shell, so every scrolled ancestor of
// the given element is scrolled back, plus the window.
export function scrollToTop
(
    from:
        HTMLElement | null
):
    void
{
    let element =
        from ?? null;

    while (element)
    {
        if
        (
            element.scrollTop > 0
            &&
            element !== document.body
            &&
            element !== document.documentElement
        )
        {
            element.scrollTo({ top:0, behavior:'smooth' });
        }

        element =
            element.parentElement;
    }

    resetDocumentScroll();
}


// "Model X 150 (2026)" → "model-x-150-2026"
export function slugify
(
    value:
        string
):
    string
{
    return (value || '')
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60);
}

// Price text for a bike : company text, else "৳ 2,45,000", else ''
export function priceLabel
(
    price:
        number | null,
    priceText:
        string,
    currency:
        string
):
    string
{
    if
    (
        priceText
    )
    {
        return priceText;
    }

    return price !== null
        ? `${currency} ${formatPrice(price)}`
        : '';
}

export const STOCK_LABELS:
    Record<string, string> =
    {
        'in-stock':'In stock',
        'few-left':'Few left',
        'pre-order':'Pre-order'
    };

// A section of the home page from any website page :
// on the home page it scrolls; elsewhere it opens the home
// page first, then scrolls once the section is there.
export function goToSection
(
    navigateHome:
        () => Promise<boolean>,
    onHome:
        boolean,
    id:
        string
):
    void
{
    if
    (
        onHome
    )
    {
        scrollToSection(id);

        return;
    }

    navigateHome().then
    (
        () =>
        {
            let tries =
                0;

            const timer =
                setInterval
                (
                    () =>
                    {
                        tries++;

                        if
                        (
                            document.getElementById(id)
                            ||
                            tries > 20
                        )
                        {
                            clearInterval(timer);

                            scrollToSection(id);
                        }
                    },
                    50
                );
        }
    );
}
