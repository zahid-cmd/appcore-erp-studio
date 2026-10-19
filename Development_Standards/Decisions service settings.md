# Decision: Service Settings (brand-wise service structure)

Status: **Locked** 2026-10-19 (not built yet).

## Business background
Two-wheeler dealership ERP (sales, service, spare parts, accessories). The dealer may run service centers for several brands. Each brand has its own:
- warranty and service policy (number of free and paid scheduled services);
- labour / service chart that must be followed strictly for job cards and billing.
Free services are reimbursed by the brand (mother company) at a reduced amount → the dealer books a receivable from the brand and income on the service head. The dealer also has its own customized packages and membership plans.

## Pages (Settings › Service Settings)
Chart of Services · Service Policy · Service Category · Service Sub Category · Scheduled Services · Labor Chart · Customized Services · Membership Services.

## Structure (locked 2026-10-19)
Two kinds of Service Category:

| Category Type | Brand | Name | Sub Category Types allowed |
|---|---|---|---|
| **Brand Services** | Required, one per brand | "<Brand> Services" (read-only) | **Labor Chart**, **Scheduled Services** — totally brand-controlled |
| **Dealer Services** | None | Typed (e.g. "General Services") | **Customized Services**, **Membership Services** — dealer-end, apply to all brands |

Every service that is not a brand Labor Chart operation or a brand Scheduled Service goes under **Customized Services** (dealer level, any brand).

```
Yadea Services (Brand)        SV-001     → Account Group
 └ Yadea Labor Chart           SV-001-001 → Account Sub Group
     └ Full Servicing 100-125cc  SV-001-001-00001 → General Ledger
 └ Yadea Scheduled Services    SV-001-002

General Services (Dealer)      SV-00n
 └ Customized Services         SV-00n-001
     └ Free Wash + Air Check     SV-00n-001-00001
 └ Membership Services         SV-00n-002
```
- Category code `SV-nnn`; Category Type locked after saving.
- Sub Category = Category + Sub Category Type (only the types allowed for that category type); name "<Brand> <Type>" for brand categories, typed for dealer categories; code `<category>-sss`; created by the user (not auto).
- **Items (all service charges)** live on the four item pages; each page offers only sub categories of its own type; code `<sub category>-nnnnn`.
- **Membership**: dealer-end; Membership Services here define the service charges only; a separate **Membership module** (later) holds the plans and links these charges.
- **Service Policy**: one per brand — warranty months / km, number of free and paid scheduled services, claim receivable, status.
- **Chart of Services**: read-only clone of Chart of Inventory (Category → Sub Category → items) with print.

## Item pages
- **Labor Chart**: Section (Engine, Electrical, Brakes… — a field, not a level), Operation Name, Standard Time, Rate, **Applies To** (single input: model or CC range, e.g. "100–125cc"); a different rate = another row.
- **Scheduled Services**: Service No., Free / Paid, due km / days, window, customer charge (0 for free), **reimbursement amount** (free only), included Labor Chart operations; free/paid counts checked against the brand's Service Policy.
- **Customized Services**: dealer-level services / packages for all brands — name, price, optional included operations / parts, remarks, status.
- **Membership Services**: dealer-level service charges (name, rate / fee, remarks, status); plans come later in the Membership module.

## Accounting (no new account class type) — revised 2026-10-19
Same 1-to-1 pattern as inventory, under the existing **Income** class (CLS-005):

| Service level | Auto account | Example |
|---|---|---|
| Service Category | **Account Group** under Income | GRP-005-ggg "Yadea Services" |
| Service Sub Category | **Account Sub Group** under that group | SUB-005-ggg-sss "Yadea Labor Chart" |
| Service item (any of the 4 item pages) | **General Ledger** under that sub group | GLR-005-ggg-sss-nnnnn "Full Servicing 100-125cc" |

- **Each level creates its own account when it is saved** (locked 2026-10-19): saving a Service Category creates its Service Auto Group only (no sub groups); saving a Service Sub Category creates its Service Auto Sub Group; saving an item creates its Service Auto Ledger.
- Renamed, (de)activated, deleted and restored together with the service record, like the inventory auto accounts; not editable by hand.
- Account Groups / Account Sub Groups / General Ledgers pages get a new tab each — **Service Auto Groups / Service Auto Sub Groups / Service Auto Ledgers** — next to the existing Inventory Auto tabs.
- **Free service done**: Dr Free Service Claim – <Brand> (receivable) / Cr the scheduled service's income ledger, at the reimbursement amount. Brand pays: Dr Bank / Cr Claim.
- **Paid / labour / package / membership**: Dr Customer or Cash / Cr the item's income ledger (membership straight to income for now).
- Claim receivable: one ledger per brand, created when the brand's Service Policy is saved, under the receivable sub group (e.g. SUB-002-002-005 Account Receivables).
- Only branches running the **Services** business line can use service charges.

## Open points
1. How the auto tabs recognise service accounts (proposed: a source marker on group / sub group / ledger, or matching the codes stored on the service records).