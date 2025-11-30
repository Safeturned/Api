using Asp.Versioning;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Safeturned.Api.Database;
using Safeturned.Api.Database.Models;
using Sentry;

namespace Safeturned.Api.Controllers;

[ApiVersion("1.0")]
[Route("v{version:apiVersion}/badge")]
[ApiController]
public class BadgeController : ControllerBase
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger _logger;

    public BadgeController(
        IServiceScopeFactory serviceScopeFactory,
        ILogger logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger.ForContext<BadgeController>();
    }

    [HttpGet("{badgeId}")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetBadge(string badgeId)
    {
        try
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

            var badge = await filesDb.Set<Badge>()
                .AsNoTracking()
                .Include(b => b.LinkedFile)
                .FirstOrDefaultAsync(x => x.Id == badgeId);

            FileData? fileData;
            if (badge != null)
            {
                fileData = badge.LinkedFile;
            }
            else
            {
                fileData = await filesDb.Set<FileData>()
                    .AsNoTracking()
                    .Where(x => x.FileName == badgeId)
                    .OrderByDescending(x => x.LastScanned)
                    .FirstOrDefaultAsync();
            }

            if (fileData == null)
            {
                return Redirect("https://img.shields.io/badge/Safeturned-Not%20Scanned-lightgrey?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIycy04LTQtOC0xMFY1bDgtM2w4IDN2N2MwIDYtOCAxMC04IDEweiIvPjwvc3ZnPg==");
            }

            string label = "Safeturned";
            string message;
            string color;

            if (fileData.Score >= 75)
            {
                message = $"High%20Risk%20({fileData.Score})";
                color = "red";
            }
            else if (fileData.Score >= 50)
            {
                message = $"Moderate%20Risk%20({fileData.Score})";
                color = "orange";
            }
            else if (fileData.Score >= 25)
            {
                message = $"Low%20Risk%20({fileData.Score})";
                color = "yellow";
            }
            else
            {
                message = $"Clean%20({fileData.Score})";
                color = "brightgreen";
            }

            var shieldIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIycy04LTQtOC0xMFY1bDgtM2w4IDN2N2MwIDYtOCAxMC04IDEweiIvPjwvc3ZnPg==";
            var badgeUrl = $"https://img.shields.io/badge/{label}-{message}-{color}?style=flat&logo={Uri.EscapeDataString(shieldIcon)}";

            return Redirect(badgeUrl);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error generating badge for {BadgeId}", badgeId);
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error generating badge"));
            return Redirect("https://img.shields.io/badge/Safeturned-Error-red?style=flat");
        }
    }

    [HttpGet("filename/{filename}")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetBadgeByFilename(string filename)
    {
        try
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();
            var fileData = await filesDb.Set<FileData>()
                .AsNoTracking()
                .Where(x => x.FileName == filename)
                .OrderByDescending(x => x.LastScanned)
                .FirstOrDefaultAsync();

            if (fileData == null)
            {
                return Redirect("https://img.shields.io/badge/Safeturned-Not%20Scanned-lightgrey?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIycy04LTQtOC0xMFY1bDgtM2w4IDN2N2MwIDYtOCAxMC04IDEweiIvPjwvc3ZnPg==");
            }

            string label = "Safeturned";
            string message;
            string color;

            if (fileData.Score >= 75)
            {
                message = $"High%20Risk%20({fileData.Score})";
                color = "red";
            }
            else if (fileData.Score >= 50)
            {
                message = $"Moderate%20Risk%20({fileData.Score})";
                color = "orange";
            }
            else if (fileData.Score >= 25)
            {
                message = $"Low%20Risk%20({fileData.Score})";
                color = "yellow";
            }
            else
            {
                message = $"Clean%20({fileData.Score})";
                color = "brightgreen";
            }

            var shieldIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIycy04LTQtOC0xMFY1bDgtM2w4IDN2N2MwIDYtOCAxMC04IDEweiIvPjwvc3ZnPg==";
            var badgeUrl = $"https://img.shields.io/badge/{label}-{message}-{color}?style=flat&logo={Uri.EscapeDataString(shieldIcon)}";

            return Redirect(badgeUrl);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error generating badge for filename {FileName}", filename);
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error generating badge for filename"));
            return Redirect("https://img.shields.io/badge/Safeturned-Error-red?style=flat");
        }
    }

    [HttpGet("hash/{hash}")]
    [ResponseCache(Duration = 300)]
    public async Task<IActionResult> GetBadgeByHash(string hash)
    {
        try
        {
            await using var scope = _serviceScopeFactory.CreateAsyncScope();
            var filesDb = scope.ServiceProvider.GetRequiredService<FilesDbContext>();

            var fileData = await filesDb.Set<FileData>()
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Hash == hash);

            if (fileData == null)
            {
                return Redirect("https://img.shields.io/badge/Safeturned-Not%20Scanned-lightgrey?style=flat&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIycy04LTQtOC0xMFY1bDgtM2w4IDN2N2MwIDYtOCAxMC04IDEweiIvPjwvc3ZnPg==");
            }

            string label = "Safeturned";
            string message;
            string color;

            if (fileData.Score >= 75)
            {
                message = $"High%20Risk%20({fileData.Score})";
                color = "red";
            }
            else if (fileData.Score >= 50)
            {
                message = $"Moderate%20Risk%20({fileData.Score})";
                color = "orange";
            }
            else if (fileData.Score >= 25)
            {
                message = $"Low%20Risk%20({fileData.Score})";
                color = "yellow";
            }
            else
            {
                message = $"Clean%20({fileData.Score})";
                color = "brightgreen";
            }

            var shieldIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDIycy04LTQtOC0xMFY1bDgtM2w4IDN2N2MwIDYtOCAxMC04IDEweiIvPjwvc3ZnPg==";
            var badgeUrl = $"https://img.shields.io/badge/{label}-{message}-{color}?style=flat&logo={Uri.EscapeDataString(shieldIcon)}";
            return Redirect(badgeUrl);
        }
        catch (Exception ex)
        {
            _logger.Error(ex, "Error generating badge for hash {Hash}", hash);
            SentrySdk.CaptureException(ex, x => x.SetExtra("message", "Error generating badge for hash"));
            return Redirect("https://img.shields.io/badge/Safeturned-Error-red?style=flat");
        }
    }

}