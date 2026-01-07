namespace Safeturned.Api.Database.Models;

[Flags]
public enum UserPermission
{
    None = 0,
    ModerateFiles = 1 << 0,
    ViewAuditLog = 1 << 1,
    ManageReports = 1 << 2,

    Administrator = int.MaxValue
}
