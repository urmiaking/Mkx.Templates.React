namespace Mkx.Templates.Domain;
public sealed class UserPushSubscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public required string Endpoint { get; set; }
    public required string EndpointHash { get; set; }
    public required string P256dh { get; set; }
    public required string Auth { get; set; }
    public string? DeviceName { get; set; }
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}