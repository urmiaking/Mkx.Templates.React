namespace Mkx.Templates.Contracts.Authorization;
public sealed record UserSummary(Guid Id, string Email, string[] Roles, string[] DirectPermissions);
public sealed record UsersPage(IReadOnlyList<UserSummary> Items, int Total);
public sealed record CreateUserRequest(string Email, string Password);
public sealed record UpdatePermissionsRequest(string[] Permissions);
public sealed record RoleSummary(string Name, string[] Permissions);
