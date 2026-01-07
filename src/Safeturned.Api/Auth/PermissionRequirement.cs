using Microsoft.AspNetCore.Authorization;
using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Auth;

public class PermissionRequirement : IAuthorizationRequirement
{
    public UserPermission RequiredPermission { get; }

    public PermissionRequirement(UserPermission permission)
    {
        RequiredPermission = permission;
    }
}
