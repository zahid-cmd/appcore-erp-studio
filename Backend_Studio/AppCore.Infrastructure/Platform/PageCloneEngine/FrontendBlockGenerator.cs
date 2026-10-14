using System.Text;
using System.Text.RegularExpressions;

namespace AppCore.Infrastructure.Platform.PageCloneEngine;

//===============================================================
// Frontend Block Generator (step 3)
//
// Rebuilds, from the blueprint:
//   frontend.model       the three interfaces
//   frontend.service     the getAll() normalizer
//   frontend.list.ts     normalize, columns, search filter
//   frontend.form.ts     entity literals, load mapping, create/update
//                        models, validation, missing control imports
//   frontend.form.html   the form sections and controls
//
// The parent dropdown, its loader and its change handler are kept
// from the source form (renamed by the engine's parent map).
// The parent is always referred to by its SINGULAR name
// (AccountSubGroup), the same name the engine's parent map uses.
//
// The parent MODEL's own properties (Id / Name / Code) are then
// remapped by FixParentMembers, because they differ from the
// source parent's (CompanyId / CompanyName / ClassCode).
//
// Route segments (Back / Add / Edit / View navigation) are then
// fixed by FixRouteSegments, so they are kebab-case (cash-accounts).
//===============================================================

public static class FrontendBlockGenerator
{
    //===========================================================
    // Engine hook
    //===========================================================

    public static string Transform(
        string key, string text, PageCloneBlueprint bp,
        string singular, List<string> warnings)
    {
        string id = singular + "Id";

        return key switch
        {
            "frontend.model"     => Model(bp, singular),
            "frontend.service"   => Service(text, bp, id, warnings),
            "frontend.list.ts"   => FixRouteSegments(FixParentMembers(ListTs(text, bp, singular, id, warnings), bp), bp),
            "frontend.form.ts"   => FixRouteSegments(FixParentMembers(FormTs(text, bp, singular, id, warnings), bp), bp),
            "frontend.form.html" => FormHtml(text, bp, warnings),
            _ => text
        };
    }

    //===========================================================
    // Small helpers
    //===========================================================

    private static List<CloneField> Fields(PageCloneBlueprint bp) =>
        FieldBlockGenerator.Active(bp);

    private static string Label(string name) =>
        Regex.Replace(name, "(?<=[a-z0-9])(?=[A-Z])", " ");

    private static string Camel(string s) =>
        s.Length == 0 ? s : char.ToLowerInvariant(s[0]) + s[1..];

    private static string Ts(CloneField f) => FieldBlockGenerator.TsType(f);

    private static bool IsBool(CloneField f) => Ts(f) == "boolean";
    private static bool IsNumber(CloneField f) => Ts(f) == "number";
    private static bool IsString(CloneField f) => Ts(f) == "string";

    private static bool IsParentFk(PageCloneBlueprint bp, CloneField f) =>
        bp.Parent != null && bp.Parent.HasParent
        && string.Equals(bp.Parent.ForeignKey, f.Name, StringComparison.OrdinalIgnoreCase);

    // The parent's singular name (AccountSubGroups -> AccountSubGroup), or "" when there is none
    private static string ParentName(PageCloneBlueprint bp) =>
        bp.Parent != null && bp.Parent.HasParent && !string.IsNullOrWhiteSpace(bp.Parent.Entity)
            ? Names.Singular(bp.Parent.Entity)
            : "";

    // AccountSubGroup -> SubGroup (the Name / Code properties of a
    // cascade entity usually drop the "Account" prefix)
    private static string ParentShort(string parentSingular) =>
        parentSingular.StartsWith("Account", StringComparison.Ordinal) && parentSingular.Length > 7
            ? parentSingular[7..]
            : parentSingular;

    private static bool IsCode(CloneField f) =>
        f.Name.EndsWith("Code", StringComparison.Ordinal);

    private static string DefaultLiteral(CloneField f)
    {
        if (IsBool(f))
        {
            string d = (f.DefaultValue ?? "").Trim().ToLowerInvariant();
            if (d is "true" or "false") return d;
            return f.Name == "IsActive" ? "true" : "false";
        }

        return IsNumber(f) ? "0" : "''";
    }

    //===========================================================
    // Route segments
    //
    // Route segments are kebab-case (cash-accounts). For a single-word
    // source such as Wings, the camel and kebab names are identical
    // (wings), so the engine's name map can only hold one of them and
    // a route can come out as 'cashAccounts'.
    //
    // A quoted literal that is exactly the camelCase target name is a
    // route segment, so it is rewritten to the kebab-case name.
    // Only whole literals are touched, so  cashAccountsService  and
    // 'cashAccountsItems'  style names are never affected.
    //===========================================================

    private static string FixRouteSegments(string text, PageCloneBlueprint bp)
    {
        string entity = Names.Clean(bp.EntityName ?? "");

        if (entity.Length == 0) return text;

        string camel = Camel(entity);
        string kebab = Names.Kebab(entity);

        if (camel == kebab) return text;

        return Regex.Replace(
            text,
            "(?<q>['\"])" + Regex.Escape(camel) + "\\k<q>",
            m => m.Groups["q"].Value + kebab + m.Groups["q"].Value);
    }

    //===========================================================
    // Parent model properties
    //
    // The source form / list read the SOURCE parent's properties
    // (company.CompanyId, company.CompanyName, company.ClassCode).
    // After the rename they point at names the new parent model
    // does not have (accountSubGroup.AccountSubGroupsId ...).
    //
    // Member accesses on the parent variable (singular or plural
    // camelCase name) are rewritten by suffix:
    //     ...Id    -> {Parent}Id          AccountSubGroupId
    //     ...Name  -> {Short}Name         SubGroupName
    //     ...Code  -> {Short}Code         SubGroupCode
    //
    // Only  variable.Member  with a capitalised member is touched,
    // so  accountSubGroups.length / .map  and  accountSubGroupsService
    // are never affected.
    //===========================================================

    private static string FixParentMembers(string text, PageCloneBlueprint bp)
    {
        string sing = ParentName(bp);

        if (sing.Length == 0) return text;

        string idProp = sing + "Id";
        string nameProp = ParentShort(sing) + "Name";
        string codeProp = ParentShort(sing) + "Code";

        var vars = new HashSet<string>(StringComparer.Ordinal)
        {
            Camel(sing),
            Camel(bp.Parent!.Entity)
        };

        string alt = string.Join("|", vars.Select(Regex.Escape));

        return Regex.Replace(
            text,
            $@"\b({alt})\.([A-Z]\w*)\b",
            m =>
            {
                string member = m.Groups[2].Value;

                string mapped =
                    member.EndsWith("Id", StringComparison.Ordinal)   ? idProp :
                    member.EndsWith("Name", StringComparison.Ordinal) ? nameProp :
                    member.EndsWith("Code", StringComparison.Ordinal) ? codeProp :
                    member;

                return m.Groups[1].Value + "." + mapped;
            });
    }

    //===========================================================
    // Replace the inside of every  anchor { ... }  literal
    //===========================================================

    private static string ReplaceLiterals(
        string text, Regex anchor, Func<string, string?> bodyFor)
    {
        int pos = 0;

        while (true)
        {
            var m = anchor.Match(text, pos);
            if (!m.Success) break;

            int open = m.Index + m.Length - 1;
            int depth = 0, close = -1;

            for (int i = open; i < text.Length; i++)
            {
                if (text[i] == '{') depth++;
                else if (text[i] == '}' && --depth == 0) { close = i; break; }
            }

            if (close < 0) break;

            string inner = text[(open + 1)..close];
            string? replacement = bodyFor(inner);

            if (replacement == null) { pos = close + 1; continue; }

            text = text[..(open + 1)] + replacement + text[close..];
            pos = open + 1 + replacement.Length;
        }

        return text;
    }

    //===========================================================
    // MODEL
    //===========================================================

    private static string Model(PageCloneBlueprint bp, string s)
    {
        var sb = new StringBuilder();
        string title = string.IsNullOrWhiteSpace(bp.DisplayName) ? Label(s) : bp.DisplayName;

        void Header(string t)
        {
            sb.AppendLine("//===============================================================");
            sb.AppendLine($"// {t}");
            sb.AppendLine("//===============================================================");
            sb.AppendLine();
        }

        void Iface(string name, bool withId)
        {
            sb.AppendLine($"export interface {name}");
            sb.AppendLine("{");
            if (withId) sb.AppendLine($"    {s}Id: number;\r\n");

            foreach (var f in Fields(bp))
                sb.AppendLine($"    {f.Name}: {Ts(f)};\r\n");

            sb.AppendLine("}");
            sb.AppendLine();
            sb.AppendLine();
        }

        Header($"{title}");
        Iface(s, true);

        Header($"Create {title}");
        Iface("Create" + s, false);

        Header($"Update {title}");
        Iface("Update" + s, true);

        return sb.ToString().TrimEnd() + "\r\n";
    }

    //===========================================================
    // SERVICE: getAll() normalizer
    //===========================================================

    private static string Service(string text, PageCloneBlueprint bp, string id, List<string> warnings)
    {
        var anchor = new Regex(@"\(\s*\{\s*\.\.\.(\w+)\s*,");
        var m = anchor.Match(text);

        if (!m.Success)
        {
            warnings.Add("frontend.service: normalizer not found; rename-copied only.");
            return text;
        }

        string v = m.Groups[1].Value;
        int open = m.Index + m.Value.IndexOf('{');
        int depth = 0, close = -1;

        for (int i = open; i < text.Length; i++)
        {
            if (text[i] == '{') depth++;
            else if (text[i] == '}' && --depth == 0) { close = i; break; }
        }

        if (close < 0) return text;

        var sb = new StringBuilder();
        sb.AppendLine();
        sb.AppendLine($"                                ...{v},");
        sb.AppendLine();
        sb.AppendLine($"                                {id}:");
        sb.AppendLine($"                                    Number({v}.{id} ?? {v}.{Camel(id)} ?? {v}.id ?? {v}.Id),");

        var all = Fields(bp);
        foreach (var f in all)
        {
            string n = f.Name, c = Camel(n);
            string expr = IsNumber(f) ? $"Number({v}.{n} ?? {v}.{c} ?? 0)"
                        : IsBool(f)   ? $"Boolean({v}.{n} ?? {v}.{c} ?? {DefaultLiteral(f)})"
                        :               $"{v}.{n} ?? {v}.{c} ?? ''";

            sb.AppendLine();
            sb.AppendLine($"                                {n}:");
            sb.AppendLine($"                                    {expr}{(f == all[^1] ? "" : ",")}");
        }

        sb.Append("                            ");

        return text[..(open + 1)] + sb + text[close..];
    }

    //===========================================================
    // LIST (ts)
    //===========================================================

    private static string ListTs(string text, PageCloneBlueprint bp, string s, string id, List<string> warnings)
    {
        var all = Fields(bp);
        string parent = ParentName(bp);

        // --- normalize: return { ... };
        var norm = new Regex(@"return\s*\{");
        int idx = text.IndexOf("normalize" + s, StringComparison.Ordinal);

        if (idx < 0)
        {
            warnings.Add($"frontend.list.ts: normalize{s} not found; rename-copied only.");
        }
        else
        {
            var m = norm.Match(text, idx);

            if (m.Success)
            {
                string pre = text[..m.Index];
                string tail = text[m.Index..];

                tail = ReplaceLiterals(tail, new Regex(@"^return\s*\{"), _ =>
                {
                    var sb = new StringBuilder();
                    sb.AppendLine();
                    sb.AppendLine($"            {id}:");
                    sb.AppendLine($"                Number(item?.{id} ?? item?.{Camel(id)} ?? 0),");

                    foreach (var f in all)
                    {
                        string n = f.Name, c = Camel(n);
                        string expr = IsNumber(f) ? $"Number(item?.{n} ?? item?.{c} ?? 0)"
                                    : IsBool(f)   ? $"Boolean(item?.{n} ?? item?.{c} ?? {DefaultLiteral(f)})"
                                    :               $"item?.{n} ?? item?.{c} ?? ''";

                        sb.AppendLine();
                        sb.AppendLine($"            {n}:");
                        sb.AppendLine($"                {expr},");

                        if (IsParentFk(bp, f) && parent.Length > 0)
                        {
                            sb.AppendLine();
                            sb.AppendLine($"            {parent}Name:");
                            sb.AppendLine($"                this.get{parent}Name(Number(item?.{n} ?? item?.{c} ?? 0)),");
                        }
                    }

                    string r = sb.ToString().TrimEnd();
                    if (r.EndsWith(",")) r = r[..^1];
                    return r + "\r\n        ";
                });

                text = pre + tail;
            }
        }

        // --- columns
        var cols = new StringBuilder();
        cols.AppendLine();
        cols.AppendLine("        {\r\n            header:'#',\r\n\r\n            field:'serial',\r\n\r\n            type:'serial',\r\n\r\n            width:'80px',\r\n\r\n            align:'center'\r\n        },");

        foreach (var f in all)
        {
            string header = Label(f.Name);
            string field = f.Name;
            string align = "left";
            string width = "";
            string type = "";

            if (IsParentFk(bp, f) && parent.Length > 0)
            {
                header = Label(parent);
                field = parent + "Name";
                width = "280px";
            }
            else if (f.Name == "IsActive")
            {
                align = "center"; width = "200px"; type = "status";
            }
            else if (IsCode(f)) { align = "center"; width = "280px"; }
            else if (f.Name == "Remarks") { width = "350px"; }
            else if (IsBool(f) || IsNumber(f)) { align = "center"; width = "200px"; }

            cols.AppendLine();
            cols.AppendLine("        {");
            cols.AppendLine($"            header:'{header}',");
            cols.AppendLine();
            cols.AppendLine($"            field:'{field}',");
            if (width.Length > 0) { cols.AppendLine(); cols.AppendLine($"            width:'{width}',"); }
            if (type.Length > 0)  { cols.AppendLine(); cols.AppendLine($"            type:'{type}',"); }
            cols.AppendLine();
            cols.AppendLine($"            align:'{align}'");
            cols.AppendLine("        },");
        }

        cols.AppendLine();
        cols.AppendLine("        {\r\n            header:'Actions',\r\n\r\n            field:'actions',\r\n\r\n            type:'actions',\r\n\r\n            width:'150px',\r\n\r\n            align:'center'\r\n        }");
        cols.Append("    ");

        var colsRx = new Regex(@"columns\s*:\s*ListTableColumn\[\]\s*=\s*\[");
        var cm = colsRx.Match(text);

        if (cm.Success)
        {
            int open = cm.Index + cm.Length - 1;
            int depth = 0, close = -1;

            for (int i = open; i < text.Length; i++)
            {
                if (text[i] == '[') depth++;
                else if (text[i] == ']' && --depth == 0) { close = i; break; }
            }

            if (close > 0) text = text[..(open + 1)] + cols + text[close..];
        }
        else warnings.Add("frontend.list.ts: columns array not found; rename-copied only.");

        // --- search filter: replace the body of the filter callback
        var flt = new Regex(@"\)\s*:\s*boolean\s*=>\s*\{");
        int af = text.IndexOf("applyFilters", StringComparison.Ordinal);
        var fm = af >= 0 ? flt.Match(text, af) : Match.Empty;
        int ret = fm.Success ? text.IndexOf("return searchMatch;", fm.Index, StringComparison.Ordinal) : -1;

        if (fm.Success && ret > 0)
        {
            var parts = new List<string>();
            foreach (var f in all)
            {
                if (IsParentFk(bp, f) && parent.Length > 0)
                    parts.Add($"item.{parent}Name");
                else if (f.Name != "IsActive")
                    parts.Add($"item.{f.Name}");
            }

            bool hasStatus = all.Any(f => f.Name == "IsActive");

            var b = new StringBuilder();
            b.AppendLine();
            b.AppendLine("                    const values:");
            b.AppendLine("                        unknown[] =");
            b.AppendLine("                    [");
            b.AppendLine("                        " + string.Join(",\r\n                        ", parts));
            b.AppendLine("                    ];");
            b.AppendLine();
            b.AppendLine("                    const searchMatch =");
            b.AppendLine("                        !keyword");
            b.AppendLine("                        ||");
            b.AppendLine("                        values.some(");
            b.AppendLine("                            value =>");
            b.AppendLine("                                String(value ?? '')");
            b.AppendLine("                                    .toLowerCase()");
            b.AppendLine("                                    .includes(keyword)");
            b.AppendLine("                        )");
            if (hasStatus)
            {
                b.AppendLine("                        ||");
                b.AppendLine("                        (item.IsActive ? 'active' : 'inactive')");
                b.AppendLine("                            .includes(keyword);");
            }
            else b.AppendLine("                    ;");
            b.AppendLine();
            b.Append("                    ");

            text = text[..(fm.Index + fm.Length)] + b + text[ret..];
        }
        else warnings.Add("frontend.list.ts: search filter not found; rename-copied only.");

        if (parent.Length > 0)
            warnings.Add($"frontend.list.ts: parent lookup (service, name map) is copied from the source list. Parent properties were mapped to {parent}Id / {ParentShort(parent)}Name. Check they match the parent model.");

        return text;
    }

    //===========================================================
    // FORM (ts)
    //===========================================================

    private static string FormTs(string text, PageCloneBlueprint bp, string s, string id, List<string> warnings)
    {
        var all = Fields(bp);

        string Defaults()
        {
            var sb = new StringBuilder("\r\n");
            sb.AppendLine($"        {id}:0,");
            foreach (var f in all)
            {
                sb.AppendLine();
                sb.AppendLine($"        {f.Name}:{DefaultLiteral(f)},");
            }
            string r = sb.ToString().TrimEnd();
            return r[..^1] + "\r\n    ";
        }

        string Load()
        {
            var sb = new StringBuilder("\r\n");
            sb.AppendLine($"                        {id}:");
            sb.AppendLine($"                            Number(response?.{id} ?? response?.{Camel(id)} ?? 0),");
            foreach (var f in all)
            {
                string n = f.Name, c = Camel(n);
                string expr = IsNumber(f) ? $"Number(response?.{n} ?? response?.{c} ?? 0)"
                            : IsBool(f)   ? $"Boolean(response?.{n} ?? response?.{c} ?? {DefaultLiteral(f)})"
                            :               $"response?.{n} ?? response?.{c} ?? ''";
                sb.AppendLine();
                sb.AppendLine($"                        {n}:");
                sb.AppendLine($"                            {expr},");
            }
            string r = sb.ToString().TrimEnd();
            return r[..^1] + "\r\n                    ";
        }

        string ModelLiteral(bool withId)
        {
            var sb = new StringBuilder("\r\n");
            if (withId)
            {
                sb.AppendLine($"            {id}:");
                sb.AppendLine($"                this.entity.{id},");
            }
            foreach (var f in all)
            {
                string v = IsString(f)
                    ? $"this.entity.{f.Name}?.trim() ?? ''"
                    : $"this.entity.{f.Name}";
                sb.AppendLine();
                sb.AppendLine($"            {f.Name}:");
                sb.AppendLine($"                {v},");
            }
            string r = sb.ToString().TrimEnd();
            return r[..^1] + "\r\n        ";
        }

        // entity: X = { ... }
        text = ReplaceLiterals(text, new Regex(@"\bentity\s*:\s*\w+\s*=\s*\{"), _ => Defaults());

        // this.entity = { ... }   (defaults, or load mapping when it reads "response")
        text = ReplaceLiterals(text, new Regex(@"this\.entity\s*=\s*\{"),
            inner => inner.Contains("response") ? Load() : Defaults());

        // const model: CreateX = { ... } / UpdateX
        text = ReplaceLiterals(text, new Regex(@"const\s+model\s*:\s*Create\w+\s*=\s*\{"), _ => ModelLiteral(false));
        text = ReplaceLiterals(text, new Regex(@"const\s+model\s*:\s*Update\w+\s*=\s*\{"), _ => ModelLiteral(true));

        // Validation block
        var vs = Regex.Match(text, @"//=+[ \t]*\r?\n[ \t]*// Validation[ \t]*\r?\n[ \t]*//=+");
        var ve = vs.Success
            ? Regex.Match(text[(vs.Index + vs.Length)..], @"//=+[ \t]*\r?\n[ \t]*// Add[ \t]*\r?\n[ \t]*//=+")
            : Match.Empty;

        if (vs.Success && ve.Success)
        {
            var sb = new StringBuilder();
            sb.AppendLine(vs.Value);
            sb.AppendLine();

            foreach (var f in all.Where(x => x.Required && !IsBool(x)))
            {
                string cond = IsString(f)   ? $"!this.entity.{f.Name}?.trim()"
                            : IsNumber(f)   ? $"!this.entity.{f.Name}\r\n            ||\r\n            this.entity.{f.Name} <= 0"
                            :                 $"!this.entity.{f.Name}";

                sb.AppendLine("        if");
                sb.AppendLine("        (");
                sb.AppendLine($"            {cond}");
                sb.AppendLine("        )");
                sb.AppendLine("        {");
                sb.AppendLine("            this.toast.error(");
                sb.AppendLine("                'Validation',");
                sb.AppendLine();
                sb.AppendLine($"                '{Label(f.Name)} is required.'");
                sb.AppendLine("            );");
                sb.AppendLine();
                sb.AppendLine("            return;");
                sb.AppendLine("        }");
                sb.AppendLine();
                sb.AppendLine();
            }

            int endAt = vs.Index + vs.Length + ve.Index;
            text = text[..vs.Index] + sb.ToString().TrimStart() + "\r\n        " + text[endAt..];
        }
        else warnings.Add("frontend.form.ts: validation block not found; rename-copied only.");

        // Yes/No items for non-status booleans
        if (all.Any(f => IsBool(f) && f.Name != "IsActive") && !text.Contains("yesNoItems", StringComparison.Ordinal))
        {
            var em = Regex.Match(text, @"[ \t]*//=+[ \t]*\r?\n[ \t]*// Entity[ \t]*\r?\n[ \t]*//=+");
            string items =
                "    //===========================================================\r\n" +
                "    // Yes / No Items\r\n" +
                "    //===========================================================\r\n\r\n" +
                "    yesNoItems:\r\n        any[] =\r\n    [\r\n        { label:'Yes', value:true },\r\n\r\n        { label:'No', value:false }\r\n    ];\r\n\r\n\r\n";

            if (em.Success) text = text.Insert(em.Index, items);
            else warnings.Add("frontend.form.ts: could not add yesNoItems; add it by hand.");
        }

        // Missing control imports
        EnsureControl(ref text, "TextboxComponent", "textbox/textbox", all.Count > 0, warnings);
        EnsureControl(ref text, "TextareaComponent", "textarea/textarea",
            all.Any(f => ControlKind(bp, f) == "textarea"), warnings);
        EnsureControl(ref text, "DropdownComponent", "dropdown/dropdown",
            all.Any(f => ControlKind(bp, f) == "dropdown"), warnings);
        EnsureControl(ref text, "SearchDropdownComponent", "search-dropdown/search-dropdown",
            all.Any(f => ControlKind(bp, f) == "search"), warnings);

        warnings.Add("frontend.form.ts: parent loading and change handlers are copied from the source form. Multi-level parent cascades (class > group) need a manual check.");

        return text;
    }

    private static void EnsureControl(
        ref string text, string component, string path, bool needed, List<string> warnings)
    {
        if (!needed || text.Contains(component, StringComparison.Ordinal)) return;

        var basePath = Regex.Match(text, @"from\s*'((?:\.\./)+shared/components/controls)/");

        if (!basePath.Success)
        {
            warnings.Add($"frontend.form.ts: {component} is needed but no controls import path was found. Add it by hand.");
            return;
        }

        string import =
            $"import\r\n{{\r\n    {component}\r\n}}\r\nfrom '{basePath.Groups[1].Value}/{path}';\r\n\r\n";

        var anchor = Regex.Match(text, @"//=+[ \t]*\r?\n[ \t]*// Utilities");
        int at = anchor.Success ? anchor.Index : 0;
        text = text.Insert(at, import);

        // add to the component imports array, after DropdownComponent / TextboxComponent
        var arr = Regex.Match(text, @"(TextboxComponent|DropdownComponent|TextareaComponent),");

        if (arr.Success)
            text = text.Insert(arr.Index + arr.Length, $"\r\n\r\n        {component},");
        else
            warnings.Add($"frontend.form.ts: add {component} to the component imports array by hand.");
    }

    //===========================================================
    // FORM (html)
    //===========================================================

    private static string ControlKind(PageCloneBlueprint bp, CloneField f)
    {
        string c = (f.Control ?? "").Trim().ToLowerInvariant();

        if (IsCode(f)) return "code";
        if (IsParentFk(bp, f)) return c.Contains("search") ? "search" : "dropdown";
        if (IsBool(f)) return "dropdown";
        if (c.Contains("area") || f.MaxLength is >= 500) return "textarea";
        return "textbox";
    }

    private static string Control(PageCloneBlueprint bp, CloneField f)
    {
        string kind = ControlKind(bp, f);
        string label = Label(f.Name);
        string ind = "                ";
        string reqLine = f.Required ? "\r\n\r\n" + ind + "    [required]=\"true\"" : "";
        var sb = new StringBuilder();

        sb.AppendLine($"{ind}<!-- {label} -->");
        sb.AppendLine();

        switch (kind)
        {
            case "code":
                sb.AppendLine($"{ind}<app-textbox\r\n\r\n{ind}    label=\"{label}\"\r\n\r\n{ind}    placeholder=\"Auto generated\"\r\n\r\n{ind}    [(value)]=\"entity.{f.Name}\"\r\n\r\n{ind}    [readonly]=\"true\"{reqLine}>\r\n\r\n{ind}</app-textbox>");
                break;

            case "dropdown":
            case "search":
            {
                string tag = kind == "search" ? "app-search-dropdown" : "app-dropdown";
                string items;
                string change;

                if (IsParentFk(bp, f))
                {
                    string p = ParentName(bp);
                    items = Camel(p) + "Items";
                    change = $"(valueChange)=\"on{p}Change($event)\"";
                    label = Label(p);
                }
                else
                {
                    items = f.Name == "IsActive" ? "statusItems" : "yesNoItems";
                    change = "(valueChange)=\"onValueChange()\"";
                }

                sb.AppendLine($"{ind}<{tag}\r\n\r\n{ind}    label=\"{label}\"\r\n\r\n{ind}    [items]=\"{items}\"\r\n\r\n{ind}    [(value)]=\"entity.{f.Name}\"\r\n\r\n{ind}    {change}\r\n\r\n{ind}    [disabled]=\"isViewMode\"{reqLine}>\r\n\r\n{ind}</{tag}>");
                break;
            }

            case "textarea":
                sb.AppendLine($"{ind}<app-textarea\r\n\r\n{ind}    label=\"{label}\"\r\n\r\n{ind}    placeholder=\"Enter {label.ToLowerInvariant()}\"\r\n\r\n{ind}    [rows]=\"4\"\r\n\r\n{ind}    [(value)]=\"entity.{f.Name}\"\r\n\r\n{ind}    (valueChange)=\"onValueChange()\"\r\n\r\n{ind}    [disabled]=\"isViewMode\"{reqLine}>\r\n\r\n{ind}</app-textarea>");
                break;

            default:
                sb.AppendLine($"{ind}<app-textbox\r\n\r\n{ind}    label=\"{label}\"\r\n\r\n{ind}    placeholder=\"Enter {label.ToLowerInvariant()}\"\r\n\r\n{ind}    [(value)]=\"entity.{f.Name}\"\r\n\r\n{ind}    (valueChange)=\"onValueChange()\"\r\n\r\n{ind}    [disabled]=\"isViewMode\"{reqLine}>\r\n\r\n{ind}</app-textbox>");
                break;
        }

        return sb.ToString();
    }

    private static string FormHtml(string text, PageCloneBlueprint bp, List<string> warnings)
    {
        var open = Regex.Match(text, @"<app-form-grid[^>]*>");
        int close = text.IndexOf("</app-form-grid>", StringComparison.Ordinal);

        if (!open.Success || close < 0)
        {
            warnings.Add("frontend.form.html: form grid not found; rename-copied only.");
            return text;
        }

        var all = Fields(bp);

        var parentFields = all.Where(f => IsParentFk(bp, f)).ToList();
        var statusFields = all.Where(f => !IsParentFk(bp, f) && IsBool(f)).ToList();
        var descFields   = all.Where(f => !IsParentFk(bp, f) && !IsBool(f) && ControlKind(bp, f) == "textarea").ToList();
        var infoFields   = all.Except(parentFields).Except(statusFields).Except(descFields).ToList();

        var sb = new StringBuilder();
        int n = 0;

        void Section(string title, string icon, List<CloneField> fields)
        {
            if (fields.Count == 0) return;
            n++;

            sb.AppendLine();
            sb.AppendLine();
            sb.AppendLine("            <!-- =============================================");
            sb.AppendLine($"                 SECTION {n:00}");
            sb.AppendLine($"                 {title.ToUpperInvariant()}");
            sb.AppendLine("            ============================================== -->");
            sb.AppendLine();
            sb.AppendLine($"            <app-form-section\r\n\r\n                title=\"{title}\"\r\n\r\n                icon=\"{icon}\">");
            sb.AppendLine();

            foreach (var f in fields)
            {
                sb.AppendLine();
                sb.AppendLine(Control(bp, f));
            }

            sb.AppendLine("            </app-form-section>");
        }

        string parentName = ParentName(bp);
        string parentTitle = parentName.Length > 0 ? Label(parentName) : "Parent";
        string display = string.IsNullOrWhiteSpace(bp.DisplayName) ? Label(bp.EntityName) : bp.DisplayName;

        Section(parentTitle, "fas fa-sitemap", parentFields);
        Section(display + " Information", "fas fa-layer-group", infoFields);
        Section("Status", "fas fa-toggle-on", statusFields);
        Section("Description", "fas fa-align-left", descFields);

        sb.AppendLine();
        sb.Append("        ");

        return text[..(open.Index + open.Length)] + sb + text[close..];
    }
}