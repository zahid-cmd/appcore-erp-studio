//===============================================================
// Shared SLIP print : styles
//
// Half-A4 slip (Money Receipt / Payment Slip / Fund Transfer
// Advice). Paper is in
// shared/print/print-engine.service.ts (BASE_CSS).
//
// The card, title block and amount box use see-through colours,
// so each half's CANCELLED / REVERSED watermark (under the
// content) shows through them. On white paper they look the same
// as before.
//===============================================================

export function SLIP_DOCUMENT_CSS():
    string
{
    return `
.sl-sheet { display: flex; flex-direction: column; }

/* One half : framed card with the security pattern, copy ribbon
   down the left edge */
.sl-half { position: relative; height: 147mm; padding: 9mm 12mm 8mm 22mm; display: flex; flex-direction: column; overflow: hidden; }
.sl-half > * { position: relative; z-index: 1; }
.sl-half > .sl-frame { position: absolute; inset: 5mm 7mm 5mm 7mm; z-index: 0; border: 1px solid #c7d5f0; border-radius: 3mm;
    background: repeating-linear-gradient(45deg, rgba(29, 78, 216, 0.035) 0 1.2mm, transparent 1.2mm 2.4mm); }
.sl-half > .sl-spine { position: absolute; left: 7mm; top: 5mm; bottom: 5mm; width: 10mm; z-index: 1; border-radius: 3mm 0 0 3mm;
    background: linear-gradient(180deg, #0b2a5b, #1d4ed8); display: flex; align-items: center; justify-content: center; }
/* Watermark : one per half, centred on the card, under the content */
.sl-half > .sl-mark { position: absolute; top: 50%; left: calc(50% + 5mm); z-index: 0; transform: translate(-50%, -50%) rotate(-20deg);
    font-size: 54pt; font-weight: 800; letter-spacing: 6pt; color: rgba(220, 38, 38, 0.12); white-space: nowrap; pointer-events: none; }
.sl-spine span { writing-mode: vertical-rl; transform: rotate(180deg); color: #ffffff; font-size: 7.5pt; font-weight: 800;
                 letter-spacing: 3pt; text-transform: uppercase; white-space: nowrap; }

/* Cut line between the halves */
.sl-cut { height: 3mm; position: relative; border-top: 1px dashed #94a3b8; flex: 0 0 auto; }
.sl-cut span { position: absolute; top: -2.4mm; left: 50%; transform: translateX(-50%); background: #ffffff;
               padding: 0 3mm; font-size: 7pt; color: #94a3b8; }

/* Top : logo | company (left), QR (right) */
.sl-top { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6mm; align-items: center; padding-left: 3mm; }
.sl-brand { display: flex; align-items: center; gap: 4mm; min-width: 0; }
.sl-logo { display: block; height: 15mm; max-width: 40mm; object-fit: contain; }
.sl-sep { width: 0.4mm; align-self: stretch;
          background: linear-gradient(180deg, rgba(29,78,216,0) 0%, #b9cbeb 18%, #1d4ed8 50%, #b9cbeb 82%, rgba(29,78,216,0) 100%); }
.sl-co { min-width: 0; }
.sl-co-name { font-size: 12.5pt; font-weight: 800; color: #0b2a5b; line-height: 1.2; }
.sl-co-line { font-size: 7.4pt; color: #64748b; line-height: 1.4; }
.sl-qr { width: 19mm; height: 19mm; padding: 1mm; border: 1px solid #cdd9ee; border-radius: 2mm; background: #ffffff; }
.sl-qr svg { display: block; width: 100%; height: 100%; }

/* Title block : MONEY RECEIPT ribbon (top), Receipt No / Date (bottom) */
.sl-titlebox { margin: 3.5mm 0 0 3mm; border: 1px solid #cdd9ee; border-radius: 2.5mm; overflow: hidden; background: transparent; }
.sl-ribbon { position: relative; padding: 2.2mm 5mm 2.2mm 7mm; text-align: center;
             background: radial-gradient(120% 180% at 100% 0%, rgba(29,78,216,0.10) 0%, rgba(29,78,216,0) 55%),
                         linear-gradient(90deg, rgba(29,78,216,0.035) 0%, rgba(29,78,216,0.077) 55%, rgba(29,78,216,0.12) 100%); }
.sl-ribbon::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 2mm; background: linear-gradient(180deg, #0b2a5b, #1d4ed8); }
.sl-ribbon::after { content: ""; position: absolute; left: 2mm; right: 0; bottom: 0; height: 0.5mm; opacity: 0.55;
                    background: linear-gradient(90deg, #0b2a5b 0%, #1d4ed8 45%, rgba(29,78,216,0) 100%); }
.sl-title { font-size: 14pt; font-weight: 800; letter-spacing: 4pt; color: #0b2a5b; white-space: nowrap; }
.sl-ids { display: grid; grid-template-columns: 1fr 1fr; background: rgba(100, 116, 139, 0.06); border-top: 1px solid #cdd9ee; }
.sl-idc { display: flex; flex-direction: column; padding: 1.8mm 4mm 1.8mm 7mm; min-width: 0; }
.sl-idc-right { border-left: 1px solid #e2e8f0; text-align: right; padding: 1.8mm 4mm; }
.sl-idc span { font-size: 6.4pt; font-weight: 700; letter-spacing: 0.8pt; text-transform: uppercase; color: #64748b; }
.sl-idc b { margin-top: 0.4mm; font-size: 10pt; font-weight: 800; color: #0f172a; white-space: nowrap; }

/* Wording */
.sl-lit { margin: 4mm 0 0 3mm; display: flex; flex-direction: column; gap: 3.4mm; font-family: Georgia, "Times New Roman", serif; font-size: 10.5pt; }
.sl-fill { display: flex; align-items: flex-end; gap: 2.5mm; }
.sl-lbl { flex: 0 0 auto; font-style: italic; color: #334155; }
.sl-val { flex: 1 1 auto; min-width: 0; border-bottom: 1px dotted #64748b; padding: 0 1mm 0.5mm;
          font-family: "Segoe UI", Arial, sans-serif; font-weight: 700; font-size: 10pt; color: #0f172a; }
.sl-val small { font-weight: 500; font-size: 8pt; color: #64748b; }
.sl-words { font-family: Georgia, "Times New Roman", serif; font-style: italic; font-weight: 600; color: #0b2a5b; }
.sl-vide { align-items: flex-start; }
.sl-vide .sl-lbl { padding-top: 1mm; }
.sl-vide-box { flex: 1 1 auto; min-width: 0; }
.sl-vide-box table { width: 100%; border-collapse: collapse; font-family: "Segoe UI", Arial, sans-serif; }
.sl-vide-box td { font-size: 8.6pt; padding: 1.1mm 1mm; border-bottom: 1px dotted #94a3b8; color: #1e293b; }
.sl-vm { width: 16mm; }
.sl-chip { display: inline-block; padding: 0.3mm 2mm; border-radius: 3mm; background: #e8effc; color: #0b2a5b;
           font-size: 6.8pt; font-weight: 800; letter-spacing: 0.6pt; }
.sl-vr { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; white-space: nowrap; }

/* Bottom : amount box, note, signature */
.sl-bottom { margin: auto 0 0 3mm; display: grid; grid-template-columns: auto 1fr auto; gap: 6mm; align-items: end; }
.sl-amount { display: flex; align-items: stretch; border-radius: 2mm; overflow: hidden; box-shadow: 0 0 0 1px #0b2a5b; }
.sl-amount span { display: grid; place-items: center; padding: 2.4mm 3mm; background: #0b2a5b; color: #ffffff; font-size: 10pt; font-weight: 800; }
.sl-amount b { padding: 1.6mm 5mm; background: rgba(255, 255, 255, 0.72); color: #0b2a5b; font-size: 16pt; font-weight: 800; font-variant-numeric: tabular-nums; }
.sl-note { align-self: center; font-size: 7.6pt; line-height: 1.4; color: #92400e; }
.sl-signs { display: flex; gap: 4mm; }
.sl-signs .sl-sign:not(:only-child) { width: 38mm; }
.sl-sign { width: 52mm; text-align: center; font-size: 8pt; color: #334155; }
.sl-sign div { border-top: 1px solid #334155; padding-top: 1mm; }
.sl-foot { margin: 2.5mm 0 0 3mm; display: flex; justify-content: space-between; align-items: baseline; gap: 4mm; font-size: 6.6pt; color: #94a3b8; }
.sl-valid { margin-left: auto; }
`;
}