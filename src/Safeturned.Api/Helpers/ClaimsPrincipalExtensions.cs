using System.Security.Claims;
using Safeturned.Api.Constants;
using Safeturned.Api.Database.Models;

namespace Safeturned.Api.Helpers;

public static class ClaimsPrincipalExtensions
{
    public static TierType GetTier(this ClaimsPrincipal user)
    {
        var tierClaim = user.FindFirst(AuthConstants.TierClaim)?.Value;
        if (int.TryParse(tierClaim, out var tierInt) && Enum.IsDefined(typeof(TierType), tierInt))
        {
            return (TierType)tierInt;
        }
        return TierType.Free;
    }
}
