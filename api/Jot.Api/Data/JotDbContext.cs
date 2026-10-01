using Microsoft.EntityFrameworkCore;

namespace Jot.Api.Data;

public class JotDbContext(DbContextOptions<JotDbContext> options) : DbContext(options)
{
    public DbSet<Todo> Todos => Set<Todo>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Postgres stamps each new todo, so nothing that adds one has to remember to
        modelBuilder.Entity<Todo>().Property(t => t.CreatedAt).HasDefaultValueSql("now()");
    }
}
