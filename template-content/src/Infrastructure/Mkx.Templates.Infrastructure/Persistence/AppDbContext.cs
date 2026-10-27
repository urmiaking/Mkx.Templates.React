using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Mkx.Templates.Domain;

namespace Mkx.Templates.Infrastructure.Persistence;

public sealed class AppUser : IdentityUser<Guid>;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<AppUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<WorkItem> WorkItems => Set<WorkItem>();
    public DbSet<UserPushSubscription> UserPushSubscriptions => Set<UserPushSubscription>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);
        builder.Entity<UserPushSubscription>(entity =>
        {
            entity.ToTable("UserPushSubscriptions");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Endpoint).HasMaxLength(2048).IsRequired();
            entity.Property(x => x.EndpointHash).HasMaxLength(64).IsUnicode(false).IsRequired();
            entity.Property(x => x.P256dh).HasMaxLength(256).IsRequired();
            entity.Property(x => x.Auth).HasMaxLength(128).IsRequired();
            entity.Property(x => x.DeviceName).HasMaxLength(120);
            entity.HasIndex(x => x.EndpointHash).IsUnique();
            entity.HasOne<AppUser>().WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        });
        builder.Entity<WorkItem>(entity =>
        {
            entity.ToTable("WorkItems");
            entity.HasKey(x => x.Id);
            entity.Property(x => x.Title).HasMaxLength(120).IsRequired();
            entity.Property(x => x.Version).IsConcurrencyToken();
            entity.Property(x => x.CreatedAt).HasConversion(v => v.UtcTicks, v => new DateTimeOffset(v, TimeSpan.Zero));
            entity.HasIndex(x => x.CreatedAt);
        });
    }
}
