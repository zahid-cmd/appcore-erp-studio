using System.Text;
using System.Text.RegularExpressions;

namespace AppCore.Infrastructure.Platform.PageCloneEngine;

//===============================================================
// Parent facts read from the parent entity file
//
// Entity    = the name from the wizard (used for renames)
// ClassName = the class declared in the entity file (used in code)
//===============================================================

public record ParentInfo(
    string Entity,
    string Namespace,
    string IdProperty,
    string CodeProperty,
    string ForeignKey,
    string ClassName);

//===============================================================
// Repository Block Generator (step 2)
//
// Rebuilds, from the blueprint:
//   - the query projection        (new XxxDto { ... })
//   - the Create entity block     (new XxxEntity { ... })
//   - the Update assignments      (entity.X = dto.X;)
//   - GetNextCodeAsync            (parent segments + next sequence)
//
// Parent renames (Company -> AccountSubGroup, companyId ->
// accountSubGroupId ...) are added to the engine's name map by
// AddParentMap, so lookups, DTO references, the interface and the
// controller follow automatically.
//===============================================================

public static class RepositoryBlockGenerator
{
    // line that starts an assignment:  Name =
    private static readonly Regex AssignRx =
        new(@"(?m)^[ \t]*([A-Z]\w*)\s*=(?!=)", RegexOptions.Compiled);

    // line that starts an update assignment:  entity.Name =
    private static readonly Regex UpdateRx =
        new(@"(?m)^[ \t]*entity\.([A-Z]\w*)\s*=(?!=)", RegexOptions.Compiled);

    //===========================================================
    // Parent
    //===========================================================

    public static ParentInfo? ResolveParent(
        SolutionIndex index, CloneParent? parent, List<string> warnings)
    {
        if (parent == null || !parent.HasParent || string.IsNullOrWhiteSpace(parent.Entity))
            return null;

        // The wizard may give the plural (AccountSubGroups) while the entity file is singular
        var hits = index.Find(parent.Entity + ".cs", "AppCore.Domain");

        if (hits.Count != 1)
            hits = index.Find(Names.Singular(parent.Entity) + ".cs", "AppCore.Domain");

        if (hits.Count != 1)
        {
            warnings.Add($"Parent entity file {parent.Entity}.cs (or {Names.Singular(parent.Entity)}.cs) found {hits.Count} time(s). Parent code lookup skipped.");
            return null;
        }

        string text = File.ReadAllText(hits[0]);

        string ns = Regex.Match(text, @"namespace\s+([\w.]+)").Groups[1].Value;

        // The class that is really declared in the file (falls back to the file name)
        string className = Regex.Match(text, @"\bclass\s+(\w+)").Groups[1].Value;

        if (string.IsNullOrWhiteSpace(className))
            className = Path.GetFileNameWithoutExtension(hits[0]);

        var props = Regex.Matches(text,
                @"public\s+[\w<>?\[\]]+\s+(\w+)\s*\{\s*get;\s*set;\s*\}")
            .Select(m => m.Groups[1].Value)
            .ToList();

        string sing = Names.Singular(parent.Entity);

        string id =
            props.FirstOrDefault(x => x == parent.Entity + "Id" || x == sing + "Id")
            ?? props.FirstOrDefault(x => x.EndsWith("Id"))
            ?? sing + "Id";

        // AccountSubGroup -> SubGroup: the code property of a cascade
        // entity often drops the "Account" prefix (SubGroupCode).
        string stripped =
            sing.StartsWith("Account", StringComparison.Ordinal) && sing.Length > 7
                ? sing[7..]
                : sing;

        // Exact matches first. Otherwise the LAST property ending in
        // "Code": in a cascade (ClassCode, GroupCode, SubGroupCode) the
        // last one is the most specific level.
        string? code =
            props.FirstOrDefault(x => x == parent.Entity + "Code"
                                   || x == sing + "Code"
                                   || x == stripped + "Code")
            ?? props.LastOrDefault(x => x.EndsWith("Code"));

        if (code == null)
        {
            warnings.Add($"No code property found on {parent.Entity}. Code number generation needs a parent code.");
            code = sing + "Code";
        }

        return new ParentInfo(parent.Entity, ns, id, code, parent.ForeignKey, className);
    }

    //===========================================================
    // Add parent renames to the engine name map
    //===========================================================

    public static void AddParentMap(
        Dictionary<string, string> map, string sourceConfigText, ParentInfo? target)
    {
        if (target == null) return;

        var m = Regex.Match(sourceConfigText,
            @"HasOne<(\w+)>\(\)\s*\.WithMany\(\)\s*\.HasForeignKey\(x\s*=>\s*x\.(\w+)\)");

        if (!m.Success) return;

        string sEnt = m.Groups[1].Value;
        string sFk = m.Groups[2].Value;

        // Code names: later calls may overwrite earlier ones
        void Add(string s, string t)
        {
            if (!string.IsNullOrEmpty(s) && s != t) map[s] = t;
        }

        // Spaced / display forms never overwrite a code-name mapping
        // (for a single-word name, Spaced("Company") == "Company")
        void AddIfAbsent(string s, string t)
        {
            if (!string.IsNullOrEmpty(s) && s != t && !map.ContainsKey(s)) map[s] = t;
        }

        // The parent is renamed by its singular name (Company -> AccountSubGroup),
        // so imports, types and services match the real files
        // (account-sub-group.model, AccountSubGroupService).
        string tEnt = Names.Singular(target.Entity);

        Add(sEnt, tEnt);
        Add(Names.Camel(sEnt), Names.Camel(tEnt));

        // Same text as the camelCase name (Company / company): Apply picks by context
        string kKey = Names.Kebab(sEnt);
        string kVal = Names.Kebab(tEnt);

        if (map.TryGetValue(kKey, out var existingKebab) && existingKebab != kVal)
        {
            if (map is NameMap nameMap) nameMap.Kebab[kKey] = kVal;
            else map[kKey] = kVal;
        }
        else
        {
            Add(kKey, kVal);
        }

        AddIfAbsent(Names.Spaced(sEnt), Names.Spaced(tEnt));
        AddIfAbsent(Names.Spaced(sEnt).ToLowerInvariant(), Names.Spaced(tEnt).ToLowerInvariant());

        // The key keeps the exact name typed in the wizard (AccountSubGroupsId)
        Add(sFk, target.ForeignKey);
        Add(Names.Camel(sFk), Names.Camel(target.ForeignKey));

        Add(sEnt + "Code", target.CodeProperty);
        Add(Names.Camel(sEnt) + "Code", Names.Camel(target.CodeProperty));
    }

    //===========================================================
    // Engine hook
    //===========================================================

    public static string Transform(
        string key, string text, PageCloneBlueprint bp,
        string target, string targetSingular,
        ParentInfo? parent, List<string> warnings)
    {
        if (key != "backend.repository") return text;

        string id = targetSingular + "Id";

        text = ReplaceNextCode(text, bp, target, targetSingular, parent, warnings);
        text = ReplaceProjection(text, bp, id, warnings);
        text = ReplaceCreate(text, bp, id, targetSingular, warnings);
        text = ReplaceUpdate(text, bp, id, warnings);
        text = FixParentLookups(text, parent);

        return text;
    }

    //===========================================================
    // Parent lookups in Create / Update
    //
    // The rename-copy turns  x.CompanyId == dto.CompanyId  into
    // x.AccountSubGroupsId == dto.AccountSubGroupsId, but on the
    // PARENT entity the key is its own id property
    // (AccountSubGroupId). Only the parent lookups have the form
    // x.<fk> == dto.<fk>, so they are safe to fix by pattern.
    //===========================================================

    private static string FixParentLookups(string text, ParentInfo? parent)
    {
        if (parent == null
            || string.IsNullOrWhiteSpace(parent.ForeignKey)
            || string.Equals(parent.IdProperty, parent.ForeignKey, StringComparison.Ordinal))
            return text;

        string fk = Regex.Escape(parent.ForeignKey);

        return Regex.Replace(
            text,
            $@"\bx\.{fk}(\s*==\s*dto\.{fk})\b",
            m => $"x.{parent.IdProperty}{m.Groups[1].Value}");
    }

    //===========================================================
    // Projection:  X = x.X,
    //===========================================================

    private static string ReplaceProjection(
        string text, PageCloneBlueprint bp, string id, List<string> warnings)
    {
        var sb = new StringBuilder();

        foreach (var f in FieldBlockGenerator.Active(bp))
        {
            sb.AppendLine($"                        {f.Name} =");
            sb.AppendLine($"                            x.{f.Name},");
            sb.AppendLine();
        }

        int anchor = Math.Max(0, text.IndexOf("IQueryable<", StringComparison.Ordinal));

        return ReplaceInBraceBlock(
            text, anchor, @"new\s+\w+Dto\b", sb.ToString(), id, warnings, "backend.repository (query)");
    }

    //===========================================================
    // Create entity block:  X = dto.X,
    //===========================================================

    private static string ReplaceCreate(
        string text, PageCloneBlueprint bp, string id, string singular, List<string> warnings)
    {
        string codeProp = CodeProperty(bp, singular);
        string local = Names.Camel(codeProp);
        bool hasLocal = text.Contains("string " + local, StringComparison.Ordinal);

        var sb = new StringBuilder();

        foreach (var f in FieldBlockGenerator.Active(bp))
        {
            string value;

            if (hasLocal && f.Name == codeProp)
                value = local;
            else if (FieldBlockGenerator.CsType(f) == "string")
                value = $"dto.{f.Name}?.Trim()\r\n                    ??\r\n                    string.Empty";
            else
                value = $"dto.{f.Name}";

            sb.AppendLine($"                {f.Name} =");
            sb.AppendLine($"                    {value},");
            sb.AppendLine();
        }

        int anchor = Math.Max(0, text.IndexOf("CreateAsync", StringComparison.Ordinal));

        return ReplaceInBraceBlock(
            text, anchor, @"new\s+\w+Entity\b", sb.ToString(), id, warnings, "backend.repository (create)");
    }

    //===========================================================
    // Update assignments:  entity.X = dto.X;
    //===========================================================

    private static string ReplaceUpdate(
        string text, PageCloneBlueprint bp, string id, List<string> warnings)
    {
        int from = text.IndexOf("UpdateAsync", StringComparison.Ordinal);

        if (from < 0)
        {
            warnings.Add("backend.repository: UpdateAsync not found; update assignments were rename-copied only.");
            return text;
        }

        var sb = new StringBuilder();

        foreach (var f in FieldBlockGenerator.Active(bp))
        {
            string value = FieldBlockGenerator.CsType(f) == "string"
                ? $"dto.{f.Name}?.Trim()\r\n            ??\r\n            string.Empty"
                : $"dto.{f.Name}";

            sb.AppendLine($"        entity.{f.Name} =");
            sb.AppendLine($"            {value};");
            sb.AppendLine();
        }

        string head = text[..from];
        string tail = text[from..];

        var all = UpdateRx.Matches(tail);

        var first = all.FirstOrDefault(m =>
            !m.Groups[1].Value.Equals(id, StringComparison.OrdinalIgnoreCase)
            && !FieldBlockGenerator.System.Contains(m.Groups[1].Value));

        var system = all.FirstOrDefault(m =>
            FieldBlockGenerator.System.Contains(m.Groups[1].Value));

        if (first == null || system == null || system.Index <= first.Index)
        {
            warnings.Add("backend.repository (update): assignment region not found; rename-copied only.");
            return text;
        }

        int start = FieldBlockGenerator.BannerStart(tail, first.Index);
        int end = FieldBlockGenerator.BannerStart(tail, system.Index);

        if (end <= start) return text;

        return head + tail[..start] + sb + "\r\n" + tail[end..];
    }

    //===========================================================
    // Replace assignments inside  new X { ... }  after an anchor
    //===========================================================

    private static string ReplaceInBraceBlock(
        string text, int anchor, string newRx, string block,
        string id, List<string> warnings, string label)
    {
        var nm = Regex.Match(text[anchor..], newRx);

        if (!nm.Success)
        {
            warnings.Add($"{label}: block not found; rename-copied only.");
            return text;
        }

        int open = text.IndexOf('{', anchor + nm.Index);
        if (open < 0) return text;

        int depth = 0, close = -1;

        for (int i = open; i < text.Length; i++)
        {
            if (text[i] == '{') depth++;
            else if (text[i] == '}' && --depth == 0) { close = i; break; }
        }

        if (close < 0) return text;

        string inner = text[(open + 1)..close];
        var all = AssignRx.Matches(inner);

        var first = all.FirstOrDefault(m =>
            !m.Groups[1].Value.Equals(id, StringComparison.OrdinalIgnoreCase)
            && !FieldBlockGenerator.System.Contains(m.Groups[1].Value));

        var system = all.FirstOrDefault(m =>
            FieldBlockGenerator.System.Contains(m.Groups[1].Value));

        if (first == null || system == null || system.Index <= first.Index)
        {
            warnings.Add($"{label}: field region not found; rename-copied only.");
            return text;
        }

        int start = FieldBlockGenerator.BannerStart(inner, first.Index);
        int end = FieldBlockGenerator.BannerStart(inner, system.Index);

        if (end <= start) return text;

        string newInner = inner[..start] + block + inner[end..];

        return text[..(open + 1)] + newInner + text[close..];
    }

    //===========================================================
    // GetNextCodeAsync
    //===========================================================

    private static string ReplaceNextCode(
        string text, PageCloneBlueprint bp, string target, string singular,
        ParentInfo? parent, List<string> warnings)
    {
        if (!bp.WriteCodeGeneratorMethod || string.IsNullOrWhiteSpace(bp.Code?.Prefix))
            return text;

        var sig = Regex.Match(text, @"public\s+async\s+Task<string>\s*GetNextCodeAsync");

        if (!sig.Success)
        {
            warnings.Add("backend.repository: GetNextCodeAsync not found; code number method not rebuilt.");
            return text;
        }

        int open = text.IndexOf('{', sig.Index);
        int depth = 0, close = -1;

        for (int i = open; i < text.Length; i++)
        {
            if (text[i] == '{') depth++;
            else if (text[i] == '}' && --depth == 0) { close = i; break; }
        }

        if (open < 0 || close < 0) return text;

        string method = BuildNextCode(bp, target, singular, parent, warnings);

        return text[..sig.Index] + method + text[(close + 1)..];
    }

    private static string BuildNextCode(
        PageCloneBlueprint bp, string target, string singular,
        ParentInfo? parent, List<string> warnings)
    {
        string codeProp = CodeProperty(bp, singular);
        string alias = target + "Entity";
        string prefix = bp.Code.Prefix;
        string call = bp.Code.MethodName;

        bool hasParent = parent != null;
        int n = hasParent ? bp.Code.Segments.Count : 0;

        var sb = new StringBuilder();

        string fk = hasParent ? Names.Camel(parent!.ForeignKey) : "";

        sb.AppendLine(hasParent
            ? $"public async Task<string>\r\n        GetNextCodeAsync(\r\n            long {fk})"
            : "public async Task<string>\r\n        GetNextCodeAsync()");

        sb.AppendLine("    {");

        if (hasParent)
        {
            // Messages read "Account Sub Group not found." (singular)
            string parentText = Names.Spaced(Names.Singular(parent!.Entity));

            sb.AppendLine($"        var parent =");
            sb.AppendLine($"            await _context.Set<global::{parent.Namespace}.{parent.ClassName}>()");
            sb.AppendLine("                .AsNoTracking()");
            sb.AppendLine($"                .FirstOrDefaultAsync(x => x.{parent.IdProperty} == {fk} && !x.IsDeleted);");
            sb.AppendLine();
            sb.AppendLine("        if (parent == null)");
            sb.AppendLine($"            throw new KeyNotFoundException(\"{parentText} not found.\");");
            sb.AppendLine();
            sb.AppendLine($"        string[] parentParts =");
            sb.AppendLine($"            (parent.{parent.CodeProperty}?.Trim() ?? string.Empty)");
            sb.AppendLine("                .Split('-', StringSplitOptions.RemoveEmptyEntries);");
            sb.AppendLine();
            sb.AppendLine($"        if (parentParts.Length != {n + 1})");
            sb.AppendLine($"            throw new InvalidOperationException(\"Invalid {parentText.ToLowerInvariant()} code.\");");
            sb.AppendLine();
            sb.AppendLine($"        int[] seg = new int[{n}];");
            sb.AppendLine();
            sb.AppendLine($"        for (int i = 0; i < {n}; i++)");
            sb.AppendLine("        {");
            sb.AppendLine("            if (!int.TryParse(parentParts[i + 1].Trim(), out seg[i]) || seg[i] < 1)");
            sb.AppendLine($"                throw new InvalidOperationException(\"Invalid {parentText.ToLowerInvariant()} sequence number.\");");
            sb.AppendLine("        }");
            sb.AppendLine();
            sb.AppendLine($"        List<string> existingCodes =");
            sb.AppendLine($"            await _context.Set<{alias}>()");
            sb.AppendLine("                .AsNoTracking()");
            sb.AppendLine($"                .Where(x => !x.IsDeleted && x.{parent.ForeignKey} == {fk})");
            sb.AppendLine($"                .Select(x => x.{codeProp})");
            sb.AppendLine("                .ToListAsync();");
        }
        else
        {
            sb.AppendLine($"        List<string> existingCodes =");
            sb.AppendLine($"            await _context.Set<{alias}>()");
            sb.AppendLine("                .AsNoTracking()");
            sb.AppendLine("                .Where(x => !x.IsDeleted)");
            sb.AppendLine($"                .Select(x => x.{codeProp})");
            sb.AppendLine("                .ToListAsync();");
        }

        sb.AppendLine();
        sb.AppendLine("        int highest = 0;");
        sb.AppendLine();
        sb.AppendLine("        foreach (string code in existingCodes)");
        sb.AppendLine("        {");
        sb.AppendLine("            if (string.IsNullOrWhiteSpace(code)) continue;");
        sb.AppendLine();
        sb.AppendLine("            string[] parts = code.Split('-', StringSplitOptions.RemoveEmptyEntries);");
        sb.AppendLine();
        sb.AppendLine($"            if (parts.Length != {n + 2}) continue;");
        sb.AppendLine();
        sb.AppendLine($"            if (!string.Equals(parts[0].Trim(), \"{prefix}\", StringComparison.OrdinalIgnoreCase)) continue;");

        if (n > 0)
        {
            sb.AppendLine();
            sb.AppendLine("            bool same = true;");
            sb.AppendLine();
            sb.AppendLine($"            for (int i = 0; i < {n}; i++)");
            sb.AppendLine("            {");
            sb.AppendLine("                if (!int.TryParse(parts[i + 1].Trim(), out int v) || v != seg[i]) { same = false; break; }");
            sb.AppendLine("            }");
            sb.AppendLine();
            sb.AppendLine("            if (!same) continue;");
        }

        sb.AppendLine();
        sb.AppendLine($"            if (int.TryParse(parts[{n + 1}].Trim(), out int sequenceNo) && sequenceNo > highest)");
        sb.AppendLine("                highest = sequenceNo;");
        sb.AppendLine("        }");
        sb.AppendLine();

        var args = new List<string>();
        for (int i = 0; i < n; i++) args.Add($"seg[{i}]");
        args.Add("highest + 1");

        sb.AppendLine($"        return CodeGenerator.{call}({string.Join(", ", args)});");
        sb.Append("    }");

        return sb.ToString();
    }

    //===========================================================
    // The field that holds the generated code
    //===========================================================

    private static string CodeProperty(PageCloneBlueprint bp, string singular)
    {
        var fields = FieldBlockGenerator.Active(bp);

        return fields.FirstOrDefault(f => f.Name == singular + "Code")?.Name
            ?? fields.FirstOrDefault(f => f.Name.EndsWith("Code") && f.Unique)?.Name
            ?? fields.FirstOrDefault(f => f.Name.EndsWith("Code"))?.Name
            ?? singular + "Code";
    }
}