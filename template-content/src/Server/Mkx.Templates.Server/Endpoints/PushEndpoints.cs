using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Mkx.Templates.Contracts;
using Mkx.Templates.Infrastructure.Notifications;
namespace Mkx.Templates.Server.Endpoints;

/// <summary>No arbitrary notification send route is exposed to browser users.</summary>
public static class PushEndpoints
{
    public static RouteGroupBuilder MapPushEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/push").WithTags("Push").RequireAuthorization();
        group.MapGet("/configuration", ([FromServices] PushNotificationService service) =>
            Results.Ok(service.Configuration())).Produces<PushConfigurationResponse>();
        group.MapPost("/subscriptions", async (
            ClaimsPrincipal principal, [FromBody] RegisterPushSubscriptionRequest request,
            [FromServices] PushNotificationService service, CancellationToken ct) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();
            if (!service.Configuration().Enabled) return Results.NotFound();
            try { await service.RegisterAsync(userId, request, ct); }
            catch (ArgumentException) { return Results.BadRequest(); }
            return Results.NoContent();
        }).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status400BadRequest);
        group.MapDelete("/subscriptions", async (
            ClaimsPrincipal principal, [FromBody] RevokePushSubscriptionRequest request,
            [FromServices] PushNotificationService service, CancellationToken ct) =>
        {
            if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId))
                return Results.Unauthorized();
            if (string.IsNullOrWhiteSpace(request.Endpoint) || request.Endpoint.Length > 2048)
                return Results.BadRequest();
            await service.RevokeAsync(userId, request.Endpoint, ct);
            return Results.NoContent();
        }).Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status400BadRequest);
        return group;
    }
}