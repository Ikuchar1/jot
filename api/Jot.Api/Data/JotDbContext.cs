using Microsoft.EntityFrameworkCore;

namespace Jot.Api.Data;

public class JotDbContext(DbContextOptions<JotDbContext> options) : DbContext(options)
{
    public DbSet<Todo> Todos => Set<Todo>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Postgres stamps each new todo, so nothing that adds one has to remember to
        modelBuilder.Entity<Todo>().Property(t => t.CreatedAt).HasDefaultValueSql("now()");

        // Deleted todos are hidden from every query; only restoring one looks past this, with IgnoreQueryFilters()
        modelBuilder.Entity<Todo>().HasQueryFilter(t => t.DeletedAt == null);
    }
}
