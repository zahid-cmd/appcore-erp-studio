using System.Text;

namespace AppCore.Infrastructure.Platform.PageCloneEngine;

public static class CodeGeneratorInjector
{
    public static string RenderMethod(CodeSpec spec)
    {
        var args = spec.Segments.Select(s => $"int {s.Name}SequenceNo").ToList();
        args.Add("int sequenceNo");

        var sb = new StringBuilder();
        sb.AppendLine($"    public static string {spec.MethodName}(");
        sb.AppendLine("        " + string.Join(",\n        ", args) + ")");
        sb.AppendLine("    {");

        foreach (var s in spec.Segments)
            sb.AppendLine($"        if ({s.Name}SequenceNo < 1)\n        {{\n            throw new ArgumentException(\"Invalid {s.Name} sequence number.\");\n        }}\n");

        sb.AppendLine("        if (sequenceNo < 1)\n        {\n            throw new ArgumentException(\"Invalid sequence number.\");\n        }\n");

        string format = spec.Prefix.ToUpperInvariant()
            + string.Concat(spec.Segments.Select((s, i) => $"-{{{s.Name}SequenceNo:D{s.Pad}}}"))
            + $"-{{sequenceNo:D{spec.SequencePad}}}";

        sb.AppendLine($"        return $\"{format}\";");
        sb.Append("    }");
        return sb.ToString();
    }

    public static string Inject(string source, CodeSpec spec, out string? warning)
    {
        warning = null;

        string begin = $"    // AUTO-BEGIN : {spec.MethodName}";
        string end = $"    // AUTO-END : {spec.MethodName}";
        string block = $"{begin}\n{RenderMethod(spec)}\n{end}\n";

        int b = source.IndexOf(begin, StringComparison.Ordinal);
        int e = source.IndexOf(end, StringComparison.Ordinal);

        // Re-clone: replace our own block
        if (b >= 0 && e > b)
            return source[..b] + block + source[(e + end.Length)..].TrimStart('\r', '\n');

        // Hand-written method with the same name: never touch it
        if (source.Contains($"static string {spec.MethodName}(", StringComparison.Ordinal))
        {
            warning = $"'{spec.MethodName}' already exists outside an AUTO block and was left unchanged.";
            return source;
        }

        // Find the closing brace of class CodeGenerator by brace matching
        int cls = source.IndexOf("class CodeGenerator", StringComparison.Ordinal);
        int open = cls < 0 ? -1 : source.IndexOf('{', cls);

        if (open < 0)
            throw new InvalidOperationException("class CodeGenerator not found in CodeGenerator.cs.");

        int depth = 0, close = -1;

        for (int i = open; i < source.Length; i++)
        {
            if (source[i] == '{') depth++;
            else if (source[i] == '}' && --depth == 0) { close = i; break; }
        }

        if (close < 0)
            throw new InvalidOperationException("Closing brace of CodeGenerator not found.");

        return source.Insert(close, "\n" + block + "\n");
    }
}