using System.Security.Claims;
using Safeturned.Api.Constants;
using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Helpers;

public static class UserPermissionHelper
{
    private static readonly Dictionary<UserPermission, string> PermissionMap = new()
    {
        { UserPermission.ModerateFiles, "moderate_files" },
        { UserPermission.ViewAuditLog, "view_audit_log" },
        { UserPermission.ManageReports, "manage_reports" },
    };

    public static bool IsAdministrator(ClaimsPrincipal user)
    {
        var permissionsClaim = user.FindFirst(AuthConstants.PermissionsClaim);
        if (permissionsClaim == null || !int.TryParse(permissionsClaim.Value, out var perms))
            return false;
        return (UserPermission)perms == UserPermission.Administrator;
    }

    public static bool HasPermissionFromClaims(ClaimsPrincipal user, UserPermission required)
    {
        var permissionsClaim = user.FindFirst(AuthConstants.PermissionsClaim);
        if (permissionsClaim == null || !int.TryParse(permissionsClaim.Value, out var perms))
            return false;

        var userPermissions = (UserPermission)perms;
        if (userPermissions == UserPermission.Administrator)
            return true;

        return (userPermissions & required) == required;
    }

    public static int PermissionsToInt(UserPermission permissions) => (int)permissions;

    public static UserPermission IntToPermissions(int permissions) => (UserPermission)permissions;

    public static bool HasPermission(int permissions, UserPermission required)
    {
        return ((UserPermission)permissions & required) == required;
    }

    public static string[] PermissionsToArray(UserPermission permissions)
    {
        return PermissionMap
            .Where(kvp => (permissions & kvp.Key) != 0)
            .Select(kvp => kvp.Value)
            .ToArray();
    }

    public static UserPermission StringArrayToPermissions(string[]? permissions)
    {
        if (permissions == null || permissions.Length == 0)
            return UserPermission.None;

        UserPermission result = 0;
        foreach (var permission in permissions)
        {
            var normalized = permission.ToLowerInvariant();
            var found = PermissionMap.FirstOrDefault(kvp => kvp.Value == normalized);
            if (found.Key != 0)
            {
                result |= found.Key;
            }
        }

        return result;
    }

    public static bool HasPermission(UserPermission permissions, UserPermission required)
    {
        return (permissions & required) == required;
    }

    public static bool HasPermission(UserPermission permissions, string permission)
    {
        var normalized = permission.ToLowerInvariant();
        var found = PermissionMap.FirstOrDefault(kvp => kvp.Value == normalized);
        return found.Key != 0 && (permissions & found.Key) != 0;
    }
}
