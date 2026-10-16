using System.Text;
using System.Text.RegularExpressions;

namespace AppCore.Infrastructure.Platform.PageCloneEngine;

//===============================================================
// Orphan Field Pruner
//
// A customised source page can contain its own code for fields
// that this clone does NOT have, for example:
//
//     !this.requireText(this.entity.FullAccountNumber, '...')
//     if (this.entity.MFSCharges > MAX) { ... } else { ... }
//     this.entity.ShortAccountName = this.toUpper(...);
//     AccountType: this.entity.AccountType,
//     get isMerchant(): boolean { ... this.entity.AccountType ... }
//
// The cloned model does not have those properties, so the Angular
// build fails (TS2339 / TS2551 / TS2353). Prune (form ts) removes:
//
//   1. required checks of an orphan field in the
//      "requireText(...) || requireText(...)" chain
//   2. methods and getters that read an orphan field, then every
//      method that calls a removed method, and every statement that
//      calls a removed method. Reads of a removed getter
//      (this.isMerchant) become  false
//   3. if (...) statements whose condition reads an orphan field.
//      With an else branch, only the else branch is kept
//   4. object properties of an orphan field   AccountType: ...,
//   5. assignments to an orphan field
//   6. html bindings of removed methods (StripBindings); reads of
//      a removed getter in the html become  false
//
// PruneList does the same for the list ts: {Field}Text members of the
// list item interface and  item.{Field}  entries of the search values.
//
// An orphan field of the form is any  this.entity.X  where X is not
// a property of this page. Everything removed is listed in the notes.
//===============================================================

internal static class OrphanFieldPruner
{
    // Names of the methods removed from the form ts of the current plan
    [ThreadStatic] private static HashSet<string>? _removed;

    // Names of the removed getters (read as this.name, not this.name())
    [ThreadStatic] private static HashSet<string>? _getters;

    // Never removed as a whole, even when they mention an orphan field
    private static readonly HashSet<string> Core = new(StringComparer.Ordinal)
    {
        "constructor", "ngOnInit", "ngOnDestroy", "ngAfterViewInit",
        "onSave", "saveCreate", "saveUpdate", "buildPayload",
        "loadEntity", "createEmptyEntity", "onCancel", "onClose"
    };

    // A class member:   [modifiers] name(params)[: type] {
    private static readonly Regex Header = new(
        @"(?m)^    (?:(?:private|public|protected|async|static|readonly|get|set)\s+)*(?<n>\w+)\s*\((?<p>[^()]*)\)\s*(?::\s*[\w<>\[\]|,.\s]+?)?\s*\{");

    private static readonly Regex Banner = new(
        @"[ \t]*//=+[ \t]*\r?\n[ \t]*//[^\r\n]*\r?\n[ \t]*//=+[ \t]*\r?\n\s*$");

    //===========================================================
    // Form ts
    //===========================================================

    public static string Prune(string text, PageCloneBlueprint bp, List<string> warnings)
    {
        _removed = new HashSet<string>(StringComparer.Ordinal);
        _getters = new HashSet<string>(StringComparer.Ordinal);

        var active = new HashSet<string>(
            FieldBlockGenerator.Active(bp).Select(f => f.Name), StringComparer.Ordinal);

        // An orphan is any this.entity.X whose X is not a property of this
        // page: a field set to Exclude in the wizard, or one that the
        // blueprint does not list at all.
        active.Add(bp.EntityName + "Id");

        foreach (var f in bp.Fields.Where(f => !f.IsExcluded))
            active.Add(f.Name);

        var orphans = Regex.Matches(text, @"this\.entity\.([A-Za-z_]\w*)")
            .Cast<Match>()
            .Select(m => m.Groups[1].Value)
            .Where(n => !active.Contains(n))
            .Distinct()
            .ToList();

        if (orphans.Count == 0) return text;

        var droppedChecks = new List<string>();
        var droppedAssign = new List<string>();

        // 1. required checks inside  if ( !a || !b || ... )
        foreach (string o in orphans)
        {
            string clause = @"!\s*this\.requireText\(\s*this\.entity\." + Regex.Escape(o) + @"\s*,[^)]*\)";

            var withLead = new Regex(@"\|\|\s*" + clause + @"\s*");
            var withTail = new Regex(clause + @"\s*\|\|\s*");
            var alone = new Regex(clause);

            if (withLead.IsMatch(text))
            {
                text = withLead.Replace(text, "");
                droppedChecks.Add(o);
            }
            else if (withTail.IsMatch(text))
            {
                text = withTail.Replace(text, "");
                droppedChecks.Add(o);
            }
            else if (alone.IsMatch(text))
            {
                text = alone.Replace(text, "false");
                droppedChecks.Add(o);
            }
        }

        // 2. methods / getters that read an orphan field, and their callers
        var removed = new List<string>();

        while (true)
        {
            foreach (string r in removed) text = StripCalls(text, r);

            bool again = false;

            foreach (Match m in Header.Matches(text))
            {
                string name = m.Groups["n"].Value;

                if (Core.Contains(name) || removed.Contains(name)) continue;

                int open = m.Index + m.Length - 1;
                int close = MatchBrace(text, open);
                if (close < 0) continue;

                string body = text[open..(close + 1)];

                bool reads = orphans.Any(o =>
                    Regex.IsMatch(body, @"this\.entity\." + Regex.Escape(o) + @"\b"));

                bool calls = removed.Any(r =>
                    Regex.IsMatch(body, @"this\." + Regex.Escape(r) + @"\s*\("));

                if (!reads && !calls) continue;

                bool isGetter = Regex.IsMatch(m.Value, @"\bget\s+" + Regex.Escape(name) + @"\s*\(");

                text = RemoveRange(text, m.Index, close + 1, true);
                removed.Add(name);
                _removed.Add(name);
                if (isGetter) _getters.Add(name);
                again = true;
                break;
            }

            if (!again) break;
        }

        // reads of a removed getter:  this.isMerchant  ->  false
        foreach (string g in _getters)
        {
            text = Regex.Replace(text,
                @"\bthis\." + Regex.Escape(g) + @"\b(?!\s*\()", "false");
        }

        // 3. if (...) statements whose condition reads an orphan field
        var droppedIfs = RemoveIfBlocks(ref text, orphans);

        // 4. object properties of an orphan field   AccountType: this.entity.AccountType,
        var droppedKeys = RemoveObjectKeys(ref text, orphans);

        // 5. what is left of the form: this.entity.X = ...;
        foreach (string o in orphans)
        {
            var assign = new Regex(
                @"(?m)^[ \t]*this\.entity\." + Regex.Escape(o) + @"\s*=[^;]*;[ \t]*\r?\n?");

            if (assign.IsMatch(text))
            {
                text = assign.Replace(text, "");
                droppedAssign.Add(o);
            }
        }

        // notes
        if (droppedChecks.Count > 0)
            warnings.Add("frontend.form.ts: removed the required checks of fields this page does not have: " + string.Join(", ", droppedChecks) + ".");

        if (droppedIfs.Count > 0)
            warnings.Add("frontend.form.ts: removed if-blocks that used fields this page does not have (an else branch was kept): " + string.Join(", ", droppedIfs.Distinct()) + ".");

        if (droppedKeys.Count > 0)
            warnings.Add("frontend.form.ts: removed object properties of fields this page does not have: " + string.Join(", ", droppedKeys.Distinct()) + ".");

        if (droppedAssign.Count > 0)
            warnings.Add("frontend.form.ts: removed assignments to fields this page does not have: " + string.Join(", ", droppedAssign) + ".");

        if (removed.Count > 0)
            warnings.Add("frontend.form.ts: removed methods / getters that used fields this page does not have: " + string.Join(", ", removed) + ". Reads of a removed getter became false. Add your own versions if this page needs them.");

        var left = orphans
            .Where(o => Regex.IsMatch(text, @"this\.entity\." + Regex.Escape(o) + @"\b"))
            .ToList();

        if (left.Count > 0)
            warnings.Add("frontend.form.ts: fields this page does not have are still used in the form: " + string.Join(", ", left) + ". Remove them by hand.");

        var dangling = removed
            .Where(r => !_getters.Contains(r)
                        && Regex.IsMatch(text, @"\bthis\." + Regex.Escape(r) + @"\b"))
            .ToList();

        if (dangling.Count > 0)
            warnings.Add("frontend.form.ts: a removed method is still referenced: " + string.Join(", ", dangling) + ". Remove it by hand.");

        return text;
    }

    //===========================================================
    // List ts
    //
    // The wizard's excluded fields (by target AND source name) are
    // removed from the list item interface ({Field}Text) and from
    // the search values (item.{Field}, item.{Field}Text).
    //===========================================================

    public static string PruneList(string text, PageCloneBlueprint bp, List<string> warnings)
    {
        var active = new HashSet<string>(
            FieldBlockGenerator.Active(bp).Select(f => f.Name), StringComparer.Ordinal);

        var orphans = bp.Fields
            .Where(f => f.IsExcluded)
            .SelectMany(f => new[] { f.Name, f.SourceName })
            .Where(n => !string.IsNullOrWhiteSpace(n) && !active.Contains(n))
            .Distinct()
            .ToList();

        if (orphans.Count == 0) return text;

        var dropped = new List<string>();

        foreach (string o in orphans)
        {
            string e = Regex.Escape(o);

            // interface member:  MFSChargesText: string;
            var member = new Regex(@"(?m)^[ \t]*" + e + @"Text\s*:\s*string\s*;[ \t]*\r?\n(?:[ \t]*\r?\n)?");

            // search values:  item.AccountType,
            var value = new Regex(@"(?m)^[ \t]*item\." + e + @"(?:Text)?\s*,?[ \t]*\r?\n");

            bool hit = false;

            if (member.IsMatch(text)) { text = member.Replace(text, ""); hit = true; }
            if (value.IsMatch(text))  { text = value.Replace(text, ""); hit = true; }

            if (hit) dropped.Add(o);
        }

        if (dropped.Count > 0)
            warnings.Add("frontend.list.ts: removed list members and search values of fields this page does not have: " + string.Join(", ", dropped) + ".");

        var left = orphans
            .Where(o => Regex.IsMatch(text, @"\.\s*" + Regex.Escape(o) + @"(?:Text)?\b"))
            .ToList();

        if (left.Count > 0)
            warnings.Add("frontend.list.ts: fields this page does not have are still used in the list: " + string.Join(", ", left) + ". Remove them by hand.");

        return text;
    }

    //===========================================================
    // Form html: drop (event)="removedMethod()" bindings and turn
    // reads of a removed getter into false
    //===========================================================

    public static string StripBindings(string html)
    {
        if (_removed == null || _removed.Count == 0) return html;

        foreach (string n in _removed)
        {
            html = Regex.Replace(html,
                @"\s+\(\w+\)\s*=\s*""\s*" + Regex.Escape(n) + @"\s*\([^""]*\)\s*;?\s*""", "");
        }

        if (_getters != null)
        {
            foreach (string g in _getters)
            {
                string name = Regex.Escape(g);
                var read = new Regex(@"(?<![\w.])" + name + @"\b(?!\s*\()");

                // attribute values:  [disabled]="isMerchant"  *ngIf="isMerchant"
                html = Regex.Replace(html, @"=\s*""[^""]*""",
                    m => read.Replace(m.Value, "false"));

                // control flow:  @if (isMerchant) {
                html = Regex.Replace(html, @"@if\s*\([^)]*\)",
                    m => read.Replace(m.Value, "false"));
            }
        }

        return html;
    }

    //===========================================================
    // Helpers
    //===========================================================

    // if ( ...orphan... ) { ... }  or  if ( ...orphan... ) statement;
    //
    // With no else, the whole if is removed.
    // With  else { ... }  only the else body is kept (the orphan
    // condition is false on this page).
    // With  else if ...   the removed if and the word else are dropped,
    // so the next if becomes the first one.
    private static List<string> RemoveIfBlocks(ref string text, List<string> orphans)
    {
        var dropped = new List<string>();
        var start = new Regex(@"(?m)^[ \t]*if\s*\(");
        int pos = 0;

        while (true)
        {
            var m = start.Match(text, pos);
            if (!m.Success) break;

            int open = m.Index + m.Length - 1;
            int close = MatchParen(text, open);

            if (close < 0) { pos = m.Index + m.Length; continue; }

            string cond = text[open..(close + 1)];

            string? hit = orphans.FirstOrDefault(o =>
                Regex.IsMatch(cond, @"this\.entity\." + Regex.Escape(o) + @"\b"));

            if (hit == null) { pos = m.Index + m.Length; continue; }

            int i = close + 1;
            while (i < text.Length && char.IsWhiteSpace(text[i])) i++;

            int end;

            if (i < text.Length && text[i] == '{')
            {
                int cb = MatchBrace(text, i);
                if (cb < 0) { pos = m.Index + m.Length; continue; }
                end = cb + 1;
            }
            else
            {
                int semi = text.IndexOf(';', i);
                if (semi < 0) { pos = m.Index + m.Length; continue; }
                end = semi + 1;
            }

            int j = end;
            while (j < text.Length && char.IsWhiteSpace(text[j])) j++;

            bool hasElse = string.CompareOrdinal(text, j, "else", 0, 4) == 0
                           && (j + 4 >= text.Length || !char.IsLetterOrDigit(text[j + 4]));

            if (hasElse)
            {
                int k = j + 4;
                while (k < text.Length && char.IsWhiteSpace(text[k])) k++;

                string indent = m.Value[..m.Value.IndexOf("if", StringComparison.Ordinal)];

                if (string.CompareOrdinal(text, k, "if", 0, 2) == 0)
                {
                    // else if (...) ...   ->   if (...) ...
                    text = text[..m.Index] + indent + text[k..];
                    dropped.Add(hit);
                    pos = m.Index;
                    continue;
                }

                if (k < text.Length && text[k] == '{')
                {
                    int eb = MatchBrace(text, k);

                    if (eb > 0)
                    {
                        string inner = text[(k + 1)..eb];
                        inner = Regex.Replace(inner, @"(?m)^    ", "").Trim('\r', '\n');

                        text = text[..m.Index] + inner + text[(eb + 1)..];
                        dropped.Add(hit);
                        pos = m.Index;
                        continue;
                    }
                }

                // else with a single statement: leave it for the notes
                pos = m.Index + m.Length;
                continue;
            }

            text = RemoveRange(text, m.Index, end, false);
            dropped.Add(hit);
            pos = m.Index;
        }

        return dropped;
    }

    // Object literal properties:   AccountType: this.entity.AccountType,
    // The value runs to the next top-level comma, or to the closing brace.
    // A line that ends in ; first (an interface member) is left alone.
    private static List<string> RemoveObjectKeys(ref string text, List<string> orphans)
    {
        var dropped = new List<string>();

        foreach (string o in orphans)
        {
            var rx = new Regex(@"(?m)^[ \t]*" + Regex.Escape(o) + @"\s*:\s*");
            int pos = 0;

            while (true)
            {
                var m = rx.Match(text, pos);
                if (!m.Success) break;

                int i = m.Index + m.Length, depth = 0, end = -1;

                for (; i < text.Length; i++)
                {
                    char c = text[i];

                    if (c == '\'' || c == '"' || c == '`')
                    {
                        int q = SkipString(text, i);
                        if (q < 0) break;
                        i = q;
                        continue;
                    }

                    if (c == '(' || c == '[' || c == '{') depth++;
                    else if (c == ')' || c == ']' || c == '}')
                    {
                        if (depth == 0) { end = i; break; }
                        depth--;
                    }
                    else if (c == ',' && depth == 0) { end = i + 1; break; }
                    else if (c == ';' && depth == 0) break;
                }

                if (end < 0) { pos = m.Index + m.Length; continue; }

                text = RemoveRange(text, m.Index, end, false);
                dropped.Add(o);
                pos = m.Index;
            }
        }

        return dropped;
    }

    // Index of the closing quote of the string that starts at "open", or -1
    private static int SkipString(string text, int open)
    {
        char q = text[open];

        for (int i = open + 1; i < text.Length; i++)
        {
            if (text[i] == '\\') { i++; continue; }
            if (text[i] == q) return i;
        }

        return -1;
    }

    // Index of the ) that closes the ( at "open", or -1
    private static int MatchParen(string text, int open)
    {
        int depth = 0;

        for (int i = open; i < text.Length; i++)
        {
            if (text[i] == '(') depth++;
            else if (text[i] == ')' && --depth == 0) return i;
        }

        return -1;
    }

    // Index of the } that closes the { at "open", or -1
    private static int MatchBrace(string text, int open)
    {
        int depth = 0;

        for (int i = open; i < text.Length; i++)
        {
            if (text[i] == '{') depth++;
            else if (text[i] == '}' && --depth == 0) return i;
        }

        return -1;
    }

    // this.name(...);   as a whole statement, with the one-line comment above it
    private static string StripCalls(string text, string name) =>
        Regex.Replace(text,
            @"(?<pre>[;{}][ \t]*\r?\n(?:[ \t]*\r?\n)*)[ \t]*(?://(?!=)[^\r\n]*\r?\n[ \t]*)?this\." +
            Regex.Escape(name) + @"\s*\((?:[^()]|\([^()]*\))*\)\s*;[ \t]*\r?\n?",
            "${pre}");

    // Removes text[start..endExclusive] (with the banner above it when asked)
    // and the blank lines after it
    private static string RemoveRange(string text, int start, int endExclusive, bool withBanner)
    {
        if (withBanner)
        {
            var banner = Banner.Match(text[..start]);
            if (banner.Success) start = banner.Index;
        }

        while (start > 0 && (text[start - 1] == ' ' || text[start - 1] == '\t')) start--;

        int i = endExclusive;

        while (i < text.Length && (text[i] == '\r' || text[i] == '\n' || text[i] == ' ' || text[i] == '\t')) i++;
        while (i > 0 && (text[i - 1] == ' ' || text[i - 1] == '\t')) i--;

        return text[..start] + text[i..];
    }
}