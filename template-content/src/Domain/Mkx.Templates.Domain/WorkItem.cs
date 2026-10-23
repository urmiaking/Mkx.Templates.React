namespace Mkx.Templates.Domain;

public sealed class WorkItem
{
    private WorkItem() { }
    private WorkItem(string title)
    {
        Id = Guid.NewGuid();
        CreatedAt = DateTimeOffset.UtcNow;
        Rename(title);
    }

    public Guid Id { get; private set; }
    public string Title { get; private set; } = string.Empty;
    public bool IsComplete { get; private set; }
    public DateTimeOffset CreatedAt { get; private set; }
    public long Version { get; private set; } = 1;

    public static WorkItem Create(string title) => new(title);

    public void Edit(string title, bool completed)
    {
        Rename(title);
        IsComplete = completed;
        Version++;
    }

    private void Rename(string title)
    {
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length > 120)
            throw new ArgumentException("Title must contain 1 to 120 characters.", nameof(title));
        Title = title.Trim();
    }
}
