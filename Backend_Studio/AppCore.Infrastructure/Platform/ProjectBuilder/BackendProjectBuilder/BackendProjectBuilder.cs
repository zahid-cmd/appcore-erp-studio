//===============================================================
// Namespaces
//===============================================================

using AppCore.Application.Platform.ProjectBuilderInterfaces;

using AppCore.Infrastructure.Platform.ProjectBuilder.Shared;


//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.ProjectBuilder.BackendProjectBuilder;


//===============================================================
// Backend Project Builder
//===============================================================

public class BackendProjectBuilder
    : IBackendProjectBuilder
{


    //===========================================================
    // Fields
    //===========================================================

    private readonly BackendProjectBuildContextResolver
        _contextResolver;


    private readonly BackendProjectBuildValidator
        _validator;


    private readonly BackendProjectBuildExecutor
        _executor;



    //===========================================================
    // Constructor
    //===========================================================

    public BackendProjectBuilder
    (
        BackendProjectBuildContextResolver contextResolver,

        BackendProjectBuildValidator validator,

        BackendProjectBuildExecutor executor
    )
    {
        _contextResolver =
            contextResolver;


        _validator =
            validator;


        _executor =
            executor;
    }



    //===========================================================
    // Rebuild Backend Project
    //===========================================================

    public async Task
        RebuildAsync()
    {
        var context =
            _contextResolver
                .Resolve();


        _validator
            .Validate
            (
                context
            );


        var result =
            await _executor
                .ExecuteAsync
                (
                    context
                );


        if
        (
            !result.Success
        )
        {
            throw new InvalidOperationException
            (
                string.IsNullOrWhiteSpace
                (
                    result.BuildOutput
                )
                    ? result.Message
                    : result.BuildOutput
            );
        }
    }

}