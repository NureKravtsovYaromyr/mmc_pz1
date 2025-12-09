const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const colorInput = document.getElementById("colorPicker");
const lineWidthInput = document.getElementById("lineWidth");
const fillStyleSelect = document.getElementById("fillStyle");
const lightnessInput = document.getElementById("lightnessControl");
const brightnessInput = document.getElementById("brightnessControl");

let mode = null;            // 'line' | 'circle' | 'ellipse' | 'select' | null
let affineMode = null;      // 'move' | 'scale' | 'rotate' | null
let startX = null, startY = null;

let shapes = [];            // усі намальовані фігури
let selectedShapeIndex = null; // індекс вибраної фігури або null

// ------------------------------------------------------
//                   РЕЖИМИ РОБОТИ
// ------------------------------------------------------
function setMode(m) {
    mode = m;
    affineMode = null;
    redrawAll();
}

function setAffine(a) {
    affineMode = a;
    mode = null;
    redrawAll();
}

// ------------------------------------------------------
//                ОБРОБКА ПОДІЙ МИШІ
// ------------------------------------------------------
canvas.addEventListener("mousedown", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    startX = x;
    startY = y;

    // режим вибору фігури
    if (mode === "select") {
        selectShapeAt(x, y);
        return;
    }

    // афінні перетворення тільки для вибраної фігури
    if (affineMode && selectedShapeIndex !== null) {
        applyAffine(e);
    }
});

canvas.addEventListener("mouseup", (e) => {
    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    if (!mode) return;

    const color = colorInput.value;
    const width = parseInt(lineWidthInput.value);
    const fill = fillStyleSelect.value; // 'none' | 'solid'

    if (mode === "line") {
        const shape = {
            type: "line",
            x1: startX,
            y1: startY,
            x2: endX,
            y2: endY,
            color,
            baseColor: color,
            width
        };
        shapes.push(shape);
        selectedShapeIndex = shapes.length - 1;
        redrawAll();
    }

    if (mode === "circle") {
        const r = Math.hypot(endX - startX, endY - startY);
        const shape = {
            type: "circle",
            x: startX,
            y: startY,
            r,
            color,
            baseColor: color,
            width,
            fill // 'none' | 'solid'
        };
        shapes.push(shape);
        selectedShapeIndex = shapes.length - 1;
        redrawAll();
    }

    if (mode === "ellipse") {
        const rx = Math.abs(endX - startX);
        const ry = Math.abs(endY - startY);
        const shape = {
            type: "ellipse",
            x: startX,
            y: startY,
            rx,
            ry,
            color,
            baseColor: color,
            width,
            fill // 'none' | 'solid'
        };
        shapes.push(shape);
        selectedShapeIndex = shapes.length - 1;
        redrawAll();
    }
});

// ------------------------------------------------------
//                   ПЕРЕМАЛЮВАННЯ
// ------------------------------------------------------
function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    shapes.forEach((s) => {
        if (s.type === "line") drawLine(s);
        if (s.type === "circle") drawCircle(s);
        if (s.type === "ellipse") drawEllipse(s);
    });

    if (selectedShapeIndex !== null && shapes[selectedShapeIndex]) {
        drawSelectionOutline(shapes[selectedShapeIndex]);
    }
}

// ------------------------------------------------------
//                     BRESENHAM LINE
// ------------------------------------------------------
function drawLine(s) {
    let { x1, y1, x2, y2, color, width } = s;

    ctx.fillStyle = color;

    x1 = Math.round(x1);
    y1 = Math.round(y1);
    x2 = Math.round(x2);
    y2 = Math.round(y2);

    let dx = Math.abs(x2 - x1);
    let dy = Math.abs(y2 - y1);
    let sx = (x1 < x2) ? 1 : -1;
    let sy = (y1 < y2) ? 1 : -1;
    let err = dx - dy;

    while (true) {
        ctx.fillRect(x1, y1, width, width);

        if (x1 === x2 && y1 === y2) break;

        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x1 += sx; }
        if (e2 < dx) { err += dx; y1 += sy; }
    }
}

// ------------------------------------------------------
//                 MIDPOINT CIRCLE + FILL
// ------------------------------------------------------
function drawCircle(s) {
    let { x, y, r, color, width, fill } = s;
    ctx.fillStyle = color;

    const rInt = Math.max(0, Math.round(r));

    // суцільне заповнення кола
    if (fill === "solid" && rInt > 0) {
        for (let yy = -rInt; yy <= rInt; yy++) {
            const dx = Math.floor(Math.sqrt(rInt * rInt - yy * yy));
            for (let xx = -dx; xx <= dx; xx++) {
                ctx.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
            }
        }
    }

    // контур за алгоритмом midpoint
    let points = [];

    let d = 1 - r;
    let xi = 0;
    let yi = r;

    while (xi <= yi) {
        points.push([x + xi, y + yi]);
        points.push([x + yi, y + xi]);
        points.push([x - yi, y + xi]);
        points.push([x - xi, y + yi]);
        points.push([x - xi, y - yi]);
        points.push([x - yi, y - xi]);
        points.push([x + yi, y - xi]);
        points.push([x + xi, y - yi]);

        if (d < 0) {
            d += 2 * xi + 3;
        } else {
            d += 2 * (xi - yi) + 5;
            yi--;
        }
        xi++;
    }

    points.forEach(([px, py]) =>
        ctx.fillRect(Math.round(px), Math.round(py), width, width)
    );
}

// ------------------------------------------------------
//               MIDPOINT ELLIPSE + FILL
// ------------------------------------------------------
function drawEllipse(s) {
    let { x, y, rx, ry, color, width, fill } = s;
    ctx.fillStyle = color;

    const rxInt = Math.max(0, Math.round(rx));
    const ryInt = Math.max(0, Math.round(ry));

    // суцільне заповнення еліпса
    if (fill === "solid" && rxInt > 0 && ryInt > 0) {
        for (let yy = -ryInt; yy <= ryInt; yy++) {
            const t = 1 - (yy * yy) / (ryInt * ryInt);
            if (t < 0) continue;
            const dx = Math.floor(rxInt * Math.sqrt(t));
            for (let xx = -dx; xx <= dx; xx++) {
                ctx.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
            }
        }
    }

    // контур за midpoint-алгоритмом
    let rx2 = rx * rx;
    let ry2 = ry * ry;

    let xi = 0, yi = ry;
    let p1 = ry2 - rx2 * ry + 0.25 * rx2;

    while (2 * ry2 * xi <= 2 * rx2 * yi) {
        plot4Ellipse(x, y, xi, yi, width);
        if (p1 < 0) {
            p1 += 2 * ry2 * xi + ry2;
        } else {
            yi--;
            p1 += 2 * ry2 * xi + ry2 - 2 * rx2 * yi;
        }
        xi++;
    }

    let p2 = ry2 * (xi + 0.5) * (xi + 0.5) + rx2 * (yi - 1) * (yi - 1) - rx2 * ry2;

    while (yi >= 0) {
        plot4Ellipse(x, y, xi, yi, width);
        if (p2 > 0) {
            p2 -= 2 * rx2 * yi - rx2;
        } else {
            xi++;
            p2 += 2 * ry2 * xi - 2 * rx2 * yi + rx2;
        }
        yi--;
    }
}

function plot4Ellipse(cx, cy, x, y, w) {
    ctx.fillRect(Math.round(cx + x), Math.round(cy + y), w, w);
    ctx.fillRect(Math.round(cx - x), Math.round(cy + y), w, w);
    ctx.fillRect(Math.round(cx + x), Math.round(cy - y), w, w);
    ctx.fillRect(Math.round(cx - x), Math.round(cy - y), w, w);
}

// ------------------------------------------------------
//     MANDELBROT: ОРИГІНАЛ + ПЕРЕТВОРЕНА КОЛІРНА СХЕМА
// ------------------------------------------------------
function drawMandelbrot() {
    const w = canvas.width;
    const h = canvas.height;
    const halfW = Math.floor(w / 2);

    const maxIter = 100;

    const xmin = -2.5, xmax = 1;
    const ymin = -1.2, ymax = 1.2;

    const img = ctx.createImageData(w, h);
    const data = img.data;

    for (let py = 0; py < h; py++) {
        const y0 = ymin + (py / h) * (ymax - ymin);

        for (let px = 0; px < halfW; px++) {
            const x0 = xmin + (px / halfW) * (xmax - xmin);

            let zx = 0, zy = 0;
            let iter = 0;

            while (zx * zx + zy * zy < 4 && iter < maxIter) {
                const xt = zx * zx - zy * zy + x0;
                zy = 2 * zx * zy + y0;
                zx = xt;
                iter++;
            }

            // індекс у лівій половині (оригінальна схема)
            const idxL = (py * w + px) * 4;

            const c = (iter === maxIter) ? 0 : iter * 10;
            const r1 = c;
            const g1 = c * 2;
            const b1 = c * 4;

            data[idxL]     = clampColor(r1);
            data[idxL + 1] = clampColor(g1);
            data[idxL + 2] = clampColor(b1);
            data[idxL + 3] = 255;

            // права половина — перетворена колірна схема (наприклад, у відтінки сірого)
            const idxR = (py * w + (px + halfW)) * 4;
            const gray = Math.round(0.299 * r1 + 0.587 * g1 + 0.114 * b1);

            data[idxR]     = clampColor(gray);
            data[idxR + 1] = clampColor(gray);
            data[idxR + 2] = clampColor(gray);
            data[idxR + 3] = 255;
        }
    }

    ctx.putImageData(img, 0, 0);
}

function clampColor(v) {
    return Math.max(0, Math.min(255, v));
}

// ------------------------------------------------------
//              АФІННІ ПЕРЕТВОРЕННЯ (по вибраній фігурі)
// ------------------------------------------------------
function applyAffine(e) {
    if (selectedShapeIndex === null) return;

    let shape = shapes[selectedShapeIndex];
    if (!shape) return;

    let dx = 10, dy = 10; // зсув для move

    // MOVE
    if (affineMode === "move") {
        if (shape.type === "line") {
            shape.x1 += dx; shape.y1 += dy;
            shape.x2 += dx; shape.y2 += dy;
        } else if (shape.type === "circle") {
            shape.x += dx;
            shape.y += dy;
        } else if (shape.type === "ellipse") {
            shape.x += dx;
            shape.y += dy;
        }

        redrawAll();
        return;
    }

    // SCALE
    if (affineMode === "scale") {
        const scaleFactor = 1.2;

        if (shape.type === "line") {
            let cx = (shape.x1 + shape.x2) / 2;
            let cy = (shape.y1 + shape.y2) / 2;

            shape.x1 = cx + (shape.x1 - cx) * scaleFactor;
            shape.y1 = cy + (shape.y1 - cy) * scaleFactor;

            shape.x2 = cx + (shape.x2 - cx) * scaleFactor;
            shape.y2 = cy + (shape.y2 - cy) * scaleFactor;
        } else if (shape.type === "circle") {
            shape.r *= scaleFactor;
        } else if (shape.type === "ellipse") {
            shape.rx *= scaleFactor;
            shape.ry *= scaleFactor;
        }

        redrawAll();
        return;
    }

    // ROTATE
    if (affineMode === "rotate") {
        const rect = canvas.getBoundingClientRect();
        const pivotX = e.clientX - rect.left;
        const pivotY = e.clientY - rect.top;

        const angleDeg = 15;
        const angle = angleDeg * Math.PI / 180;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        function rotatePoint(px, py) {
            const dx = px - pivotX;
            const dy = py - pivotY;
            const rx = pivotX + dx * cosA - dy * sinA;
            const ry = pivotY + dx * sinA + dy * cosA;
            return { x: rx, y: ry };
        }

        if (shape.type === "line") {
            const p1 = rotatePoint(shape.x1, shape.y1);
            const p2 = rotatePoint(shape.x2, shape.y2);
            shape.x1 = p1.x; shape.y1 = p1.y;
            shape.x2 = p2.x; shape.y2 = p2.y;
        } else if (shape.type === "circle") {
            const pc = rotatePoint(shape.x, shape.y);
            shape.x = pc.x;
            shape.y = pc.y;
        } else if (shape.type === "ellipse") {
            const pc = rotatePoint(shape.x, shape.y);
            shape.x = pc.x;
            shape.y = pc.y;
        }

        redrawAll();
        return;
    }
}

// ------------------------------------------------------
//                  ВИБІР ФІГУРИ (HIT TEST)
// ------------------------------------------------------
function hitTestShape(s, px, py) {
    if (s.type === "line") {
        return hitTestLine(px, py, s);
    }
    if (s.type === "circle") {
        const dx = px - s.x;
        const dy = py - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        return Math.abs(dist - s.r) <= (s.width || 1) + 2;
    }
    if (s.type === "ellipse") {
        const dx = px - s.x;
        const dy = py - s.y;
        if (s.rx === 0 || s.ry === 0) return false;
        const value = (dx * dx) / (s.rx * s.rx) + (dy * dy) / (s.ry * s.ry);
        return Math.abs(value - 1) <= 0.2;
    }
    return false;
}

function hitTestLine(px, py, s) {
    const { x1, y1, x2, y2 } = s;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length2 = dx * dx + dy * dy;

    if (length2 === 0) {
        const ddx = px - x1;
        const ddy = py - y1;
        return Math.sqrt(ddx * ddx + ddy * ddy) <= (s.width || 1) + 2;
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / length2;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    const ddx = px - projX;
    const ddy = py - projY;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy);

    return dist <= (s.width || 1) + 2;
}

function selectShapeAt(x, y) {
    selectedShapeIndex = null;

    for (let i = shapes.length - 1; i >= 0; i--) {
        if (hitTestShape(shapes[i], x, y)) {
            selectedShapeIndex = i;
            break;
        }
    }

    if (selectedShapeIndex !== null) {
        const s = shapes[selectedShapeIndex];

        if (!s.baseColor) {
            s.baseColor = s.color;
        }

        if (s.color) {
            colorInput.value = s.color;
        }

        if (s.fill) {
            fillStyleSelect.value = s.fill;
        } else {
            fillStyleSelect.value = "none";
        }

        if (lightnessInput && brightnessInput) {
            lightnessInput.value = 0;
            brightnessInput.value = 0;
        }
    }

    redrawAll();
}

// ------------------------------------------------------
//            ПІДСВІЧУВАННЯ ВИБРАНОЇ ФІГУРИ
// ------------------------------------------------------
function drawSelectionOutline(s) {
    ctx.save();
    ctx.strokeStyle = "red";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);

    if (s.type === "line") {
        const minX = Math.min(s.x1, s.x2);
        const maxX = Math.max(s.x1, s.x2);
        const minY = Math.min(s.y1, s.y2);
        const maxY = Math.max(s.y1, s.y2);
        ctx.strokeRect(minX - 4, minY - 4, (maxX - minX) + 8, (maxY - minY) + 8);
    } else if (s.type === "circle") {
        const x = s.x - s.r - 4;
        const y = s.y - s.r - 4;
        const size = 2 * s.r + 8;
        ctx.strokeRect(x, y, size, size);
    } else if (s.type === "ellipse") {
        const x = s.x - s.rx - 4;
        const y = s.y - s.ry - 4;
        const w = 2 * s.rx + 8;
        const h = 2 * s.ry + 8;
        ctx.strokeRect(x, y, w, h);
    }

    ctx.restore();
}

// ------------------------------------------------------
//             ЗМІНА КОЛЬОРУ / ЗАПОВНЕННЯ
// ------------------------------------------------------
function recolorSelected() {
    if (selectedShapeIndex === null) return;
    const s = shapes[selectedShapeIndex];
    s.color = colorInput.value;
    s.baseColor = s.color;
    redrawAll();
}

// миттєва зміна кольору
colorInput.addEventListener("input", () => {
    if (selectedShapeIndex === null) return;
    const s = shapes[selectedShapeIndex];
    s.color = colorInput.value;
    s.baseColor = s.color;
    redrawAll();
});

// зміна стилю заповнення для вибраної фігури
fillStyleSelect.addEventListener("change", () => {
    if (selectedShapeIndex === null) return;
    const s = shapes[selectedShapeIndex];

    if (s.type === "circle" || s.type === "ellipse") {
        s.fill = fillStyleSelect.value; // 'none' | 'solid'
        redrawAll();
    }
});

// ------------------------------------------------------
//     ЗМІНА ОСВІТЛЕНОСТІ ТА ЯСКРАВОСТІ ДЛЯ ОБ'ЄКТА
// ------------------------------------------------------
function hexToRgb(hex) {
    if (!hex) return null;
    let h = hex.replace("#", "");
    if (h.length === 3) {
        h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    if (h.length !== 6) return null;
    const r = parseInt(h.substr(0, 2), 16);
    const g = parseInt(h.substr(2, 2), 16);
    const b = parseInt(h.substr(4, 2), 16);
    return { r, g, b };
}

function rgbToHex(r, g, b) {
    const toHex = (v) => {
        const s = v.toString(16);
        return s.length === 1 ? "0" + s : s;
    };
    return "#" + toHex(r) + toHex(g) + toHex(b);
}

function applyLightnessBrightness(hexColor, lightnessDelta, brightnessDelta) {
    const rgb = hexToRgb(hexColor);
    if (!rgb) return hexColor;
    let { r, g, b } = rgb;

    // яскравість: масштабування інтенсивності
    const bFactor = (100 + brightnessDelta) / 100;
    r *= bFactor;
    g *= bFactor;
    b *= bFactor;

    // освітленість: рух до білого (при >0) або до чорного (при <0)
    const lFactor = lightnessDelta / 100;
    if (lFactor > 0) {
        r = r + (255 - r) * lFactor;
        g = g + (255 - g) * lFactor;
        b = b + (255 - b) * lFactor;
    } else if (lFactor < 0) {
        const f = 1 + lFactor; // 0..1
        r *= f;
        g *= f;
        b *= f;
    }

    r = clampColor(Math.round(r));
    g = clampColor(Math.round(g));
    b = clampColor(Math.round(b));

    return rgbToHex(r, g, b);
}

function updateLightnessBrightness() {
    if (selectedShapeIndex === null) return;
    const s = shapes[selectedShapeIndex];
    if (!s.baseColor) {
        s.baseColor = s.color;
    }
    const lVal = parseInt(lightnessInput.value || "0", 10);
    const bVal = parseInt(brightnessInput.value || "0", 10);

    s.color = applyLightnessBrightness(s.baseColor, lVal, bVal);
    redrawAll();
}

if (lightnessInput && brightnessInput) {
    lightnessInput.addEventListener("input", updateLightnessBrightness);
    brightnessInput.addEventListener("input", updateLightnessBrightness);
}

function resetLightBright() {
    if (!lightnessInput || !brightnessInput) return;
    lightnessInput.value = 0;
    brightnessInput.value = 0;

    if (selectedShapeIndex === null) return;
    const s = shapes[selectedShapeIndex];
    if (s.baseColor) {
        s.color = s.baseColor;
    }
    redrawAll();
}


function deleteSelected() {
    if (selectedShapeIndex === null) return;
    shapes.splice(selectedShapeIndex, 1);
    selectedShapeIndex = null;
    redrawAll();
}
