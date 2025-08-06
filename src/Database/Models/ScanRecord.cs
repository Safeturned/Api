using System.ComponentModel.DataAnnotations;

namespace Safeturned.Api.Database.Models;

public class ScanRecord
{
    [Key] public int Id { get; set; }
    public string FileName { get; set; } = string.Empty;
    public float Score { get; set; }
    public bool IsThreat { get; set; }
    public int ScanTimeMs { get; set; }
    public DateTime ScanDate { get; set; }
}