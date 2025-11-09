import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonFooter,
  IonButton,
  IonIcon,
  IonText,
  useIonToast,
} from "@ionic/react";
import { refresh, swapHorizontal, home } from "ionicons/icons";
import { useLocation, useHistory } from "react-router-dom";
import { generatePuzzle } from "../utils/generatePuzzle"; 
import "./crossword.css";

type Cell = {
  r: number;
  c: number;
  isBlock: boolean;
  solution?: string;
  value?: string;
  correct?: boolean;
};

type Direction = "across" | "down";

type Coor = { r: number; c: number };

function inBounds(p: any, r: number, c: number) {
  return r >= 0 && r < p.rows && c >= 0 && c < p.cols;
}

function isBlock(p: any, r: number, c: number) {
  return p.grid[r][c] === ".";
}

function buildCells(p: any): Cell[][] {
  const cells: Cell[][] = [];
  for (let r = 0; r < p.rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < p.cols; c++) {
      const ch = p.grid[r][c];
      row.push({ r, c, isBlock: ch === ".", solution: ch === "." ? undefined : ch });
    }
    cells.push(row);
  }
  return cells;
}

export default function CrosswordPage() {
  const location = useLocation();
  const history = useHistory();
  const query = new URLSearchParams(location.search);
  const mode = (query.get("mode") as "normal" | "hard") || "normal";

  const [puzzle, setPuzzle] = useState(() => generatePuzzle(mode));
  const [cells, setCells] = useState<Cell[][]>(() => buildCells(puzzle));
  const [active, setActive] = useState<Coor>({ r: 0, c: 0 });
  const [dir, setDir] = useState<Direction>("across");
  const [present] = useIonToast();
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: puzzle.rows }, () => Array(puzzle.cols).fill(null))
  );

  // 🔦 Dark mode automático
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    document.body.classList.toggle("dark", prefersDark.matches);
    prefersDark.addEventListener("change", (e) =>
      document.body.classList.toggle("dark", e.matches)
    );
  }, []);

  // Regera puzzle
  const handleRestart = () => {
    const newPuzzle = generatePuzzle(mode);
    setPuzzle(newPuzzle);
    setCells(buildCells(newPuzzle));
  };

  function handleInput(r: number, c: number, e: CustomEvent) {
    const target = e.target as HTMLInputElement;
    const raw = (target?.value || "").toString();
    const ch = raw.slice(-1).toUpperCase().replace(/[^A-Z]/, "");

    if (!ch) return;

    setCells((prev) => {
      const next = prev.map((row) => row.slice());
      const cell = next[r][c];
      if (cell.isBlock) return next;

      const correct = cell.solution?.toUpperCase() === ch;
      cell.value = ch;

      const input = inputRefs.current[r][c];
      if (correct) {
  cell.correct = true;
  input!.value = ch; // garante que a letra apareça no input
  input!.style.backgroundColor = "lightgreen";
  input!.style.color = "black"; // garante visibilidade do texto
  input!.readOnly = true;
  present({ message: "✅ Correto!", duration: 800, position: "top" });
} else {
        input!.style.backgroundColor = "lightcoral";
        present({ message: "❌ Errado!", duration: 600, position: "top" });
        setTimeout(() => {
          input!.style.backgroundColor = "";
          input!.value = "";
          cell.value = "";
        }, 800);
      }

      return next;
    });
  }

  function handleKeyDown(r: number, c: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      setCells((prev) => {
        const next = prev.map((row) => row.slice());
        if (!next[r][c].correct) next[r][c].value = "";
        return next;
      });
    }
  }

  // 🔁 Alterna direção
  function toggleDir() {
    setDir((d) => (d === "across" ? "down" : "across"));
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{puzzle.title}</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent className="ion-padding">
        <IonText color="medium">
          <h2 style={{ textAlign: "center" }}>Modo: {mode === "hard" ? "Difícil" : "Normal"}</h2>
        </IonText>

        <div className="crossword-container">
          <div
  className="crossword-grid"
  style={{ gridTemplateColumns: `repeat(${puzzle.cols}, 40px)` } as React.CSSProperties}
>
            {cells.map((row, r) =>
              row.map((cell, c) => (
                <div
                  key={`${r}-${c}`}
                  className={`cell ${cell.isBlock ? "block" : ""}`}
                  onClick={() => !cell.isBlock && setActive({ r, c })}
                >
                  {!cell.isBlock && (
                    <input
                      ref={(el) => {
                        if (!inputRefs.current[r]) inputRefs.current[r] = [];
                        inputRefs.current[r][c] = el;
                      }}
                      value={cell.value || ""}
                      onInput={(e) => handleInput(r, c, e as unknown as CustomEvent)}
                      onKeyDown={(e) => handleKeyDown(r, c, e)}
                      readOnly={cell.correct}
                      className={cell.correct ? "correct" : ""}
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
            <IonText color="dark">
            <h3>Dicas:</h3>
            <ul>
              {Object.entries(puzzle.clues.across).map(([num, clue]) => (
                <li key={num}>
                  <strong>{num}.</strong> {clue}
                </li>
              ))}
            </ul>
          </IonText>

      </IonContent>

      <IonFooter>
        <IonToolbar>
          <IonButton onClick={toggleDir}>
            <IonIcon icon={swapHorizontal} slot="start" />
            {dir === "across" ? "Horizontal" : "Vertical"}
          </IonButton>

          <IonButton color="success" onClick={handleRestart}>
            <IonIcon icon={refresh} slot="start" />
            Jogar novamente
          </IonButton>

          <IonButton color="medium" onClick={() => history.push("/")}>
            <IonIcon icon={home} slot="start" />
            Menu
          </IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  );
}
