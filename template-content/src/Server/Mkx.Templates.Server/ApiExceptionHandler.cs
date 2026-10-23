using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Mkx.Templates.Application.WorkItems;

namespace Mkx.Templates.Server;

public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken ct)
    {
        var (status, title) = exception switch
        {
            ArgumentException => (400, "Invalid request."),
            KeyNotFoundException => (404, "Resource not found."),
            WorkItemConflictException => (409, "Update conflict."),
            _ => (500, "Unexpected server error.")
        };

        if (status == 500)
            logger.LogError(exception, "Unhandled request failure");
        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status,
            Title = title,
            Detail = status == 500 ? null : exception.Message
        }, cancellationToken: ct);
        return true;
    }
}
