namespace Mkx.Templates.Contracts;

public sealed record WorkItemDto(Guid Id, string Title, bool IsComplete, long Version, DateTimeOffset CreatedAt);
public sealed record WorkItemsPage(IReadOnlyList<WorkItemDto> Items, int Total);
public sealed record CreateWorkItemRequest(string Title);
public sealed record UpdateWorkItemRequest(string Title, bool IsComplete, long Version);
