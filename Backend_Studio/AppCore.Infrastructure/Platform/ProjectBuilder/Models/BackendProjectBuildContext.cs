//===============================================================
// Namespace
//===============================================================

namespace AppCore.Infrastructure.Platform.ProjectBuilder.Models;


//===============================================================
// Backend Project Build Context
//===============================================================

public class BackendProjectBuildContext
{


    //===========================================================
    // Backend Studio Root
    //===========================================================

    public string
        BackendStudioRoot
    {
        get;
        set;
    } =
        string.Empty;



    //===========================================================
    // Infrastructure Project Path
    //===========================================================

    public string
        InfrastructureProjectPath
    {
        get;
        set;
    } =
        string.Empty;



    //===========================================================
    // Infrastructure Project File
    //===========================================================

    public string
        InfrastructureProjectFile
    {
        get;
        set;
    } =
        string.Empty;

}