//===============================================================
// The four AppCore products, in the order the website shows them.
// Page content (modules, points, local cards) lives here; the
// Console's Products table gives the request form its list.
//===============================================================

export interface ProductPoint
{
    t: string;
    d: string;
}

export interface ProductModule
{
    id: string;
    icon: string;
    title: string;
    text: string;
    points: ProductPoint[];
}

export interface ProductLocal
{
    icon: string;
    title: string;
    text: string;
}

export interface ProductInfo
{
    slug: string;
    code: string;
    name: string;
    industry: string;
    icon: string;
    short: string;
    highlights: string[];
    heroTitle: string;
    heroText: string;
    modules: ProductModule[];
    localTitle: string;
    localText: string;
    local: ProductLocal[];
}

const TAX_CARD: ProductLocal = { icon: 'fas fa-receipt', title: 'VAT, GST or sales tax', text: 'Tax invoices, tax payable and tax payments posted with each sale, in your country\'s format.' };
const TAX_NO_CARD: ProductLocal = { icon: 'fas fa-building-columns', title: 'Tax numbers', text: 'Business and tax registration numbers on customers, suppliers and every document that needs them.' };
const CURRENCY_CARD: ProductLocal = { icon: 'fas fa-coins', title: 'Your currency', text: 'Prices, instalments and accounts in your own currency and number format.' };

const ACCOUNTS: ProductModule =
{
    id: 'accounts', icon: 'fas fa-scale-balanced', title: 'Accounts & tax',
    text: 'Every sale, purchase and payment posts its own journal : the books are always up to date.',
    points:
    [
        { t: 'Vouchers and journals', d: 'Receipts, payments, transfers and journals.' },
        { t: 'Trial balance', d: 'Live, by branch and financial year.' },
        { t: 'Tax payable', d: 'Posted with each sale; payments recorded.' },
        { t: 'Banks and cash', d: 'Bank, card, mobile wallet and cash accounts.' }
    ]
};

export const PRODUCTS: ProductInfo[] =
[
    // 1 ------------------------------------------------------------
    {
        slug: 'automobiles', code: 'AUTOMOBILE', name: 'AppCore Automobiles', industry: 'Car and commercial vehicle dealers', icon: 'fas fa-car',
        short: 'Showroom, workshop, parts and accounts for car, SUV, pickup and truck dealers, with every vehicle followed by its VIN.',
        highlights: ['Vehicle sales and trade-ins', 'Service workshop and job cards', 'Parts by model and variant', 'Registration per VIN'],
        heroTitle: 'Dealer management software for car and commercial vehicle dealers.',
        heroText: 'From the showroom floor to the workshop bay : vehicles, customers, service and accounts in one system, for one branch or a whole dealer network.',
        modules:
        [
            {
                id: 'sales', icon: 'fas fa-file-invoice-dollar', title: 'Sales & bookings',
                text: 'Quote, book and sell new and used vehicles with the right price, finance and extras.',
                points:
                [
                    { t: 'Quotations', d: 'Variant, colour, extras and finance on one quote.' },
                    { t: 'Bookings and advances', d: 'The vehicle held for the buyer until delivery.' },
                    { t: 'Finance and leasing', d: 'Bank and lease cases followed to approval.' },
                    { t: 'Trade-ins', d: 'Valued, received and put back on sale.' },
                    { t: 'Fleet and corporate sales', d: 'Companies, fleets and institutions.' },
                    { t: 'Delivery', d: 'Pre-delivery inspection, keys and papers.' }
                ]
            },
            {
                id: 'stock', icon: 'fas fa-warehouse', title: 'Vehicle stock',
                text: 'Every vehicle known by VIN, engine number, colour and location.',
                points:
                [
                    { t: 'Receiving by VIN', d: 'Against the purchase, unit by unit.' },
                    { t: 'Models and variants', d: 'Trims, colours, specifications and prices.' },
                    { t: 'Yards and branches', d: 'Transfers between showrooms and yards.' },
                    { t: 'Live stock', d: 'By model, variant, colour and age.' }
                ]
            },
            {
                id: 'workshop', icon: 'fas fa-screwdriver-wrench', title: 'Service & workshop',
                text: 'A workshop that knows every car it has ever serviced.',
                points:
                [
                    { t: 'Service bookings', d: 'Slots by bay and technician.' },
                    { t: 'Job cards', d: 'Labour, parts and approvals on one card.' },
                    { t: 'Warranty claims', d: 'Claims prepared and followed with the maker.' },
                    { t: 'Service history', d: 'Every visit, per VIN and per owner.' }
                ]
            },
            {
                id: 'parts', icon: 'fas fa-gears', title: 'Parts & accessories',
                text: 'Parts sold over the counter and issued to the workshop from the same stock.',
                points:
                [
                    { t: 'Parts catalogue', d: 'Part numbers, prices and pictures.' },
                    { t: 'Fitments', d: 'Which part fits which model and variant.' },
                    { t: 'Counter and workshop issue', d: 'One stock, two desks.' },
                    { t: 'Reorder', d: 'Minimum levels by branch.' }
                ]
            },
            {
                id: 'registration', icon: 'fas fa-id-card', title: 'Registration',
                text: 'From sale to number plate : every step and every paper, per VIN.',
                points:
                [
                    { t: 'Registration forms', d: 'Filled from the sale, ready to print.' },
                    { t: 'Documents', d: 'Invoices, letters and receipts in one place.' },
                    { t: 'Fees on the invoice', d: 'Collected with the sale.' },
                    { t: 'Status at a glance', d: 'What is pending, with whom, since when.' }
                ]
            },
            ACCOUNTS,
            {
                id: 'customers', icon: 'fas fa-users', title: 'Customers',
                text: 'Leads, test drives and follow-ups, so no buyer goes cold.',
                points:
                [
                    { t: 'Enquiries and test drives', d: 'Saved as leads with reminders.' },
                    { t: 'Customer files', d: 'Vehicles, visits and papers in one file.' },
                    { t: 'Service reminders', d: 'The next service, on time.' },
                    { t: 'Roles and branches', d: 'Each person sees only their own work.' }
                ]
            }
        ],
        localTitle: 'Set up for the way vehicles are sold where you are.',
        localText: 'Tax, vehicle registration, currency and document layouts are configured for your country during setup.',
        local:
        [
            TAX_CARD,
            { icon: 'fas fa-id-card', title: 'Vehicle registration', text: 'The forms and papers your registration authority asks for, tracked for every VIN.' },
            TAX_NO_CARD,
            CURRENCY_CARD
        ]
    },

    // 2 ------------------------------------------------------------
    {
        slug: 'two-wheelers', code: 'TWO-WHEELER', name: 'AppCore Two Wheelers', industry: 'Motorcycle and scooter dealers', icon: 'fas fa-motorcycle',
        short: 'Sales, bookings, stock, spare parts, registration, accounts and tax for motorcycle and scooter dealers.',
        highlights: ['Bikes, parts and accessories on one invoice', 'Receiving by chassis and engine number', 'Registration per chassis', 'Every showroom in one system'],
        heroTitle: 'Dealer management software for motorcycle and scooter dealers.',
        heroText: 'Built inside a working motorcycle dealership : every screen follows how bikes are really booked, sold, delivered, registered and accounted for, in one showroom or fifty.',
        modules:
        [
            {
                id: 'sales', icon: 'fas fa-file-invoice-dollar', title: 'Sales & bookings',
                text: 'Sell motorcycles, scooters, spare parts and accessories from one screen, with the right price card, discounts and gifts.',
                points:
                [
                    { t: 'One invoice for everything', d: 'Bikes, spare parts and accessories together.' },
                    { t: 'Quotations and returns', d: 'Quote, convert to a sale, return with stock back.' },
                    { t: 'Bookings', d: 'Advances, collections and cancellations.' },
                    { t: 'Instalments', d: 'Instalment sales with schedules and dues.' },
                    { t: 'Discounts and gifts', d: 'Campaign and special discounts, free accessories.' },
                    { t: 'Corporate sales', d: 'Companies, fleets and institutions.' }
                ]
            },
            {
                id: 'stock', icon: 'fas fa-truck-ramp-box', title: 'Purchase & stock',
                text: 'Receive bikes with chassis and engine numbers and always know what is where.',
                points:
                [
                    { t: 'Receiving', d: 'Against the purchase, unit by unit.' },
                    { t: 'CKD kits', d: 'Knocked-down kits and their documents.' },
                    { t: 'PDI and deliveries', d: 'Pre-delivery inspection before a bike leaves.' },
                    { t: 'Branch transfers', d: 'Stock moved between showrooms and stores.' },
                    { t: 'Models and specifications', d: 'Every model, colour and spec in one catalogue.' },
                    { t: 'Live stock', d: 'By branch, model and colour, at any moment.' }
                ]
            },
            {
                id: 'parts', icon: 'fas fa-gears', title: 'Spare parts',
                text: 'A parts counter that knows which part fits which bike.',
                points:
                [
                    { t: 'Parts catalogue', d: 'Part numbers, prices and pictures.' },
                    { t: 'Fitments', d: 'Which part fits which model.' },
                    { t: 'Counter sales', d: 'Fast sales for walk-in customers and mechanics.' },
                    { t: 'Stock by branch', d: 'Reorder before you run out.' }
                ]
            },
            {
                id: 'registration', icon: 'fas fa-id-card', title: 'Registration',
                text: 'From sale to number plate : every step and every paper, per chassis.',
                points:
                [
                    { t: 'Registration forms', d: 'Filled from the sale, ready to print.' },
                    { t: 'Documents portal', d: 'Tax documents, letters and receipts in one place.' },
                    { t: 'Registration on sale', d: 'Fees collected with the invoice.' },
                    { t: 'Status at a glance', d: 'What is pending, with whom, since when.' }
                ]
            },
            ACCOUNTS,
            {
                id: 'customers', icon: 'fas fa-users', title: 'Customers',
                text: 'Know every buyer and every enquiry, and follow up on time.',
                points:
                [
                    { t: 'Customer files', d: 'Papers and history in one file.' },
                    { t: 'Enquiries', d: 'Walk-ins and calls saved as leads.' },
                    { t: 'Follow-ups', d: 'Reminders so no lead goes cold.' },
                    { t: 'Team chat', d: 'Talk inside the system, by branch.' }
                ]
            },
            {
                id: 'control', icon: 'fas fa-shield-halved', title: 'Control',
                text: 'The owner decides how the business runs; the system makes it stick.',
                points:
                [
                    { t: 'Roles', d: 'Each person sees only their own work.' },
                    { t: 'Business rules', d: 'Turn rules on or off without new software.' },
                    { t: 'Branches', d: 'Switch branch in one click, or see all at once.' },
                    { t: 'Activity history', d: 'Who changed what, and when.' }
                ]
            }
        ],
        localTitle: 'Set up for the way bikes are sold where you are.',
        localText: 'Tax, vehicle registration, currency and document layouts are configured for your country during setup, so your invoices and returns look the way your authorities expect.',
        local:
        [
            TAX_CARD,
            { icon: 'fas fa-id-card', title: 'Vehicle registration', text: 'The forms and papers your registration authority asks for, tracked for every chassis.' },
            TAX_NO_CARD,
            CURRENCY_CARD
        ]
    },

    // 3 ------------------------------------------------------------
    {
        slug: 'real-estate', code: 'REAL-ESTATE', name: 'AppCore Real Estate', industry: 'Developers, builders and property companies', icon: 'fas fa-building',
        short: 'Projects, apartments and plots, bookings, instalments, construction costs, handover and accounts in one system.',
        highlights: ['Every unit and plot with its status', 'Booking to handover', 'Instalment schedules and dues', 'Cost by project'],
        heroTitle: 'Property development and sales software for real estate companies.',
        heroText: 'Projects, apartments and plots, buyers, instalments, construction costs and accounts : one system from the first site visit to the day the keys are handed over.',
        modules:
        [
            {
                id: 'projects', icon: 'fas fa-city', title: 'Projects & inventory',
                text: 'Every project, building, floor, unit and plot, with its price and status.',
                points:
                [
                    { t: 'Projects and buildings', d: 'Buildings, floors, units and plots.' },
                    { t: 'Unit status', d: 'Available, held, booked, sold, handed over.' },
                    { t: 'Price lists', d: 'By unit, floor, view and size.' },
                    { t: 'Parking and extras', d: 'Sold with the unit or on their own.' }
                ]
            },
            {
                id: 'sales', icon: 'fas fa-handshake', title: 'Bookings & sales',
                text: 'From enquiry to signed agreement, with every paper in the buyer\'s file.',
                points:
                [
                    { t: 'Enquiries and site visits', d: 'Leads with follow-up reminders.' },
                    { t: 'Bookings', d: 'Booking money and the unit held.' },
                    { t: 'Allotment and agreement', d: 'Letters and agreements printed from the sale.' },
                    { t: 'Transfers and cancellations', d: 'Name changes and refunds, recorded.' }
                ]
            },
            {
                id: 'collections', icon: 'fas fa-calendar-days', title: 'Instalments & collections',
                text: 'Every buyer\'s schedule, what is due and what is late.',
                points:
                [
                    { t: 'Payment schedules', d: 'By date or by construction stage.' },
                    { t: 'Due reminders', d: 'Before the date, not after.' },
                    { t: 'Receipts', d: 'Money received posted to the right unit.' },
                    { t: 'Buyer statements', d: 'Paid, due and late at a glance.' }
                ]
            },
            {
                id: 'construction', icon: 'fas fa-helmet-safety', title: 'Construction & purchase',
                text: 'Know what each project really costs while it is being built.',
                points:
                [
                    { t: 'Work orders', d: 'Contractors, scopes and rates.' },
                    { t: 'Contractor bills', d: 'Checked against the work done.' },
                    { t: 'Materials', d: 'Purchase and stock by site.' },
                    { t: 'Budget against actual', d: 'By project and by stage.' }
                ]
            },
            {
                id: 'handover', icon: 'fas fa-key', title: 'Handover & after-sales',
                text: 'Keys, deeds and service requests after the sale.',
                points:
                [
                    { t: 'Handover checklist', d: 'Nothing missed on the day.' },
                    { t: 'Deeds and registration', d: 'Papers tracked per unit.' },
                    { t: 'Service requests', d: 'Owners\' complaints followed to closure.' },
                    { t: 'Owners list', d: 'Who owns what, always current.' }
                ]
            },
            ACCOUNTS
        ],
        localTitle: 'Set up for the way property is sold where you are.',
        localText: 'Tax, property registration, currency and document layouts are configured for your country during setup.',
        local:
        [
            TAX_CARD,
            { icon: 'fas fa-file-signature', title: 'Property registration', text: 'Deeds, transfers and the papers your land or property office asks for, per unit.' },
            TAX_NO_CARD,
            CURRENCY_CARD
        ]
    },

    // 4 ------------------------------------------------------------
    {
        slug: 'consultancy', code: 'CONSULTANCY', name: 'AppCore Consultancy', industry: 'Consulting and professional service firms', icon: 'fas fa-briefcase',
        short: 'Clients, engagements, time, billing and accounts for consulting, audit, legal, engineering and advisory firms.',
        highlights: ['Client files and proposals', 'Engagements with deadlines', 'Timesheets and expenses', 'Fixed, hourly and retainer billing'],
        heroTitle: 'Practice management software for consulting firms.',
        heroText: 'Clients, engagements, time, billing and accounts for consulting, audit, legal, engineering and advisory firms : know which work pays and which deadlines are close.',
        modules:
        [
            {
                id: 'clients', icon: 'fas fa-address-book', title: 'Clients & proposals',
                text: 'Every client, contact, proposal and engagement letter in one file.',
                points:
                [
                    { t: 'Client files', d: 'Contacts, papers and history.' },
                    { t: 'Leads and proposals', d: 'From first call to signed engagement.' },
                    { t: 'Engagement letters', d: 'Printed from the proposal.' },
                    { t: 'Documents', d: 'Client papers kept with the client.' }
                ]
            },
            {
                id: 'engagements', icon: 'fas fa-diagram-project', title: 'Engagements & projects',
                text: 'Who is doing what, for which client, by when.',
                points:
                [
                    { t: 'Tasks and milestones', d: 'Planned, assigned and tracked.' },
                    { t: 'Deadlines', d: 'Filing and delivery dates never missed.' },
                    { t: 'Team assignment', d: 'The right people on each job.' },
                    { t: 'Progress', d: 'Status of every engagement at a glance.' }
                ]
            },
            {
                id: 'time', icon: 'fas fa-stopwatch', title: 'Time & expenses',
                text: 'Hours and costs recorded against the work they belong to.',
                points:
                [
                    { t: 'Timesheets', d: 'By client, engagement and task.' },
                    { t: 'Approvals', d: 'Checked before they are billed.' },
                    { t: 'Billable and non-billable', d: 'Kept apart, measured.' },
                    { t: 'Expense claims', d: 'Re-billed to the client where agreed.' }
                ]
            },
            {
                id: 'billing', icon: 'fas fa-file-invoice-dollar', title: 'Billing & collections',
                text: 'Bill the way each client is engaged, and collect on time.',
                points:
                [
                    { t: 'Fixed fee and hourly', d: 'From the engagement and the timesheets.' },
                    { t: 'Retainers and milestones', d: 'Billed on schedule.' },
                    { t: 'Dues and reminders', d: 'Who owes what, since when.' },
                    { t: 'Receipts', d: 'Posted against the right invoice.' }
                ]
            },
            ACCOUNTS,
            {
                id: 'team', icon: 'fas fa-user-tie', title: 'Team & control',
                text: 'See how the firm\'s time is used, and keep each client\'s work private.',
                points:
                [
                    { t: 'Utilisation', d: 'Billable hours by person and team.' },
                    { t: 'Profit by client', d: 'Fees against the time spent.' },
                    { t: 'Roles', d: 'Each person sees only their own clients.' },
                    { t: 'Activity history', d: 'Who changed what, and when.' }
                ]
            }
        ],
        localTitle: 'Set up for the way your firm works where you are.',
        localText: 'Tax, currency and document layouts are configured for your country during setup.',
        local:
        [
            TAX_CARD,
            { icon: 'fas fa-percent', title: 'Withholding tax', text: 'Tax deducted by clients recorded against each receipt, where your country uses it.' },
            TAX_NO_CARD,
            CURRENCY_CARD
        ]
    }
];

export function productBySlug(slug: string | undefined | null): ProductInfo
{
    return PRODUCTS.find(p => p.slug === slug) ?? PRODUCTS[1];
}

export function productByCode(code: string | undefined | null): ProductInfo | undefined
{
    return PRODUCTS.find(p => p.code === code);
}
