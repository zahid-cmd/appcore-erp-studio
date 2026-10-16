using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;

using PageCloningEntity =
    AppCore.Domain.Entities.InfrastructureControl.DevelopmentManagement.PageCloning;

namespace AppCore.Infrastructure.Platform.PageCloneEngine;

public class PageCloneEngine
{
    private const string Marker = "PAGE-CLONED";

    // key, file pattern ({E} entity, {K} kebab), required path fragment
    internal static readonly (string Key, string Pattern, string In)[] Specs =
    {
        ("backend.entity",        "{E}.cs",                  "AppCore.Domain"),
        ("backend.configuration", "{E}Configuration.cs",     "AppCore.Infrastructure"),
        ("backend.repository",    "{E}Repository.cs",        "AppCore.Infrastructure"),
        ("backend.interface",     "I{E}Repository.cs",       "AppCore.Application"),
        ("backend.dto",           "{E}Dto.cs",               "AppCore.Application"),
        ("backend.createdto",     "Create{E}Dto.cs",         "AppCore.Application"),
        ("backend.updatedto",     "Update{E}Dto.cs",         "AppCore.Application"),
        ("backend.defaultsdto",   "{E}DefaultsDto.cs",       "AppCore.Application"),
        ("backend.controller",    "{E}Controller.cs",        "AppCore.API"),
        ("frontend.model",        "{K}.model.ts",            "Studio_UI"),
        ("frontend.service",      "{K}.service.ts",          "Studio_UI"),
        ("frontend.form.ts",      "{K}-form.ts",             "Studio_UI"),
        ("frontend.form.html",    "{K}-form.html",           "Studio_UI"),
        ("frontend.list.ts",      "{K}-list.ts",             "Studio_UI"),
        ("frontend.list.html",    "{K}-list.html",           "Studio_UI"),
    };

    //===========================================================
    // Plan from a saved row (existing callers keep working)
    //===========================================================

    public EnginePlan Plan(PageCloningEntity row)
    {
        PageCloneBlueprint bp;

        try { bp = PageCloneBlueprint.Parse(row.BlueprintJson); }
        catch (Exception ex)
        {
            var failed = new EnginePlan();
            failed.Errors.Add("Blueprint error: " + ex.Message);
            return failed;
        }

        return Plan(bp, row.CloneFromName, row.CloneToName);
    }

    //===========================================================
    // Plan from the wizard (no saved row needed). Writes nothing.
    // Shared by Preview and Apply.
    //===========================================================

    public EnginePlan Plan(PageCloneBlueprint bp, string cloneFromName, string cloneToName)
    {
        var plan = new EnginePlan();

        SolutionIndex index;
        try { index = new SolutionIndex(); }
        catch (Exception ex) { plan.Errors.Add(ex.Message); return plan; }

        string? src = ResolveEntity(index, cloneFromName, plan, "source");
        string? tgt = ResolveEntity(index, bp.EntityName, plan, "target");

        if (src == null || tgt == null) return plan;

        var baselines = BaselineLocator.Load(index.Root);
        var baselineByKey = new Dictionary<string, string>();

        // Locate the 15 files on both sides, and the target baselines
        var pairs = new List<(string Key, string SrcPath, string TgtPath)>();

        foreach (var spec in Specs)
        {
            string? s = FindOne(index, spec, src, plan, "source");
            string? t = FindOne(index, spec, tgt, plan, "target");

            if (s == null || t == null) continue;

            string? b = FindBaseline(baselines, t, spec.Key, plan);
            if (b == null) continue;

            baselineByKey[spec.Key] = b;
            pairs.Add((spec.Key, s, t));
        }

        if (plan.Errors.Count > 0) return plan;

        var map = BuildNameMap(src, tgt, string.IsNullOrWhiteSpace(bp.DisplayName)
                        ? Names.Spaced(tgt) : bp.DisplayName, pairs, plan);

        // Parent renames (Company -> AccountSubGroup, companyId -> accountSubGroupId ...)
        var parentInfo = RepositoryBlockGenerator.ResolveParent(index, bp.Parent, plan.Warnings);

        var cfgPair = pairs.FirstOrDefault(p => p.Key == "backend.configuration");
        if (cfgPair.SrcPath != null)
            RepositoryBlockGenerator.AddParentMap(map, File.ReadAllText(cfgPair.SrcPath), parentInfo);

        foreach (var (key, sp, tp) in pairs)
        {
            string before = File.ReadAllText(tp);
            string baselineText = File.ReadAllText(baselineByKey[key]);

            string renamed = Apply(File.ReadAllText(sp), map);

            // Field-level generation driven by the blueprint
            renamed = FieldBlockGenerator.Transform(key, renamed, bp, Names.Singular(tgt), plan.Warnings);
            renamed = RepositoryBlockGenerator.Transform(
                key, renamed, bp, tgt, Names.Singular(tgt), parentInfo, plan.Warnings);
            renamed = FrontendBlockGenerator.Transform(
                key, renamed, bp, Names.Singular(tgt), plan.Warnings);

            // Routed components keep the class name the target's own routes expect
            renamed = AlignRoutedClasses(key, renamed, baselineText);

            string after = AddMarker(renamed, tp, cloneFromName, cloneToName);

            plan.Files.Add(new FileChange
            {
                Key = key,
                Path = Relative(index.Root, tp),
                Before = before,
                After = after,

                // Edited by hand = differs from the sync baseline AND is not
                // the output of an earlier clone (which carries our marker).
                Edited = Normalize(before) != Normalize(baselineText)
                         && !before.Contains(Marker, StringComparison.Ordinal)
            });
        }

        // CodeGenerator.cs (the 16th write target)
        if (bp.WriteCodeGeneratorMethod && !string.IsNullOrWhiteSpace(bp.Code.Prefix))
        {
            var cg = index.Find("CodeGenerator.cs", "AppCore.Infrastructure");

            if (cg.Count != 1)
            {
                plan.Warnings.Add("CodeGenerator.cs not found exactly once. Method not injected.");
            }
            else
            {
                string before = File.ReadAllText(cg[0]);
                string after = CodeGeneratorInjector.Inject(before, bp.Code, out string? w);
                if (w != null) plan.Warnings.Add(w);

                plan.Files.Add(new FileChange
                {
                    Key = "backend.codegenerator",
                    Path = Relative(index.Root, cg[0]),
                    Before = before,
                    After = after
                });
            }
        }

        return plan;
    }

    //===========================================================
    // Apply (saved row)
    //===========================================================

    public Task<EngineResult> ApplyAsync(PageCloningEntity row, bool overwriteEdited)
    {
        PageCloneBlueprint bp;

        try { bp = PageCloneBlueprint.Parse(row.BlueprintJson); }
        catch (Exception ex)
        {
            var failed = new EngineResult();
            failed.Messages.Add("Blueprint error: " + ex.Message);
            return Task.FromResult(failed);
        }

        return ApplyAsync(bp, row.CloneFromName, row.CloneToName, overwriteEdited, verify: true);
    }

    //===========================================================
    // Apply (blueprint). verify = run the backend and frontend builds.
    //===========================================================

    public async Task<EngineResult> ApplyAsync(
        PageCloneBlueprint bp, string cloneFromName, string cloneToName,
        bool overwriteEdited, bool verify)
    {
        var result = new EngineResult();
        var plan = Plan(bp, cloneFromName, cloneToName);

        if (plan.Errors.Count > 0)
        {
            result.Messages.AddRange(plan.Errors);
            return result;
        }

        var edited = plan.Files.Where(f => f.Edited).Select(f => f.Path).ToList();

        if (edited.Count > 0 && !overwriteEdited)
        {
            result.Messages.Add("Files edited by hand since baseline: " + string.Join(", ", edited));
            result.Messages.Add("Nothing written. Confirm overwrite to continue.");
            return result;
        }

        string root = new SolutionIndex().Root;
        var utf8 = new UTF8Encoding(false);

        foreach (var f in plan.Files)
        {
            if (f.Before == f.After) continue;
            await File.WriteAllTextAsync(Path.Combine(root, f.Path), f.After, utf8);
            result.Messages.Add("Written: " + f.Path);
        }

        result.Written = true;
        result.Messages.AddRange(plan.Warnings);

        if (!verify)
        {
            result.Success = true;
            result.Messages.Add("Files written. Build was not run.");
            return result;
        }

        var sb = new StringBuilder();
        int backend = await RunAsync("dotnet",
            $"build \"{Path.Combine(root, "Backend_Studio", "AppCore.API")}\" --nologo -v q " +
            $"-p:OutDir=\"{Path.Combine(Path.GetTempPath(), "pageclone-build")}{Path.DirectorySeparatorChar}\"",
            root, sb);

        int frontend = await RunFrontendBuildAsync(root, sb);

        result.BuildOutput = sb.ToString();
        result.Success = backend == 0 && frontend == 0;
        result.Messages.Add(result.Success ? "Both builds passed." : "A build failed. See build output.");

        return result;
    }

    //===========================================================
    // Restore the target page to its sync baseline.
    //
    // Copies each baseline file back over the target file and removes
    // the CodeGenerator method this clone injected. If any baseline
    // is missing, nothing is changed.
    //===========================================================

    public async Task<EngineResult> RestoreAsync(PageCloningEntity row)
    {
        var result = new EngineResult();
        var plan = new EnginePlan();

        PageCloneBlueprint bp;

        try { bp = PageCloneBlueprint.Parse(row.BlueprintJson); }
        catch (Exception ex)
        {
            result.Messages.Add("Blueprint error: " + ex.Message);
            return result;
        }

        SolutionIndex index;
        try { index = new SolutionIndex(); }
        catch (Exception ex) { result.Messages.Add(ex.Message); return result; }

        string? tgt = ResolveEntity(index, bp.EntityName, plan, "target");

        if (tgt == null)
        {
            result.Messages.AddRange(plan.Errors);
            return result;
        }

        var baselines = BaselineLocator.Load(index.Root);
        var items = new List<(string Key, string Target, string Baseline)>();

        foreach (var spec in Specs)
        {
            string? t = FindOne(index, spec, tgt, plan, "target");
            if (t == null) continue;

            string? b = FindBaseline(baselines, t, spec.Key, plan);
            if (b != null) items.Add((spec.Key, t, b));
        }

        // All or nothing: a missing file or baseline stops everything
        if (plan.Errors.Count > 0)
        {
            result.Messages.AddRange(plan.Errors);
            result.Messages.Add("Nothing was restored.");
            return result;
        }

        var utf8 = new UTF8Encoding(false);

        //-------------------------------------------------------
        // 1. The 15 files: copy the baseline back
        //-------------------------------------------------------

        foreach (var (_, target, baseline) in items)
        {
            string baselineText = File.ReadAllText(baseline);
            string current = File.ReadAllText(target);

            if (Normalize(current) == Normalize(baselineText)) continue;

            await File.WriteAllTextAsync(target, baselineText, utf8);
            result.Messages.Add("Restored: " + Relative(index.Root, target));
        }

        //-------------------------------------------------------
        // 2. CodeGenerator.cs: remove the method this clone injected.
        //    Only the AUTO-BEGIN / AUTO-END block of this method is cut.
        //-------------------------------------------------------

        string methodName = bp.Code?.MethodName ?? string.Empty;
        bool codeWasExpected = bp.WriteCodeGeneratorMethod
                               && !string.IsNullOrWhiteSpace(bp.Code?.Prefix);

        if (!string.IsNullOrWhiteSpace(methodName))
        {
            var cg = index.Find("CodeGenerator.cs", "AppCore.Infrastructure");

            if (cg.Count == 1)
            {
                string text = File.ReadAllText(cg[0]);
                string cleaned = CodeGeneratorInjector.Remove(text, methodName, out bool removed);

                if (removed)
                {
                    await File.WriteAllTextAsync(cg[0], cleaned, utf8);
                    result.Messages.Add("Removed " + methodName + " from CodeGenerator.cs");
                }
                else if (codeWasExpected)
                {
                    result.Messages.Add(
                        "CodeGenerator.cs: no injected block found for " + methodName +
                        ". Check it by hand.");
                }
            }
            else if (codeWasExpected)
            {
                result.Messages.Add(
                    "CodeGenerator.cs was not found exactly once. " + methodName +
                    " was not removed. Check it by hand.");
            }
        }

        if (result.Messages.Count == 0)
            result.Messages.Add("Everything is already at the baseline.");

        result.Written = true;
        result.Success = true;
        return result;
    }

    //===========================================================
    // Helpers
    //===========================================================

    internal static string? ResolveEntity(SolutionIndex index, string raw, EnginePlan plan, string role)
    {
        string name = Names.Clean(raw);

        var candidates = new[] { name, name + "s", Names.Singular(name) }.Distinct();

        foreach (string c in candidates)
            if (index.Find($"{c}Repository.cs", "AppCore.Infrastructure").Count == 1)
                return c;

        plan.Errors.Add($"Cannot resolve the {role} entity from '{raw}'. No unique {name}Repository.cs found.");
        return null;
    }

    private static string? FindOne((string Key, string Pattern, string In) spec,
                                   SolutionIndex index, string entity, EnginePlan plan, string role)
    {
        string file = spec.Pattern.Replace("{E}", entity).Replace("{K}", Names.Kebab(entity));
        var hits = index.Find(file, spec.In);

        if (hits.Count == 1) return hits[0];

        plan.Errors.Add($"{spec.Key}: {file} found {hits.Count} time(s) in {role}.");
        return null;
    }

    private static string? FindOne(SolutionIndex index, (string Key, string Pattern, string In) spec,
                                   string entity, EnginePlan plan, string role) =>
        FindOne(spec, index, entity, plan, role);

    private static string? FindBaseline(
        BaselineLocator baselines, string targetPath, string key, EnginePlan plan)
    {
        string file = Path.GetFileName(targetPath);
        var hits = baselines.Find(file + ".appcore-sync-baseline");

        if (hits.Count == 1) return hits[0];

        plan.Errors.Add(hits.Count == 0
            ? $"{key}: no sync baseline found for {file}. Restore needs the baseline created by the code sync engine."
            : $"{key}: sync baseline for {file} found {hits.Count} times. It must be unique.");

        return null;
    }

    //===========================================================
    // Routed component class names
    //
    // The target's routes file (written by code synchronization) imports
    // the list and form classes by the name the baseline file declares,
    // for example PosAccountsForm. The rename-copy writes the class as
    // the SOURCE spelled it (MfsAccountsForm, MFSAccountsForm), so the
    // route import fails (TS2551). When the baseline declares exactly
    // one class and the generated file declares exactly one class, the
    // generated class always takes the baseline's name, because that
    // is the name the routes import.
    //===========================================================
    private static string AlignRoutedClasses(string key, string text, string baselineText)
    {
        if (key != "frontend.list.ts" && key != "frontend.form.ts") return text;

        var want = Regex.Matches(baselineText, @"export\s+class\s+(\w+)")
            .Select(m => m.Groups[1].Value).ToList();
        var have = Regex.Matches(text, @"export\s+class\s+(\w+)")
            .Select(m => m.Groups[1].Value).ToList();

        if (want.Count != 1 || have.Count != 1) return text;

        string w = want[0], h = have[0];

        if (w == h) return text;

        return Regex.Replace(text, @"\b" + Regex.Escape(h) + @"\b", w);
    }

    private static string Normalize(string text) =>
        text.Replace("\r\n", "\n").Trim();

    //===========================================================
    // Acronym spellings
    //
    // MFSAccounts is also written MfsAccounts (class names) and
    // mfsAccounts (camelCase). The name map needs those spellings
    // too, otherwise they stay in the clone.
    //===========================================================

    private static (string Title, string LowerLead) AcronymForms(string name)
    {
        var words = Regex.Matches(name, "[A-Z]+(?![a-z])|[A-Z][a-z0-9]*|[0-9]+")
            .Select(m => m.Value).ToList();

        if (words.Count == 0) return (name, name);

        string title = string.Concat(words.Select(w =>
            w.Length > 1 && w == w.ToUpperInvariant() && w.Any(char.IsLetter)
                ? w[0] + w[1..].ToLowerInvariant()
                : w));

        string lower = char.ToLowerInvariant(title[0]) + title[1..];

        return (title, lower);
    }

    //===========================================================
    // Name map
    //===========================================================

    private static NameMap BuildNameMap(
        string src, string tgt, string tgtDisplay,
        List<(string Key, string SrcPath, string TgtPath)> pairs, EnginePlan plan)
    {
        var map = new NameMap();

        // Code names: later calls may overwrite earlier ones
        void Add(string s, string t)
        {
            if (!string.IsNullOrEmpty(s) && s != t) map[s] = t;
        }

        // Spaced / display forms: never overwrite a code-name mapping.
        // For a single-word name such as Wings, Spaced("Wings") == "Wings",
        // so an overwrite would turn the class name into "Cash Accounts".
        void AddIfAbsent(string s, string t)
        {
            if (!string.IsNullOrEmpty(s) && s != t && !map.ContainsKey(s)) map[s] = t;
        }

        // Kebab forms: when the text equals a code name that is already mapped
        // (Wing / wing), keep both and let Apply choose by context.
        void AddKebab(string s, string t)
        {
            if (string.IsNullOrEmpty(s) || s == t) return;

            if (map.TryGetValue(s, out var existing))
            {
                if (existing != t) map.Kebab[s] = t;
            }
            else
            {
                map[s] = t;
            }
        }

        string sSing = Names.Singular(src);
        string tSing = Names.Singular(tgt);

        // Ids use the singular form (GeneralLedgers -> GeneralLedgerId)
        Add(src + "Id", tSing + "Id");
        Add(sSing + "Id", tSing + "Id");
        Add(Names.Camel(src) + "Id", Names.Camel(tSing) + "Id");
        Add(Names.Camel(sSing) + "Id", Names.Camel(tSing) + "Id");

        // Plural forms (Wings -> BankAccounts)
        Add(src, tgt);
        Add(Names.Camel(src), Names.Camel(tgt));
        AddKebab(Names.Kebab(src), Names.Kebab(tgt));
        AddIfAbsent(Names.Spaced(src), tgtDisplay);
        AddIfAbsent(Names.Spaced(src).ToLowerInvariant(), tgtDisplay.ToLowerInvariant());

        // Singular stem (WingDto, WingCode, WingName -> BankAccountDto, BankAccountCode ...)
        // Longer keys are applied first, so the plural forms above win where they match.
        Add(sSing, tSing);
        Add(Names.Camel(sSing), Names.Camel(tSing));
        AddKebab(Names.Kebab(sSing), Names.Kebab(tSing));
        AddIfAbsent(Names.Spaced(sSing), Names.Spaced(tSing));
        AddIfAbsent(Names.Spaced(sSing).ToLowerInvariant(), Names.Spaced(tSing).ToLowerInvariant());

        // Acronym spellings: MFSAccounts -> MfsAccounts / mfsAccounts
        //                    POSAccounts -> PosAccounts / posAccounts
        var sPl = AcronymForms(src);
        var tPl = AcronymForms(tgt);
        var sSg = AcronymForms(sSing);
        var tSg = AcronymForms(tSing);

        AddIfAbsent(sPl.Title, tPl.Title);
        AddIfAbsent(sPl.LowerLead, tPl.LowerLead);
        AddIfAbsent(sSg.Title, tSg.Title);
        AddIfAbsent(sSg.LowerLead, tSg.LowerLead);
        AddIfAbsent(sPl.Title + "Id", tSing + "Id");
        AddIfAbsent(sSg.Title + "Id", tSing + "Id");

        // Module / namespace pairs, learned by comparing source and target locations
        foreach (var (_, sp, tp) in pairs)
        {
            var a = sp.Split(Path.DirectorySeparatorChar);
            var b = tp.Split(Path.DirectorySeparatorChar);
            if (a.Length != b.Length) continue;

            for (int i = 0; i < a.Length - 1; i++)
            {
                if (a[i] == b[i]) continue;
                if (a[i].Contains(src) || b[i].Contains(tgt) ||
                    a[i].Contains(Names.Kebab(src)) || b[i].Contains(Names.Kebab(tgt))) continue;

                Add(a[i], b[i]);                                        // ProductSettings / product-settings
                AddIfAbsent(Names.Spaced(a[i]), Names.Spaced(b[i]));    // "Product Settings"
            }
        }

        // Namespaces can differ from the folders: compare declared namespaces of the entity files
        var entityPair = pairs.FirstOrDefault(p => p.Key == "backend.entity");

        if (entityPair.SrcPath != null)
        {
            string ns(string path) =>
                Regex.Match(File.ReadAllText(path), @"namespace\s+([\w.]+)").Groups[1].Value;

            var sn = ns(entityPair.SrcPath).Split('.');
            var tn = ns(entityPair.TgtPath).Split('.');

            if (sn.Length == tn.Length)
            {
                for (int i = 0; i < sn.Length; i++)
                {
                    if (sn[i] == tn[i]) continue;

                    Add(sn[i], tn[i]);
                    AddIfAbsent(Names.Spaced(sn[i]), Names.Spaced(tn[i]));
                    AddKebab(Names.Kebab(sn[i]), Names.Kebab(tn[i]));
                }
            }
            else
            {
                plan.Warnings.Add("Source and target namespaces have different depth. Check namespaces in the diff.");
            }
        }

        return map;
    }

    private static string Apply(string text, Dictionary<string, string> map)
    {
        if (map.Count == 0) return text;

        var kebab = (map as NameMap)?.Kebab;

        var keys = map.Keys.AsEnumerable();
        if (kebab != null) keys = keys.Concat(kebab.Keys);

        string pattern = string.Join("|",
            keys.Distinct().OrderByDescending(k => k.Length).Select(Regex.Escape));

        return Regex.Replace(text, pattern, m =>
        {
            // Same text as a camelCase name: inside a path or URL it is the
            // kebab-case name, everywhere else it is the camelCase name.
            if (kebab != null && kebab.TryGetValue(m.Value, out var k) && IsKebabContext(text, m))
                return k;

            if (map.TryGetValue(m.Value, out var v)) return v;

            return kebab != null && kebab.TryGetValue(m.Value, out var k2) ? k2 : m.Value;
        });
    }

    // /wings/  ./wings.service  wings-list  app-wings
    private static bool IsKebabContext(string text, Match m)
    {
        char prev = m.Index > 0 ? text[m.Index - 1] : ' ';

        int e = m.Index + m.Length;
        char next = e < text.Length ? text[e] : ' ';

        return prev == '/' || prev == '-' || next == '-';
    }

    private static string AddMarker(string text, string path, string cloneFromName, string cloneToName)
    {
        string line = $"{Marker} : {cloneFromName} -> {cloneToName}";

        return path.EndsWith(".html", StringComparison.OrdinalIgnoreCase)
            ? $"<!-- {line} -->\n{text}"
            : $"// {line}\n{text}";
    }

    private static string Relative(string root, string path) =>
        Path.GetRelativePath(root, path);

    private static Task<int> RunFrontendBuildAsync(string root, StringBuilder log)
    {
        string dir = Path.Combine(root, "Frontend_Studio", "Studio_UI");

        return OperatingSystem.IsWindows()
            ? RunAsync("cmd.exe", "/c npx ng build", dir, log)
            : RunAsync("npx", "ng build", dir, log);
    }

    private static async Task<int> RunAsync(string exe, string args, string dir, StringBuilder log)
    {
        var psi = new ProcessStartInfo(exe, args)
        {
            WorkingDirectory = dir,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false
        };

        using var p = Process.Start(psi)!;
        using var cts = new CancellationTokenSource(TimeSpan.FromMinutes(6));

        Task<string> o = p.StandardOutput.ReadToEndAsync();
        Task<string> e = p.StandardError.ReadToEndAsync();

        try { await p.WaitForExitAsync(cts.Token); }
        catch (OperationCanceledException) { p.Kill(true); log.AppendLine($"{exe}: timed out."); return -1; }

        log.AppendLine($"> {exe} {args}");
        log.AppendLine(await o);
        log.AppendLine(await e);

        return p.ExitCode;
    }
}

//===============================================================
// Name map that also remembers kebab-case names that look exactly
// like a camelCase name (wing / wing). Those are chosen by context
// in PageCloneEngine.Apply.
//===============================================================

internal sealed class NameMap : Dictionary<string, string>
{
    public NameMap() : base(StringComparer.Ordinal) { }

    public Dictionary<string, string> Kebab { get; } = new(StringComparer.Ordinal);
}