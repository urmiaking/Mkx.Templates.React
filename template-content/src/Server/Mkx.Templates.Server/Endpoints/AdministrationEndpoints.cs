using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Mkx.Templates.Contracts.Authorization;
using Mkx.Templates.Infrastructure.Persistence;

namespace Mkx.Templates.Server.Endpoints;

public static class AdministrationEndpoints
{
    public static RouteGroupBuilder MapAdministrationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin").WithTags("Administration").RequireAuthorization();
        group.MapGet("/users", async (UserManager<AppUser> users, int? skip, int? take, string? search, CancellationToken ct) =>
        {
            var query = users.Users.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(search))
                query = query.Where(u => u.Email != null && u.Email.Contains(search.Trim()));
            var total = await query.CountAsync(ct);
            var page = await query.OrderBy(u => u.Email).Skip(Math.Max(0, skip ?? 0))
                .Take(Math.Clamp(take ?? 20, 1, 100)).ToListAsync(ct);
            var results = new List<UserSummary>(page.Count);
            foreach (var user in page) results.Add(await DescribeAsync(users, user));
            return Results.Ok(new UsersPage(results, total));
        }).RequireAuthorization(AppPolicies.Users.View);

        group.MapPost("/users", async (CreateUserRequest request, UserManager<AppUser> users, RoleManager<IdentityRole<Guid>> roles) =>
        {
            if (string.IsNullOrWhiteSpace(request.Email) || request.Email.Length > 256 ||
                !System.Net.Mail.MailAddress.TryCreate(request.Email, out var address) ||
                !string.Equals(address.Address, request.Email, StringComparison.OrdinalIgnoreCase))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["email"] = ["Valid email is required."] });
            if (string.IsNullOrWhiteSpace(request.Password))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["password"] = ["Password is required."] });
            var user = new AppUser { UserName = request.Email.Trim(), Email = request.Email.Trim(), EmailConfirmed = false };
            var result = await users.CreateAsync(user, request.Password);
            if (!result.Succeeded)
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["account"] = result.Errors.Select(e => e.Description).ToArray() });
            const string member = "Users";
            var role = await roles.FindByNameAsync(member);
            if (role is null)
            {
                role = new IdentityRole<Guid>(member);
                EnsureSucceeded(await roles.CreateAsync(role));
                EnsureSucceeded(await roles.AddClaimAsync(role, new Claim(AppPolicies.SampleItems.View, "true")));
            }
            EnsureSucceeded(await users.AddToRoleAsync(user, member));
            return Results.Created($"/api/admin/users/{user.Id}", await DescribeAsync(users, user));
        }).RequireAuthorization(AppPolicies.Users.Manage);

        group.MapGet("/roles", async (RoleManager<IdentityRole<Guid>> roles) =>
        {
            var results = new List<RoleSummary>();
            foreach (var role in await roles.Roles.OrderBy(x => x.Name).ToListAsync())
            {
                var claims = await roles.GetClaimsAsync(role);
                results.Add(new RoleSummary(role.Name ?? "", claims.Where(x => AppPolicies.IsKnown(x.Type))
                    .Select(x => x.Type).Where(AppPolicies.IsKnown).Distinct().ToArray()));
            }
            return Results.Ok(results);
        }).RequireAuthorization(AppPolicies.Users.View);

        group.MapPut("/roles/{roleName}/permissions", async (string roleName, UpdatePermissionsRequest request,
            RoleManager<IdentityRole<Guid>> roles, UserManager<AppUser> users) =>
        {
            if (roleName != "Users") return Results.Forbid();
            if (!Valid(request)) return Results.BadRequest(new { title = "Unknown permission." });
            var role = await roles.FindByNameAsync(roleName);
            if (role is null) return Results.NotFound();
            var old = (await roles.GetClaimsAsync(role)).Where(x => AppPolicies.IsKnown(x.Type)).ToArray();
            var desired = request.Permissions.Distinct().ToHashSet();
            foreach (var claim in old.Where(x => !desired.Contains(x.Type)))
                EnsureSucceeded(await roles.RemoveClaimAsync(role, claim));
            foreach (var permission in desired.Except(old.Select(x => x.Type)))
                EnsureSucceeded(await roles.AddClaimAsync(role, new Claim(permission, "true")));
            foreach (var member in await users.GetUsersInRoleAsync(roleName))
                EnsureSucceeded(await users.UpdateSecurityStampAsync(member));
            return Results.NoContent();
        }).RequireAuthorization(AppPolicies.Users.ManageClaims);

        group.MapPut("/users/{id:guid}/permissions", async (Guid id, UpdatePermissionsRequest request, UserManager<AppUser> users) =>
        {
            if (!Valid(request)) return Results.BadRequest(new { title = "Unknown permission." });
            var user = await users.FindByIdAsync(id.ToString());
            if (user is null) return Results.NotFound();
            if (await users.IsInRoleAsync(user, "Administrators")) return Results.Forbid();
            var old = (await users.GetClaimsAsync(user)).Where(x => AppPolicies.IsKnown(x.Type)).ToArray();
            var desired = request.Permissions.Distinct().ToHashSet();
            foreach (var claim in old.Where(x => !desired.Contains(x.Type)))
                EnsureSucceeded(await users.RemoveClaimAsync(user, claim));
            foreach (var permission in desired.Except(old.Select(x => x.Type)))
                EnsureSucceeded(await users.AddClaimAsync(user, new Claim(permission, "true")));
            EnsureSucceeded(await users.UpdateSecurityStampAsync(user));
            return Results.NoContent();
        }).RequireAuthorization(AppPolicies.Users.ManageClaims);
        return group;
    }
    private static bool Valid(UpdatePermissionsRequest? request) =>
        request?.Permissions is not null && request.Permissions.All(AppPolicies.IsKnown);

    private static async Task<UserSummary> DescribeAsync(UserManager<AppUser> users, AppUser user) =>
        new(user.Id, user.Email ?? "", (await users.GetRolesAsync(user)).ToArray(),
            (await users.GetClaimsAsync(user)).Where(c => AppPolicies.IsKnown(c.Type))
                .Select(c => c.Type).Where(AppPolicies.IsKnown).Distinct().ToArray());

    private static void EnsureSucceeded(IdentityResult result)
    {
        if (!result.Succeeded)
            throw new InvalidOperationException("Identity operation failed: " +
                string.Join(", ", result.Errors.Select(x => x.Code)));
    }
}
