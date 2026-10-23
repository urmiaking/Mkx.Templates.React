using Microsoft.AspNetCore.Authorization;
using Mkx.Templates.Contracts.Authorization;
namespace Mkx.Templates.Server.Authorization;
public sealed record PermissionRequirement(string Permission) : IAuthorizationRequirement;
public sealed class PermissionHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        if (context.User.Identity?.IsAuthenticated == true && (context.User.IsInRole("Administrators") ||
            context.User.HasClaim(c => c.Type == requirement.Permission)))
            context.Succeed(requirement);
        return Task.CompletedTask;
    }
}
public static class PermissionRegistration
{
    public static AuthorizationOptions AddAppPolicies(this AuthorizationOptions options)
    {
        foreach (var permission in AppPolicies.All)
            options.AddPolicy(permission, p => p.RequireAuthenticatedUser().AddRequirements(new PermissionRequirement(permission)));
        return options;
    }
}
