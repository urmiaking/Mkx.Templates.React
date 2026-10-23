using Microsoft.EntityFrameworkCore;
using Mkx.Templates.Application.WorkItems;
using Mkx.Templates.Domain;

namespace Mkx.Templates.Infrastructure.Persistence;

public sealed class WorkItemStore(AppDbContext db) : IWorkItemStore
{
    public async Task<(IReadOnlyList<WorkItem>, int)> ListAsync(int skip, int take, CancellationToken ct)
    {
        var total = await db.WorkItems.CountAsync(ct);
        var items = await db.WorkItems.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Skip(skip).Take(take).ToListAsync(ct);
        return (items, total);
    }

    public Task<WorkItem?> FindAsync(Guid id, CancellationToken ct) =>
        db.WorkItems.SingleOrDefaultAsync(x => x.Id == id, ct);

    public async Task AddAsync(WorkItem item, CancellationToken ct)
    {
        db.WorkItems.Add(item);
        await db.SaveChangesAsync(ct);
    }

    public async Task SaveAsync(WorkItem item, long expectedVersion, CancellationToken ct)
    {
        db.Entry(item).Property(x => x.Version).OriginalValue = expectedVersion;
        await SaveAsync(ct);
    }

    public async Task DeleteAsync(WorkItem item, long expectedVersion, CancellationToken ct)
    {
        db.Entry(item).Property(x => x.Version).OriginalValue = expectedVersion;
        db.WorkItems.Remove(item);
        await SaveAsync(ct);
    }

    private async Task SaveAsync(CancellationToken ct)
    {
        try { await db.SaveChangesAsync(ct); }
        catch (DbUpdateConcurrencyException) { throw new WorkItemConflictException(); }
    }
}
