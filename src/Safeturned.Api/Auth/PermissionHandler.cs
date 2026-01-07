using Microsoft.AspNetCore.Authorization;
using Safeturned.Api.Constants;
using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Auth;

public class PermissionHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var permissionsClaim = context.User.FindFirst(AuthConstants.PermissionsClaim);

        if (permissionsClaim == null || !int.TryParse(permissionsClaim.Value, out var permissionsValue))
        {
            return Task.CompletedTask;
        }

        var userPermissions = (UserPermission)permissionsValue;

        if (userPermissions == UserPermission.Administrator)
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        if ((userPermissions & requirement.RequiredPermission) == requirement.RequiredPermission)
        {
            context.Succeed(requirement);
        }

        return Task.CompletedTask;
    }
}

public static class PermissionPolicies
{
    public const string ModerateFiles = "ModerateFiles";
    public const string ViewAuditLog = "ViewAuditLog";
    public const string ManageReports = "ManageReports";
    public const string Administrator = "Administrator";
}

public static class AuthorizationExtensions
{
    public static AuthorizationBuilder AddPermissionPolicies(this AuthorizationBuilder builder)
    {
        builder.AddPolicy(PermissionPolicies.ModerateFiles, policy =>
        {
            policy.RequireAuthenticatedUser();
            policy.Requirements.Add(new PermissionRequirement(UserPermission.ModerateFiles));
        });

        builder.AddPolicy(PermissionPolicies.ViewAuditLog, policy =>
        {
            policy.RequireAuthenticatedUser();
            policy.Requirements.Add(new PermissionRequirement(UserPermission.ViewAuditLog));
        });

        builder.AddPolicy(PermissionPolicies.ManageReports, policy =>
        {
            policy.RequireAuthenticatedUser();
            policy.Requirements.Add(new PermissionRequirement(UserPermission.ManageReports));
        });

        builder.AddPolicy(PermissionPolicies.Administrator, policy =>
        {
            policy.RequireAuthenticatedUser();
            policy.Requirements.Add(new PermissionRequirement(UserPermission.Administrator));
        });

        return builder;
    }
}
