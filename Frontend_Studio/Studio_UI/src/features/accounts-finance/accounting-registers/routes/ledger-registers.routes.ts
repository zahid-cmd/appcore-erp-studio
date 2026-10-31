//===============================================================
// Imports
//===============================================================

import
{
    Routes
}
from '@angular/router';


//===============================================================
// Submenu Routes : Accounting Registers ›
//   Ledger Statements · Cash / Bank / MFS / POS / EMI Registers
//
// Hand-written read-only pages (no Code Sync). One component
// for all six : data.registerType picks the register.
//===============================================================

export function ledgerRegisterRoutes
(
    registerType:
        string,
    title:
        string
):
    Routes
{
    return [
        {
            path:'',
            redirectTo:'list',
            pathMatch:'full'
        },
        {
            path:'list',
            data:
            {
                breadcrumb:title,
                registerType
            },
            loadComponent:() =>
                import(
                    '../ledger-registers/ledger-registers'
                )
                .then(
                    m =>
                        m.LedgerRegisters
                )
        }
    ];
}

export const LedgerStatementsRoutes:
Routes =
    ledgerRegisterRoutes('General Ledger', 'Ledger Statements');

export const CashRegistersRoutes:
Routes =
    ledgerRegisterRoutes('Cash', 'Cash Registers');

export const BankRegistersRoutes:
Routes =
    ledgerRegisterRoutes('Bank', 'Bank Registers');

export const MfsRegistersRoutes:
Routes =
    ledgerRegisterRoutes('MFS', 'MFS Registers');

export const PosRegistersRoutes:
Routes =
    ledgerRegisterRoutes('POS', 'POS Registers');

export const EmiRegistersRoutes:
Routes =
    ledgerRegisterRoutes('EMI', 'EMI Registers');
