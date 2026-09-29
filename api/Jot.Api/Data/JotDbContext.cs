using Microsoft.EntityFrameworkCore;

namespace Jot.Api.Data;

public class JotDbContext(DbContextOptions<JotDbContext> options) : DbContext(options)
{
    public DbSet<Todo> Todos => Set<Todo>();
}
