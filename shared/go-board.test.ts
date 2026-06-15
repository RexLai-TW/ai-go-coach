import { describe, it, expect } from "vitest";
import { computeBoardState, coordToIndices, type BoardMove } from "./go-board";

describe("go-board engine", () => {
  it("places stones at the right indices", () => {
    const moves: BoardMove[] = [
      { player: "black", coordinate: "A19" }, // top-left -> [0, 0]
      { player: "white", coordinate: "S1" }, // bottom-right -> [18, 18]
    ];
    const board = computeBoardState(moves, 2);
    expect(board[0][0]).toBe(1);
    expect(board[18][18]).toBe(2);
  });

  it("ignores pass moves", () => {
    const moves: BoardMove[] = [{ player: "black", coordinate: "pass" }];
    const board = computeBoardState(moves, 1);
    expect(board.flat().every(cell => cell === 0)).toBe(true);
  });

  it("captures a surrounded single stone", () => {
    // White at C17 ([2,2]) surrounded by black on all four sides.
    const moves: BoardMove[] = [
      { player: "white", coordinate: "C17" }, // [2,2]
      { player: "black", coordinate: "C18" }, // above [1,2]
      { player: "white", coordinate: "A1" }, // elsewhere
      { player: "black", coordinate: "C16" }, // below [3,2]
      { player: "white", coordinate: "A2" }, // elsewhere
      { player: "black", coordinate: "B17" }, // left [2,1]
      { player: "white", coordinate: "A3" }, // elsewhere
      { player: "black", coordinate: "D17" }, // right [2,3] -> captures white at [2,2]
    ];
    const board = computeBoardState(moves, moves.length);
    expect(board[2][2]).toBe(0); // captured white stone removed
    expect(board[1][2]).toBe(1); // surrounding black stones remain
    expect(board[2][3]).toBe(1);
  });

  it("respects the upToMove limit", () => {
    const moves: BoardMove[] = [
      { player: "black", coordinate: "A19" },
      { player: "white", coordinate: "B19" },
    ];
    const board = computeBoardState(moves, 1);
    expect(board[0][0]).toBe(1);
    expect(board[0][1]).toBe(0); // second move not yet played
  });

  it("converts coordinates, returning null for invalid input", () => {
    expect(coordToIndices("A19")).toEqual([0, 0]);
    expect(coordToIndices("pass")).toBeNull();
    expect(coordToIndices("")).toBeNull();
    expect(coordToIndices("Z25")).toBeNull();
  });
});
