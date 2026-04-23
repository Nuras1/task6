using Microsoft.AspNetCore.SignalR;
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
    }
}
