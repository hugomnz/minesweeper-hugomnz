// --- Buscaminas con sprites + PRIMER CLICK SEGURO ---
// Controles: D-Pad mueve | A revela | B bandera | MENU reinicia

const W = 10
const H = 7
const MINES = 15
const CELL = 16

// 0 oculta, 1 mostrada, 2 bandera
const state: number[][] = []
const mine: boolean[][] = []
const adj: number[][] = []
const cells: Sprite[][] = []

let cx = 0
let cy = 0
let finished = false
let started = false // <-- aún no hay minas hasta el primer click

function inB(x: number, y: number) {
    return x >= 0 && x < W && y >= 0 && y < H
}

function neighbors(x: number, y: number) {
    const out: number[][] = []
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            if (dx == 0 && dy == 0) continue
            const nx = x + dx, ny = y + dy
            if (inB(nx, ny)) out.push([nx, ny])
        }
    }
    return out
}

function makeCellSprite(): Sprite {
    return sprites.create(image.create(CELL, CELL))
}

function init() {
    finished = false
    started = false   // <-- sin minas aún
    cx = 0; cy = 0

    for (let x = 0; x < W; x++) {
        state[x] = []; mine[x] = []; adj[x] = []; cells[x] = []
        for (let y = 0; y < H; y++) {
            state[x][y] = 0
            mine[x][y] = false
            adj[x][y] = 0
            const s = makeCellSprite()
            s.left = x * CELL
            s.top = y * CELL
            cells[x][y] = s
        }
    }
    refreshAll()
}

// Coloca las minas tras el primer click, excluyendo (fx,fy) y sus vecinos
function placeMinesSafe(fx: number, fy: number) {
    // Construimos la lista de posiciones permitidas
    const banned: boolean[][] = []
    for (let x = 0; x < W; x++) {
        banned[x] = []
        for (let y = 0; y < H; y++) banned[x][y] = false
    }
    banned[fx][fy] = true
    const nb = neighbors(fx, fy)
    for (let i = 0; i < nb.length; i++) banned[nb[i][0]][nb[i][1]] = true

    // Colocar minas aleatorias en posiciones no prohibidas
    let left = MINES
    while (left > 0) {
        const x = randint(0, W - 1), y = randint(0, H - 1)
        if (!banned[x][y] && !mine[x][y]) {
            mine[x][y] = true
            left--
        }
    }
    // Calcular adyacencias
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
        if (mine[x][y]) { adj[x][y] = -1; continue }
        let c = 0
        const nbs = neighbors(x, y)
        for (let i = 0; i < nbs.length; i++) if (mine[nbs[i][0]][nbs[i][1]]) c++
        adj[x][y] = c
    }
    started = true
}

function drawCell(x: number, y: number) {
    const img = image.create(CELL, CELL)
    img.fill(12)
    img.drawRect(0, 0, CELL, CELL, 1)

    if (state[x][y] == 1) {
        img.fill(7)
        img.drawRect(0, 0, CELL, CELL, 1)
        if (mine[x][y]) {
            img.print("*", 4, 4)
        } else {
            const n = adj[x][y]
            if (n > 0) img.print("" + n, 4, 4)
        }
    } else if (state[x][y] == 2) {
        img.fill(12)
        img.drawRect(0, 0, CELL, CELL, 1)
        img.print("F", 4, 4)
    } else {
        img.fill(11)
        img.drawRect(0, 0, CELL, CELL, 1)
    }

    if (x == cx && y == cy) img.drawRect(0, 0, CELL, CELL, 10)
    cells[x][y].setImage(img)
}

function refreshAll() {
    for (let x = 0; x < W; x++)
        for (let y = 0; y < H; y++)
            drawCell(x, y)
}

function floodReveal(x: number, y: number) {
    const stack: number[][] = [[x, y]]
    while (stack.length > 0) {
        const p = stack.pop()
        if (!p) continue
        const px = p[0], py = p[1]
        if (!inB(px, py)) continue
        if (state[px][py] != 0) continue
        state[px][py] = 1
        if (mine[px][py]) continue
        if (adj[px][py] == 0) {
            const nb = neighbors(px, py)
            for (let i = 0; i < nb.length; i++) stack.push(nb[i])
        }
    }
}

function reveal(x: number, y: number) {
    if (finished || !inB(x, y)) return
    if (state[x][y] == 1 || state[x][y] == 2) return

    // Si es el primer click, generamos el tablero seguro
    if (!started) {
        placeMinesSafe(x, y)
    }

    state[x][y] = 1

    if (mine[x][y]) { endGame(false); return }

    if (adj[x][y] == 0) floodReveal(x, y)

    checkWin()
    refreshAll()
}

function toggleFlag(x: number, y: number) {
    if (finished || !inB(x, y)) return
    if (state[x][y] == 1) return
    state[x][y] = (state[x][y] == 2) ? 0 : 2
    drawCell(x, y)
}

function checkWin() {
    let shown = 0, safe = 0
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
        if (!mine[x][y]) { safe++; if (state[x][y] == 1) shown++ }
    }
    if (shown == safe) endGame(true)
}

function endGame(win: boolean) {
    finished = true
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
        if (state[x][y] == 0) state[x][y] = 1
    }
    refreshAll()
    if (win) game.over(true); else game.over(false, effects.melt)
}

// --- Controles ---
controller.left.onEvent(ControllerButtonEvent.Pressed, function () { if (cx > 0) { cx--; refreshAll() } })
controller.right.onEvent(ControllerButtonEvent.Pressed, function () { if (cx < W - 1) { cx++; refreshAll() } })
controller.up.onEvent(ControllerButtonEvent.Pressed, function () { if (cy > 0) { cy--; refreshAll() } })
controller.down.onEvent(ControllerButtonEvent.Pressed, function () { if (cy < H - 1) { cy++; refreshAll() } })

controller.A.onEvent(ControllerButtonEvent.Pressed, function () { reveal(cx, cy) })
controller.B.onEvent(ControllerButtonEvent.Pressed, function () { toggleFlag(cx, cy) })

controller.menu.onEvent(ControllerButtonEvent.Pressed, function () {
    for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
        if (cells[x] && cells[x][y]) cells[x][y].destroy()
    }
    init()
})

// Iniciar
init()
