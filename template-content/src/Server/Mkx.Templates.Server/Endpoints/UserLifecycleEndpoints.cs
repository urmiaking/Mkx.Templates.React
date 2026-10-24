using System.Security.Claims;
using Microsoft.AspNetCore.Identity;
using Mkx.Templates.Contracts.Authorization;
using Mkx.Templates.Infrastructure.Persistence;

namespace Mkx.Templates.Server.Endpoints;

/// <summary>
/// Safe member-account lifecycle operations; never elevates an account to Administrators.
/// Server-side policy checks are mandatory regardless of the React UI state.
/// </summary>
public static class UserLifecycleEndpoints
{
    public static RouteGroupBuilder MapUserLifecycleEndpoints(this RouteGroupBuilder group)
    {
        group.MapPut("/users/{id:guid}/account", async (Guid id, UpdateUserAccountRequest request,
            UserManager<AppUser> users, ClaimsPrincipal principal) =>
        {
            if (!ValidName(request.UserName ?? request.Email))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["userName"] = ["A valid username is required."] });
            if (!TryEmail(request.Email, out var email))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["email"] = ["A valid email is required."] });

            var user = await users.FindByIdAsync(id.ToString());
            if (user is null) return Results.NotFound();
            if (await ProtectedAsync(users, user, principal)) return Results.Forbid();

            var name = (request.UserName ?? (string.Equals(user.UserName, user.Email, StringComparison.OrdinalIgnoreCase) ? email : user.UserName))?.Trim() ?? "";
            if (!ValidName(name))
                return Results.ValidationProblem(new Dictionary<string, string[]> { ["userName"] = ["A valid username is required."] });
            var duplicateName = await users.FindByNameAsync(name);
            if (duplicateName is not null && duplicateName.Id != user.Id)
                return Results.Conflict(new { title = "Username is already used." });
            if (string.Equals(user.Email, email, StringComparison.Ordinal) && string.Equals(user.UserName, name, StringComparison.Ordinal))
                return Results.Ok(await DescribeAsync(users, user));

            var other = await users.FindByEmailAsync(email);
            if (other is not null && other.Id != user.Id)
                return Results.Conflict(new { title = "Email is already used." });

            // Username and email are independent. Legacy email-as-username accounts are updated compatibly.
            var emailChanged = !string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase);
            user.Email = email;
            user.UserName = name;
            if (emailChanged) user.EmailConfirmed = false;
            var result = await users.UpdateAsync(user);
            if (!result.Succeeded) return IdentityErrors(result);
            await users.UpdateSecurityStampAsync(user);
            return Results.Ok(await DescribeAsync(users, user));
        }).RequireAuthorization(AppPolicies.Users.Manage).Produces<UserSummary>();

        group.MapPut("/users/{id:guid}/lock", async (Guid id, UpdateUserLockRequest request,
            UserManager<AppUser> users, ClaimsPrincipal principal) =>
        {
            var user = await users.FindByIdAsync(id.ToString());
            if (user is null) return Results.NotFound();
            if (await ProtectedAsync(users, user, principal)) return Results.Forbid();
            var enable = await users.SetLockoutEnabledAsync(user, true);
            if (!enable.Succeeded) return IdentityErrors(enable);
            var result = await users.SetLockoutEndDateAsync(
                user, request.Locked ? DateTimeOffset.UtcNow.AddYears(100) : null);
            if (!result.Succeeded) return IdentityErrors(result);
            if (!request.Locked)
                await users.ResetAccessFailedCountAsync(user);
            await users.UpdateSecurityStampAsync(user);
            return Results.Ok(await DescribeAsync(users, user));
        }).RequireAuthorization(AppPolicies.Users.Manage).Produces<UserSummary>();

        group.MapPut("/users/{id:guid}/roles", async (Guid id, UpdateUserRolesRequest request,
            UserManager<AppUser> users, RoleManager<IdentityRole<Guid>> roles, ClaimsPrincipal principal) =>
        {
            // The public administration surface allows Users membership only;
            // a role with elevated privileges cannot be granted here.
            if (request.Roles is null || request.Roles.Any(role => role != "Users"))
                return Results.BadRequest(new { title = "Only Users membership can be changed." });
            var user = await users.FindByIdAsync(id.ToString());
            if (user is null) return Results.NotFound();
            if (await ProtectedAsync(users, user, principal)) return Results.Forbid();
            var member = await users.IsInRoleAsync(user, "Users");
            var desired = request.Roles.Contains("Users");
            if (desired && !member)
            {
                if (!await roles.RoleExistsAsync("Users"))
                    return Results.Conflict(new { title = "The Users role is not provisioned." });
                var result = await users.AddToRoleAsync(user, "Users");
                if (!result.Succeeded) return IdentityErrors(result);
            }
            else if (!desired && member)
            {
                var result = await users.RemoveFromRoleAsync(user, "Users");
                if (!result.Succeeded) return IdentityErrors(result);
            }
            await users.UpdateSecurityStampAsync(user);
            return Results.Ok(await DescribeAsync(users, user));
        }).RequireAuthorization(AppPolicies.Users.ManageClaims).Produces<UserSummary>();

        group.MapDelete("/users/{id:guid}", async (Guid id, UserManager<AppUser> users,
            ClaimsPrincipal principal) =>
        {
            var user = await users.FindByIdAsync(id.ToString());
            if (user is null) return Results.NotFound();
            if (await ProtectedAsync(users, user, principal)) return Results.Forbid();
            var result = await users.DeleteAsync(user);
            return result.Succeeded ? Results.NoContent() : IdentityErrors(result);
        }).RequireAuthorization(AppPolicies.Users.Manage).Produces(StatusCodes.Status204NoContent);
        return group;
    }

    private static bool ValidName(string? name) => !string.IsNullOrWhiteSpace(name) && name.Trim().Length <= 128;

    private static bool TryEmail(string? value, out string email)
    {
        email = value?.Trim() ?? "";
        return email.Length is > 0 and <= 256 &&
            System.Net.Mail.MailAddress.TryCreate(email, out var address) &&
            string.Equals(address.Address, email, StringComparison.OrdinalIgnoreCase);
    }

    private static async Task<bool> ProtectedAsync(UserManager<AppUser> users, AppUser user, ClaimsPrincipal principal) =>
        user.Id.ToString() == users.GetUserId(principal) ||
        await users.IsInRoleAsync(user, "Administrators");

    private static IResult IdentityErrors(IdentityResult result) =>
        Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["account"] = result.Errors.Select(error => error.Description).ToArray()
        });

    private static async Task<UserSummary> DescribeAsync(UserManager<AppUser> users, AppUser user) =>
        new(user.Id, user.Email ?? "", (await users.GetRolesAsync(user)).ToArray(),
            (await users.GetClaimsAsync(user)).Where(c => AppPolicies.IsKnown(c.Type))
                .Select(c => c.Type).Distinct().ToArray(),
            user.EmailConfirmed, user.LockoutEnabled && user.LockoutEnd > DateTimeOffset.UtcNow, user.UserName ?? "");
}
