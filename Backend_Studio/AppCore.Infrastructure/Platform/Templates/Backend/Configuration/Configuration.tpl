//===============================================================
// Namespaces
//===============================================================

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

//===============================================================
// Namespace
//===============================================================

namespace {{InfrastructureNamespace}};

//===============================================================
// {{ConfigurationName}}
//===============================================================

public class {{ConfigurationName}}
    : IEntityTypeConfiguration<{{EntityName}}>
{
    //===========================================================
    // Configure
    //===========================================================

    public void Configure
    (
        EntityTypeBuilder<{{EntityName}}> builder
    )
    {

    }
}