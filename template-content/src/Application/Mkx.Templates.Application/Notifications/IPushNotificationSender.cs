using Mkx.Templates.Contracts;
namespace Mkx.Templates.Application.Notifications;
/// <summary>Inject only into trusted server-side code, after the business transaction commits.</summary>
public interface IPushNotificationSender
{
    Task<PushSendResult> SendToUserAsync(Guid userId, PushNotificationMessage message, CancellationToken ct = default);
}