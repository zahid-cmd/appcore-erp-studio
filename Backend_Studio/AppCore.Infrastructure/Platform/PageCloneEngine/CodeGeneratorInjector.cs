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
            + string.Concat(spec.Segments.Select(s => $"-{{{s.Name}SequenceNo:D{s.Pad}}}"))
            + $"-{{sequenceNo:D{spec.SequencePad}}}";

        sb.AppendLine($"        return $\"{format}\";");
        sb.Append("    }");
        return sb.ToString();
    }

    //===========================================================
    // Inject (add, or replace our own block on a re-clone)
    //===========================================================

    public static string Inject(string source, CodeSpec spec, out string? warning)
    {
        warning = null;

        string begin = BeginMarker(spec.MethodName);
        string end = EndMarker(spec.MethodName);
        string block = $"{begin}\n{RenderMethod(spec)}\n{end}\n";

        int b = FindMarkerLine(source, begin);
        int e = FindMarkerLine(source, end);

        // Re-clone: replace our own block, keep the lines around it
        if (b >= 0 && e > b)
        {
            int after = SkipLineEnd(source, e + end.Length);
            return source[..b] + block + source[after..];
        }

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

    //===========================================================
    // Remove (used by Restore). Cuts only this method's AUTO block
    // and the blank lines Inject added around it.
    //===========================================================

    public static string Remove(string source, string methodName, out bool removed)
    {
        removed = false;

        string begin = BeginMarker(methodName);
        string end = EndMarker(methodName);

        int b = FindMarkerLine(source, begin);
        int e = FindMarkerLine(source, end);

        if (b < 0 || e <= b) return source;

        int start = b;

        // one blank line above the block
        if (start >= 1 && source[start - 1] == '\n')
        {
            int p = start - 1;
            if (p > 0 && source[p - 1] == '\r') p--;
            if (p > 0 && source[p - 1] == '\n') start = p;
        }

        int endAfter = SkipLineEnd(source, e + end.Length);

        // one blank line below the block
        if (endAfter < source.Length
            && (source[endAfter] == '\n'
                || (source[endAfter] == '\r' && endAfter + 1 < source.Length && source[endAfter + 1] == '\n')))
        {
            endAfter = SkipLineEnd(source, endAfter);
        }

        removed = true;
        return source[..start] + source[endAfter..];
    }

    //===========================================================
    // Helpers
    //===========================================================

    private static string BeginMarker(string methodName) => $"    // AUTO-BEGIN : {methodName}";
    private static string EndMarker(string methodName) => $"    // AUTO-END : {methodName}";

    // Finds the marker only when it ends the line (so GenerateBankCode
    // never matches inside GenerateBankCodeX).
    private static int FindMarkerLine(string source, string marker)
    {
        int from = 0;

        while (true)
        {
            int i = source.IndexOf(marker, from, StringComparison.Ordinal);
            if (i < 0) return -1;

            int after = i + marker.Length;

            if (after >= source.Length || char.IsWhiteSpace(source[after])) return i;

            from = after;
        }
    }

    private static int SkipLineEnd(string source, int pos)
    {
        if (pos < source.Length && source[pos] == '\r') pos++;
        if (pos < source.Length && source[pos] == '\n') pos++;
        return pos;
    }
}