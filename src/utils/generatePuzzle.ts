// src/utils/generatePuzzle.ts
type WordItem = { word: string; clue: string };
type PlacedWord = {
  word: string;
  clue: string;
  r: number;
  c: number;
  dir: "across" | "down";
};

function stripAccents(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacríticos
    .replace(/[^A-Z]/gi, "") // remove não letras
    .toUpperCase();
}

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generatePuzzle(mode: "normal" | "hard") {
  const easyList: WordItem[] = [
    { word: "CASA", clue: "Lugar onde moramos" },
    { word: "SOL", clue: "Estrela que ilumina a Terra" },
    { word: "LUA", clue: "Satélite natural da Terra" },
    { word: "AMOR", clue: "Sentimento de afeto" },
    { word: "MAPA", clue: "Representação geográfica" },
    { word: "FLOR", clue: "Parte colorida de uma planta" },
    { word: "MAR", clue: "Grande massa de água salgada" },
    { word: "CEU", clue: "Onde ficam as nuvens" },
    { word: "GATO", clue: "Animal felino doméstico" },
    { word: "CAO", clue: "Animal canino doméstico" },
    { word: "BOLA", clue: "Objeto esférico usado para jogar" },
    { word: "PAO", clue: "Alimento feito com farinha" },
    { word: "ARVORE", clue: "Planta alta com tronco" },
    { word: "RIO", clue: "Curso de água doce que corre" },
    { word: "FRIO", clue: "Quando a temperatura está baixa" },
    { word: "QUENTE", clue: "Quando a temperatura está alta" },
    { word: "FELIZ", clue: "Sentimento de alegria" },
    { word: "TRISTE", clue: "Sentimento de tristeza" },
    { word: "AMIGO", clue: "Pessoa com quem temos amizade" },
    { word: "FAMILIA", clue: "Grupo de pessoas unidas por laços" },
    { word: "ESC URO".replace(" ", "") , clue: "Quando falta luz" }, // small fix if needed
    { word: "BRILHO", clue: "Reflexo ou luz forte" },
    { word: "DIA", clue: "Período de 24 horas ou parte clara" },
    { word: "NOITE", clue: "Período de escuridão" },
    { word: "LIVRO", clue: "Conjunto de páginas escritas e encadernadas" },
    { word: "MUSICA", clue: "Arte de combinar sons" },
    { word: "DANCA", clue: "Movimento ritmado do corpo" },
    { word: "JOGO", clue: "Atividade de diversão ou competição" },
    { word: "SONHO", clue: "Atividade mental durante o sono" },
    { word: "RUA", clue: "Via pública" },
  ].map((w) => ({ word: stripAccents(w.word), clue: w.clue }));

  const hardList: WordItem[] = [
    { word: "PROGRAMAR", clue: "Criar instruções para o computador" },
    { word: "DESAFIO", clue: "Algo difícil de superar" },
    { word: "TECNOLOGIA", clue: "Ciência aplicada ao desenvolvimento de soluções" },
    { word: "CRUZADAS", clue: "Nome do jogo de palavras" },
    { word: "ALGORITMO", clue: "Sequência de passos lógicos" },
    { word: "LINGUAGEM", clue: "Ferramenta usada para escrever código" },
    { word: "COMPILADOR", clue: "Traduz código fonte em executável" },
    { word: "VARIAVEL", clue: "Elemento que armazena um valor" },
    { word: "INTEGRACAO", clue: "Ato de unir partes num todo" },
    { word: "SISTEMA", clue: "Conjunto organizado de elementos" },
    { word: "FUNCIONAL", clue: "Relativo à função ou funcionamento" },
    { word: "ORGANIZACAO", clue: "Estrutura de pessoas ou coisas" },
    { word: "AUTOMACAO", clue: "Uso de máquinas para realizar tarefas" },
    { word: "ANALITICO", clue: "Relativo à análise detalhada" },
    { word: "DESENVOLVER", clue: "Criar ou ampliar algo" },
    { word: "ESTRUTURA", clue: "Forma de organização de algo" },
    { word: "INFRAESTRUTURA", clue: "Base para algo funcionar" },
    { word: "IMPLEMENTAR", clue: "Colocar em prática um plano ou sistema" },
    { word: "RESULTADO", clue: "Consequência ou efeito de algo" },
    { word: "PARTICIPAR", clue: "Tomar parte de algo" },
    { word: "OTIMIZACAO", clue: "Tornar algo o melhor possível" },
    { word: "PERFORMANCE", clue: "Desempenho ou rendimento de algo" },
    { word: "VALIDACAO", clue: "Ato de confirmar ou verificar algo" },
    { word: "CONFIGURACAO", clue: "Disposição ou ajuste de componentes" },
    { word: "AUTENTICACAO", clue: "Verificar identidade" },
    { word: "CRITERIO", clue: "Padrão para avaliação" },
    { word: "INTERFACE", clue: "Ponto de contato entre sistemas" },
    { word: "ESTATISTICA", clue: "Ramo que analisa dados" },
    { word: "ALGORITMICO", clue: "Relativo a algoritmos" },
  ].map((w) => ({ word: stripAccents(w.word), clue: w.clue }));

  const list = mode === "hard" ? hardList : easyList;
  // define tamanho. maior para hard
  const size = mode === "hard" ? 15 : 13;

  // grid inicial
  const grid: string[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ".")
  );

  const placed: PlacedWord[] = [];

  function canPlaceAt(word: string, r: number, c: number, dir: "across" | "down") {
    if (dir === "across") {
      if (c < 0 || c + word.length > size || r < 0 || r >= size) return false;
      for (let i = 0; i < word.length; i++) {
        const rr = r;
        const cc = c + i;
        const ch = grid[rr][cc];
        if (ch !== "." && ch !== word[i]) return false;
        // opcional: evitar tocar letras adjacentes (vertical) que não sejam interseções
        // checar célula acima e abaixo se existe letra e não coincide em interseção
        if (rr - 1 >= 0) {
          const above = grid[rr - 1][cc];
          if (above !== "." && above !== word[i]) {
            // se acima tem letra e não é uma cruz válida (permitimos cruza apenas quando equal)
            // mas aqui não sabemos se é interseção válida — simplificamos e permitimos
          }
        }
      }
      return true;
    } else {
      // down
      if (r < 0 || r + word.length > size || c < 0 || c >= size) return false;
      for (let i = 0; i < word.length; i++) {
        const rr = r + i;
        const cc = c;
        const ch = grid[rr][cc];
        if (ch !== "." && ch !== word[i]) return false;
      }
      return true;
    }
  }

  function placeWord(word: string, clue: string, r: number, c: number, dir: "across" | "down") {
    if (dir === "across") {
      for (let i = 0; i < word.length; i++) grid[r][c + i] = word[i];
    } else {
      for (let i = 0; i < word.length; i++) grid[r + i][c] = word[i];
    }
    placed.push({ word, clue, r, c, dir });
  }

  // tentativa de colocar palavras com interseções preferenciais
  const words = shuffle(list.slice()); // randomiza ordem de tentativa

  for (const item of words) {
    const word = stripAccents(item.word);
    if (word.length > size) continue; // pula palavras maiores que grid

    let placedThis = false;

    // 1) Tentar encontrar intersecção com palavras já colocadas
    for (const existing of placed) {
      if (placedThis) break;
      for (let i = 0; i < existing.word.length; i++) {
        for (let j = 0; j < word.length; j++) {
          if (existing.word[i] !== word[j]) continue;

          // se existing está across -> tentar colocar 'word' vertical cruzando neste ponto
          if (existing.dir === "across") {
            const r = existing.r - j;
            const c = existing.c + i;
            if (canPlaceAt(word, r, c, "down")) {
              placeWord(word, item.clue, r, c, "down");
              placedThis = true;
              break;
            }
          } else {
            // existing down -> tentar colocar 'word' across
            const r = existing.r + i;
            const c = existing.c - j;
            if (canPlaceAt(word, r, c, "across")) {
              placeWord(word, item.clue, r, c, "across");
              placedThis = true;
              break;
            }
          }
        }
        if (placedThis) break;
      }
    }

    // 2) Se não colocou por interseção, tentar posicoes aleatorias
    if (!placedThis) {
      const attempts = 200;
      for (let t = 0; t < attempts; t++) {
        const dir: "across" | "down" = Math.random() < 0.5 ? "across" : "down";
        let r = 0;
        let c = 0;
        if (dir === "across") {
          r = Math.floor(Math.random() * size);
          c = Math.floor(Math.random() * (size - word.length + 1));
        } else {
          r = Math.floor(Math.random() * (size - word.length + 1));
          c = Math.floor(Math.random() * size);
        }
        if (canPlaceAt(word, r, c, dir)) {
          placeWord(word, item.clue, r, c, dir);
          placedThis = true;
          break;
        }
      }
    }
    // se não conseguiu placeThis ficará false: palavra pulada
  }

  // Agora geramos as dicas numeradas (across e down)
  const cluesAcross: Record<number, string> = {};
  const cluesDown: Record<number, string> = {};
  const numberGrid: (number | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  );
  let nextNumber = 1;

  function extractAcross(r: number, c: number) {
    let s = "";
    let cc = c;
    while (cc < size && grid[r][cc] !== ".") {
      s += grid[r][cc];
      cc++;
    }
    return s;
  }
  function extractDown(r: number, c: number) {
    let s = "";
    let rr = r;
    while (rr < size && grid[rr][c] !== ".") {
      s += grid[rr][c];
      rr++;
    }
    return s;
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === ".") continue;
      const isStartAcross = (c === 0 || grid[r][c - 1] === ".") && (c + 1 < size && grid[r][c + 1] !== ".");
      const isStartDown = (r === 0 || grid[r - 1][c] === ".") && (r + 1 < size && grid[r + 1][c] !== ".");

      if (isStartAcross || isStartDown) {
        numberGrid[r][c] = nextNumber;
        // achar placed word que começa aqui e pegar a dica
        const pAcross = placed.find((p) => p.dir === "across" && p.r === r && p.c === c);
        const pDown = placed.find((p) => p.dir === "down" && p.r === r && p.c === c);

        if (isStartAcross) {
          const word = extractAcross(r, c);
          const clue = pAcross ? pAcross.clue : "—";
          cluesAcross[nextNumber] = clue;
        }
        if (isStartDown) {
          const word = extractDown(r, c);
          const clue = pDown ? pDown.clue : "—";
          cluesDown[nextNumber] = clue;
        }
        nextNumber++;
      }
    }
  }

  return {
    id: `${mode}-${Date.now()}`,
    title: `Palavras Cruzadas (${mode === "hard" ? "Difícil" : "Normal"})`,
    rows: size,
    cols: size,
    grid: grid.map((r) => r.join("")),
    blocks: [], // opcional
    placed,
    clues: { across: cluesAcross, down: cluesDown },
  };
}
