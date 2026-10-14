using System.Text;
using System.Text.RegularExpressions;

namespace AppCore.Infrastructure.Platform.PageCloneEngine;

//===============================================================
// Field Block Generator
//
// Turns the user's field decisions (bp.Fields) into the property
// blocks of the generated files. Everything is driven by the
// blueprint; nothing is read from the source page's field list.
//
// Step 1 covers: Entity, Dto, CreateDto, UpdateDto, Configuration.
//===============================================================

public static class FieldBlockGenerator
{
    //===========================================================
    // System fields are never generated from the blueprint.
    // They stay exactly as the rename-copy produced them.
    //===========================================================

    internal static readonly HashSet<string> System = new(StringComparer.OrdinalIgnoreCase)
    {
        "IsDeleted", "DeletedBy", "DeletedDate",
        "CreatedBy", "CreatedDate", "ModifiedBy", "ModifiedDate"
    };

    //===========================================================
    // Active fields = not excluded, not system, not the primary key
    //===========================================================

    public static List<CloneField> Active(PageCloneBlueprint bp)
    {
        string pk = bp.EntityName + "Id";

        return bp.Fields
            .Where(f => !f.IsExcluded)
            .Where(f => !System.Contains(f.Name))
            .Where(f => !string.Equals(f.Name, pk, StringComparison.OrdinalIgnoreCase))
            .ToList();
    }

    //===========================================================
    // Type helpers
    //===========================================================

    public static string CsType(CloneField f)
    {
        string t = (f.Type ?? "string").Trim().ToLowerInvariant().TrimEnd('?');

        string cs = t switch
        {
            "string" or "text" or "varchar" => "string",
            "bool" or "boolean" or "yes/no" => "bool",
            "int" or "integer" or "number" => "int",
            "long" or "bigint" => "long",
            "decimal" or "money" => "decimal",
            "double" => "double",
            "datetime" or "date" => "DateTime",
            _ => "string"
        };

        if (cs != "string" && !f.Required && !IsFlag(f)) cs += "?";
        return cs;
    }

    // IsActive / bool flags always stay non-nullable
    private static bool IsFlag(CloneField f) =>
        CsBase(f) == "bool";

    private static string CsBase(CloneField f)
    {
        string t = (f.Type ?? "string").Trim().ToLowerInvariant().TrimEnd('?');
        return t is "bool" or "boolean" or "yes/no" ? "bool" : t;
    }

    public static string TsType(CloneField f) =>
        CsType(f).TrimEnd('?') switch
        {
            "bool" => "boolean",
            "int" or "long" or "decimal" or "double" => "number",
            "DateTime" => "string",
            _ => "string"
        };

    private static string Init(CloneField f) =>
        CsType(f) == "string" ? " = string.Empty;" : "";

    private static string Banner(string title) =>
        "    //===============================================================\r\n" +
        $"    // {title}\r\n" +
        "    //===============================================================\r\n";

    //===========================================================
    // Entity / Dto property block
    //===========================================================

    public static string Properties(PageCloneBlueprint bp, bool includeId, string idName)
    {
        var sb = new StringBuilder();

        if (includeId)
        {
            sb.Append(Banner("Primary Key"));
            sb.AppendLine();
            sb.AppendLine($"    public long {idName} {{ get; set; }}");
            sb.AppendLine();
        }

        foreach (var f in Active(bp))
        {
            sb.Append(Banner(Spaced(f.Name)));
            sb.AppendLine();
            sb.AppendLine($"    public {CsType(f)} {f.Name} {{ get; set; }}{Init(f)}");
            sb.AppendLine();
        }

        return sb.ToString().TrimEnd() + "\r\n";
    }

    //===========================================================
    // Write / Create / Update DTOs: same list, no Id for Create
    //===========================================================

    public static string CreateProperties(PageCloneBlueprint bp) =>
        Properties(bp, includeId: false, idName: "");

    public static string UpdateProperties(PageCloneBlueprint bp, string idName) =>
        Properties(bp, includeId: true, idName: idName);

    //===========================================================
    // Default value of a flag as a C# literal.
    //
    // The wizard may hold free text ("active"). Only true / false
    // are valid C# literals, so anything else is converted:
    // IsActive -> true, any other flag -> false.
    //===========================================================

    private static string FlagDefault(CloneField f)
    {
        string d = (f.DefaultValue ?? "").Trim().ToLowerInvariant();

        if (d == "true" || d == "false")
            return d;

        return f.Name == "IsActive" ? "true" : "false";
    }

    //===========================================================
    // EF Configuration block (one stanza per field)
    //===========================================================

    public static string ConfigurationBlock(PageCloneBlueprint bp)
    {
        var sb = new StringBuilder();

        foreach (var f in Active(bp))
        {
            sb.AppendLine("        //===========================================================");
            sb.AppendLine($"        // {Spaced(f.Name)}");
            sb.AppendLine("        //===========================================================");
            sb.AppendLine();
            sb.AppendLine($"        builder.Property(x => x.{f.Name})");

            var chain = new List<string>();

            if (f.Required) chain.Add(".IsRequired()");

            if (CsType(f) == "string" && f.MaxLength is > 0)
                chain.Add($".HasMaxLength({f.MaxLength})");

            if (IsFlag(f) && !string.IsNullOrWhiteSpace(f.DefaultValue))
                chain.Add($".HasDefaultValue({FlagDefault(f)})");

            for (int i = 0; i < chain.Count; i++)
            {
                bool last = i == chain.Count - 1;
                sb.AppendLine($"               {chain[i]}{(last ? ";" : "")}");
            }

            if (chain.Count == 0)
                sb.Length -= Environment.NewLine.Length; // drop newline, close below

            if (chain.Count == 0) sb.AppendLine(";");

            if (f.Unique)
            {
                sb.AppendLine();
                sb.AppendLine($"        builder.HasIndex(x => x.{f.Name})");
                sb.AppendLine("               .IsUnique();");
            }

            sb.AppendLine();

            // Parent link: index + relationship
            if (bp.Parent != null && bp.Parent.HasParent
                && string.Equals(bp.Parent.ForeignKey, f.Name, StringComparison.OrdinalIgnoreCase)
                && !string.IsNullOrWhiteSpace(bp.Parent.Entity))
            {
                if (!f.Unique)
                {
                    sb.AppendLine($"        builder.HasIndex(x => x.{f.Name});");
                    sb.AppendLine();
                }

                // The real entity class is singular (AccountSubGroup),
                // even when the wizard holds the plural.
                string parentClass = Names.Singular(bp.Parent.Entity);

                sb.AppendLine($"        builder.HasOne<{parentClass}>()");
                sb.AppendLine("               .WithMany()");
                sb.AppendLine($"               .HasForeignKey(x => x.{f.Name})");
                sb.AppendLine("               .OnDelete(DeleteBehavior.Restrict);");
                sb.AppendLine();
            }
        }

        return sb.ToString().TrimEnd() + "\r\n";
    }

    //===========================================================
    // Engine hook: called once per file after the rename-copy.
    // Files this step does not own are returned unchanged.
    //===========================================================

    public static string Transform(
        string key, string text, PageCloneBlueprint bp,
        string targetSingular, List<string> warnings)
    {
        string id = targetSingular + "Id";

        return key switch
        {
            "backend.entity" =>
                ReplaceBusinessRegion(text, Properties(bp, false, id), id, warnings, key),

            "backend.dto" =>
                ReplaceBusinessRegion(text, Properties(bp, false, id), id, warnings, key),

            "backend.createdto" =>
                ReplaceClassBody(text, CreateProperties(bp), warnings, key),

            "backend.updatedto" =>
                ReplaceClassBody(text, UpdateProperties(bp, id), warnings, key),

            "backend.configuration" =>
                ReplaceBusinessRegion(text, ConfigurationBlock(bp), id, warnings, key, configuration: true),

            _ => text
        };
    }

    //===========================================================
    // Replace the business property region of a generated file.
    //
    // The region is every property from the first non-key property
    // up to (not including) the first audit/system property. This
    // matches the Wings layout: key, business fields, status, soft
    // delete, audit.
    //===========================================================

    private static readonly Regex Prop = new(
        @"public\s+[\w<>?\[\]]+\s+(\w+)\s*\{\s*get;\s*set;\s*\}[^\r\n]*",
        RegexOptions.Compiled);

    private static readonly Regex ConfigProp = new(
        @"builder\.Property\(x\s*=>\s*x\.(\w+)\)",
        RegexOptions.Compiled);

    // Create/Update DTOs have no audit fields: replace the whole class body
    public static string ReplaceClassBody(
        string text, string newBlock, List<string> warnings, string fileLabel)
    {
        int cls = text.IndexOf("class ", StringComparison.Ordinal);
        int open = cls < 0 ? -1 : text.IndexOf('{', cls);
        int close = text.LastIndexOf('}');

        if (open < 0 || close <= open)
        {
            warnings.Add($"{fileLabel}: class body not found; fields were rename-copied only.");
            return text;
        }

        return text[..(open + 1)] + "\r\n" + newBlock + text[close..];
    }

    public static string ReplaceBusinessRegion(
        string text,
        string newBlock,
        string idName,
        List<string> warnings,
        string fileLabel,
        bool configuration = false)
    {
        var matches = (configuration ? ConfigProp : Prop).Matches(text);

        var first = matches
            .FirstOrDefault(m => !string.Equals(m.Groups[1].Value, idName, StringComparison.OrdinalIgnoreCase));

        var firstSystem = matches
            .FirstOrDefault(m => System.Contains(m.Groups[1].Value));

        if (first == null || firstSystem == null || firstSystem.Index <= first.Index)
        {
            warnings.Add($"{fileLabel}: could not find the field region; fields were rename-copied only.");
            return text;
        }

        int start = BannerStart(text, first.Index);
        int end = BannerStart(text, firstSystem.Index);

        if (end <= start)
        {
            warnings.Add($"{fileLabel}: field region boundaries unclear; fields were rename-copied only.");
            return text;
        }

        return text[..start] + newBlock + "\r\n" + text[end..];
    }

    // Start of the 3-line banner (=====, title, =====) above a member,
    // or the start of the member's own line when there is none.
    internal static int BannerStart(string text, int memberIndex)
    {
        int lineStart = text.LastIndexOf('\n', Math.Max(0, memberIndex - 1)) + 1;
        int pos = lineStart;

        // skip back over blank lines
        while (pos > 0)
        {
            int prevStart = text.LastIndexOf('\n', Math.Max(0, pos - 2)) + 1;
            string prev = text[prevStart..pos].Trim();
            if (prev.Length == 0) { pos = prevStart; continue; }
            break;
        }

        int p = pos;
        int found = 0;

        while (p > 0 && found < 3)
        {
            int prevStart = text.LastIndexOf('\n', Math.Max(0, p - 2)) + 1;
            string prev = text[prevStart..p].Trim();
            if (!prev.StartsWith("//")) break;
            p = prevStart;
            found++;
        }

        return found == 3 ? p : lineStart;
    }

    //===========================================================
    // Naming
    //===========================================================

    private static string Spaced(string name) =>
        Regex.Replace(name, "(?<=[a-z0-9])(?=[A-Z])", " ");
}