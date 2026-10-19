# Decision: Business Configuration (business lines per branch)

Status: **Locked** 2026-10-19 (design agreed; not built yet).

## Why
Products must only be stored, bought, sold and moved through branches / warehouses that run that business. A branch may temporarily or permanently do business outside its wing's core line (e.g. a Sales Center showroom selling accessories).

## Structure
- Company → 3 fixed Wings → Branches → Warehouses (one created with each branch, extra ones allowed) → Racks.
- **Business lines (fixed list):** Motor Bikes · Spare Parts · Accessories · Services.
  - The first three are stock types and match Product Category → Category Type.
  - **Services** has no stock, warehouse or shelf; it will control job cards / service invoices.

## Core lines (from the wing, per branch, cannot be removed)
| Wing | Core line(s) of every branch under it |
|---|---|
| Sales Center | Motor Bikes |
| Service Center | Spare Parts, Services |
| Accessory Shop | Accessories |

## Extra lines (Business Configuration page, per BRANCH)
- Any other line can be **granted** to a single branch.
- Each grant is either:
  - **Fixed** — no end date, stays until removed; or
  - **Time-bound** — Valid From / Valid Until; switches off by itself after Valid Until.
- A grant can be **removed (revoked)** at any time, or its dates changed.
- Every grant / change / revoke is kept in history (who, when, dates).

## Page
Settings › General Settings › **Business Configuration**: rows = branches (with wing); columns = the 4 lines. Core lines show as locked ticks; extra lines are toggles with optional Valid From / Until. Wing filter; Save.

## Effect on warehouses and racks
- A warehouse (and every rack under it) may store product type T only while its branch has line T active (core, or a grant valid today).
- Spare Parts / Accessories **Add Location** modal lists only those warehouses / racks; the server checks again on save.
- Rack Management shows each warehouse's active lines.
- When a grant is revoked or expires:
  - no new placements / sales of that type in that branch;
  - existing storage rows are kept and shown as **"access revoked"** on the product form so they can be moved; they can still be edited or removed;
  - re-granting makes them normal again.
- Future purchase / sales / transfer / adjustment screens use the same rule (shared helper "is line T active for branch B on date D").

## Data (to be finalised when building)
- New table for the extra grants per branch (BranchId, BusinessLine, ValidFrom?, ValidUntil?, IsActive, soft delete + audit).
- Core lines derived from the wing (wing gets its core line(s)); not stored per branch.

## Later (not now)
- Per-warehouse narrowing.

## Needed to build
Current Wing and Branch files (entity, DTOs, repository, controller, form/list), especially the Branch repository's auto-warehouse creation.