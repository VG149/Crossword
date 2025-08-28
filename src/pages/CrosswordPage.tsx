import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonGrid,
  IonRow,
  IonCol,
  IonButton,
  IonButtons,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonToggle,
  IonFooter,
  IonText,
  useIonViewWillEnter,
  useIonToast,
} from "@ionic/react";
import { refresh, eye, checkmarkCircle, closeCircle, swapHorizontal } from "ionicons/icons";
import "./crossword.css";

/**
 * Minimal crossword engine + Ionic UI in a single file.
 *
 * How to use:
 * - Drop this file into src/pages/CrosswordPage.tsx
 * - Add a route in App.tsx: <Route exact path="/crossword" component={CrosswordPage} />
 * - Run: ionic serve
 *
 * Notes:
 * - Works with touch and hardware keyboard.
 * - Uses IonInput's `onIonInput` to capture letters and auto-advance.
 * - Persists progress to localStorage.
 */

type Cell = {
  r: number;
  c: number;
  isBlock: boolean; // black cell
  solution?: string; // uppercase letter A-Z
  value?: string; // user's current letter
  number?: number; // clue number if starts a word
};

export type Puzzle = {
  id: string; // used for storage key
  title: string;
  rows: number;
  cols: number;
  blocks: string[]; // list of coordinates like "r,c" that are blocks
  grid: string[]; // rows*cols string of letters (use "." for blocks)
  clues: {
    across: Record<number, string>;
    down: Record<number, string>;
  };
};

// --- Sample 7x7 puzzle (Portuguese) --- //
const SAMPLE: Puzzle = {
  id: "pt-hello-7x7",
  title: "Mini Palavras Cruzadas",
  rows: 7,
  cols: 7,
  // Grid uses "." for blocks; letters are A-Z; fill row by row
  grid: [
    "C A S A . S O M",
    "A M O R . O V O",
    "S O L . L U A .",
    "A R . M A P A",
    ". . C O D E . .",
    "T E C L A . N O",
    "A R T E . D A D O",
  ].map((row) => row.replace(/\s+/g, "")),
  blocks: [], // derived from grid (we compute below)
  clues: {
    across: {
      1: "Lar, moradia.",
      5: "Ruído agradável ou não.",
      7: "Sentimento afetivo.",
      9: "Vem da galinha.",
      10: "Astro do dia.",
      11: "Satélite natural da Terra.",
      13: "Representação geográfica.",
      16: "Escrever programas.",
      18: "Botão com letras.",
      20: "Partícula de negação.",
      21: "Manifestação criativa.",
      22: "Cubo de jogar.",
    },
    down: {
      1: "Casa em inglês (house)? (var.: CASA)",
      2: "Peça de teclado.",
      3: "Contrário de sim.",
      4: "Astro da noite.",
      6: "Mapa em inglês (map).",
      8: "Som forte.",
      12: "O que o programador faz.",
      14: "Artefato para escrever no computador.",
      15: "Astro que ilumina.",
      17: "Objeto com seis faces numeradas.",
      19: "Afeto intenso.",
    },
  },
};

// Derive blocks from grid
SAMPLE.blocks = (() => {
  const blocks: string[] = [];
  for (let r = 0; r < SAMPLE.rows; r++) {
    for (let c = 0; c < SAMPLE.cols; c++) {
      if (SAMPLE.grid[r][c] === ".") blocks.push(`${r},${c}`);
    }
  }
  return blocks;
})();

// Utilities
const keyFor = (p: Puzzle) => `crossword:${p.id}:state:v1`;

type Direction = "across" | "down";

type Coor = { r: number; c: number };

function inBounds(p: Puzzle, r: number, c: number) {
  return r >= 0 && r < p.rows && c >= 0 && c < p.cols;
}

function isBlock(p: Puzzle, r: number, c: number) {
  return p.grid[r][c] === ".";
}

function buildCells(p: Puzzle): Cell[][] {
  const cells: Cell[][] = [];
  for (let r = 0; r < p.rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < p.cols; c++) {
      const ch = p.grid[r][c];
      row.push({ r, c, isBlock: ch === ".", solution: ch === "." ? undefined : ch });
    }
    cells.push(row);
  }

  // Numbering
  let num = 1;
  for (let r = 0; r < p.rows; r++) {
    for (let c = 0; c < p.cols; c++) {
      if (isBlock(p, r, c)) continue;
      const startsAcross = (c === 0 || isBlock(p, r, c - 1)) && c + 1 < p.cols && !isBlock(p, r, c + 1);
      const startsDown = (r === 0 || isBlock(p, r - 1, c)) && r + 1 < p.rows && !isBlock(p, r + 1, c);
      if (startsAcross || startsDown) {
        cells[r][c].number = num++;
      }
    }
  }
  return cells;
}

function contiguousCells(p: Puzzle, from: Coor, dir: Direction): Coor[] {
  if (isBlock(p, from.r, from.c)) return [];
  // Back to start
  let r = from.r;
  let c = from.c;
  while (true) {
    const nr = dir === "across" ? r : r - 1;
    const nc = dir === "across" ? c - 1 : c;
    if (!inBounds(p, nr, nc) || isBlock(p, nr, nc)) break;
    r = nr; c = nc;
  }
  // Walk forward
  const out: Coor[] = [];
  while (inBounds(p, r, c) && !isBlock(p, r, c)) {
    out.push({ r, c });
    if (dir === "across") c++; else r++;
  }
  return out;
}

export default function CrosswordPage() {
  const puzzle = useMemo(() => SAMPLE, []);
  const [cells, setCells] = useState<Cell[][]>(() => buildCells(puzzle));
  const [active, setActive] = useState<Coor>({ r: 0, c: 0 });
  const [dir, setDir] = useState<Direction>("across");
  const [autoCheck, setAutoCheck] = useState(true);
  const [present] = useIonToast();

  // Refs for inputs to manage focus
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: puzzle.rows }, () => Array(puzzle.cols).fill(null))
  );

  // Load state
  useIonViewWillEnter(() => {
    const raw = localStorage.getItem(keyFor(puzzle));
    if (!raw) return;
    try {
      const parsed: { values: (string | undefined)[][] } = JSON.parse(raw);
      setCells((prev) => prev.map((row, r) => row.map((cell, c) => ({
        ...cell,
        value: parsed.values?.[r]?.[c],
      }))));
    } catch {}
  });

  // Persist when values change
  useEffect(() => {
    const values = cells.map((row) => row.map((cell) => cell.value));
    localStorage.setItem(keyFor(puzzle), JSON.stringify({ values }));
  }, [cells, puzzle]);

  // Active word
  const wordCells = useMemo(() => contiguousCells(puzzle, active, dir), [puzzle, active, dir]);

  function focusCell(coor: Coor) {
    const el = inputRefs.current[coor.r]?.[coor.c];
    el?.focus();
    setActive(coor);
  }

  function move(coor: Coor, delta: { dr: number; dc: number }) {
    let r = coor.r + delta.dr;
    let c = coor.c + delta.dc;
    while (inBounds(puzzle, r, c) && isBlock(puzzle, r, c)) {
      r += delta.dr; c += delta.dc;
    }
    if (inBounds(puzzle, r, c)) focusCell({ r, c });
  }

  function toggleDir() {
    setDir((d) => (d === "across" ? "down" : "across"));
  }

  function handleInput(r: number, c: number, e: CustomEvent) {
    const target = e.target as HTMLInputElement;
    const raw = (target?.value || "").toString();
    const ch = raw.slice(-1).toUpperCase().replace(/[^A-ZÁÂÃÀÉÊÍÓÔÕÚÇ]/, "");

    setCells((prev) => {
      const next = prev.map((row) => row.slice());
      next[r][c] = { ...next[r][c], value: ch || undefined };
      return next;
    });

    // Auto-advance
    if (ch) {
      const delta = dir === "across" ? { dr: 0, dc: 1 } : { dr: 1, dc: 0 };
      move({ r, c }, delta);
    }
  }

  function handleKeyDown(r: number, c: number, e: React.KeyboardEvent<HTMLInputElement>) {
    const key = e.key;
    if (key === "Backspace") {
      if (!cells[r][c].value) {
        const delta = dir === "across" ? { dr: 0, dc: -1 } : { dr: -1, dc: 0 };
        move({ r, c }, delta);
      }
      setCells((prev) => {
        const next = prev.map((row) => row.slice());
        next[r][c] = { ...next[r][c], value: undefined };
        return next;
      });
    } else if (key === "ArrowLeft") move({ r, c }, { dr: 0, dc: -1 });
    else if (key === "ArrowRight") move({ r, c }, { dr: 0, dc: 1 });
    else if (key === "ArrowUp") move({ r, c }, { dr: -1, dc: 0 });
    else if (key === "ArrowDown") move({ r, c }, { dr: 1, dc: 0 });
    else if (key === "Tab") {
      e.preventDefault();
      toggleDir();
    }
  }

  // Checking utilities
  function isCorrect(coor: Coor) {
    const cell = cells[coor.r][coor.c];
    return cell.solution?.toUpperCase() === (cell.value || "").toUpperCase();
  }

  function checkWord() {
    const allCorrect = wordCells.every((coor) => isCorrect(coor));
    present({ message: allCorrect ? "✔️ Palavra correta!" : "❌ Ainda há erros.", duration: 1200 });
  }

  function reveal(coors: Coor[]) {
    setCells((prev) => {
      const next = prev.map((row) => row.slice());
      coors.forEach(({ r, c }) => {
        const sol = next[r][c].solution;
        if (sol) next[r][c] = { ...next[r][c], value: sol };
      });
      return next;
    });
  }

  function clearAll() {
    setCells((prev) => prev.map((row) => row.map((cell) => ({ ...cell, value: undefined }))));
    localStorage.removeItem(keyFor(puzzle));
  }

  useEffect(() => {
    if (!autoCheck) return;
    // Auto check active word; if all match, show subtle toast
    const allCorrect = wordCells.length > 0 && wordCells.every((coor) => isCorrect(coor));
    if (allCorrect) {
      present({ message: "✨ Palavra concluída!", duration: 900, position: "top" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cells, active, dir, autoCheck]);

  // Render helpers
  function cellBg(r: number, c: number) {
    const isActive = wordCells.some((w) => w.r === r && w.c === c);
    const here = active.r === r && active.c === c;
    if (isBlock(puzzle, r, c)) return "bg-neutral-300 dark:bg-neutral-700";
    if (here) return "bg-amber-200";
    if (isActive) return "bg-amber-100";
    return "bg-white";
  }

  // Layout
  return (
     <IonPage>
      <IonHeader>
        <IonToolbar><IonTitle>{puzzle.title}</IonTitle></IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {/* Botões de controle removidos para foco no visual */}
        <div className="crossword-container">
          <div className="crossword-grid">
            {cells.map((row, r) => row.map((cell, c) => (
              <div
                key={`${r}-${c}`}
                className={`cell ${cell.isBlock ? "block" : ""}`}
                onClick={() => cell.isBlock || setActive({ r, c })}
              >
                {!cell.isBlock && cell.number && (
                  <div className="number">{cell.number}</div>
                )}
                {!cell.isBlock && (
                  <input
                    ref={(el) => { inputRefs.current[r][c] = el }}
                    value={cell.value || ""}
                    onInput={(e) => handleInput(r, c, e as unknown as CustomEvent)}
                    onKeyDown={(e) => handleKeyDown(r, c, e)}
                    onFocus={() => setActive({ r, c })}
                  />
                )}
              </div>
            )))}
          </div>
        </div>
        {/* Pista  */}
        <div style={{ marginTop: '1rem' }}>
          <IonText><h2>Horizontais</h2></IonText>
          <IonList inset>
            {Object.entries(puzzle.clues.across).map(([num, text]) => (
              <IonItem key={num} button onClick={() => {/* lógica de foco */}}>
                <IonLabel><IonText color="medium">{num}</IonText> — {text}</IonLabel>
              </IonItem>
            ))}
          </IonList>
          <IonText><h2>Verticais</h2></IonText>
          <IonList inset>
            {Object.entries(puzzle.clues.down).map(([num, text]) => (
              <IonItem key={num} button onClick={() => {/* foco */}}>
                <IonLabel><IonText color="medium">{num}</IonText> — {text}</IonLabel>
              </IonItem>
            ))}
          </IonList>
        </div>
      </IonContent>
      <IonFooter>
        <IonToolbar>
          {/* Botões de ação */}
          <IonButton onClick={() => toggleDir()}>
            <IonIcon icon={swapHorizontal} /> {dir === "across" ? "Horizontal" : "Vertical"}
          </IonButton>
          {/* Outros botões como conferir, revelar, limpar */}
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
}
