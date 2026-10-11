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
    // Plan (shared by Preview and Apply)
    //===========================================================

    public EnginePlan Plan(PageCloningEntity row)
    {
        var plan = new EnginePlan();

        PageCloneBlueprint bp;
        try { bp = PageCloneBlueprint.Parse(row.BlueprintJson); }
        catch (Exception ex) { plan.Errors.Add("Blueprint error: " + ex.Message); return plan; }

        SolutionIndex index;
        try { index = new SolutionIndex(); }
        catch (Exception ex) { plan.Errors.Add(ex.Message); return plan; }

        string? src = ResolveEntity(index, row.CloneFromName, plan, "source");
        string? tgt = ResolveEntity(index, bp.EntityName, plan, "target");

        if (src == null || tgt == null) return plan;

        // Locate the 15 files on both sides
        var pairs = new List<(string Key, string SrcPath, string TgtPath)>();

        foreach (var spec in Specs)
        {
            string? s = FindOne(index, spec, src, plan, "source");
            string? t = FindOne(index, spec, tgt, plan, "target (baseline missing)");
            if (s != null && t != null) pairs.Add((spec.Key, s, t));
        }

        if (plan.Errors.Count > 0) return plan;

        var map = BuildNameMap(src, tgt, string.IsNullOrWhiteSpace(bp.DisplayName)
                        ? Names.Spaced(tgt) : bp.DisplayName, pairs, plan);

        foreach (var (key, sp, tp) in pairs)
        {
            string before = File.ReadAllText(tp);
            string after = AddMarker(Apply(File.ReadAllText(sp), map), tp, row);

            plan.Files.Add(new FileChange
            {
                Key = key,
                Path = Relative(index.Root, tp),
                Before = before,
                After = after,
                // Heuristic: a baseline holds the engine's sample text or our own marker.
                // Anything else was changed by hand. Replace when the baseline format is known.
                Edited = !string.IsNullOrWhiteSpace(before)
                         && !before.Contains("Sample", StringComparison.Ordinal)
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
    // Apply
    //===========================================================

    public async Task<EngineResult> ApplyAsync(PageCloningEntity row, bool overwriteEdited)
    {
        var result = new EngineResult();
        var plan = Plan(row);

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

        // Verify
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

    private static Dictionary<string, string> BuildNameMap(
        string src, string tgt, string tgtDisplay,
        List<(string Key, string SrcPath, string TgtPath)> pairs, EnginePlan plan)
    {
        var map = new Dictionary<string, string>(StringComparer.Ordinal);

        void Add(string s, string t)
        {
            if (!string.IsNullOrEmpty(s) && s != t) map[s] = t;
        }

        // Ids use the singular form (GeneralLedgers -> GeneralLedgerId)
        string tSing = Names.Singular(tgt);
        Add(src + "Id", tSing + "Id");
        Add(Names.Singular(src) + "Id", tSing + "Id");
        Add(Names.Camel(src) + "Id", Names.Camel(tSing) + "Id");
        Add(Names.Camel(Names.Singular(src)) + "Id", Names.Camel(tSing) + "Id");

        Add(src, tgt);
        Add(Names.Camel(src), Names.Camel(tgt));
        Add(Names.Kebab(src), Names.Kebab(tgt));
        Add(Names.Spaced(src), tgtDisplay);
        Add(Names.Spaced(src).ToLowerInvariant(), tgtDisplay.ToLowerInvariant());

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

                Add(a[i], b[i]);                                   // ProductSettings / product-settings
                Add(Names.Spaced(a[i]), Names.Spaced(b[i]));       // "Product Settings"
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
                for (int i = 0; i < sn.Length; i++)
                    if (sn[i] != tn[i])
                    {
                        Add(sn[i], tn[i]);
                        Add(Names.Spaced(sn[i]), Names.Spaced(tn[i]));
                        Add(Names.Kebab(sn[i]), Names.Kebab(tn[i]));
                    }
            else
                plan.Warnings.Add("Source and target namespaces have different depth. Check namespaces in the diff.");
        }

        return map;
    }

    private static string Apply(string text, Dictionary<string, string> map)
    {
        if (map.Count == 0) return text;

        string pattern = string.Join("|",
            map.Keys.OrderByDescending(k => k.Length).Select(Regex.Escape));

        return Regex.Replace(text, pattern, m => map[m.Value]);
    }

    private static string AddMarker(string text, string path, PageCloningEntity row)
    {
        string line = $"{Marker} : {row.CloneFromName} -> {row.CloneToName}";

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