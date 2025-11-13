import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
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

function buildCells(p: any): Cell[][] {
  return Array.from({ length: p.rows }, (_, r) =>
    Array.from({ length: p.cols }, (_, c) => {
      const ch = p.grid[r][c];
      return { r, c, isBlock: ch === ".", solution: ch === "." ? undefined : ch };
    })
  );
}

export default function CrosswordPage() {
  const location = useLocation();
  const history = useHistory();
  const query = new URLSearchParams(location.search);
  const mode = (query.get("mode") as "normal" | "hard") || "normal";

  const [puzzle, setPuzzle] = useState(() => generatePuzzle(mode));
  const [cells, setCells] = useState<Cell[][]>(() => buildCells(puzzle));
  const [dir, setDir] = useState<Direction>("across");
  const [present] = useIonToast();
  const inputRefs = useRef<(HTMLInputElement | null)[][]>(
    Array.from({ length: puzzle.rows }, () => Array(puzzle.cols).fill(null))
  );
  const [cellSize, setCellSize] = useState<number>(40);

  // Ajusta modo escuro
  useEffect(() => {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)");
    const applyDark = () => document.body.classList.toggle("dark", prefersDark.matches);
    applyDark();
    prefersDark.addEventListener("change", applyDark);
    return () => prefersDark.removeEventListener("change", applyDark);
  }, []);

  // Recalcula tamanho da célula para caber na tela
  useEffect(() => {
    function recalc() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const reserved = 200; // espaço para header + botões + margens
      const availableW = vw - 32;
      const availableH = vh - reserved;

      const sizeW = Math.floor(availableW / puzzle.cols);
      const sizeH = Math.floor(availableH / puzzle.rows);
      const size = Math.max(20, Math.min(48, Math.min(sizeW, sizeH)));
      setCellSize(size);
    }

    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [puzzle]);

  // Regera puzzle
  const handleRestart = () => {
    const newPuzzle = generatePuzzle(mode);
    setPuzzle(newPuzzle);
    setCells(buildCells(newPuzzle));
  };

  // Alternar direção
  const toggleDir = () => setDir((d) => (d === "across" ? "down" : "across"));

  // Entrada do usuário
  const handleInput = (r: number, c: number, e: any) => {
    const ch = e.target.value.toUpperCase().replace(/[^A-ZÀ-Ý]/, "");
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
        if (input) {
          input.style.backgroundColor = "lightgreen";
          input.readOnly = true;
        }
        present({ message: "✅ Correto!", duration: 800, position: "top" });
      } else {
        if (input) input.style.backgroundColor = "lightcoral";
        present({ message: "❌ Errado!", duration: 600, position: "top" });
        setTimeout(() => {
          if (input) {
            input.style.backgroundColor = "";
            input.value = "";
          }
          cell.value = "";
        }, 800);
      }

      return next;
    });
  };

  // Backspace
  const handleKeyDown = (r: number, c: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      setCells((prev) => {
        const next = prev.map((row) => row.slice());
        if (!next[r][c].correct) next[r][c].value = "";
        return next;
      });
    }
  };

  // Estilo dinâmico da grade
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: `repeat(${puzzle.cols}, ${cellSize}px)`,
    gridAutoRows: `${cellSize}px`,
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{puzzle.title}</IonTitle>
        </IonToolbar>
      </IonHeader>

      {/* Controles fixos */}
      <div className="fixed-buttons">
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
      </div>

      <IonContent fullscreen>
        <div className="scroll-area">
          <IonText color="medium">
            <h2 style={{ textAlign: "center", marginTop: "0.5rem" }}>
              Modo: {mode === "hard" ? "Difícil" : "Normal"}
            </h2>
          </IonText>

          {/* Tabuleiro */}
          <div className="crossword-scroll">
            <div className="crossword-grid" style={gridStyle}>
              {cells.map((row, r) =>
                row.map((cell, c) => (
                  <div
                    key={`${r}-${c}`}
                    className={`cell ${cell.isBlock ? "block" : ""}`}
                    style={{
                      width: `${cellSize}px`,
                      height: `${cellSize}px`,
                    }}
                  >
                    {!cell.isBlock && (
                      <input
                        ref={(el) => {
                          if (!inputRefs.current[r]) inputRefs.current[r] = [];
                          inputRefs.current[r][c] = el;
                        }}
                        value={cell.value || ""}
                        onInput={(e) => handleInput(r, c, e)}
                        onKeyDown={(e) => handleKeyDown(r, c, e)}
                        readOnly={cell.correct}
                        className={cell.correct ? "correct" : ""}
                        inputMode="text"
                        autoComplete="off"
                      />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Dicas */}
          <div className="hints-container">
            <IonText color="dark">
              <h3>Dicas:</h3>
              <ul>
                {Object.entries(puzzle.clues.across || {}).map(([num, clue]) => (
                  <li key={num}>
                    <strong>{num}.</strong> {clue}
                  </li>
                ))}
              </ul>
            </IonText>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
}
