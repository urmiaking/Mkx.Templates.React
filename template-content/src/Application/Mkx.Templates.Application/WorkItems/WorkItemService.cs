using Mkx.Templates.Contracts;
using Mkx.Templates.Domain;

namespace Mkx.Templates.Application.WorkItems;

public interface IWorkItemStore
{
    Task<(IReadOnlyList<WorkItem> Items, int Total)> ListAsync(int skip, int take, CancellationToken ct);
    Task<WorkItem?> FindAsync(Guid id, CancellationToken ct);
    Task AddAsync(WorkItem item, CancellationToken ct);
    Task SaveAsync(WorkItem item, long expectedVersion, CancellationToken ct);
    Task DeleteAsync(WorkItem item, long expectedVersion, CancellationToken ct);
}

public sealed class WorkItemService(IWorkItemStore store)
{
    public async Task<WorkItemsPage> ListAsync(int skip, int take, CancellationToken ct)
    {
        var (items, total) = await store.ListAsync(Math.Max(0, skip), Math.Clamp(take, 1, 100), ct);
        return new WorkItemsPage(items.Select(ToDto).ToArray(), total);
    }

    public async Task<WorkItemDto> CreateAsync(CreateWorkItemRequest request, CancellationToken ct)
    {
        var item = WorkItem.Create(request.Title);
        await store.AddAsync(item, ct);
        return ToDto(item);
    }

    public async Task<WorkItemDto> UpdateAsync(Guid id, UpdateWorkItemRequest request, CancellationToken ct)
    {
        var item = await store.FindAsync(id, ct) ?? throw new KeyNotFoundException("Work item not found.");
        if (item.Version != request.Version) throw new WorkItemConflictException();
        item.Edit(request.Title, request.IsComplete);
        await store.SaveAsync(item, request.Version, ct);
        return ToDto(item);
    }

    public async Task DeleteAsync(Guid id, long version, CancellationToken ct)
    {
        var item = await store.FindAsync(id, ct) ?? throw new KeyNotFoundException("Work item not found.");
        if (item.Version != version) throw new WorkItemConflictException();
        await store.DeleteAsync(item, version, ct);
    }

    private static WorkItemDto ToDto(WorkItem item) =>
        new(item.Id, item.Title, item.IsComplete, item.Version, item.CreatedAt);
}

public sealed class WorkItemConflictException : Exception
{
    public WorkItemConflictException() : base("Work item was changed by another request.") { }
}
