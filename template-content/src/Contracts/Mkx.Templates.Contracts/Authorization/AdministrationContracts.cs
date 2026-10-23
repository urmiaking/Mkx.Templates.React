namespace Mkx.Templates.Contracts.Authorization;
public sealed record UserSummary(Guid Id, string Email, string[] Roles, string[] DirectPermissions, bool EmailConfirmed = false, bool IsLocked = false, string UserName = "");
public sealed record UsersPage(IReadOnlyList<UserSummary> Items, int Total);
public sealed record CreateUserRequest(string Email, string Password, string? UserName = null);
public sealed record UpdatePermissionsRequest(string[] Permissions);
public sealed record RoleSummary(string Name, string[] Permissions);

public sealed record UpdateUserAccountRequest(string Email, string? UserName = null);
public sealed record UpdateUserLockRequest(bool Locked);
public sealed record UpdateUserRolesRequest(string[] Roles);
