import { describe, it, expect } from 'vitest';
import {
  parseSGF,
  getBoardStateAfterMove,
  boardToASCII,
  getLastMoves,
  getGamePhase,
} from './sgf-parser';

describe('SGF Parser', () => {
  describe('parseSGF', () => {
    it('should parse a simple SGF game', () => {
      const sgf = `(;GM[1]FF[4]CA[UTF-8]AP[Sabaki]KM[6.5]PB[Black Player]PW[White Player];B[pd];W[dp];B[pq];W[dd])`;

      const result = parseSGF(sgf);

      expect(result).not.toBeNull();
      expect(result?.metadata.playerBlack).toBe('Black Player');
      expect(result?.metadata.playerWhite).toBe('White Player');
      expect(result?.metadata.komi).toBe(6.5);
      expect(result?.totalMoves).toBe(4);
      expect(result?.moves[0].coordinate).toBe('P16');
    });

    it('should parse moves correctly', () => {
      const sgf = `(;GM[1]FF[4];B[pd];W[dp];B[pq])`;

      const result = parseSGF(sgf);

      expect(result?.moves).toHaveLength(3);
      expect(result?.moves[0].player).toBe('black');
      expect(result?.moves[0].coordinate).toBe('P16');
      expect(result?.moves[1].player).toBe('white');
      expect(result?.moves[1].coordinate).toBe('D4');
      expect(result?.moves[2].player).toBe('black');
      expect(result?.moves[2].coordinate).toBe('P3');
    });

    it('should handle pass moves', () => {
      const sgf = `(;GM[1]FF[4];B[pd];W[];B[pq])`;

      const result = parseSGF(sgf);

      expect(result?.moves).toHaveLength(3);
      expect(result?.moves[1].coordinate).toBe('pass');
    });

    it('should parse handicap and result', () => {
      const sgf = `(;GM[1]FF[4]HA[2]RE[B+2.5];B[pd];W[dp])`;

      const result = parseSGF(sgf);

      expect(result?.metadata.handicap).toBe(2);
      expect(result?.metadata.result).toBe('B+2.5');
    });

    it('should return null for invalid SGF', () => {
      expect(parseSGF('invalid')).toBeNull();
      expect(parseSGF('')).toBeNull();
      expect(parseSGF('no parentheses')).toBeNull();
    });

    it('should handle comments in moves', () => {
      const sgf = `(;GM[1]FF[4];B[pd]C[Good opening move];W[dp])`;

      const result = parseSGF(sgf);

      expect(result?.moves[0].comment).toBe('Good opening move');
    });
  });

  describe('getBoardStateAfterMove', () => {
    it('should create empty board initially', () => {
      const board = getBoardStateAfterMove([], 0);

      expect(board).toHaveLength(19);
      expect(board[0]).toHaveLength(19);
      const allEmpty = board.every(row => row.every(cell => cell === 0));
      expect(allEmpty).toBe(true);
    });

    it('should place stones correctly', () => {
      const sgf = `(;GM[1]FF[4];B[pd];W[dp];B[pq])`;

      const result = parseSGF(sgf);
      if (!result) throw new Error('Failed to parse SGF');

      const board = getBoardStateAfterMove(result.moves, 3);

      expect(board[3][15]).toBe(1);
      expect(board[15][3]).toBe(2);
      expect(board[16][15]).toBe(1);
    });

    it('should handle partial game state', () => {
      const sgf = `(;GM[1]FF[4];B[pd];W[dp];B[pq];W[dd])`;

      const result = parseSGF(sgf);
      if (!result) throw new Error('Failed to parse SGF');

      const board = getBoardStateAfterMove(result.moves, 2);

      expect(board[3][15]).toBe(1);
      expect(board[15][3]).toBe(2);
      expect(board[16][15]).toBe(0);
    });
  });

  describe('boardToASCII', () => {
    it('should convert board to ASCII representation', () => {
      const sgf = `(;GM[1]FF[4];B[pd];W[dp])`;

      const result = parseSGF(sgf);
      if (!result) throw new Error('Failed to parse SGF');

      const board = getBoardStateAfterMove(result.moves, 2);
      const ascii = boardToASCII(board);

      expect(ascii).toContain('●');
      expect(ascii).toContain('○');
      expect(ascii).toContain('A B C D E F G H J K L M N O P Q R S T');
    });
  });

  describe('getLastMoves', () => {
    it('should return last N moves', () => {
      const sgf = `(;GM[1]FF[4];B[pd];W[dp];B[pq];W[dd];B[nc])`;

      const result = parseSGF(sgf);
      if (!result) throw new Error('Failed to parse SGF');

      const lastMoves = getLastMoves(result.moves, 5, 3);

      expect(lastMoves.length).toBe(3);
      expect(lastMoves[0]).toBe('P3');
      expect(lastMoves[1]).toBe('D16');
      expect(lastMoves[2]).toBe('N17');
    });

    it('should handle fewer moves than requested', () => {
      const sgf = `(;GM[1]FF[4];B[pd];W[dp])`;

      const result = parseSGF(sgf);
      if (!result) throw new Error('Failed to parse SGF');

      const lastMoves = getLastMoves(result.moves, 2, 5);

      expect(lastMoves.length).toBeLessThanOrEqual(2);
      expect(lastMoves[0]).toBe('P16');
      expect(lastMoves[1]).toBe('D4');
    });
  });

  describe('getGamePhase', () => {
    it('should identify opening phase', () => {
      expect(getGamePhase(10, 150)).toBe('opening');
    });

    it('should identify midgame phase', () => {
      expect(getGamePhase(75, 150)).toBe('midgame');
    });

    it('should identify endgame phase', () => {
      expect(getGamePhase(130, 150)).toBe('endgame');
    });
  });

  describe('edge cases', () => {
    it('should parse SGF with multiple moves', () => {
      const sgf = `(;GM[1]FF[4];B[pd];W[dp];B[pq];W[dd])`;

      const result = parseSGF(sgf);

      expect(result).not.toBeNull();
      expect(result?.moves.length).toBe(4);
    });

    it('should handle uppercase properties', () => {
      const sgf = `(;GM[1]FF[4]PB[Black]PW[White];B[pd];W[dp])`;

      const result = parseSGF(sgf);

      expect(result).not.toBeNull();
      expect(result?.metadata.playerBlack).toBe('Black');
      expect(result?.metadata.playerWhite).toBe('White');
    });

    it('should handle empty board positions', () => {
      const sgf = `(;GM[1]FF[4];B[pd];W[dp];B[pq];W[dd];B[nc];W[qd];B[qe];W[pe])`;

      const result = parseSGF(sgf);
      if (!result) throw new Error('Failed to parse SGF');

      const board = getBoardStateAfterMove(result.moves, 8);

      expect(board[0][0]).toBe(0);
      expect(board[0][18]).toBe(0);
      expect(board[18][0]).toBe(0);
    });
  });
});
