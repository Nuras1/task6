using Microsoft.EntityFrameworkCore;
using task6.Models;

namespace task6.Data
{
    public class AppDbContext : DbContext
    {
        public DbSet<Board> Boards { get; set; }
        public DbSet<DrawingAction> DrawingActions { get; set; }

        public AppDbContext(DbContextOptions<AppDbContext> options)
            : base(options) { }
    }
}
