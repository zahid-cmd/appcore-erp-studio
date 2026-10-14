namespace AppCore.Infrastructure.Platform.PageCloneEngine;

//===============================================================
// Baseline Locator
//
// Finds the *.appcore-sync-baseline files written by the code
// sync engines:
//   Backend_Studio\AppCore.*\Development_Backup\Baseline_Files\...
//   Frontend_Studio\Studio_UI\src\development_backup\baseline-files\...
//===============================================================

internal sealed class BaselineLocator
{
    private readonly Dictionary<string, List<string>> _files =
        new(StringComparer.OrdinalIgnoreCase);

    public static BaselineLocator Load(string root)
    {
        var locator = new BaselineLocator();
        var folders = new List<string>();

        string backend = Path.Combine(root, "Backend_Studio");

        if (Directory.Exists(backend))
        {
            foreach (string project in Directory.GetDirectories(backend))
                foreach (string d in Directory.GetDirectories(project))
                    if (string.Equals(Path.GetFileName(d), "Development_Backup",
                            StringComparison.OrdinalIgnoreCase))
                        folders.Add(d);
        }

        string frontend = Path.Combine(root, "Frontend_Studio", "Studio_UI", "src");

        if (Directory.Exists(frontend))
        {
            foreach (string d in Directory.GetDirectories(frontend))
                if (string.Equals(Path.GetFileName(d), "development_backup",
                        StringComparison.OrdinalIgnoreCase))
                    folders.Add(d);
        }

        foreach (string folder in folders)
        {
            foreach (string file in Directory.EnumerateFiles(
                         folder, "*.appcore-sync-baseline", SearchOption.AllDirectories))
            {
                string name = Path.GetFileName(file);

                if (!locator._files.TryGetValue(name, out var list))
                    locator._files[name] = list = new List<string>();

                list.Add(file);
            }
        }

        return locator;
    }

    // name = "<target file name>.appcore-sync-baseline"
    public List<string> Find(string name) =>
        _files.TryGetValue(name, out var list) ? list : new List<string>();
}