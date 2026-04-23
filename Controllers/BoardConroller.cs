using Microsoft.AspNetCore.Mvc;
using task6.Data;

namespace task6.Controllers
{
    public class BoardController : Controller
    {
        private readonly AppDbContext _context;

        public BoardController(AppDbContext context)
        {
            _context = context;
        }

        public IActionResult Room(int id)
        {
            ViewBag.BoardId = id;
            ViewBag.Actions = _context.DrawingActions
                .Where(x => x.BoardId == id)
                .Select(x => x.Data)
                .ToList();

            return View();
        }
        public class PreviewDto
        {
            public string Image { get; set; }
        }

        [HttpPost]
        public IActionResult SavePreview(int id, [FromBody] PreviewDto data)
        {
            if (data == null || string.IsNullOrEmpty(data.Image))
                return BadRequest();

            var board = _context.Boards.Find(id);

            if (board == null)
                return NotFound();

            board.PreviewImage = data.Image;

            _context.SaveChanges();

            return Ok();
        }
        [HttpPost]
        public IActionResult Delete(int id)
        {
            var board = _context.Boards.Find(id);

            if (board == null)
                return NotFound();

            var actions = _context.DrawingActions
                .Where(x => x.BoardId == id)
                .ToList();

            _context.DrawingActions.RemoveRange(actions);
            _context.Boards.Remove(board);

            _context.SaveChanges();

            return RedirectToAction("Index", "Home");
        }
    }
}
