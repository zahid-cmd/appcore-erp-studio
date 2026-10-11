using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;

namespace AppCore.Infrastructure.Platform.PageCloneEngine;

//===============================================================
// Blueprint
//===============================================================

public class PageCloneBlueprint
{
    public string EntityName { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public CodeSpec Code { get; set; } = new();
    public bool WriteCodeGeneratorMethod { get; set; } = true;

    public static PageCloneBlueprint Parse(string json) =>
        JsonSerializer.Deserialize<PageCloneBlueprint>(
            json,
            new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                NumberHandling = JsonNumberHandling.AllowReadingFromString
            })
        ?? throw new InvalidOperationException("Blueprint is empty.");
}

public class CodeSpec
{
    public string MethodName { get; set; } = string.Empty;
    public string Prefix { get; set; } = string.Empty;
    public List<CodeSegment> Segments { get; set; } = new();
    public int SequencePad { get; set; } = 4;
}

public class CodeSegment
{
    public string Name { get; set; } = string.Empty;
    public int Pad { get; set; } = 3;
}

//===============================================================
// Plan / Result
//===============================================================

public class FileChange
{
    public string Key { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string Before { get; set; } = string.Empty;
    public string After { get; set; } = string.Empty;
    public bool Edited { get; set; }
}

public class EnginePlan
{
    public List<FileChange> Files { get; } = new();
    public List<string> Warnings { get; } = new();
    public List<string> Errors { get; } = new();
}

public class EngineResult
{
    public bool Success { get; set; }
    public bool Written { get; set; }
    public List<string> Messages { get; } = new();
    public string BuildOutput { get; set; } = string.Empty;
}

//===============================================================
// Name helpers
//===============================================================

public static class Names
{
    public static List<string> Words(string pascal) =>
        Regex.Matches(pascal, "[A-Z][a-z0-9]*|[0-9]+")
             .Select(m => m.Value).ToList();

    public static string Spaced(string pascal) => string.Join(" ", Words(pascal));
    public static string Kebab(string pascal) => string.Join("-", Words(pascal)).ToLowerInvariant();

    public static string Camel(string pascal) =>
        pascal.Length == 0 ? pascal : char.ToLowerInvariant(pascal[0]) + pascal[1..];

    public static string Singular(string pascal) =>
        pascal.EndsWith("s") && !pascal.EndsWith("ss") ? pascal[..^1] : pascal;

    public static string Clean(string text) =>
        Regex.Replace(text ?? string.Empty, "[^A-Za-z0-9]", "");
}

//===============================================================
// Solution file index (skips bin, obj, node_modules ...)
//===============================================================

public class SolutionIndex
{
    private static readonly HashSet<string> Skip = new(StringComparer.OrdinalIgnoreCase)
        { "bin", "obj", "node_modules", ".angular", "dist", ".git", ".vs" };

    private readonly Dictionary<string, List<string>> _byName =
        new(StringComparer.OrdinalIgnoreCase);

    public string Root { get; }

    public SolutionIndex()
    {
        Root = FindRoot();

        foreach (string start in new[]
        {
            Path.Combine(Root, "Backend_Studio"),
            Path.Combine(Root, "Frontend_Studio", "Studio_UI", "src")
        })
        {
            var stack = new Stack<string>();
            stack.Push(start);

            while (stack.Count > 0)
            {
                string dir = stack.Pop();

                foreach (string d in Directory.EnumerateDirectories(dir))
                    if (!Skip.Contains(System.IO.Path.GetFileName(d))) stack.Push(d);

                foreach (string f in Directory.EnumerateFiles(dir))
                {
                    string name = System.IO.Path.GetFileName(f);
                    if (!_byName.TryGetValue(name, out var list))
                        _byName[name] = list = new List<string>();
                    list.Add(f);
                }
            }
        }
    }

    private static string FindRoot()
    {
        var dir = new DirectoryInfo(AppContext.BaseDirectory);

        while (dir != null)
        {
            if (Directory.Exists(Path.Combine(dir.FullName, "Backend_Studio")) &&
                Directory.Exists(Path.Combine(dir.FullName, "Frontend_Studio")))
                return dir.FullName;

            dir = dir.Parent;
        }

        throw new InvalidOperationException(
            "Solution root (folder containing Backend_Studio and Frontend_Studio) not found.");
    }

    public List<string> Find(string fileName, string pathContains) =>
        _byName.TryGetValue(fileName, out var list)
            ? list.Where(p => p.Contains(pathContains, StringComparison.OrdinalIgnoreCase)).ToList()
            : new List<string>();
}