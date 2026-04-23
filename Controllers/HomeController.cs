using Microsoft.AspNetCore.Mvc;
using System.Diagnostics;
using task6.Data;
using task6.Models;

namespace task6.Controllers
{
    public class HomeController : Controller
    {
        private readonly AppDbContext _context;

        public HomeController(AppDbContext context)
        {
            _context = context;
        }

        public IActionResult Index()
        {
            return View(_context.Boards.ToList());
        }

        [HttpPost]
        public IActionResult Create(string name)
        {
            var board = new Board { Name = name };
            _context.Boards.Add(board);
            _context.SaveChanges();

            return RedirectToAction("Room", "Board", new { id = board.Id });
        }
    }
}
