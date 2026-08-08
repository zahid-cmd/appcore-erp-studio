// AUTO-BEGIN : {{MenuCode}}

//===========================================================
// {{MenuName}}
//===========================================================

{
    path:'{{MenuRoutePath}}',

    data:
    {
        breadcrumb:'{{MenuName}}'
    },

    loadChildren:() =>
        import(
            '{{MenuRouteImport}}'
        )
        .then(
            m =>
                m.{{MenuVariable}}Routes
        )
},

// AUTO-END : {{MenuCode}}