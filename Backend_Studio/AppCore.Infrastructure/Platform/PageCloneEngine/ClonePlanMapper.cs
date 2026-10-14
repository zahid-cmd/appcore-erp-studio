using System.Text.RegularExpressions;

using AppCore.Application.InfrastructureControl.DevelopmentManagement.PageCloning.DTOs;

namespace AppCore.Infrastructure.Platform.PageCloneEngine;

//===============================================================
// Turns the plan sent by the wizard into the engine blueprint
//===============================================================

public static class ClonePlanMapper
{
    public static PageCloneBlueprint ToBlueprint(ClonePlanDto plan)
    {
        var setup = plan.Setup ?? new ClonePlanSetupDto();

        string entity = Names.Clean(plan.EntityName);

        var segments = new List<CodeSegment>();
        var used = new HashSet<string>(StringComparer.Ordinal);
        int index = 0;

        foreach (var s in setup.CodeSegments ?? new())
        {
            index++;

            // "Account Sub Group" -> accountSubGroup (a valid C# parameter name)
            string name = Identifier(s.Name, "segment" + index);

            // two segments must never share a name
            string unique = name;
            for (int n = 2; !used.Add(unique); n++) unique = name + n;

            segments.Add(new CodeSegment { Name = unique, Pad = s.Pad });
        }

        return new PageCloneBlueprint
        {
            EntityName = entity,
            DisplayName = plan.DisplayName?.Trim() ?? string.Empty,

            CloneFromName = plan.CloneFromName ?? string.Empty,
            CloneToName = plan.CloneToName ?? string.Empty,

            Fields = (plan.Fields ?? new()).Select(f => new CloneField
            {
                SourceName = f.SourceName?.Trim() ?? string.Empty,
                Action = string.IsNullOrWhiteSpace(f.Action) ? "Keep" : f.Action,
                Name = f.Name?.Trim() ?? string.Empty,
                Type = string.IsNullOrWhiteSpace(f.Type) ? "string" : f.Type,
                MaxLength = f.MaxLength,
                Required = f.Required,
                Unique = f.Unique,
                Control = string.IsNullOrWhiteSpace(f.Control) ? "Textbox" : f.Control,
                DefaultValue = f.DefaultValue ?? string.Empty
            }).ToList(),

            Parent = new CloneParent
            {
                Mode = string.IsNullOrWhiteSpace(setup.ParentMode) ? "Exclude" : setup.ParentMode,
                Entity = setup.ParentEntity ?? string.Empty,
                ForeignKey = setup.ParentFk ?? string.Empty,
                Cascade = setup.Cascade ?? new()
            },

            SoftDelete = setup.SoftDelete,

            WriteCodeGeneratorMethod = setup.CodeEnabled,

            Code = new CodeSpec
            {
                MethodName = $"Generate{entity}Code",
                Prefix = setup.CodePrefix ?? string.Empty,
                SequencePad = setup.CodeSequencePad,
                Segments = segments
            }
        };
    }

    //===========================================================
    // Any text -> camelCase C# identifier
    //===========================================================

    private static string Identifier(string? raw, string fallback)
    {
        var words = Regex.Matches(raw ?? string.Empty, "[A-Za-z0-9]+")
            .Select(m => m.Value)
            .ToList();

        if (words.Count == 0) return fallback;

        // keep the inner capitals of each word, only the first letter is lowered
        string joined = string.Concat(words.Select(w => char.ToUpperInvariant(w[0]) + w[1..]));
        string name = char.ToLowerInvariant(joined[0]) + joined[1..];

        if (char.IsDigit(name[0])) name = "_" + name;

        return name;
    }
}