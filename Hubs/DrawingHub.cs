using Microsoft.AspNetCore.SignalR;
using System.Text.Json;
using task6.Data;
using task6.Models;

namespace task6.Hubs
{
    public class DrawingHub : Hub
    {
        private readonly AppDbContext _context;

        public DrawingHub(AppDbContext context)
        {
            _context = context;
        }

        public async Task JoinBoard(string boardId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, boardId);
        }

        public async Task SendDrawing(string boardId, string data)
        {
            try
            {
                _context.DrawingActions.Add(new DrawingAction
                {
                    BoardId = int.Parse(boardId),
                    Data = data
                });

                await _context.SaveChangesAsync();
            }
            catch
            {
            }

            await Clients.OthersInGroup(boardId)
                .SendAsync("ReceiveDrawing", data);
        }
        public async Task ClearBoard(string boardId)
        {
            var items = _context.DrawingActions.Where(x => x.BoardId == int.Parse(boardId));
            _context.DrawingActions.RemoveRange(items);
            await _context.SaveChangesAsync();

            await Clients.Group(boardId).SendAsync("ClearCanvas");
        }
        public async Task UpdateShape(string boardId, string data)
        {
            if (!int.TryParse(boardId, out var id))
                return;

            try
            {
                using var doc = JsonDocument.Parse(data);
                var shapeId = doc.RootElement.GetProperty("id").GetInt64();

                var all = _context.DrawingActions
                    .Where(x => x.BoardId == id)
                    .ToList();

                var toRemove = new List<DrawingAction>();

                foreach (var item in all)
                {
                    try
                    {
                        using var oldDoc = JsonDocument.Parse(item.Data);
                        if (oldDoc.RootElement.TryGetProperty("id", out var idProp))
                        {
                            if (idProp.GetInt64() == shapeId)
                                toRemove.Add(item);
                        }
                    }
                    catch { }
                }

                _context.DrawingActions.RemoveRange(toRemove);

                _context.DrawingActions.Add(new DrawingAction
                {
                    BoardId = id,
                    Data = data
                });

                await _context.SaveChangesAsync();

                await Clients.Group(boardId).SendAsync("ReceiveDrawing", data);
            }
            catch
            {
                
            }
        }
    }
}
