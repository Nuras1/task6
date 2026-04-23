using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using task6.Data;
using task6.Hubs;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllersWithViews();
builder.Services.AddSignalR();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=app.db;Cache=Shared"));

var app = builder.Build();

app.UseStaticFiles();


app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.MapHub<DrawingHub>("/drawingHub");

app.Run();
