import
{
    Routes
}
from '@angular/router';


//===========================================================
// Financial Statements Routes (hand-written read-only pages,
// no Code Sync)
//
//   trial-balance/list    Trial Balance
//   profit-loss/list      Profit & Loss
//   balance-sheet/list    Balance Sheet
//   cash-flow/list        Cash Flow Statement
//   changes-in-equity/list Changes in Equity
//   receipt-payment/list  Receipt & Payment Account
//   daily-collection/list Daily Collection Statement
//   invoice-profit/list   Invoice-wise Profit & Loss
//===========================================================

export const financialStatementsRoutes:
Routes =
[
    {
        path:'',

        children:
        [
            //===========================================================
            // Trial Balance
            //===========================================================

            {
                path:'trial-balance',

                data:
                {
                    breadcrumb:'Trial Balance'
                },

                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:
                        {
                            breadcrumb:'Trial Balance'
                        },
                        loadComponent:() =>
                            import(
                                '../trial-balance/trial-balance'
                            )
                            .then(
                                m =>
                                    m.TrialBalancePage
                            )
                    }
                ]
            },

            //===========================================================
            // Profit & Loss
            //===========================================================

            {
                path:'profit-loss',

                data:
                {
                    breadcrumb:'Profit & Loss'
                },

                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:
                        {
                            breadcrumb:'Profit & Loss'
                        },
                        loadComponent:() =>
                            import(
                                '../profit-loss/profit-loss'
                            )
                            .then(
                                m =>
                                    m.ProfitLossPage
                            )
                    }
                ]
            },

            //===========================================================
            // Balance Sheet
            //===========================================================

            {
                path:'balance-sheet',

                data:
                {
                    breadcrumb:'Balance Sheet'
                },

                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:
                        {
                            breadcrumb:'Balance Sheet'
                        },
                        loadComponent:() =>
                            import(
                                '../balance-sheet/balance-sheet'
                            )
                            .then(
                                m =>
                                    m.BalanceSheetPage
                            )
                    }
                ]
            },

            //===========================================================
            // Cash Flow Statement
            //===========================================================

            {
                path:'cash-flow',

                data:
                {
                    breadcrumb:'Cash Flow Statement'
                },

                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:
                        {
                            breadcrumb:'Cash Flow Statement'
                        },
                        loadComponent:() =>
                            import(
                                '../cash-flow/cash-flow'
                            )
                            .then(
                                m =>
                                    m.CashFlowPage
                            )
                    }
                ]
            },

            //===========================================================
            // Changes in Equity
            //===========================================================

            {
                path:'changes-in-equity',

                data:
                {
                    breadcrumb:'Changes in Equity'
                },

                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:
                        {
                            breadcrumb:'Changes in Equity'
                        },
                        loadComponent:() =>
                            import(
                                '../changes-in-equity/changes-in-equity'
                            )
                            .then(
                                m =>
                                    m.ChangesInEquityPage
                            )
                    }
                ]
            },

            //===========================================================
            // Receipt & Payment Account
            //===========================================================

            {
                path:'receipt-payment',

                data:
                {
                    breadcrumb:'Receipt & Payment Account'
                },

                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:
                        {
                            breadcrumb:'Receipt & Payment Account'
                        },
                        loadComponent:() =>
                            import(
                                '../receipt-payment/receipt-payment'
                            )
                            .then(
                                m =>
                                    m.ReceiptPaymentPage
                            )
                    }
                ]
            },

            //===========================================================
            // Daily Collection Statement
            //===========================================================

            {
                path:'daily-collection',

                data:
                {
                    breadcrumb:'Daily Collection Statement'
                },

                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:
                        {
                            breadcrumb:'Daily Collection Statement'
                        },
                        loadComponent:() =>
                            import(
                                '../daily-collection/daily-collection'
                            )
                            .then(
                                m =>
                                    m.DailyCollectionPage
                            )
                    }
                ]
            },

            //===========================================================
            // Invoice-wise Profit & Loss
            //===========================================================

            {
                path:'invoice-profit',

                data:
                {
                    breadcrumb:'Invoice-wise Profit & Loss'
                },

                children:
                [
                    {
                        path:'',
                        redirectTo:'list',
                        pathMatch:'full'
                    },
                    {
                        path:'list',
                        data:
                        {
                            breadcrumb:'Invoice-wise Profit & Loss'
                        },
                        loadComponent:() =>
                            import(
                                '../invoice-profit/invoice-profit'
                            )
                            .then(
                                m =>
                                    m.InvoiceProfitPage
                            )
                    }
                ]
            }
        ]
    }
];
