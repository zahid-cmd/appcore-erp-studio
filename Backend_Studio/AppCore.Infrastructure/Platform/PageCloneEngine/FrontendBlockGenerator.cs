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
// FormHtml keeps the SOURCE form's own parent dropdown element
// (SourceParentControl), so a customised source form (reserved
// parent, no change handler) never gets a handler it does not have.
//
// FormHtml keeps the source form's own sections and its own control
// for every field whose wizard control is still the wizard's guess
// (see FormHtmlFromSource), so a customised lookup / status dropdown
// is not turned into a generic textarea or Yes / No dropdown.
//
// The list keeps the display members its item interface declares
// ({Field}Text, for example CollectionAccountText: 'Yes' / 'No'):
// they are written into normalize and used by the columns.
//
// When the clone has NO parent (parent mode Exclude):
//   - StripSourceParent removes the copied source parent from the
//     form ts (import, service, loader, handler, items, loading
//     flag), drops the "parent required" guard of the code
//     generator, calls the code generator when a new record
//     starts, and getNextCode() is called without a parent id.
//   - StripListParent removes the copied source parent from the
//     list ts (import, service, lookup map, loader) and reduces
//     loadItems() to the page's own loader.
//   - NoParentCode drops the parent id from getNextCode and
//     getDefaults in the Angular service, the controller, the
//     repository interface and the repository.
//   - NoParentRepository removes the parent lookups of Create and
//     Update ("Resolve Company") and the repository's using alias
//     of the source parent (using CompanyEntity = ...).
//
// FixNormalizeCollision keeps normalizeWing / normalizeWings apart
// when the target name has the same singular and plural form.
//
// FixCodeName points every {Page}Code and {Page}Name member access
// (BankSetupCode, BankSetupName) at the clone's real code and name
// fields (BankCode, BankName). It runs on the list / form ts and on
// the backend controller and repository.
//
// The parent MODEL's own properties (Id / Name / Code) are then
// remapped by FixParentMembers, because they differ from the
// source parent's (CompanyId / CompanyName / ClassCode).
//
// Route segments (Back / Add / Edit / View navigation) are then
// fixed by FixRouteSegments, so they are kebab-case (cash-accounts).
//
// Plain fields set to Dropdown / Search dropdown in the wizard are
// generated as real dropdowns (see IsListControl), each bound to a
// {field}Items list that is added to the form ts. When the field
// has an entry in Lookups (e.g. Branch), the list is also loaded
// from that service (see WireLookup).
//
// A bool set to "Status dropdown" (or named IsActive / Status) is a
// status field (see IsStatusField): Active / Inactive items, default
// Active, even when the wizard renamed it (IsActive -> Status).
//
// The form has four columns: Parent, Information, Status, Description.
// A field goes to the column chosen in the wizard (CloneField.Section,
// see SectionOf). The parent link field is always in Parent. When no
// section was chosen, the old rule applies (bool -> Status,
// textarea -> Description, the rest -> Information).
//
// Code of EXCLUDED fields in a customised form (required checks,
// assignments, helper methods) is removed by OrphanFieldPruner, which
// runs on the rebuilt form ts; its html bindings are removed from the
// form html. Typed Create / Update payload literals (any variable
// name, or a  buildPayload(): CreateX { return { ... } }  method) are
// rebuilt like  const model: CreateX = { ... }.
//===============================================================

public static class FrontendBlockGenerator
{
    //===========================================================
    // Lookup sources
    //
    // A plain dropdown field whose name is listed here is filled
    // from an existing service instead of an empty list.
    //
    //   Service : the Angular service class
    //   File    : the service file name (without .ts)
    //   Module  : the settings module folder that owns the service
    //   Code    : property shown first in the label
    //   Name    : property shown in the label AND saved as the value
    //
    // To support another field, add one line.
    //===========================================================

    private sealed record LookupSource(
        string Service, string File, string Module, string Code, string Name);

    private static readonly Dictionary<string, LookupSource> Lookups =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["Branch"] = new("BranchesService", "branches.service", "general-settings", "BranchCode", "BranchName")
        };

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
            "frontend.service"   => NoParentCode(FixRenamedFields(Service(text, bp, id, warnings), bp), bp),
            "backend.controller" => FixCodeName(FixRenamedFields(NoParentCode(text, bp), bp), bp, singular),
            "backend.interface"  => NoParentCode(text, bp),
            "backend.repository" => FixCodeName(FixRenamedFields(NoParentRepository(NoParentCode(text, bp), bp, singular), bp), bp, singular),
            "frontend.list.ts"   => FixCodeName(FixRouteSegments(FixParentMembers(OrphanFieldPruner.PruneList(FixRenamedFields(ListTs(text, bp, singular, id, warnings), bp), bp, warnings), bp), bp), bp, singular),
            "frontend.form.ts"   => FixCodeName(FixRouteSegments(FixParentMembers(OrphanFieldPruner.Prune(FixRenamedFields(FormTs(text, bp, singular, id, warnings), bp), bp, warnings), bp), bp), bp, singular),
            "frontend.form.html" => OrphanFieldPruner.StripBindings(FormHtml(text, bp, warnings)),
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

    // Status-style bool: the IsActive / Status flag, or any bool set to
    // "Status dropdown" (the wizard may rename IsActive -> Status).
    private static bool IsStatusField(CloneField f) =>
        f.Name == "IsActive"
        || f.Name == "Status"
        || (f.Control ?? "").Trim().ToLowerInvariant().Contains("status");

    // A non-parent field the user set to Dropdown / Search dropdown.
    // Yes / No and Status dropdowns are handled by the bool rules.
    private static bool IsListControl(CloneField f)
    {
        string c = (f.Control ?? "").Trim().ToLowerInvariant();
        return c.Contains("dropdown") && !c.Contains("yes") && !c.Contains("status");
    }

    private static string DefaultLiteral(CloneField f)
    {
        if (IsBool(f))
        {
            string d = (f.DefaultValue ?? "").Trim().ToLowerInvariant();
            if (d is "true" or "active") return "true";
            if (d is "false" or "inactive") return "false";
            return IsStatusField(f) ? "true" : "false";
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
    // Renamed fields
    //
    // A field the wizard renamed (BankName -> CardName, SourceName ->
    // Name) is still read by its SOURCE name in the copied list / form
    // ts:  item.BankName,  this.entity.BankName,  response?.bankName.
    // Every member access to the source name is pointed at the new
    // name. Accesses on the parent variable are left alone (they are
    // fixed by FixParentMembers), and two passes keep swapped names
    // (A -> B, B -> A) from colliding.
    //===========================================================

    private static string FixRenamedFields(string text, PageCloneBlueprint bp)
    {
        var renamed = Fields(bp)
            .Where(f => !string.IsNullOrWhiteSpace(f.SourceName)
                        && !string.Equals(f.SourceName, f.Name, StringComparison.Ordinal)
                        && !IsParentFk(bp, f))
            .ToList();

        if (renamed.Count == 0) return text;

        string parent = ParentName(bp);

        var skip = new HashSet<string>(StringComparer.Ordinal);
        if (parent.Length > 0)
        {
            skip.Add(Camel(parent));
            skip.Add(Camel(bp.Parent!.Entity));
        }

        // pass 1: source name -> placeholder, pass 2: placeholder -> new name
        for (int i = 0; i < renamed.Count; i++)
        {
            var f = renamed[i];

            foreach (string have in new[] { f.SourceName!, Camel(f.SourceName!) })
            {
                text = Regex.Replace(
                    text,
                    @"(?<obj>[A-Za-z_]\w*)(?<q>\??)\.(?<m>" + Regex.Escape(have) + @")\b",
                    m => skip.Contains(m.Groups["obj"].Value)
                        ? m.Value
                        : m.Groups["obj"].Value + m.Groups["q"].Value + "." + "\u0001" + i + (have == f.SourceName ? "P" : "C") + "\u0001");
            }
        }

        for (int i = 0; i < renamed.Count; i++)
        {
            text = text.Replace("\u0001" + i + "P\u0001", renamed[i].Name);
            text = text.Replace("\u0001" + i + "C\u0001", Camel(renamed[i].Name));
        }

        return text;
    }
    //===========================================================
    // Code and name field names
    //
    // The engine's rename turns the source properties (WingCode,
    // WingName) into {Page}Code / {Page}Name (BankSetupCode,
    // BankSetupName). The real fields of the clone may be named
    // differently (BankCode, BankName). Every member access to
    // {Page}Code / {Page}Name is pointed at the real field:
    //     this.entity.BankSetupCode   -> this.entity.BankCode
    //     response?.bankSetupCode     -> response?.bankCode
    //     item.BankSetupName          -> item.BankName
    //     entity.BankSetupName        -> entity.BankName   (C#)
    //===========================================================

    private static string FixCodeName(string text, PageCloneBlueprint bp, string s)
    {
        var code = Fields(bp).FirstOrDefault(IsCode);

        if (code != null)
            text = PointMember(text, s + "Code", code.Name);

        // The same for the name field: WingName -> BankSetupName -> BankName
        var name = Fields(bp).FirstOrDefault(f =>
            f.Name.EndsWith("Name", StringComparison.Ordinal) && !IsParentFk(bp, f));

        if (name != null)
            text = PointMember(text, s + "Name", name.Name);

        return text;
    }

    private static string PointMember(string text, string have, string real)
    {
        if (real == have) return text;

        text = Regex.Replace(text, @"(?<=\.)" + Regex.Escape(have) + @"\b", real);
        text = Regex.Replace(text, @"(?<=\.)" + Regex.Escape(Camel(have)) + @"\b", Camel(real));

        return text;
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
            // normalizePOSAccount(item: any): POSAccount { return { ... } }
            var fn = Regex.Match(text,
                @"function\s+normalize\w*\s*\(\s*(?<v>\w+)\s*:\s*any\s*\)\s*:\s*\w+\s*\{\s*return\s*\{");

            if (fn.Success) return ServiceReturnLiteral(text, fn, bp, id);

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

    // Rebuilds  function normalizeX(item: any): X { return { ... } }
    // from the blueprint, using readText / readNumber / readBool when the file has them.
    private static string ServiceReturnLiteral(string text, Match fn, PageCloneBlueprint bp, string id)
    {
        string v = fn.Groups["v"].Value;
        int open = fn.Index + fn.Length - 1;
        int depth = 0, close = -1;

        for (int i = open; i < text.Length; i++)
        {
            if (text[i] == '{') depth++;
            else if (text[i] == '}' && --depth == 0) { close = i; break; }
        }

        if (close < 0) return text;

        bool helpers =
            text.Contains("function readText", StringComparison.Ordinal)
            && text.Contains("function readNumber", StringComparison.Ordinal)
            && text.Contains("function readBool", StringComparison.Ordinal);

        var all = Fields(bp);
        var sb = new StringBuilder("\r\n");

        void Prop(string name, string expr, bool last)
        {
            sb.AppendLine($"        {name}:");
            sb.AppendLine($"            {expr}{(last ? "" : ",")}");
            if (!last) sb.AppendLine();
        }

        Prop(id,
            helpers ? $"readNumber({v}, '{id}')"
                    : $"Number({v}?.{id} ?? {v}?.{Camel(id)} ?? 0)",
            all.Count == 0);

        for (int i = 0; i < all.Count; i++)
        {
            var f = all[i];
            string n = f.Name, c = Camel(n);

            string expr =
                IsNumber(f) ? (helpers ? $"readNumber({v}, '{n}')" : $"Number({v}?.{n} ?? {v}?.{c} ?? 0)")
              : IsBool(f)   ? (helpers ? $"readBool({v}, '{n}', {DefaultLiteral(f)})" : $"Boolean({v}?.{n} ?? {v}?.{c} ?? {DefaultLiteral(f)})")
              :               (helpers ? $"readText({v}, '{n}')" : $"{v}?.{n} ?? {v}?.{c} ?? ''");

            Prop(n, expr, i == all.Count - 1);
        }

        sb.Append("    ");

        return text[..(open + 1)] + sb + text[close..];
    }

    //===========================================================
    // LIST (ts)
    //===========================================================

    private static string ListTs(string text, PageCloneBlueprint bp, string s, string id, List<string> warnings)
    {
        var all = Fields(bp);
        string parent = ParentName(bp);

        // The source parent (for example Company) no longer exists on this page
        if (bp.Parent == null || !bp.Parent.HasParent)
            text = StripListParent(text, s, warnings);

        // Wings / Wing -> BankSetup / BankSetup: two methods with the same name
        text = FixNormalizeCollision(text, s);

        // --- normalize: return { ... };
        // {Field}Text members the list item interface declares (CollectionAccountText: string)
        var extras = all
            .Where(f => IsBool(f) && !IsStatusField(f)
                        && Regex.IsMatch(text, @"\b" + Regex.Escape(f.Name) + @"Text\s*:\s*string"))
            .Select(f => (
                Name: f.Name + "Text",
                Text: $"Boolean(item?.{f.Name} ?? item?.{Camel(f.Name)} ?? false) ? 'Yes' : 'No'"))
            .ToList();

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

                    foreach (var (xn, xt) in extras)
                    {
                        sb.AppendLine();
                        sb.AppendLine($"            {xn}:");
                        sb.AppendLine($"                {xt},");
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
            else if (IsBool(f) && IsStatusField(f))
            {
                align = "center"; width = "200px"; type = "status";
            }
            else if (IsCode(f)) { align = "center"; width = "280px"; }
            else if (f.Name == "Remarks") { width = "350px"; }
            else if (IsBool(f) || IsNumber(f)) { align = "center"; width = "200px"; }

            if (IsBool(f) && !IsStatusField(f) && extras.Any(x => x.Name == f.Name + "Text"))
                field = f.Name + "Text";

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
                else if (!(IsBool(f) && IsStatusField(f)))
                    parts.Add($"item.{f.Name}");
            }

            var statusField = all.FirstOrDefault(f => IsBool(f) && IsStatusField(f));
            bool hasStatus = statusField != null;

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
                b.AppendLine($"                        (item.{statusField!.Name} ? 'active' : 'inactive')");
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

        // The source parent (for example Company) no longer exists on this page
        if (bp.Parent == null || !bp.Parent.HasParent)
            text = StripSourceParent(text, s, warnings);

        // entity: X = { ... }
        text = ReplaceLiterals(text, new Regex(@"\bentity\s*:\s*\w+\s*=\s*\{"), _ => Defaults());

        // this.entity = { ... }   (defaults, or load mapping when it reads "response")
        text = ReplaceLiterals(text, new Regex(@"this\.entity\s*=\s*\{"),
            inner => inner.Contains("response") ? Load() : Defaults());

        // const model: CreateX = { ... } / UpdateX
        // any variable name:  const model / const payload / let x : CreateX = { ... }
        text = ReplaceLiterals(text, new Regex(@"(?:const|let|var)\s+\w+\s*:\s*Create\w+\s*=\s*\{"), _ => ModelLiteral(false));
        text = ReplaceLiterals(text, new Regex(@"(?:const|let|var)\s+\w+\s*:\s*Update\w+\s*=\s*\{"), _ => ModelLiteral(true));

        // typed methods:  private buildPayload(): CreateX { return { ... }; }
        text = ReplaceLiterals(text, new Regex(@"\)\s*:\s*Create\w+\s*\{\s*return\s*\{"), _ => ModelLiteral(false));
        text = ReplaceLiterals(text, new Regex(@"\)\s*:\s*Update\w+\s*\{\s*return\s*\{"), _ => ModelLiteral(true));

        // createEmptyEntity(): X { return { ... }; }  (customised forms)
        text = ReplaceLiterals(text,
            new Regex(@"createEmptyEntity\s*\(\s*\)\s*:\s*\w+\s*\{\s*return\s*\{"),
            _ => Defaults());

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
        if (all.Any(f => IsBool(f) && !IsStatusField(f)) && !text.Contains("yesNoItems", StringComparison.Ordinal))
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

        // Status items (Active / Inactive) when the form does not have them
        if (all.Any(f => IsBool(f) && IsStatusField(f)) && !text.Contains("statusItems", StringComparison.Ordinal))
        {
            var em = Regex.Match(text, @"[ \t]*//=+[ \t]*\r?\n[ \t]*// Entity[ \t]*\r?\n[ \t]*//=+");
            string items =
                "    //===========================================================\r\n" +
                "    // Status Items\r\n" +
                "    //===========================================================\r\n\r\n" +
                "    statusItems:\r\n        any[] =\r\n    [\r\n        { label:'Active', value:true },\r\n\r\n        { label:'Inactive', value:false }\r\n    ];\r\n\r\n\r\n";

            if (em.Success) text = text.Insert(em.Index, items);
            else warnings.Add("frontend.form.ts: could not add statusItems; add it by hand.");
        }

        // Item lists for plain Dropdown / Search dropdown fields
        foreach (var f in all.Where(x => !IsParentFk(bp, x) && !IsBool(x) && !IsCode(x) && IsListControl(x)))
        {
            string listName = Camel(f.Name) + "Items";
            if (text.Contains(listName + ":", StringComparison.Ordinal)) continue;

            var em = Regex.Match(text, @"[ \t]*//=+[ \t]*\r?\n[ \t]*// Entity[ \t]*\r?\n[ \t]*//=+");
            string block =
                "    //===========================================================\r\n" +
                $"    // {Label(f.Name)} Items\r\n" +
                "    //===========================================================\r\n\r\n" +
                $"    {listName}:\r\n        any[] =\r\n    [];\r\n\r\n\r\n";

            if (em.Success) text = text.Insert(em.Index, block);
            else warnings.Add($"frontend.form.ts: could not add {listName}; add it by hand.");

            if (Lookups.TryGetValue(f.Name, out var src))
                text = WireLookup(text, f, src, listName, warnings);
            else
                warnings.Add($"frontend.form.ts: {Label(f.Name)} is a dropdown with an empty item list ({listName}). Fill it from its data source.");
        }

        // Missing control imports
        EnsureControl(ref text, "TextboxComponent", "textbox/textbox", all.Count > 0, warnings);
        EnsureControl(ref text, "TextareaComponent", "textarea/textarea",
            all.Any(f => ControlKind(bp, f) == "textarea"), warnings);
        EnsureControl(ref text, "DropdownComponent", "dropdown/dropdown",
            all.Any(f => ControlKind(bp, f) == "dropdown"), warnings);
        EnsureControl(ref text, "SearchDropdownComponent", "search-dropdown/search-dropdown",
            all.Any(f => ControlKind(bp, f) == "search"), warnings);

        if (bp.Parent != null && bp.Parent.HasParent)
            warnings.Add("frontend.form.ts: parent loading and change handlers are copied from the source form. Multi-level parent cascades (class > group) need a manual check.");

        // The source wrote the id under two spellings (MFSAccountId / MFSAccountsId).
        // After the rename both are the same key: keep the first one.
        string idKey = Regex.Escape(id);

        text = Regex.Replace(text,
            @"(?<a>[ \t]*" + idKey + @"\s*:\s*[^,;{}]+,)[ \t]*\r?\n(?:[ \t]*\r?\n)*[ \t]*" + idKey + @"\s*:\s*[^,;{}]+,[ \t]*\r?\n?",
            "${a}\r\n");

        return text;
    }

    //===========================================================
    // Remove the copied source parent from the FORM ts
    //
    // When the clone has no parent, the form ts still holds the
    // SOURCE form's parent (for example Company):
    //   - the model + service imports
    //   - the injected service
    //   - the loadXxx() method (plural too: loadCompanies) and
    //     its call in ngOnInit
    //   - the onXxxChange() handler
    //   - the xxxItems list and the isLoadingXxx flag (plural too)
    //   - the "parent required" guard of the code generator, and
    //     the parent id passed to getNextCode
    //
    // The code generator used to run when the parent changed. With
    // no parent that never happens, so it is called when a new
    // record is started (initializeEntity).
    //
    // The parent is found as a single-name import from a
    // */models/*.model file that is not this page's own model.
    //===========================================================

    private static string StripSourceParent(string text, string s, List<string> warnings)
    {
        foreach (Match m in Regex.Matches(text,
            @"import\s*\{\s*(\w+)\s*\}\s*from\s*'[^']*/models/[\w\-\.]+\.model'\s*;?").Cast<Match>().ToList())
        {
            string y = m.Groups[1].Value;

            if (y == s
                || y.StartsWith("Create", StringComparison.Ordinal)
                || y.StartsWith("Update", StringComparison.Ordinal))
                continue;

            string yc = char.ToLowerInvariant(y[0]) + y[1..];

            // plural forms: Company -> Companies, Branch -> Branches, Class -> Classes
            string plural =
                y.EndsWith("y", StringComparison.Ordinal) && y.Length > 1 && !"aeiou".Contains(char.ToLowerInvariant(y[^2]))
                    ? y[..^1] + "ies"
                    : y.EndsWith("s", StringComparison.Ordinal) || y.EndsWith("x", StringComparison.Ordinal)
                      || y.EndsWith("ch", StringComparison.Ordinal) || y.EndsWith("sh", StringComparison.Ordinal)
                        ? y + "es"
                        : y + "s";

            string forms = Regex.Escape(y) + "|" + Regex.Escape(plural);

            // model + service imports
            text = Regex.Replace(text, @"import\s*\{\s*" + y + @"\s*\}\s*from\s*'[^']*';?[ \t]*\r?\n(\s*\r?\n)?", "");
            text = Regex.Replace(text, @"import\s*\{\s*" + y + @"Service\s*\}\s*from\s*'[^']*';?[ \t]*\r?\n(\s*\r?\n)?", "");

            // private readonly yService = inject(YService);
            text = Regex.Replace(text, @"[ \t]*private\s+readonly\s+\w+\s*=\s*inject\(\s*" + y + @"Service\s*\)\s*;[ \t]*\r?\n(\s*\r?\n)?", "");

            // handler, loader, call, items list, loading flag
            text = RemoveMember(text, @"\bon" + y + @"Change\b");
            text = RemoveMember(text, @"\bload(" + forms + @")\b");
            text = Regex.Replace(text, @"[ \t]*this\.load(" + forms + @")\(\s*\)\s*;[ \t]*\r?\n(\s*\r?\n)?", "");
            text = RemoveMember(text, @"\b" + yc + @"Items\b");
            text = RemoveMember(text, @"\bisLoading(" + forms + @")\b");

            // code number: no parent id any more
            text = Regex.Replace(text, @"getNextCode\(\s*this\.entity\." + y + @"Id\s*\)", "getNextCode()");

            var guard = Regex.Match(text,
                @"if\s*\(\s*!this\.entity\." + y + @"Id\s*\|\|\s*this\.entity\." + y + @"Id\s*<=\s*0\s*\)\s*\{");

            if (guard.Success)
            {
                int gi = guard.Index + guard.Length - 1, gd = 0, ge = -1;

                for (int k = gi; k < text.Length; k++)
                {
                    if (text[k] == '{') gd++;
                    else if (text[k] == '}' && --gd == 0) { ge = k; break; }
                }

                if (ge > 0)
                {
                    int gs = guard.Index;
                    while (gs > 0 && (text[gs - 1] == ' ' || text[gs - 1] == '\t')) gs--;
                    int gx = ge + 1;
                    while (gx < text.Length && (text[gx] == '\r' || text[gx] == '\n' || text[gx] == ' ' || text[gx] == '\t')) gx++;
                    text = text[..gs] + text[gx..];
                }
            }

            // generate the code when a new record is started (it used to run on parent change)
            var gen = Regex.Match(text, @"private\s+(generate\w*Code)\s*\(");
            var init = Regex.Match(text, @"private\s+initializeEntity\s*\(");

            if (gen.Success && init.Success)
            {
                string call = "this." + gen.Groups[1].Value + "();";
                var setState = Regex.Match(text[init.Index..], @"this\.setInitialFormState\(\);");

                if (setState.Success && !text.Contains(call, StringComparison.Ordinal))
                {
                    int at = init.Index + setState.Index + setState.Length;
                    text = text.Insert(at, "\r\n\r\n\r\n        " + call);
                }
            }

            warnings.Add($"frontend.form.ts: removed the copied {y} parent (import, service, loader, handler) because this page has no parent.");

            // leftovers: any use of the removed service / loader means the removal missed something
            if (Regex.IsMatch(text, @"\b" + yc + @"Service\b") || Regex.IsMatch(text, @"\bload(" + forms + @")\b"))
                warnings.Add($"frontend.form.ts: a reference to the removed {y} parent is still in the form. Remove it by hand.");
        }

        return text;
    }

    //===========================================================
    // Name collision: normalizeWing / normalizeWings
    //
    // The source list has two normalizers, normalizeWing(item) and
    // normalizeWings(response). When the target name has the same
    // singular and plural form (BankSetup), both become
    // normalizeBankSetup, which is a duplicate method (TS2393).
    //
    // The second one (the array normalizer) is renamed to
    // normalize{S}List and the call that passes the API response
    // to it is pointed at the new name.
    //===========================================================

    private static string FixNormalizeCollision(string text, string s)
    {
        string n = "normalize" + s;

        var defs = Regex.Matches(text, @"(?m)^[ \t]*(private\s+)?" + Regex.Escape(n) + @"\b")
            .Cast<Match>().ToList();

        if (defs.Count < 2) return text;

        var second = defs[1];
        int nameAt = second.Index + second.Value.LastIndexOf(n, StringComparison.Ordinal);

        text = text[..nameAt] + n + "List" + text[(nameAt + n.Length)..];

        text = Regex.Replace(text,
            @"this\." + Regex.Escape(n) + @"\(\s*response\b",
            m => m.Value.Replace(n, n + "List"));

        return text;
    }

    //===========================================================
    // Remove the copied source parent from the LIST ts
    //
    // The source list holds its parent (for example Company):
    //   - the model + service imports and the injected service
    //   - the  xxxMap  lookup, buildXxxMap() and getXxxName()
    //   - the  XxxName  member of the list item interface
    //   - loadItems(), which first loads the parents and only then
    //     calls the page's own loader (loadWings)
    //
    // loadItems() is reduced to a direct call of the page's own
    // loader. The normalize / columns / filter blocks are rebuilt
    // from the blueprint by ListTs, so they no longer use the parent.
    //===========================================================

    private static string StripListParent(string text, string s, List<string> warnings)
    {
        foreach (Match m in Regex.Matches(text,
            @"import\s*\{\s*(\w+)\s*\}\s*from\s*'[^']*/models/[\w\-\.]+\.model'\s*;?").Cast<Match>().ToList())
        {
            string y = m.Groups[1].Value;

            if (y == s
                || y.StartsWith("Create", StringComparison.Ordinal)
                || y.StartsWith("Update", StringComparison.Ordinal))
                continue;

            string yc = char.ToLowerInvariant(y[0]) + y[1..];

            // imports + injected service
            text = Regex.Replace(text, @"import\s*\{\s*" + y + @"\s*\}\s*from\s*'[^']*';?[ \t]*\r?\n(\s*\r?\n)?", "");
            text = Regex.Replace(text, @"import\s*\{\s*" + y + @"Service\s*\}\s*from\s*'[^']*';?[ \t]*\r?\n(\s*\r?\n)?", "");
            text = Regex.Replace(text, @"[ \t]*private\s+readonly\s+\w+\s*=\s*inject\(\s*" + y + @"Service\s*\)\s*;[ \t]*\r?\n(\s*\r?\n)?", "");

            // loadItems(): parents first, then the page's own loader  ->  the own loader only
            var call = Regex.Match(text, @"this\." + yc + @"Service\s*\.getAll\(\s*\)\s*\.subscribe\s*\(\s*\{");

            if (call.Success)
            {
                int open = call.Index + call.Length - 1, depth = 0, close = -1;

                for (int k = open; k < text.Length; k++)
                {
                    if (text[k] == '{') depth++;
                    else if (text[k] == '}' && --depth == 0) { close = k; break; }
                }

                if (close > 0)
                {
                    int e = close + 1;
                    while (e < text.Length && char.IsWhiteSpace(text[e])) e++;
                    if (e < text.Length && text[e] == ')') e++;
                    while (e < text.Length && char.IsWhiteSpace(text[e]) && text[e] != '\n') e++;
                    if (e < text.Length && text[e] == ';') e++;

                    var own = Regex.Match(text[open..close], @"this\.(load\w+)\(\s*\)");

                    if (own.Success)
                    {
                        int st = call.Index;
                        while (st > 0 && (text[st - 1] == ' ' || text[st - 1] == '\t')) st--;

                        var banner = Regex.Match(text[..st],
                            @"[ \t]*//=+[ \t]*\r?\n[ \t]*//[^\r\n]*\r?\n[ \t]*//=+[ \t]*\r?\n\s*$");

                        if (banner.Success) st = banner.Index;

                        text = text[..st] + "\r\n        this." + own.Groups[1].Value + "();" + text[e..];
                    }
                    else warnings.Add($"frontend.list.ts: could not reduce loadItems() because the page's own loader call was not found; the {y} loader is still in the list.");
                }
            }

            // lookup map + helpers
            text = RemoveMember(text, @"\b" + yc + @"Map\b");
            text = RemoveMember(text, @"\bbuild" + y + @"Map\b");
            text = RemoveMember(text, @"\bget" + y + @"Name\b");

            // list item interface member:  CompanyName: string;
            text = Regex.Replace(text, @"[ \t]*" + y + @"Name\s*:\s*string\s*;[ \t]*\r?\n(\s*\r?\n)?", "");

            // unused local in normalize:  const companyId: number = Number(...);
            text = Regex.Replace(text,
                @"[ \t]*const\s+" + yc + @"Id\s*:\s*number\s*=\s*Number\s*\([\s\S]*?\)\s*;[ \t]*\r?\n(\s*\r?\n)?", "");

            warnings.Add($"frontend.list.ts: removed the copied {y} parent (import, service, lookup map, loader) because this page has no parent.");

            if (Regex.IsMatch(text, @"\b" + yc + @"Service\b") || Regex.IsMatch(text, @"\b" + yc + @"Map\b"))
                warnings.Add($"frontend.list.ts: a reference to the removed {y} parent is still in the list. Remove it by hand.");
        }

        return text;
    }

    //===========================================================
    // Code number without a parent
    //
    // The source builds the next code per parent
    // (getNextCode(companyId)) and the defaults per parent
    // (GetDefaults(companyId)). With no parent both are global, so
    // the parent id is dropped in the Angular service, the
    // controller, the repository interface and the repository
    // (the repository's GetNextCodeAsync is already rebuilt as
    // GetNextCodeAsync()).
    //===========================================================

    private static string NoParentCode(string text, PageCloneBlueprint bp)
    {
        if (bp.Parent != null && bp.Parent.HasParent) return text;

        // Angular service: getNextCode(companyId: number)  +  params / path segment
        var svc = Regex.Match(text, @"getNextCode\s*\(\s*\w+\s*:\s*number\s*\)");

        if (svc.Success)
        {
            text = text[..svc.Index] + "getNextCode()" + text[(svc.Index + svc.Length)..];

            int from = svc.Index;
            var prm = Regex.Match(text[from..], @"params\s*:\s*\{[^{}]*\}\s*,\s*");
            int end = text.IndexOf("\r\n    }", from, StringComparison.Ordinal);

            if (prm.Success && (end < 0 || from + prm.Index < end))
                text = text[..(from + prm.Index)] + text[(from + prm.Index + prm.Length)..];

            text = Regex.Replace(text, @"/next-code/\$\{\w+\}", "/next-code");
        }

        // Controller route + action, controller call, repository interface + repository
        text = Regex.Replace(text, @"next-code/\{\w+(:\w+)?\}", "next-code");
        text = Regex.Replace(text, @"GetNextCode\(\s*(\[FromQuery\]\s*)?(long|int)\s+\w+\s*\)", "GetNextCode()");
        text = Regex.Replace(text, @"GetNextCodeAsync\s*\(\s*(long\s+|int\s+)?[\w\.]+\s*\)", "GetNextCodeAsync()");
        text = Regex.Replace(text, @"GetDefaults\(\s*(\[FromQuery\]\s*)?(long|int)\s+\w+\s*\)", "GetDefaults()");
        text = Regex.Replace(text, @"GetDefaultsAsync\s*\(\s*(long\s+|int\s+)?[\w\.]+\s*\)", "GetDefaultsAsync()");

        return text;
    }

    //===========================================================
    // Repository without a parent
    //
    // The source repository looks up its parent in Create and Update:
    //
    //     // Resolve Company
    //     CompanyEntity? company = await ...;
    //     if (company == null) { throw ... }
    //
    // and has a using alias for the parent entity:
    //
    //     using CompanyEntity = AppCore.Domain.Entities....Company;
    //
    // That namespace does not exist for the new page, so the build
    // fails (CS0234). With no parent:
    //   1. every lookup of an entity alias that is not the page's own
    //      ({s}Entity) is removed, with its banner comment and its
    //      "== null" check
    //   2. a using alias that nothing uses any more is removed
    //===========================================================

    private static string NoParentRepository(string text, PageCloneBlueprint bp, string s)
    {
        if (bp.Parent != null && bp.Parent.HasParent) return text;

        // 1. the copied parent lookups
        var decl = new Regex(@"(?m)^[ \t]*(?<alias>\w+Entity)\?\s+(?<var>\w+)\s*=");

        while (true)
        {
            Match? m = decl.Matches(text).Cast<Match>()
                .FirstOrDefault(x => x.Groups["alias"].Value != s + "Entity");

            if (m == null) break;

            int start = m.Index;

            // the banner comment above it ("Resolve Company")
            var banner = Regex.Match(text[..start],
                @"[ \t]*//=+[ \t]*\r?\n[ \t]*//[^\r\n]*\r?\n[ \t]*//=+[ \t]*\r?\n\s*$");

            if (banner.Success) start = banner.Index;

            // the statement, up to its closing ;
            int i = m.Index + m.Length, paren = 0;
            bool ended = false;

            for (; i < text.Length; i++)
            {
                char c = text[i];

                if (c == '(') paren++;
                else if (c == ')') paren--;
                else if (c == ';' && paren == 0) { i++; ended = true; break; }
            }

            if (!ended) break;

            // the "if (company == null) { ... }" check that follows
            var chk = Regex.Match(text[i..],
                @"^\s*if\s*\(\s*" + Regex.Escape(m.Groups["var"].Value) + @"\s*==\s*null\s*\)\s*\{");

            if (chk.Success)
            {
                int open = i + chk.Length - 1, depth = 0;

                for (int k = open; k < text.Length; k++)
                {
                    if (text[k] == '{') depth++;
                    else if (text[k] == '}' && --depth == 0) { i = k + 1; break; }
                }
            }

            while (i < text.Length && char.IsWhiteSpace(text[i])) i++;
            while (i > 0 && (text[i - 1] == ' ' || text[i - 1] == '\t')) i--;

            text = text[..start] + "\r\n" + text[i..];
        }

        // 2. a using alias that nothing uses any more
        foreach (Match m in Regex.Matches(text,
            @"(?m)^[ \t]*using\s+(\w+)\s*=\s*[\w\.\s]+?;[ \t]*\r?\n(\s*\r?\n)?").Cast<Match>().ToList())
        {
            string alias = m.Groups[1].Value;

            if (Regex.Matches(text, @"\b" + Regex.Escape(alias) + @"\b").Count == 1)
                text = text.Replace(m.Value, "");
        }

        return text;
    }

    // Removes "name ... ;" or "name(...) ... { ... }" starting at the member, with its banner comment.
    private static string RemoveMember(string text, string namePattern)
    {
        var m = Regex.Match(text, @"(?m)^[ \t]*(private\s+|public\s+|readonly\s+)*" + namePattern);

        if (!m.Success) return text;

        int start = m.Index;

        // include a preceding banner comment block
        var banner = Regex.Match(text[..start],
            @"[ \t]*//=+[ \t]*\r?\n[ \t]*//[^\r\n]*\r?\n[ \t]*//=+[ \t]*\r?\n\s*$");

        if (banner.Success) start = banner.Index;

        int i = m.Index + m.Length;
        int depth = 0;
        bool opened = false;

        for (; i < text.Length; i++)
        {
            char c = text[i];

            if (c == '{') { depth++; opened = true; }
            else if (c == '}') { depth--; if (opened && depth == 0) { i++; break; } }
            else if (c == ';' && depth == 0 && !opened) { i++; break; }
        }

        // eat trailing whitespace / newlines
        while (i < text.Length && (text[i] == '\r' || text[i] == '\n' || text[i] == ' ' || text[i] == '\t')) i++;

        return text[..start] + text[i..];
    }

    //===========================================================
    // Wire a lookup dropdown to its service
    //
    // Adds to the form ts:
    //   1. the service import (path built from the form's own
    //      services/ import, one folder up, into the owning module)
    //   2. the injected service
    //   3. a loadXxxItems() method, placed after ngOnInit, and a
    //      call to it at the top of ngOnInit
    //
    // The list holds the active records: label "Code - Name",
    // value = Name (saved as text).
    //===========================================================

    private static string WireLookup(
        string text, CloneField f, LookupSource src, string listName, List<string> warnings)
    {
        string svc = Camel(src.Service);
        string loader = "load" + f.Name + "Items";
        string title = Label(f.Name);

        if (text.Contains(loader + "(", StringComparison.Ordinal)) return text;

        // 1. import
        var imp = Regex.Match(text, @"from\s*'((?:\.\./)+)services/");

        if (!imp.Success)
        {
            warnings.Add($"frontend.form.ts: could not find the services import path to add {src.Service}. {title} list is empty; wire it by hand.");
            return text;
        }

        if (!text.Contains(src.Service, StringComparison.Ordinal))
        {
            string importPath = imp.Groups[1].Value + "../" + src.Module + "/services/" + src.File;

            string import =
                "import\r\n{\r\n    " + src.Service + "\r\n}\r\nfrom '" + importPath + "';\r\n\r\n";

            var anchor = Regex.Match(text, @"//=+[ \t]*\r?\n[ \t]*// Utilities");
            text = text.Insert(anchor.Success ? anchor.Index : 0, import);
        }

        // 2. injection
        if (!text.Contains("private readonly " + svc, StringComparison.Ordinal))
        {
            var inj = Regex.Match(text, @"private\s+readonly\s+\w+\s*=\s*inject\(\s*\w+\s*\);");

            if (!inj.Success)
            {
                warnings.Add($"frontend.form.ts: could not find an injected service to add {svc}. {title} list is empty; wire it by hand.");
                return text;
            }

            string decl = "\r\n    private readonly " + svc + " =\r\n        inject(" + src.Service + ");";
            text = text.Insert(inj.Index + inj.Length, decl);
        }

        // 3. loader method after ngOnInit + call inside ngOnInit
        var init = Regex.Match(text, @"ngOnInit\s*\(\s*\)\s*:\s*void\s*\{");

        if (!init.Success)
        {
            warnings.Add($"frontend.form.ts: ngOnInit not found; {title} list is empty. Call {loader}() by hand.");
            return text;
        }

        int open = init.Index + init.Length - 1;
        int depth = 0, close = -1;

        for (int i = open; i < text.Length; i++)
        {
            if (text[i] == '{') depth++;
            else if (text[i] == '}' && --depth == 0) { close = i; break; }
        }

        if (close < 0)
        {
            warnings.Add($"frontend.form.ts: ngOnInit body not closed; {title} list is empty. Call {loader}() by hand.");
            return text;
        }

        bool hasCdr = text.Contains("this.cdr.detectChanges", StringComparison.Ordinal);

        var m = new StringBuilder();
        m.AppendLine("    //===========================================================");
        m.AppendLine($"    // Load {title} Items");
        m.AppendLine("    //===========================================================");
        m.AppendLine();
        m.AppendLine($"    private {loader}():");
        m.AppendLine("        void");
        m.AppendLine("    {");
        m.AppendLine($"        this.{svc}");
        m.AppendLine("            .getAll()");
        m.AppendLine("            .subscribe");
        m.AppendLine("            ({");
        m.AppendLine("                next:");
        m.AppendLine("                (");
        m.AppendLine("                    response:");
        m.AppendLine("                        any[]");
        m.AppendLine("                ):");
        m.AppendLine("                    void =>");
        m.AppendLine("                {");
        m.AppendLine($"                    this.{listName} =");
        m.AppendLine("                        response");
        m.AppendLine("                            .filter(");
        m.AppendLine("                                item =>");
        m.AppendLine("                                    item.IsActive");
        m.AppendLine("                            )");
        m.AppendLine("                            .map(");
        m.AppendLine("                                item =>");
        m.AppendLine("                                ({");
        m.AppendLine("                                    label:");
        m.AppendLine("                                        `${item." + src.Code + "} - ${item." + src.Name + "}`,");
        m.AppendLine("                                    value:");
        m.AppendLine("                                        item." + src.Name);
        m.AppendLine("                                })");
        m.AppendLine("                            );");
        if (hasCdr) m.AppendLine("                    this.cdr.detectChanges();");
        m.AppendLine("                },");
        m.AppendLine("                error:");
        m.AppendLine("                (");
        m.AppendLine("                    error:");
        m.AppendLine("                        unknown");
        m.AppendLine("                ):");
        m.AppendLine("                    void =>");
        m.AppendLine("                {");
        m.AppendLine($"                    console.error('Load {title} Items Error:', error);");
        m.AppendLine($"                    this.{listName} =");
        m.AppendLine("                        [];");
        m.AppendLine("                }");
        m.AppendLine("            });");
        m.AppendLine("    }");

        // method first (later index), then the call (earlier index)
        text = text.Insert(close + 1, "\r\n\r\n" + m.ToString().TrimEnd());
        text = text.Insert(open + 1, $"\r\n        this.{loader}();\r\n");

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
        if (IsListControl(f)) return c.Contains("search") ? "search" : "dropdown";
        if (c.Contains("area") || f.MaxLength is >= 500) return "textarea";
        return "textbox";
    }

    //===========================================================
    // The form column of a field: Parent, Information, Status or
    // Description.
    //
    //   1. the parent link field is always in Parent
    //   2. otherwise the column chosen in the wizard (CloneField.Section)
    //   3. no valid choice (an older saved clone): the old rule,
    //      bool -> Status, textarea -> Description, the rest -> Information
    //===========================================================

    private static string SectionOf(PageCloneBlueprint bp, CloneField f)
    {
        if (IsParentFk(bp, f)) return "Parent";

        string chosen = (f.Section ?? "").Trim();

        if (chosen.Equals("Information", StringComparison.OrdinalIgnoreCase)) return "Information";
        if (chosen.Equals("Status", StringComparison.OrdinalIgnoreCase)) return "Status";
        if (chosen.Equals("Description", StringComparison.OrdinalIgnoreCase)) return "Description";

        if (IsBool(f)) return "Status";
        if (ControlKind(bp, f) == "textarea") return "Description";

        return "Information";
    }

    //===========================================================
    // The source form's own control for a field
    //
    // A customised source form has controls that differ from the
    // generic ones (a reserved parent with no change handler, a
    // Branch search dropdown, an Active / Inactive status dropdown).
    // The element that is bound to entity.{field} is taken from the
    // source form grid as it is, so its items list, handler and
    // attributes always match the form ts that was copied with it.
    // Returns null when the source form has no such element.
    //===========================================================

    private static string? SourceControl(string grid, string fk)
    {
        if (string.IsNullOrWhiteSpace(fk)) return null;

        var bind = Regex.Match(grid, @"\[\(value\)\]\s*=\s*""entity\." + Regex.Escape(fk) + @"""");

        if (!bind.Success) return null;

        int start = grid.LastIndexOf("<app-", bind.Index, StringComparison.Ordinal);

        if (start < 0) return null;

        var tag = Regex.Match(grid[start..], @"^<(app-[\w\-]+)");

        if (!tag.Success) return null;

        string endTag = "</" + tag.Groups[1].Value + ">";
        int end = grid.IndexOf(endTag, bind.Index, StringComparison.Ordinal);

        if (end < 0) return null;

        return grid[start..(end + endTag.Length)];
    }

    private static string? SourceParentControl(string grid, string fk) =>
        SourceControl(grid, fk);

    //===========================================================
    // The wizard's own guess of a field's control (guessControl in
    // the wizard component). A control that still equals the guess
    // was not changed by the user, so the SOURCE form's own control
    // for that field (a lookup dropdown, a status dropdown ...) is
    // kept. A control the user changed is generated from the wizard.
    //===========================================================

    private static string GuessControl(CloneField f, bool parent)
    {
        string n = (string.IsNullOrWhiteSpace(f.SourceName) ? f.Name : f.SourceName).ToLowerInvariant();
        string t = (f.Type ?? "string").Trim();
        string b = t.TrimEnd('?').ToLowerInvariant();

        if (parent) return "searchdropdown";
        if (n == "isactive") return "status";
        if (t.ToLowerInvariant() == "bool") return "yesno";
        if (b == "datetime") return "date";
        if (b is "int" or "long" or "decimal" or "double" or "float" or "short") return "number";
        if (b == "string" && (f.MaxLength ?? 0) >= 500) return "textarea";

        return "textbox";
    }

    private static bool SameControl(string? chosen, string guess)
    {
        string c = Regex.Replace(chosen ?? "", "[^A-Za-z]", "").ToLowerInvariant();

        if (c.Length == 0) return true;

        return c == guess || c.StartsWith(guess, StringComparison.Ordinal);
    }

    //===========================================================
    // The form sections of the SOURCE form grid
    //===========================================================

    private sealed record SrcSection(string OpenTag, string Kind, int Start, int End);

    private static List<SrcSection> SourceSections(string grid)
    {
        var list = new List<SrcSection>();

        foreach (Match m in Regex.Matches(grid, @"<app-form-section\b[^>]*>"))
        {
            int end = grid.IndexOf("</app-form-section>", m.Index, StringComparison.Ordinal);
            if (end < 0) continue;

            string title = Regex.Match(m.Value, @"title\s*=\s*""([^""]*)""").Groups[1].Value.ToLowerInvariant();

            string kind =
                title.Contains("information") ? "Information" :
                title.Contains("status")      ? "Status" :
                title.Contains("description") ? "Description" :
                list.Count == 0               ? "Parent" :
                                                "Information";

            list.Add(new SrcSection(m.Value, kind, m.Index + m.Length, end));
        }

        return list;
    }

    private static string Control(PageCloneBlueprint bp, CloneField f, string? sourceParent = null)
    {
        string kind = ControlKind(bp, f);
        string label = Label(f.Name);
        string ind = "                ";
        string reqLine = f.Required ? "\r\n\r\n" + ind + "    [required]=\"true\"" : "";
        var sb = new StringBuilder();

        sb.AppendLine($"{ind}<!-- {label} -->");
        sb.AppendLine();

        // the parent field keeps the source form's own control
        if (IsParentFk(bp, f) && sourceParent != null)
        {
            sb.AppendLine(ind + sourceParent);
            return sb.ToString();
        }

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
                else if (IsListControl(f) && !IsBool(f))
                {
                    items = Camel(f.Name) + "Items";
                    change = "(valueChange)=\"onValueChange()\"";
                }
                else
                {
                    items = IsStatusField(f) ? "statusItems" : "yesNoItems";
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

    //===========================================================
    // Rebuild the grid from the SOURCE form's own sections
    //
    //   - a field whose wizard control is still the wizard's guess
    //     keeps the source form's control for it, in the section
    //     where the source had it
    //   - a field the user changed, and a new field, is generated
    //     from the wizard, in the section of its kind
    //   - a source section left with no field is dropped
    //===========================================================

    private static string FormHtmlFromSource(
        string grid, List<SrcSection> secs, PageCloneBlueprint bp,
        List<CloneField> all, string? sourceParent)
    {
        string ind = "                ";
        var buckets = secs.Select(_ => new List<(long Order, string Html)>()).ToList();
        var extra = new Dictionary<string, List<string>>();
        long seq = 1_000_000;

        int SectionAt(int pos)
        {
            for (int i = 0; i < secs.Count; i++)
                if (pos >= secs[i].Start && pos < secs[i].End) return i;
            return -1;
        }

        int SectionOfKind(string kind)
        {
            for (int i = 0; i < secs.Count; i++)
                if (secs[i].Kind == kind) return i;
            return -1;
        }

        foreach (var f in all)
        {
            bool parent = IsParentFk(bp, f);
            string? el = SourceControl(grid, f.Name);

            if (el != null && (parent || SameControl(f.Control, GuessControl(f, parent))))
            {
                int pos = grid.IndexOf(el, StringComparison.Ordinal);
                int si = SectionAt(pos);

                if (si >= 0)
                {
                    string label = parent && ParentName(bp).Length > 0 ? Label(ParentName(bp)) : Label(f.Name);

                    buckets[si].Add((pos, $"{ind}<!-- {label} -->\r\n\r\n{ind}{el}\r\n"));
                    continue;
                }
            }

            string kind = SectionOf(bp, f);
            string generated = Control(bp, f, sourceParent);
            int target = SectionOfKind(kind);

            if (target >= 0)
            {
                buckets[target].Add((seq++, generated));
            }
            else
            {
                if (!extra.TryGetValue(kind, out var list)) extra[kind] = list = new List<string>();
                list.Add(generated);
            }
        }

        var sb = new StringBuilder();

        void Emit(string openTag, IEnumerable<string> items)
        {
            sb.AppendLine();
            sb.AppendLine();
            sb.AppendLine("            " + openTag);
            sb.AppendLine();

            foreach (string item in items)
            {
                sb.AppendLine();
                sb.AppendLine(item.TrimEnd('\r', '\n'));
            }

            sb.AppendLine();
            sb.AppendLine("            </app-form-section>");
        }

        for (int i = 0; i < secs.Count; i++)
        {
            if (buckets[i].Count == 0) continue;

            Emit(secs[i].OpenTag, buckets[i].OrderBy(x => x.Order).Select(x => x.Html));
        }

        string parentName = ParentName(bp);
        string display = string.IsNullOrWhiteSpace(bp.DisplayName) ? Label(bp.EntityName) : bp.DisplayName;

        string Tag(string title, string icon) =>
            $"<app-form-section\r\n\r\n                title=\"{title}\"\r\n\r\n                icon=\"{icon}\">";

        foreach (var (kind, title, icon) in new[]
        {
            ("Parent",      parentName.Length > 0 ? Label(parentName) : "Parent", "fas fa-sitemap"),
            ("Information", display + " Information",                           "fas fa-layer-group"),
            ("Status",      "Status",                                           "fas fa-toggle-on"),
            ("Description", "Description",                                      "fas fa-align-left")
        })
        {
            if (extra.TryGetValue(kind, out var items))
                Emit(Tag(title, icon), items);
        }

        sb.AppendLine();
        sb.Append("        ");

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

        // the source form's own parent dropdown (kept as it is)
        string? sourceParent = null;

        if (bp.Parent != null && bp.Parent.HasParent)
            sourceParent = SourceParentControl(
                text[(open.Index + open.Length)..close], bp.Parent.ForeignKey);

        // Customised source form: keep its sections and its own controls
        var srcSections = SourceSections(text[(open.Index + open.Length)..close]);

        if (srcSections.Count > 0)
        {
            string html = FormHtmlFromSource(
                text[(open.Index + open.Length)..close], srcSections, bp, all, sourceParent);

            return text[..(open.Index + open.Length)] + html + text[close..];
        }

        // Each field goes to the column chosen in the wizard (field order is kept)
        var parentFields = all.Where(f => SectionOf(bp, f) == "Parent").ToList();
        var infoFields   = all.Where(f => SectionOf(bp, f) == "Information").ToList();
        var statusFields = all.Where(f => SectionOf(bp, f) == "Status").ToList();
        var descFields   = all.Where(f => SectionOf(bp, f) == "Description").ToList();

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
                sb.AppendLine(Control(bp, f, sourceParent));
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