using Jot.Api.Data;
using Jot.Api.Orchestrators;
using Microsoft.EntityFrameworkCore;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi(options => options.AddDocumentTransformer((document, _, _) =>
{
    document.Info.Title = "Jot API";
    return Task.CompletedTask;
}));

builder.Services.AddDbContext<JotDbContext>(options => options
    .UseNpgsql(builder.Configuration.GetConnectionString("Jot"))
    .UseSnakeCaseNamingConvention());

builder.Services.AddScoped<TodoOrchestrator>();

// The UI calls the API on its own port (no Vite proxy), so the browser needs CORS to allow its origin
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    // Browsable API reference with "try it out" at /scalar
    app.MapScalarApiReference();
}

app.MapControllers();

app.Run();
