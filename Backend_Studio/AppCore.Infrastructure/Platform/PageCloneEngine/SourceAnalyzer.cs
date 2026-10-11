using System.Text.RegularExpressions;
using AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;

namespace AppCore.Infrastructure.Platform.PageCloneEngine;

public class SourceAnalyzer
{
    private static readonly HashSet<string> Audit = new(StringComparer.OrdinalIgnoreCase)
    {
        "IsDeleted","DeletedBy","DeletedDate","CreatedBy","CreatedDate","ModifiedBy","ModifiedDate"
    };

    private static readonly HashSet<string> Common = new(StringComparer.OrdinalIgnoreCase)
    {
        "IsActive","Remarks"
    };

    public EntityAnalysisDto Analyze(string sourceName)
    {
        var dto = new EntityAnalysisDto { SourceName = sourceName };

        SolutionIndex index;
        try { index = new SolutionIndex(); }
        catch (Exception ex) { dto.Errors.Add(ex.Message); return dto; }

        // Resolve the entity
        var plan = new EnginePlan();
        string? entity = PageCloneEngine.ResolveEntity(index, sourceName, plan, "source");
        if (entity == null) { dto.Errors.AddRange(plan.Errors); return dto; }

        dto.Entity = entity;

        // 15 files
        foreach (var spec in PageCloneEngine.Specs)
        {
            string file = spec.Pattern.Replace("{E}", entity)
                                      .Replace("{K}", Names.Kebab(entity));
            var hits = index.Find(file, spec.In);

            dto.Files.Add(new AnalysisFileDto
            {
                Key = spec.Key,
                Path = hits.Count == 1 ? Path.GetRelativePath(index.Root, hits[0]) : file,
                Exists = hits.Count == 1
            });
        }

        string? entityPath = dto.Files.FirstOrDefault(f => f.Key == "backend.entity" && f.Exists)?.Path;
        string? configPath = dto.Files.FirstOrDefault(f => f.Key == "backend.configuration" && f.Exists)?.Path;
        string? repoPath   = dto.Files.FirstOrDefault(f => f.Key == "backend.repository" && f.Exists)?.Path;

        if (entityPath == null) { dto.Errors.Add("Entity file not found."); return dto; }

        string entityText = File.ReadAllText(Path.Combine(index.Root, entityPath));
        dto.Namespace = Regex.Match(entityText, @"namespace\s+([\w.]+)").Groups[1].Value;

        // Configuration facts
        var maxLen = new Dictionary<string, int>();
        var required = new HashSet<string>();
        var unique = new HashSet<string>();

        if (configPath != null)
        {
            string cfg = File.ReadAllText(Path.Combine(index.Root, configPath));

            dto.Table = Regex.Match(cfg, @"ToTable\(""(\w+)""").Groups[1].Value;

            foreach (Match m in Regex.Matches(cfg, @"builder\.Property\(x\s*=>\s*x\.(\w+)\)([^;]*);"))
            {
                string name = m.Groups[1].Value, chain = m.Groups[2].Value;
                if (chain.Contains("IsRequired")) required.Add(name);
                var ml = Regex.Match(chain, @"HasMaxLength\((\d+)\)");
                if (ml.Success) maxLen[name] = int.Parse(ml.Groups[1].Value);
            }

            foreach (Match m in Regex.Matches(cfg, @"HasIndex\(x\s*=>\s*x\.(\w+)\)\s*\.IsUnique\(\)"))
                unique.Add(m.Groups[1].Value);

            foreach (Match m in Regex.Matches(cfg,
                @"HasOne<(\w+)>\(\)\s*\.WithMany\(\)\s*\.HasForeignKey\(x\s*=>\s*x\.(\w+)\)"))
                dto.Parents.Add(new AnalysisParentDto
                {
                    ParentEntity = m.Groups[1].Value,
                    ForeignKey = m.Groups[2].Value
                });
        }

        // Fields from the entity
        dto.PrimaryKey = Regex.IsMatch(entityText, $@"\b{entity}Id\b") ? $"{entity}Id" : string.Empty;

        string singular = Names.Singular(entity);
        foreach (Match m in Regex.Matches(entityText,
            @"public\s+([\w<>?\[\]]+)\s+(\w+)\s*\{\s*get;\s*set;\s*\}"))
        {
            string type = m.Groups[1].Value, name = m.Groups[2].Value;

            string category =
                name == $"{entity}Id" || name == $"{singular}Id" || dto.Parents.Any(p => p.ForeignKey == name)
                    ? "Primary & Navigation"
                : Audit.Contains(name) || Common.Contains(name) && name == "IsActive"
                    ? "Audit & System"
                    : "Business & Functional";

            if (name == $"{entity}Id" || name == $"{singular}Id") dto.PrimaryKey = name;

            dto.Fields.Add(new AnalysisFieldDto
            {
                Name = name,
                CsType = type,
                TsType = ToTs(type),
                MaxLength = maxLen.TryGetValue(name, out int l) ? l : null,
                Required = required.Contains(name),
                Unique = unique.Contains(name),
                Category = category
            });
        }

        // Code format and children from the repository
        if (repoPath != null)
        {
            string repo = File.ReadAllText(Path.Combine(index.Root, repoPath));

            var cg = Regex.Matches(repo, @"CodeGenerator\.(\w+)\(")
                          .Select(x => x.Groups[1].Value)
                          .FirstOrDefault(n => n.Contains(singular, StringComparison.OrdinalIgnoreCase)
                                            || n.Contains(entity, StringComparison.OrdinalIgnoreCase));

            if (cg != null)
            {
                dto.CodeMethod = cg;

                var cgFile = index.Find("CodeGenerator.cs", "AppCore.Infrastructure");
                if (cgFile.Count == 1)
                {
                    string cgText = File.ReadAllText(cgFile[0]);
                    var fm = Regex.Match(cgText,
                        $@"static string {cg}\([^)]*\)[\s\S]*?return \$""([^""]+)"";");
                    if (fm.Success) dto.CodeFormat = fm.Groups[1].Value;
                }
            }

            foreach (Match m in Regex.Matches(repo, @"Set<(\w+)>\(\)\s*\.Add\s*\(|Set<(\w+)>\(\)\s*\.Add\s*\(\s*new"))
            {
                string child = m.Groups[1].Success ? m.Groups[1].Value : m.Groups[2].Value;
                if (child != $"{entity}Entity" && !dto.ChildEntities.Contains(child))
                    dto.ChildEntities.Add(child);
            }

            // Also catch a helper that adds rows: new XEntity { ... } inside AddAuto... methods
            foreach (Match m in Regex.Matches(repo, @"new\s+(\w+)Entity\s*\{"))
            {
                string child = m.Groups[1].Value + "Entity";
                if (child != $"{entity}Entity" && !dto.ChildEntities.Contains(child)
                    && Regex.IsMatch(repo, $@"Set<{child}>\(\)\s*\.Add"))
                    dto.ChildEntities.Add(child);
            }
        }

        // Hints
        if (dto.Parents.Count > 0)
            dto.Hints.Add($"Has {dto.Parents.Count} parent link(s): " +
                          string.Join(", ", dto.Parents.Select(p => p.ParentEntity)) + ".");
        if (dto.ChildEntities.Count > 0)
            dto.Hints.Add("Creates child rows in: " + string.Join(", ", dto.ChildEntities) +
                          ". Check the target needs this.");
        if (!string.IsNullOrEmpty(dto.CodeFormat))
            dto.Hints.Add($"Generated code format: {dto.CodeFormat}.");
        if (dto.Fields.Any(f => f.Name == "IsDeleted"))
            dto.Hints.Add("Uses soft delete and restore.");
        if (dto.Files.Any(f => !f.Exists))
            dto.Hints.Add($"{dto.Files.Count(f => !f.Exists)} of 15 files were not found.");

        return dto;
    }

    private static string ToTs(string cs) =>
        cs.TrimEnd('?') switch
        {
            "string" => cs.EndsWith("?") ? "string | null" : "string",
            "bool" => "boolean",
            "int" or "long" or "decimal" or "double" or "float" =>
                cs.EndsWith("?") ? "number | null" : "number",
            "DateTime" => cs.EndsWith("?") ? "string | null" : "string",
            _ => "any"
        };
}