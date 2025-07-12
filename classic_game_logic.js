// Classic Sudoku logic – identical to the original game_logic.js but WITHOUT
// auto-initialisation. The hosting page decides when to call `window.initClassic()`.
/* global PUZZLES */

// Debug flag must be defined before any function uses it
const DEBUG = true;

// --- original game_logic.js below (unchanged) --------------------------------

// Basic Sudoku logic and UI handling
// Keep code minimal per user rule "fewer lines of code" and use external catalog

/**
 * buildGrid()
 * Renders a 9×9 input grid inside the <table id="grid"> element.
 * Each cell is a single-char <input>. No solving algorithm involved.
 */
function buildGrid(){
  const tbl=document.getElementById('grid');
  for(let r=0;r<9;r++){
    const row=tbl.insertRow();
    for(let c=0;c<9;c++){
      const cell=row.insertCell();
      const inp=document.createElement('input');
      inp.maxLength=1;
      inp.dataset.idx=r*9+c;
      inp.addEventListener('focus',()=>{selectedIdx=+inp.dataset.idx;});
      inp.addEventListener('input',e=>{const v=e.target.value;if(!/^[1-9]?$/.test(v))e.target.value='';refreshConflicts();});
      cell.appendChild(inp);
    }
  }
}

/**
 * loadPuzzle(pzIdx)
 * Populates the 9×9 grid with a new puzzle of the requested index.
 *  - Derives a playable puzzle string from the full solution according to the
 *    selected difficulty level.
 *  - Sets initial cell values, disables clues, and marks them with the `given`
 *    class for styling.
 *  - Caches the solution array for later quick access.
 *  - Finally triggers conflict highlighting to reflect the freshly loaded
 *    state.
 * @param {number} pzIdx Index of the puzzle inside the global `PUZZLES` list
 */
function loadPuzzle(pzIdx){
  const {solution,level}=PUZZLES[pzIdx];
  const solStr=typeof solution==='string'?solution:solution.join('');
  const puzzleStr=generatePuzzle(solStr,cluesForLevel(level||document.getElementById('level').value));
  const arr=[...puzzleStr].map(Number);
  document.querySelectorAll('#grid input').forEach((inp,i)=>{
    const v=arr[i];
    inp.value=v?v:'';
    inp.disabled=!!v;
    inp.className=v?'given':'';
  });
  currentPuzzle=pzIdx;
  PUZZLES[pzIdx]._cachedSolutionArr=[...solStr].map(Number);
  refreshConflicts();
}

/**
 * checkPuzzle()
 * Validates the currently filled grid against the solution.
 *  - Aborts if any cell is still empty.
 *  - Alerts the user whether all inputs match the cached solution.
 */
function checkPuzzle(){
  const inputs=[...document.querySelectorAll('#grid input')];
  const sol=getSolutionArray();
  if(inputs.some(inp=>!inp.value)){alert('Puzzle incomplete.');return;}
  const allOk=inputs.every((inp,i)=>+inp.value===sol[i]);
  alert(allOk?'Correct!':'There are errors.');
}

/**
 * solveRow(idx)
 * Auto-fills every cell in the row of `idx` with its correct digit.
 *  - Clears duplicates the action would create in intersecting columns/blocks
 *    to retain a valid (though partially revealed) board.
 * @param {number} idx Linear index (0-80) of the user-selected cell
 */
function solveRow(idx) {
  const row = Math.floor(idx / 9);
  const sol = getSolutionArray();
  const inputs = [...document.querySelectorAll('#grid input')];

  for (let c = 0; c < 9; c++) {
    const i = row * 9 + c;
    const v = sol[i];
    inputs[i].value = v;

    // clear same value in other rows of this column
    for (let r = 0; r < 9; r++) {
      if (r === row) continue;
      const j = r * 9 + c;
      if (!inputs[j].disabled && inputs[j].value == v) inputs[j].value = '';
    }

    // clear duplicates in same 3×3 block
    const rBase = Math.floor(row / 3) * 3;
    const cBase = Math.floor(c / 3) * 3;
    for (let rr = rBase; rr < rBase + 3; rr++) {
      for (let cc = cBase; cc < cBase + 3; cc++) {
        const k = rr * 9 + cc;
        if (k === i) continue;
        if (!inputs[k].disabled && inputs[k].value == v) inputs[k].value = '';
      }
    }
  }
  refreshConflicts();
}

/**
 * solveCol(idx)
 * Auto-fills every cell in the column of `idx` and removes resulting
 * duplicates in the corresponding rows/blocks.
 * @param {number} idx Linear index (0-80)
 */
function solveCol(idx) {
  const col = idx % 9;
  const sol = getSolutionArray();
  const inputs = [...document.querySelectorAll('#grid input')];

  for (let r = 0; r < 9; r++) {
    const i = r * 9 + col;
    const v = sol[i];
    inputs[i].value = v;

    // clear duplicates in row
    for (let c = 0; c < 9; c++) {
      if (c === col) continue;
      const j = r * 9 + c;
      if (!inputs[j].disabled && inputs[j].value == v) inputs[j].value = '';
    }

    // clear duplicates in block
    const rBase = Math.floor(r / 3) * 3;
    const cBase = Math.floor(col / 3) * 3;
    for (let rr = rBase; rr < rBase + 3; rr++) {
      for (let cc = cBase; cc < cBase + 3; cc++) {
        const k = rr * 9 + cc;
        if (k === i) continue;
        if (!inputs[k].disabled && inputs[k].value == v) inputs[k].value = '';
      }
    }
  }
  refreshConflicts();
}

/**
 * solveBlock(idx)
 * Auto-fills the 3×3 block containing `idx` using the cached solution array.
 * @param {number} idx Linear index (0-80)
 */
function solveBlock(idx) {
  const rBase = Math.floor(Math.floor(idx / 9) / 3) * 3;
  const cBase = Math.floor((idx % 9) / 3) * 3;
  const sol = getSolutionArray();

  document.querySelectorAll('#grid input').forEach((inp, i) => {
    const r = Math.floor(i / 9);
    const c = i % 9;
    if (r >= rBase && r < rBase + 3 && c >= cBase && c < cBase + 3) {
      inp.value = sol[i];
    }
  });
  refreshConflicts();
}

/**
 * getSolutionArray()
 * Lazily returns (and caches) the numeric solution array for the current
 * puzzle so repeated calls are O(1).
 * @returns {number[]} 81-element solution digits 1-9
 */
function getSolutionArray() {
  const cached = PUZZLES[currentPuzzle]._cachedSolutionArr;
  if (cached) return cached;

  const { solution } = PUZZLES[currentPuzzle];
  return (PUZZLES[currentPuzzle]._cachedSolutionArr =
    typeof solution === 'string' ? [...solution].map(n => +n) : solution);
}

/**
 * refreshConflicts()
 * Scans the grid and toggles `conflict` CSS class on inputs that violate
 * Sudoku rules (row/column/block duplicates).
 * Runs after every user input or automated solve helper.
 */
function refreshConflicts() {
  const inputs = [...document.querySelectorAll('#grid input')];

  const rows   = [...Array(9)].map(() => ({ count: {} }));
  const cols   = [...Array(9)].map(() => ({ count: {} }));
  const blocks = [...Array(9)].map(() => ({ count: {} }));

  inputs.forEach((inp, i) => {
    const v = inp.value;
    if (!v) return;
    const r = Math.floor(i / 9);
    const c = i % 9;
    const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
    rows[r].count[v]   = (rows[r].count[v]   || 0) + 1;
    cols[c].count[v]   = (cols[c].count[v]   || 0) + 1;
    blocks[b].count[v] = (blocks[b].count[v] || 0) + 1;
  });

  inputs.forEach((inp, i) => {
    const v = inp.value;
    let conflict = false;
    if (v) {
      const r = Math.floor(i / 9);
      const c = i % 9;
      const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
      conflict =
        rows[r].count[v] > 1 ||
        cols[c].count[v] > 1 ||
        blocks[b].count[v] > 1;
    }
    inp.classList.toggle('conflict', conflict);
  });
}

/**
 * randomIndexForLevel(level)
 * Picks a random puzzle index matching the requested difficulty.
 * Falls back to 0 if none are available.
 * @param {string} level One of 'easy'|'medium'|'hard'
 * @returns {number} Puzzle index
 */
function randomIndexForLevel(level) {
  const indices = PUZZLES.map((p, idx) => (p.level === level ? idx : null)).filter(x => x !== null);
  return indices[Math.floor(Math.random() * indices.length)] || 0;
}

/**
 * cluesForLevel(level)
 * Pure helper that maps difficulty to number of starting clues.
 * @param {string} level Difficulty label
 * @returns {number} Amount of clues to retain when generating a puzzle
 */
const cluesForLevel = level => ({ easy: 40, medium: 30, hard: 24 }[level] || 30);

/**
 * generatePuzzle(solStr, clueCt)
 * Produces a masked puzzle string by keeping `clueCt` positions from the full
 * solution and blanking the others with '0'.
 * @param {string} solStr 81-char solution digits
 * @param {number} clueCt Desired number of visible digits
 * @returns {string} 81-char puzzle string with zeros for blanks
 */
function generatePuzzle(solStr, clueCt) {
  const indices = [...Array(81).keys()];

  // Fisher–Yates shuffle
  for (let i = 80; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const keep = new Set(indices.slice(0, clueCt));
  return [...solStr].map((d, i) => (keep.has(i) ? d : '0')).join('');
}

// --- Dev util --------------------------------------------------------------
// DEBUG already declared at top
/**
 * validateCatalogue()
 * Developer-only helper (runs when DEBUG=true) that ensures every puzzle and
 * solution pair in the global `PUZZLES` catalogue is internally consistent
 * and free of rule violations. Errors are logged to the console.
 */
function validateCatalogue() {
  const isValidUnit = arr => {
    const nums = arr.filter(n => n);
    return new Set(nums).size === nums.length;
  };

  const toNumArr = s => [...s].map(Number);

  PUZZLES.forEach(({ puzzle, solution }, idx) => {
    if (!solution || solution.length !== 81 || /[^1-9]/.test(solution)) {
      console.error(`Puzzle ${idx}: solution malformed`);
      return;
    }

    const grid = toNumArr(solution);

    // row/col/block uniqueness
    for (let i = 0; i < 9; i++) {
      const row   = grid.slice(i * 9, i * 9 + 9);
      const col   = grid.filter((_, k) => k % 9 === i);
      const rBase = Math.floor(i / 3) * 3;
      const cBase = (i % 3) * 3;
      const block = [0, 1, 2].flatMap(r =>
        [0, 1, 2].map(c => grid[(rBase + r) * 9 + cBase + c])
      );

      if (![row, col, block].every(isValidUnit)) {
        console.error(`Puzzle ${idx}: duplicate digits in row/col/block`);
        break;
      }
    }

    // Ensure puzzle clues match the solution
    if (puzzle) {
      const pzArr = toNumArr(puzzle);
      for (let k = 0; k < 81; k++) {
        const d = pzArr[k];
        if (d && d !== grid[k]) {
          console.error(`Puzzle ${idx}: clue mismatch at pos ${k}`);
          break;
        }
      }
    }
  });
}

// -------- init helpers --------
/**
 * initClassic()
 * Thin wrapper to expose Classic-mode bootstrap to the hosting page. Merely
 * invokes the shared `init()` routine.
 */
function initClassic(){
  init(); // reuse original inner init() body by invoking immediately
}

// expose for external bootstrap
window.initClassic = initClassic;

// remove automatic start – page will call initClassic() based on mode selector

// -------- init helpers --------
/**
 * init()
 * Core initialisation shared by Classic and (indirectly) Killer variants.
 *  - Validates catalogue in dev mode
 *  - Builds empty grid
 *  - Loads first puzzle according to selected level
 *  - Wires all UI control buttons
 */
function init(){
  if(DEBUG)validateCatalogue();
  // Always use classic conflict checker after potential Killer override
  window.refreshConflicts = refreshConflicts;
  // Ensure clean slate (e.g. when switching from Killer → Classic)
  const gridEl=document.getElementById('grid');
  if(gridEl) gridEl.innerHTML='';
  buildGrid();
  const levelSel=document.getElementById('level');
  const startIdx=randomIndexForLevel(levelSel.value);
  loadPuzzle(startIdx);
  document.getElementById('new').onclick=()=>{
    // Ensure pointer uses classic checker before and after reload
    window.refreshConflicts = refreshConflicts;
    const idx = randomIndexForLevel(levelSel.value);
    loadPuzzle(idx);
    window.refreshConflicts = refreshConflicts;
  };
  document.getElementById('check').onclick=checkPuzzle;
  const bind=(id,fn)=>document.getElementById(id).onclick=()=>{if(selectedIdx===null){alert('Select a cell first');return;}fn(selectedIdx);};
  bind('solve-row',solveRow);bind('solve-col',solveCol);bind('solve-block',solveBlock);
  // final guarantee: any listener added above will call the classic checker
  window.refreshConflicts = refreshConflicts;
  refreshConflicts();
}

// ---------------------------------------------------------------------------
// Note: the original auto-initialisation block is intentionally removed to avoid
// double-starting when Classic & Killer scripts are both loaded.
// Export explicit entry point instead:
window.initClassic=init;

let currentPuzzle=0;let selectedIdx=null;
