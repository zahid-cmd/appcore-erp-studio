// AUTO-BEGIN : {{ModuleCode}}

//===========================================================
// {{ModuleName}}
//===========================================================

{
    path:'{{ModuleRoutePath}}',

    data:
    {
        breadcrumb:'{{ModuleName}}'
    },

    loadChildren:() =>
        import(
            '../features/{{ModuleRoutePath}}/routes/{{ModuleRouteFile}}'
        )
        .then(
            m =>
                m.{{ModuleVariable}}Routes
        )
},

// AUTO-END : {{ModuleCode}}