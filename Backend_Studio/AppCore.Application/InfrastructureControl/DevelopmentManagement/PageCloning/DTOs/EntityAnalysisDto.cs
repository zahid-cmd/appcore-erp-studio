namespace AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;

public class EntityAnalysisDto
{
    public string SourceName { get; set; } = string.Empty;
    public string Entity { get; set; } = string.Empty;
    public string Table { get; set; } = string.Empty;
    public string Namespace { get; set; } = string.Empty;
    public string PrimaryKey { get; set; } = string.Empty;

    public List<AnalysisFileDto> Files { get; set; } = new();
    public List<AnalysisFieldDto> Fields { get; set; } = new();
    public List<AnalysisParentDto> Parents { get; set; } = new();
    public List<string> ChildEntities { get; set; } = new();

    public string CodeMethod { get; set; } = string.Empty;
    public string CodeFormat { get; set; } = string.Empty;

    public List<string> Hints { get; set; } = new();
    public List<string> Errors { get; set; } = new();
}

public class AnalysisFileDto
{
    public string Key { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public bool Exists { get; set; }
}

public class AnalysisFieldDto
{
    public string Name { get; set; } = string.Empty;
    public string CsType { get; set; } = string.Empty;
    public string TsType { get; set; } = string.Empty;
    public int? MaxLength { get; set; }
    public bool Required { get; set; }
    public bool Unique { get; set; }
    public string Category { get; set; } = string.Empty;   // Primary & Navigation | Business & Functional | Audit & System
}

public class AnalysisParentDto
{
    public string ForeignKey { get; set; } = string.Empty;
    public string ParentEntity { get; set; } = string.Empty;
}