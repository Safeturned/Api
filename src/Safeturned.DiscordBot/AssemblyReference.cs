using System.Reflection;

namespace Safeturned.DiscordBot;

public static class AssemblyReference
{
    public static readonly Assembly Assembly = typeof(AssemblyReference).Assembly;
}