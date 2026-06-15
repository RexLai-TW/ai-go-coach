/**
 * Capture-aware Go board engine shared by client (rendering) and server (LLM context).
 *
 * Coordinates use the internal convention produced by the SGF parser:
 * column letters A..S map to indices 0..18 (note: 'I' is NOT skipped here),
 * rows are 1..19 counted from the bottom. board[row][col] holds 0=empty, 1=black, 2=white,
 * where row 0 is the top of the board.
 */

export const BOARD_DIM = 19;

export interface BoardMove {
  player: "black" | "white";
  coordinate: string;
}

/** Convert a coordinate such as "Q16" to [row, col] indices, or null for pass/invalid. */
export function coordToIndices(coordinate: string): [number, number] | null {
  if (!coordinate || coordinate === "pass" || coordinate.length < 2) {
    return null;
  }
  const col = coordinate.charCodeAt(0) - "A".charCodeAt(0);
  const row = BOARD_DIM - parseInt(coordinate.slice(1), 10);
  if (Number.isNaN(row) || col < 0 || col >= BOARD_DIM || row < 0 || row >= BOARD_DIM) {
    return null;
  }
  return [row, col];
}

function neighbors(row: number, col: number): Array<[number, number]> {
  const result: Array<[number, number]> = [];
  if (row > 0) result.push([row - 1, col]);
  if (row < BOARD_DIM - 1) result.push([row + 1, col]);
  if (col > 0) result.push([row, col - 1]);
  if (col < BOARD_DIM - 1) result.push([row, col + 1]);
  return result;
}

/** Flood-fill the connected same-colour group at (row,col) and report whether it has a liberty. */
function collectGroup(
  board: number[][],
  row: number,
  col: number
): { stones: Array<[number, number]>; hasLiberty: boolean } {
  const color = board[row][col];
  const stack: Array<[number, number]> = [[row, col]];
  const seen = new Set<string>([`${row},${col}`]);
  const stones: Array<[number, number]> = [];
  let hasLiberty = false;

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    stones.push([r, c]);
    for (const [nr, nc] of neighbors(r, c)) {
      const cell = board[nr][nc];
      if (cell === 0) {
        hasLiberty = true;
      } else if (cell === color) {
        const key = `${nr},${nc}`;
        if (!seen.has(key)) {
          seen.add(key);
          stack.push([nr, nc]);
        }
      }
    }
  }

  return { stones, hasLiberty };
}

/**
 * Replay `moves` up to `upToMove` and return the resulting board, applying capture rules
 * (removing enemy groups with no liberties, and any resulting suicide group).
 */
export function computeBoardState(moves: BoardMove[], upToMove: number): number[][] {
  const board: number[][] = Array.from({ length: BOARD_DIM }, () =>
    Array<number>(BOARD_DIM).fill(0)
  );

  const limit = Math.min(upToMove, moves.length);
  for (let i = 0; i < limit; i++) {
    const idx = coordToIndices(moves[i].coordinate);
    if (!idx) continue; // pass or malformed coordinate
    const [row, col] = idx;
    const color = moves[i].player === "black" ? 1 : 2;
    const enemy = color === 1 ? 2 : 1;

    board[row][col] = color;

    // Remove adjacent enemy groups that just lost their last liberty.
    for (const [nr, nc] of neighbors(row, col)) {
      if (board[nr][nc] === enemy) {
        const group = collectGroup(board, nr, nc);
        if (!group.hasLiberty) {
          for (const [sr, sc] of group.stones) board[sr][sc] = 0;
        }
      }
    }

    // Defensive: drop the placed group if it ended up with no liberties (suicide).
    const placed = collectGroup(board, row, col);
    if (!placed.hasLiberty) {
      for (const [sr, sc] of placed.stones) board[sr][sc] = 0;
    }
  }

  return board;
}
