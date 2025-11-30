using System.ComponentModel.DataAnnotations;

namespace Safeturned.Api.Database.Models;

public class Endpoint
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(500)]
    public string Path { get; set; } = null!;
}
