    // AUTO-BEGIN : {{SUBMENU_CODE}}

    //===========================================================
    // {{SUBMENU_NAME}}
    //===========================================================

    {
        path:'{{SUBMENU_ROUTE_PATH}}',

        data:
        {
            breadcrumb:'{{SUBMENU_NAME}}'
        },

        loadChildren:() =>
            import(
                '{{SUBMENU_ROUTE_IMPORT}}'
            )
            .then(
                m =>
                    m.{{SUBMENU_VARIABLE}}Routes
            )
    },

    // AUTO-END : {{SUBMENU_CODE}}