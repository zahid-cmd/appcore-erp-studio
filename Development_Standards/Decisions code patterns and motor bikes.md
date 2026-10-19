# Decision: Code pattern (Accounting · Inventory) and Motor Bikes

Status: **Locked** (2026-10-18). This replaces the earlier `INV-00x` draft of 2026-10-17.
Revised 2026-10-18: every Class Type now numbers on its own, so the inventory classes are `INV-001`, `WIP-001` and `COGS-001` (previously `INV-001`, `WIP-002`, `COGS-003`).
Revised 2026-10-18 (later): Product Category now has a **Category Type** and a **Brand**, and its name is generated from them (see "Product Category naming").
Revised 2026-10-18 (later still): Product Category now carries **four codes**: its own type-based code (`MB-` / `SP-` / `AC-nnn`, numbered per type) plus `INV` / `WIP` / `COGS-001-ggg`. The `CAT-` prefix is dropped; the Inventory group uses the class prefix `INV`.

## 1. Code pattern
Format: **PREFIX - class - group - sub group - number**, with widths **3 - 3 - 3 - 5**.
- Each level is its parent's code plus its own number.
- The prefix shows the kind of class or record, so codes from different areas can never collide.

### Account Class
- **Class Type** has four values: **Account, Inventory, Work In Progress, Cost of Goods Sold**.
- The **prefix is typed on the form** (2–5 capital letters), never hard-coded in the backend. Type and prefix are locked after saving.
- **Numbering restarts at 001 for every Class Type**: `CLS-001`, `CLS-002` … for Account; `INV-001`; `WIP-001`; `COGS-001`. Deleted rows count, so numbers are never reused.
- A prefix belongs to one Class Type only. Each inventory type has its own unique prefix, and only one class of each inventory type may exist.
- The inventory types never allow manual group creation.

### Accounting
| Level | Pattern | Example |
|---|---|---|
| Account Class | `CLS-ccc` | `CLS-001` |
| Account Group | `GRP-ccc-ggg` | `GRP-001-001` |
| Account Sub Group | `SUB-ccc-ggg-sss` | `SUB-001-001-001` |
| General Ledger / Cash / Bank / POS / MFS | `GLR` / `CSH` / `BNK` / `POS` / `MFS` `-ccc-ggg-sss-nnnnn` | `GLR-001-001-001-00001` |

### Inventory (three fixed classes, each class 001)
| Level | Own code | Inventory | WIP | COGS |
|---|---|---|---|---|
| Class | — | `INV-001` | `WIP-001` | `COGS-001` |
| Product Category | `MB-nnn` / `SP-nnn` / `AC-nnn` | `INV-001-ggg` | `WIP-001-ggg` | `COGS-001-ggg` |
| Product Sub Category | (= Inventory code) | `SCG-001-ggg-sss` | `WIP-001-ggg-sss` | `COGS-001-ggg-sss` |
| Product Ledger (product) | (= Inventory code) | `PLG-001-ggg-sss-nnnnn` | `WIP-001-ggg-sss-nnnnn` | `COGS-001-ggg-sss-nnnnn` |

### Product Category codes (2026-10-18)
- **Category Code** prefix comes from the Category Type: **Motor Bikes → `MB`, Spare Parts → `SP`, Accessories → `AC`**, 3 digits.
- **Numbering restarts at 001 for each type**: `MB-001`, `MB-002` …; `SP-001` …; `AC-001` …. Deleted rows count, so numbers are never reused.
- **Group number `ggg` is shared by all types**, because every category puts one group into the same three classes. So `MB-001` gets `INV-001-001`, then `SP-001` gets `INV-001-002`, and so on. It counts deleted categories and groups, so it is never reused either.
- **Category Type is locked after saving**, because it sets the code prefix. Brand can still change, which renames the category and its groups.
- **Older categories** (`CAT-001-ggg`) are moved to the new codes the next time they are updated. The groups are renamed in place, keeping their `ggg`, so sub groups and sub categories already created keep working.
- Sub Category is unchanged: its codes come from the category's group numbers (`SCG-001-ggg-sss`).

### Rules
- **Inventory code sets:** physical management and cost management.
  - Sub categories and products use the Inventory set for both: `SCG` / `PLG` are their own codes and at the same time the Inventory class's sub group and ledger.
  - Product Category is the exception: it has its own type-based code (`MB` / `SP` / `AC`) plus the three group codes, so **4 codes per category**.
  - WIP and COGS add one parallel code each, with identical numbers that differ only in prefix.
- **No short product codes.** `MB-00001`, `SP-00001` and `AC-00001` are dropped for products; the product's code is its `PLG-…` code. (`MB` / `SP` / `AC` are now used for category codes only.)
- **Class numbers:** each Class Type has its own sequence starting at 001 (see Account Class above). The inventory classes' groups, sub groups and ledgers are created **only** from Product Category, Sub Category and product pages, never by hand.
- **The last part is 5 digits everywhere** (up to 99,999 per sub group).
- **Prefix changes from the current system:**
  - classes `ACC-` → `CLS-`;
  - cash `CAS-` → `CSH-`;
  - bank accounts `BAN-` → `BNK-` (`BAN-` stays for Bank Setup);
  - product `PRD-` / `GLR-` → `PLG-`;
  - product category `CAT-` → own code `MB` / `SP` / `AC` plus Inventory group `INV-`.
  - Sub category keeps `SCG-`, now with a 3-digit last part instead of 5.

### Product Category naming (2026-10-18)
- **Category Type**: Motor Bikes, Spare Parts or Accessories (fixed list, checked on the server).
- **Brand**: from Brand Management (`BrandManagementId`, no database foreign key; the repository checks it).
- **Category Name is read-only and generated**: `<Brand Name> <Category Type>`, e.g. `Yadea Motor Bikes`. The server builds it; the form only previews it.
- Group names follow it: `INV - Yadea Motor Bikes`, `WIP - …`, `COGS - …`.
- The name is unique, so each brand has at most one category per type.
- An inactive brand can't be chosen for a new category; a category keeps its brand if the brand is made inactive later.
- A brand used by any product category can't be deleted (409). A category whose brand was deleted can't be restored (409).
- Open: renaming a brand does not yet rename its categories; resaving the category refreshes the name.

### Example: one motor bike
- Category `MB-001` Yadea Motor Bikes, with groups `INV-001-001`, `WIP-001-001` and `COGS-001-001`.
- Sub Category `SCG-001-001-001`, also linked to `WIP-001-001-001` and `COGS-001-001-001`.
- Product `PLG-001-001-001-00001`, also linked to `WIP-001-001-001-00001` and `COGS-001-001-001-00001`.

## 2. Rebuild approach
- **Drop and recreate the account and product tables.** Their data is lost; this is a clean restart. (Done: the user dropped all the tables on 2026-10-18.)
  - **Accounts:** Account Classes, Account Groups, Account Sub Groups, General Ledgers, Cash, Bank, MFS, POS Accounts, Card Charges.
  - **Products:** Product Categories, Product Sub Categories, Motor Bikes.
  - **Kept:** Bank Setup, Card Setup, Color Management.
- **After the drop:** update `CodeGenerator` and every affected repository. Recreate the empty tables through Code Synchronization, which is safe because they're empty.
- **Seed script** for the fixed records:
  - the accounting classes (`CLS-…`) and the inventory classes `INV-001`, `WIP-001`, `COGS-001`;
  - the fixed cash, bank, MFS and POS sub groups.
- **Chart of Accounts:** the tree shows the inventory classes with their groups, sub groups and ledgers. The Chart of Accounts backend needs to be revised for this.

## 3. Motor Bikes (replaces Product Master)
- The ProductMasters table is dropped. The earlier `MotorBikes_Rename.sql` is superseded; do not run it.
- **Product Category:** previously planned as fixed to `CAT-001-001` Motor Bikes. With Category Type and Brand on Product Category, this needs revisiting: the Motor Bikes page should most likely offer the categories whose Category Type is Motor Bikes (one per brand, `MB-…`). To confirm when the Motor Bikes page is rebuilt.

### Form (standard 4 sections)
| # | Section | Fields |
|---|---|---|
| 1 | Parent Information | Product Category · Product Sub Category |
| 2 | Motor Bike Information | Model Name · Color (Color Management) · Product Code (`PLG-…`, auto) · Product Name (auto = Model + Color) |
| 3 | Inventory Configuration | Re-order Level · Red Level · WIP and COGS codes (auto) |
| 4 | Image, Status & Description | Motor Bike Image (shared Image Hub) · Status · Remarks |

### Behaviour
- Choosing a Sub Category previews the 3 codes. The final numbers are assigned on save.
- The Product Name updates live from Model Name and Color.
- The parent is locked after saving.
- Red Level must be lower than Re-order Level; both are whole numbers of 0 or more.

### Still open
- Product Name format (`Model - Color`?) and duplicate rule within a sub category.
- Account names for the WIP and COGS entries: automatic from the Product Name, or typed by the user?
- Editing Model Name or Color later: should the names update with it?
- Image: one or several? Required?
- The list page design.

## 4. Next steps
1. Account Class (done: four types, typed prefix, per-type numbering), then Account Group, Sub Group and the ledger types.
2. Product Category / Sub Category with the WIP and COGS codes (done; Category Type + Brand added; four codes per category), then the seed script.
3. Motor Bikes backend, then frontend.

The temporary state in the meantime: the Product Category and Sub Category repositories have their Motor Bikes delete checks removed, marked `TODO (Motor Bikes rebuild)`.