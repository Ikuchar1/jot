namespace Jot.Api.Data;

public class Todo
{
    public Guid Id { get; set; }
    public required string Title { get; set; }

    // Filled in by Postgres when the row is inserted (see JotDbContext)
    public DateTime CreatedAt { get; set; }

    // When it was checked off; null while it isn't done
    public DateTime? CompletedAt { get; set; }
}
