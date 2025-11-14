using dnlib.DotNet;

namespace Safeturned.Api.Helpers;

public static class AssemblyMetadataHelper
{
    public static AssemblyMetadata ExtractMetadata(ModuleDef module)
    {
        var assembly = module.Assembly;
        var metadata = new AssemblyMetadata();

        if (assembly?.CustomAttributes == null)
            return metadata;

        foreach (var attr in assembly.CustomAttributes)
        {
            if (attr.ConstructorArguments.Count == 0)
                continue;

            var value = attr.ConstructorArguments[0].Value?.ToString();
            if (string.IsNullOrWhiteSpace(value))
                continue;

            switch (attr.TypeFullName)
            {
                case "System.Reflection.AssemblyCompanyAttribute":
                    metadata.Company = value;
                    break;
                case "System.Reflection.AssemblyProductAttribute":
                    metadata.Product = value;
                    break;
                case "System.Reflection.AssemblyTitleAttribute":
                    metadata.Title = value;
                    break;
                case "System.Reflection.AssemblyCopyrightAttribute":
                    metadata.Copyright = value;
                    break;
            }
        }

        // Extract GUID from module
        metadata.Guid = module.Mvid?.ToString();

        return metadata;
    }

    public static AssemblyMetadata ExtractMetadata(Stream fileStream)
    {
        try
        {
            fileStream.Position = 0;
            var module = ModuleDefMD.Load(fileStream);
            return ExtractMetadata(module);
        }
        catch
        {
            return new AssemblyMetadata();
        }
    }
}

public class AssemblyMetadata
{
    public string? Company { get; set; }
    public string? Product { get; set; }
    public string? Title { get; set; }
    public string? Copyright { get; set; }
    public string? Guid { get; set; }
}
