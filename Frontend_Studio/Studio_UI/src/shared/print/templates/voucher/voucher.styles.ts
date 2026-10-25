//===============================================================
// Shared VOUCHER print : styles
//
// Body of the office voucher. The header (logo | company | QR,
// title ribbon, info strip), workflow line, signatures and paper
// are in shared/print/print-engine.service.ts (BASE_CSS).
//
// Tinted areas (amount bar, Debit / Credit columns, group rows)
// use see-through colours, so the CANCELLED / REVERSED watermark
// shows through them. On white paper they look the same as the
// solid colours they replace.
//===============================================================

export function VOUCHER_DOCUMENT_CSS():
    string
{
    return `
/* Total + amount in words (thin bar) */
.vd-amount { display: grid; grid-template-columns: auto minmax(0, 1fr); margin: 0 0 4mm; border: 1px solid #c7d5f0;
             border-radius: 2mm; overflow: hidden; background: rgba(37, 99, 235, 0.05); }
.vd-amount > div { display: flex; align-items: center; gap: 3mm; padding: 1.6mm 5mm; min-width: 0; }
.vd-amount span { font-size: 6.6pt; font-weight: 700; letter-spacing: 0.9pt; text-transform: uppercase; color: #475569; white-space: nowrap; }
.vd-amount-total { border-right: 1px solid #c7d5f0; background: rgba(37, 99, 235, 0.06); }
.vd-amount-total b { font-size: 12.5pt; font-weight: 800; color: #0b2a5b; letter-spacing: 0.2pt; font-variant-numeric: tabular-nums; white-space: nowrap; }
.vd-amount-words i { font-family: Georgia, "Times New Roman", serif; font-size: 10pt; color: #0b2a5b; }

/* Lines */
table.vd-lines { width: 100%; border-collapse: collapse; table-layout: fixed; }
.vd-lines th { font-size: 6.8pt; font-weight: 700; letter-spacing: 0.9pt; text-transform: uppercase; color: #64748b; text-align: left;
               padding: 0 2mm 1.6mm; border-bottom: 1.4px solid #0f172a; background: transparent; }
.vd-lines td { padding: 2mm; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
.vd-c { text-align: center; }
.vd-r { text-align: right !important; font-variant-numeric: tabular-nums; }
.vd-sl { color: #64748b; }
.vd-main { font-weight: 600; }
.vd-code { font-size: 7.6pt; font-weight: 500; color: #64748b; white-space: nowrap; }
.vd-sub { font-size: 7.6pt; color: #475569; margin-top: 0.4mm; }
.vd-notes { font-size: 9pt; color: #334155; }
.vd-sys .vd-main { font-style: italic; font-weight: 500; color: #475569; }
.vd-lines .vd-dr { background: rgba(37, 99, 235, 0.04); }
.vd-lines .vd-cr { background: rgba(22, 163, 74, 0.045); }
.vd-lines tr.vd-group td { padding: 1.4mm 2mm; background: rgba(30, 64, 175, 0.07); border-bottom: 1px solid #cbd5e1; font-size: 7.2pt; font-weight: 700;
                            letter-spacing: 0.8pt; text-transform: uppercase; color: #0b2a5b; }
.vd-total td { border-top: 1.4px solid #0f172a; border-bottom: 0; font-weight: 800; font-size: 10pt; padding-top: 2.4mm; }

/* Narration + notes */
.vd-narration { display: grid; grid-template-columns: 28mm minmax(0, 1fr); gap: 4mm; margin-top: 5mm; padding: 3mm 0;
                border-top: 1px dashed #cbd5e1; border-bottom: 1px dashed #cbd5e1; }
.vd-narration span { padding-top: 0.6mm; font-size: 6.6pt; font-weight: 700; letter-spacing: 0.9pt; text-transform: uppercase; color: #64748b; }
.vd-narration p { margin: 0; font-size: 9.4pt; color: #1e293b; }
.vd-note { margin-top: 2.5mm; font-size: 8pt; color: #92400e; }
.vd-note.vd-danger { color: #b91c1c; }

/* Workflow + signatures : right after the narration */
.vd-after { padding-top: 6mm; }
.vd-after .pv-signs { padding-top: 16mm; }
`;
}