let confirmForm = null;

window.showConfirm = function (e, form, text) {
    e.preventDefault();

    confirmForm = form;

    document.getElementById("confirmText").innerText = text;

    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    modal.show();

    return false;
};

document.addEventListener("DOMContentLoaded", () => {

    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const TOOLS = {
        PEN: "pen",
        ERASE: "erase",
        RECT: "rect",
        CIRCLE: "circle",
        MOVE: "move"
    };

    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();

        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    let tool = "pen";
    let drawing = false;
    let placingShape = false;

    let startX = 0;
    let startY = 0;

    let brushSize = Number(localStorage.getItem("brushSize")) || 2;
    let color = localStorage.getItem("color") || "#000000";

    let sliderTimeout;

    let strokes = [];
    let currentStroke = null;
    let shapes = [];

    let erases = [];
    let currentErase = null;

    let selectedShape = null;
    let draggingShape = false;
    let offsetX = 0;
    let offsetY = 0;

    canvas.style.cursor = "crosshair";

    const connection = new signalR.HubConnectionBuilder()
        .withUrl("/drawingHub")
        .build();

    connection.start().then(() => {
        connection.invoke("JoinBoard", boardId);
    });

    connection.on("ReceiveDrawing", (data) => {
        const d = JSON.parse(data);

        if (d.id) {
            shapes = shapes.filter(s => s.id !== d.id);
        }

        if (d.type === "stroke") strokes.push(d);
        else if (d.type === "erase") erases.push(d);
        else shapes.push(d);

        redraw();
    });

    document.getElementById("confirmBtn").addEventListener("click", () => {
        if (confirmForm) confirmForm.submit();
    });

    window.setTool = (t) => {
        if (t === "move") canvas.style.cursor = "grab";
        else canvas.style.cursor = "crosshair";

        tool = t;
        placingShape = false;
        drawing = false;
    };

    const colorPicker = document.getElementById("colorPicker");
    const brushSlider = document.getElementById("brushSize");

    colorPicker.value = color;
    brushSlider.value = brushSize;


    brushSlider.addEventListener("input", (e) => {
        clearTimeout(sliderTimeout);
        const value = Number(e.target.value);

        sliderTimeout = setTimeout(() => {
            brushSize = value;
            localStorage.setItem("brushSize", brushSize);
        }, 30);
    });

    colorPicker.addEventListener("input", (e) => {
        color = e.target.value;
        localStorage.setItem("color", color);
    });

    function redraw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        strokes.forEach(s => {
            ctx.beginPath();
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.size;

            s.points.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });

            ctx.stroke();
        });

        shapes.forEach(s => {
            ctx.strokeStyle = s.color;
            ctx.lineWidth = s.size;

            if (s.type === "rect") {
                ctx.strokeRect(s.x1, s.y1, s.x2 - s.x1, s.y2 - s.y1);
            }

            if (s.type === "circle") {
                const r = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
                ctx.beginPath();
                ctx.arc(s.x1, s.y1, r, 0, Math.PI * 2);
                ctx.stroke();
            }
        });

        erases.forEach(e => {
            ctx.beginPath();
            ctx.globalCompositeOperation = "destination-out";
            ctx.lineWidth = e.size;

            e.points.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });

            ctx.stroke();
            ctx.globalCompositeOperation = "source-over";
        });
    }

    function getShapeAt(x, y) {
        return shapes.slice().reverse().find(s => {
            if (s.type === "rect") {
                return x >= Math.min(s.x1, s.x2) &&
                    x <= Math.max(s.x1, s.x2) &&
                    y >= Math.min(s.y1, s.y2) &&
                    y <= Math.max(s.y1, s.y2);
            }

            if (s.type === "circle") {
                const r = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
                return Math.hypot(x - s.x1, y - s.y1) <= r;
            }
        });
    }

    canvas.addEventListener("mousedown", (e) => {

        const pos = getMousePos(e);

        if  (tool === TOOLS.MOVE) {
            const shape = getShapeAt(pos.x, pos.y);

            if (shape) {
                selectedShape = shape;
                draggingShape = true;

                offsetX = pos.x - shape.x1;
                offsetY = pos.y - shape.y1;
            }
            return;
        }

        if (tool !== "pen" && tool !== "erase") return;

        drawing = true;

        if (tool === TOOLS.ERASE) {
            currentErase = {
                type: "erase",
                size: brushSize * 2,
                points: [{ x: pos.x, y: pos.y }]
            };
        } else {
            currentStroke = {
                type: "stroke",
                color: color,
                size: brushSize,
                points: [{ x: pos.x, y: pos.y }]
            };
        }

        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    });

    canvas.addEventListener("mousemove", (e) => {

        const pos = getMousePos(e);

        if (draggingShape && selectedShape) {
            const newX = pos.x - offsetX;
            const newY = pos.y - offsetY;

            const dx = newX - selectedShape.x1;
            const dy = newY - selectedShape.y1;

            selectedShape.x1 += dx;
            selectedShape.y1 += dy;
            selectedShape.x2 += dx;
            selectedShape.y2 += dy;

            redraw();
            return;
        }

        if (drawing && (tool === TOOLS.PEN || tool === TOOLS.ERASE)) {

            const isErase = tool === TOOLS.ERASE;

            ctx.strokeStyle = isErase ? "#000" : currentStroke.color;
            ctx.lineWidth = isErase ? currentErase.size : currentStroke.size;

            if (isErase) ctx.globalCompositeOperation = "destination-out";

            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();

            if (isErase) {
                ctx.globalCompositeOperation = "source-over";
                currentErase.points.push({ x: pos.x, y: pos.y });
            } else {
                currentStroke.points.push({ x: pos.x, y: pos.y });
            }
        }

        if (placingShape && (tool === TOOLS.RECT || tool === TOOLS.CIRCLE)) {
            redraw();

            ctx.strokeStyle = color;
            ctx.lineWidth = brushSize;

            if (tool === TOOLS.RECT) {
                ctx.strokeRect(startX, startY, pos.x - startX, pos.y - startY);
            }

            if (tool === TOOLS.CIRCLE) {
                const r = Math.hypot(pos.x - startX, pos.y - startY);
                ctx.beginPath();
                ctx.arc(startX, startY, r, 0, Math.PI * 2);
                ctx.stroke();
            }
        }
    });

    canvas.addEventListener("mouseup", () => {

        if (draggingShape) {
            draggingShape = false;
            connection.invoke("SendDrawing", boardId, JSON.stringify(selectedShape));
            selectedShape = null;
            return;
        }

        if (drawing && tool === TOOLS.PEN) {
            drawing = false;
            strokes.push(currentStroke);
            connection.invoke("SendDrawing", boardId, JSON.stringify(currentStroke));
            currentStroke = null;
        }

        if (drawing && tool === TOOLS.ERASE) {
            drawing = false;
            erases.push(currentErase);
            connection.invoke("SendDrawing", boardId, JSON.stringify(currentErase));
            currentErase = null;
        }
    });

    canvas.addEventListener("click", (e) => {

        const pos = getMousePos(e);

        if (tool === TOOLS.PEN || tool === TOOLS.ERASE) return;

        if (!placingShape) {
            startX = pos.x;
            startY = pos.y;
            placingShape = true;
            return;
        }

        const obj = {
            id: Date.now(),
            type: tool,
            x1: startX,
            y1: startY,
            x2: x,
            y2: y,
            color,
            size: brushSize
        };

        shapes.push(obj);
        connection.invoke("UpdateShape", boardId, JSON.stringify(selectedShape));

        placingShape = false;
        redraw();
    });

    function showCanvasConfirm(text, callback) {
        document.getElementById("confirmText").innerText = text;

        const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
        const btn = document.getElementById("confirmBtn");

        btn.onclick = () => {
            callback();
            modal.hide();
        };

        modal.show();
    }

    window.clearCanvas = () => {
        showCanvasConfirm("Clear entire board?", () => {
            strokes = [];
            shapes = [];
            erases = [];
            redraw();

            connection.invoke("ClearBoard", boardId);
        });
    };

    window.exportImage = () => {
        const tempCanvas = document.createElement("canvas");
        const tempCtx = tempCanvas.getContext("2d");

        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;

        tempCtx.fillStyle = "#fff";
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        tempCtx.drawImage(canvas, 0, 0);

        const link = document.createElement("a");
        link.download = "board.jpg";
        link.href = tempCanvas.toDataURL("image/jpeg");
        link.click();
    };

    window.saveAndExit = () => {
        fetch(`/Board/SavePreview/${boardId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: canvas.toDataURL() })
        });

        setTimeout(() => window.location.href = "/", 500);
    };

    existing.forEach(d => {
        const data = JSON.parse(d);
        if (data.type === "stroke") strokes.push(data);
        else if (data.type === "erase") erases.push(data);
        else shapes.push(data);
    });

    redraw();
});