// Killer Sudoku logic – independent module that reuses helpers from classic_game_logic.js
// Only *adds* functionality; does not alter classic behaviour.
// Exposes `initKiller()` globally; HTML decides which one to run.
/* global PUZZLES */

// --- Static cage layout ---------------------------------------------------
// Provided by user, format RnCm (1-based). We ignore the supplied sum and
// compute it from the active puzzle’s solution each time.
const STATIC_CAGE_LAYOUT=[
  {cells:["R1C1","R1C2"]},
  {cells:["R1C3","R1C4"]},
  {cells:["R1C5","R1C6","R2C6","R3C6","R4C6"]},
  {cells:["R1C7","R1C8","R2C7"]},
  {cells:["R1C9","R2C9"]},
  {cells:["R2C1"]},
  {cells:["R2C2","R2C3","R3C3"]},
  {cells:["R2C4","R2C5","R3C4"]},
  {cells:["R3C1","R4C1"]},
  {cells:["R2C8","R3C8"]},
  {cells:["R3C2","R4C2"]},
  {cells:["R3C5","R4C4","R4C5"]},
  {cells:["R3C7"]},
  {cells:["R3C9","R4C8","R4C9"]},
  {cells:["R5C1","R5C2","R5C3"]},
  {cells:["R5C4","R5C5","R5C6"]},
  {cells:["R5C8","R6C7","R6C8","R7C8"]},
  {cells:["R5C9","R6C9"]},
  {cells:["R6C1","R6C2","R6C3"]},
  {cells:["R6C4","R6C5","R6C6","R7C4"]},
  {cells:["R7C1","R8C1","R8C2"]},
  {cells:["R7C2","R7C3"]},
  {cells:["R7C5","R8C5","R8C6"]},
  {cells:["R7C6"]},
  {cells:["R7C7","R8C7"]},
  {cells:["R7C9","R8C9"]},
  {cells:["R8C3","R9C3"]},
  {cells:["R8C4","R9C4"]},
  {cells:["R9C1","R9C2"]},
  {cells:["R9C5","R9C6"]},
  {cells:["R9C7","R9C8","R9C9","R8C8"]}
];

/**
 * rcToIdx(rc)
 * Converts an algebraic cell reference like "R3C5" to the corresponding
 * linear index 0-80 used by the rest of the code.
 * @param {string} rc Cell reference (1-based row/column)
 * @returns {number} 0-based index into grid
 */
function rcToIdx(rc){
  const m=/R(\d)C(\d)/.exec(rc);
  const r=parseInt(m[1],10)-1; // 0-based
  const c=parseInt(m[2],10)-1;
  return r*9+c;
}

// --- Removed hard-coded sample puzzle; we will reuse the global PUZZLES catalog ---
let currentCageMap=null;

/**
 * loadPuzzleKiller(idx)
 * Builds a playable Killer Sudoku from the static cage layout and a hidden
 * full solution.
 *  - Generates a classic puzzle string with difficulty-based clues.
 *  - Injects the digits/clues into the DOM and disables given cells.
 *  - Computes cage sums from the solution so the same layout can be reused
 *    for any underlying puzzle.
 *  - Prepares `currentCageMap` for fast look-ups and renders cage borders and
 *    sum labels.
 *  - Finally calls the specialised conflict refresh.
 * @param {number} idx Index in local `KILLER_PUZZLES` array
 */
function loadPuzzleKiller(idx){
  const p=PUZZLES[idx]; // grab from global catalog
  const solStr=p.solution;
  const puzzleStr=generatePuzzle(solStr,cluesForLevel(p.level));
  const arr=[...puzzleStr].map(n=>+n);
  document.getElementById('grid').querySelectorAll('input').forEach((inp,i)=>{
    const v=arr[i];
    inp.value=v?v:'';
    inp.disabled=!!v;
    inp.className=v?'given':'';
  });
  window.currentPuzzleKiller=idx;
  // cache solution for killer mode too
  p._cachedSolutionArr=[...solStr].map(Number);

  currentCageMap=Array(81).fill(-1);
  // Build cages with computed sums ---------------------------------------
  const solArr=[...solStr].map(Number);
  const cages=STATIC_CAGE_LAYOUT.map(layout=>{
    const idxs=layout.cells.map(rcToIdx);
    const sum=idxs.reduce((a,i)=>a+solArr[i],0);
    return {sum,cells:idxs};
  });
  p._killerCages=cages;

  p._killerCages.forEach((c,ci)=>c.cells.forEach(k=>currentCageMap[k]=ci));
  renderCagesKiller(p._killerCages);
  drawCageBorders(p._killerCages);
  refreshConflictsKiller();
}

/**
 * refreshConflictsKiller()
 * Killer-aware duplicate/sum checking that extends the classic validation by
 * also enforcing cage rules (unique digits per cage, sum equals target when
 * cage is full, etc.). Highlights finished cages.
 */
function refreshConflictsKiller(){
  const inputs=[...document.querySelectorAll('#grid input')];
  const rows=[...Array(9)].map(()=>({}));
  const cols=[...Array(9)].map(()=>({}));
  const blocks=[...Array(9)].map(()=>({}));
  const cagesStats=currentCageMap?currentCageMap.map(()=>({cnt:{},sum:0,len:0,target:0})):null;
  if(cagesStats){
    PUZZLES[window.currentPuzzleKiller]._killerCages.forEach((cg,i)=>{cagesStats[i].target=cg.sum;cagesStats[i].len=cg.cells.length;});
  }
  inputs.forEach((inp,i)=>{
    const v=+inp.value||0; if(!v) return;
    const r=Math.floor(i/9),c=i%9,b=Math.floor(r/3)*3+Math.floor(c/3);
    rows[r][v]=(rows[r][v]||0)+1;
    cols[c][v]=(cols[c][v]||0)+1;
    blocks[b][v]=(blocks[b][v]||0)+1;
    if(currentCageMap && currentCageMap[i]>-1){
      const cs=cagesStats[currentCageMap[i]];
      cs.cnt[v]=(cs.cnt[v]||0)+1;
      cs.sum+=v;
    }
  });
  // Track which cages are complete after pass
  const cageComplete=cagesStats?cagesStats.map(()=>false):null;

  inputs.forEach((inp,i)=>{
    const v=+inp.value||0;
    let conf=false;
    if(v){
      const r=Math.floor(i/9),c=i%9,b=Math.floor(r/3)*3+Math.floor(c/3);
      conf = rows[r][v]>1||cols[c][v]>1||blocks[b][v]>1;
      if(!conf && currentCageMap[i]>-1){
        const cs=cagesStats[currentCageMap[i]];
        conf = cs.cnt[v]>1 || cs.sum>cs.target || (Object.values(cs.cnt).reduce((a,b)=>a+b,0)===cs.len && cs.sum!==cs.target);
      }
    }
    inp.classList.toggle('conflict',conf);
  });
  // Determine completed cages
  if(cagesStats){
    cagesStats.forEach((cs,ci)=>{
      const filled=Object.values(cs.cnt).reduce((a,b)=>a+b,0);
      if(filled===cs.len && cs.sum===cs.target) cageComplete[ci]=true;
    });
  }
  // Apply cage-complete class to td elements
  if(cageComplete){
    inputs.forEach((inp,i)=>{
      const td=inp.parentElement;
      const ci=currentCageMap[i];
      const done=ci>-1 && cageComplete[ci];
      td.classList.toggle('cage-complete',done);
    });
  }
}

/**
 * renderCagesKiller(cages)
 * Places small sum labels in the top-left corner of each cage’s first cell
 * and clears any previous labels.
 * @param {{sum:number,cells:number[]}[]} cages List of cages for current puzzle
 */
function renderCagesKiller(cages){
  document.querySelectorAll('.sum-label').forEach(el=>el.remove());
  document.querySelectorAll('.cage-border').forEach(el=>el.remove());
  const tbl=document.getElementById('grid');
  cages.forEach(cg=>{
    const first=cg.cells[0];
    const r=Math.floor(first/9),c=first%9;
    const td=tbl.rows[r].cells[c];
    td.style.position='relative';
    const sp=document.createElement('span');
    sp.textContent=cg.sum;
    sp.className='sum-label';
    Object.assign(sp.style,{position:'absolute',top:'2px',left:'4px',fontSize:'12px',color:'#004c99',fontWeight:'bold',zIndex:6,
      pointerEvents:'none'});
    td.appendChild(sp);
  });
}

/**
 * drawCageBorders(cages)
 * Draws dashed borders around each cage by overlaying absolutely-positioned
 * divs inside every cell. Only the outer edges are rendered so neighboring
 * cells within the same cage share borders.
 * @param {{cells:number[]}[]} cages
 */
function drawCageBorders(cages){
  const tbl=document.getElementById('grid');
  // Map each cell to its cage index
  const cellToCage=Array(81).fill(-1);
  cages.forEach((cg,ci)=>cg.cells.forEach(idx=>{cellToCage[idx]=ci;}));

  // helper to know neighbor same cage
  const same=(idx,neighborIdx)=>neighborIdx>=0&&neighborIdx<81&&cellToCage[idx]===cellToCage[neighborIdx];

  cages.forEach(()=>{}); // placeholder to satisfy linter

  for(let idx=0;idx<81;idx++){
    const cageIdx=cellToCage[idx];
    if(cageIdx<0) continue;
    const r=Math.floor(idx/9),c=idx%9;
    const td=tbl.rows[r].cells[c];
    td.style.position='relative';
    const overlay=document.createElement('div');
    overlay.className='cage-border';
    // Inset dashed rectangle 3 px inside cell so neighbouring cages remain distinct.
    const inset=2; // closer to grid for visual alignment
    Object.assign(overlay.style,{
      position:'absolute',
      top:`${inset}px`,
      left:`${inset}px`,
      width:`calc(100% - ${inset*2}px)`,
      height:`calc(100% - ${inset*2}px)`,
      boxSizing:'border-box',
      pointerEvents:'none',
      zIndex:10 // ensure above grid lines
    });

    const borders={top:!same(idx,idx-9),right:!same(idx,idx+1),bottom:!same(idx,idx+9),left:!same(idx,idx-1)};
    const style='2px dashed #444'; // darker dashed line per new spec
    overlay.style.borderTop   = borders.top   ? style : 'none';
    overlay.style.borderRight = borders.right ? style : 'none';
    overlay.style.borderBottom= borders.bottom? style : 'none';
    overlay.style.borderLeft  = borders.left  ? style : 'none';

    td.appendChild(overlay);
  }
}

// --- Killer-specific solve helpers ---------------------------------------
/**
 * solveRowKiller(idx)
 * Fills the entire row of the selected cell with solution digits while
 * clearing any duplicates that would otherwise violate column, block or cage
 * constraints.
 * @param {number} idx 0-80 linear cell index
 */
function solveRowKiller(idx){
  const row=Math.floor(idx/9);
  const sol=PUZZLES[window.currentPuzzleKiller]._cachedSolutionArr;
  const inputs=[...document.querySelectorAll('#grid input')];
  for(let c=0;c<9;c++){
    const i=row*9+c;
    const v=sol[i];
    inputs[i].value=v;

    // clear same value in other rows of this column
    for(let r=0;r<9;r++){
      if(r===row)continue;
      const j=r*9+c;
      if(!inputs[j].disabled && inputs[j].value==v) inputs[j].value='';
    }

    // clear duplicates in same 3×3 block
    const rBase=Math.floor(row/3)*3;
    const cBase=Math.floor(c/3)*3;
    for(let rr=rBase;rr<rBase+3;rr++){
      for(let cc=cBase;cc<cBase+3;cc++){
        const k=rr*9+cc;
        if(k===i)continue;
        if(!inputs[k].disabled && inputs[k].value==v) inputs[k].value='';
      }
    }

    // clear duplicates in same cage
    if(currentCageMap){
      const ci=currentCageMap[i];
      if(ci>-1){
        currentCageMap.forEach((cageIdx,cellIdx)=>{
          if(cageIdx===ci && cellIdx!==i){
            if(!inputs[cellIdx].disabled && inputs[cellIdx].value==v) inputs[cellIdx].value='';
          }
        });
      }
    }
  }
  refreshConflictsKiller();
}

/**
 * solveColKiller(idx) – analogous to solveRowKiller but for columns.
 */
function solveColKiller(idx){
  const col=idx%9;
  const sol=PUZZLES[window.currentPuzzleKiller]._cachedSolutionArr;
  const inputs=[...document.querySelectorAll('#grid input')];
  for(let r=0;r<9;r++){
    const i=r*9+col;
    const v=sol[i];
    inputs[i].value=v;

    // clear duplicates in same row
    for(let c=0;c<9;c++){
      if(c===col)continue;
      const j=r*9+c;
      if(!inputs[j].disabled && inputs[j].value==v) inputs[j].value='';
    }

    // clear duplicates in same block
    const rBase=Math.floor(r/3)*3;
    const cBase=Math.floor(col/3)*3;
    for(let rr=rBase;rr<rBase+3;rr++){
      for(let cc=cBase;cc<cBase+3;cc++){
        const k=rr*9+cc;
        if(k===i)continue;
        if(!inputs[k].disabled && inputs[k].value==v) inputs[k].value='';
      }
    }

    // clear duplicates in same cage
    if(currentCageMap){
      const ci=currentCageMap[i];
      if(ci>-1){
        currentCageMap.forEach((cageIdx,cellIdx)=>{
          if(cageIdx===ci && cellIdx!==i){
            if(!inputs[cellIdx].disabled && inputs[cellIdx].value==v) inputs[cellIdx].value='';
          }
        });
      }
    }
  }
  refreshConflictsKiller();
}

/**
 * solveBlockKiller(idx)
 * Fills the 3×3 block containing the selected cell.
 */
function solveBlockKiller(idx){
  const rBase=Math.floor(Math.floor(idx/9)/3)*3;
  const cBase=Math.floor((idx%9)/3)*3;
  const sol=PUZZLES[window.currentPuzzleKiller]._cachedSolutionArr;
  document.querySelectorAll('#grid input').forEach((inp,i)=>{
    const r=Math.floor(i/9),c=i%9;
    if(r>=rBase && r<rBase+3 && c>=cBase && c<cBase+3){
      inp.value=sol[i];
    }
  });
  refreshConflictsKiller();
}

// --- UI wiring -----------------------------------------------------------
/**
 * initKiller()
 * Entry point for Killer mode. Rebuilds the grid, wires up UI buttons, loads
 * the sample Killer puzzle and overrides `window.refreshConflicts` so classic
 * input listeners invoke the cage-aware validation instead.
 */
function initKiller(){
  // Ensure buildGrid's input listeners call the Killer version
  window.refreshConflicts = refreshConflictsKiller;

  // reset grid and rebuild
  const grid=document.getElementById('grid');
  grid.innerHTML='';
  buildGrid();
  const levelSel=document.getElementById('level');
  const idx=randomIndexForLevel(levelSel.value); // random classic puzzle reused for killer
  loadPuzzleKiller(idx);
  document.getElementById('new').onclick=()=>loadPuzzleKiller(idx);
  document.getElementById('check').onclick=()=>alert('Check not implemented yet');
  const bind=(id,fn)=>document.getElementById(id).onclick=()=>{
    if(selectedIdx===null){alert('Select a cell first');return;}
    fn(selectedIdx);
  };
  bind('solve-row',solveRowKiller);
  bind('solve-col',solveColKiller);
  bind('solve-block',solveBlockKiller);
}

window.initKiller=initKiller;
