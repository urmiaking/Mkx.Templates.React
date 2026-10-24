using Mkx.Templates.Application.WorkItems;
using Mkx.Templates.Contracts;
using Mkx.Templates.Contracts.Authorization;

namespace Mkx.Templates.Server.Endpoints;

public static class WorkItemEndpoints
{
    public static RouteGroupBuilder MapWorkItemEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/work-items").WithTags("Work items");
        group.MapGet("/", async (WorkItemService service, int? skip, int? take, CancellationToken ct) =>
            Results.Ok(await service.ListAsync(skip ?? 0, take ?? 20, ct))).RequireAuthorization(AppPolicies.SampleItems.View).Produces<WorkItemsPage>();
        group.MapPost("/", async (CreateWorkItemRequest request, WorkItemService service, CancellationToken ct) =>
        {
            var item = await service.CreateAsync(request, ct);
            return Results.Created("/api/work-items/" + item.Id, item);
        }).RequireAuthorization(AppPolicies.SampleItems.Manage).Produces<WorkItemDto>(StatusCodes.Status201Created);
        group.MapPut("/{id:guid}", async (Guid id, UpdateWorkItemRequest request, WorkItemService service, CancellationToken ct) =>
            Results.Ok(await service.UpdateAsync(id, request, ct))).RequireAuthorization(AppPolicies.SampleItems.Manage).Produces<WorkItemDto>();
        group.MapDelete("/{id:guid}", async (Guid id, long version, WorkItemService service, CancellationToken ct) =>
        {
            await service.DeleteAsync(id, version, ct);
            return Results.NoContent();
        }).RequireAuthorization(AppPolicies.SampleItems.Manage).Produces(StatusCodes.Status204NoContent);
        return group;
    }
}
