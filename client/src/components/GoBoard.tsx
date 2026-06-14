import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';

interface Move {
  moveNumber: number;
  player: 'black' | 'white';
  coordinate: string;
  comment?: string;
}

interface GoBoardProps {
  moves: Move[];
  currentMoveNumber?: number;
  onMoveSelect?: (moveNumber: number) => void;
  width?: number;
  height?: number;
}

/**
 * Interactive Go board component using Canvas
 * Displays 19x19 board with stones and move history
 */
export const GoBoard: React.FC<GoBoardProps> = ({
  moves,
  currentMoveNumber = 0,
  onMoveSelect,
  width = 600,
  height = 600,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayMove, setDisplayMove] = useState(currentMoveNumber);

  const BOARD_SIZE = 19;
  const MARGIN = 40;
  const CELL_SIZE = (width - 2 * MARGIN) / (BOARD_SIZE - 1);

  // Coordinate conversion: "P16" -> [15, 3]
  const coordinateToIndices = (coord: string): [number, number] | null => {
    if (coord === 'pass') return null;
    if (coord.length !== 2) return null;

    const col = coord.charCodeAt(0) - 'A'.charCodeAt(0);
    const row = 19 - parseInt(coord.slice(1), 10);

    if (col < 0 || col > 18 || row < 0 || row > 18) return null;
    return [row, col];
  };

  // Build board state from moves
  const getBoardState = (upToMove: number) => {
    const board: number[][] = Array(19)
      .fill(null)
      .map(() => Array(19).fill(0));

    for (let i = 0; i < Math.min(upToMove, moves.length); i++) {
      const move = moves[i];
      const indices = coordinateToIndices(move.coordinate);
      if (indices) {
        const [row, col] = indices;
        board[row][col] = move.player === 'black' ? 1 : 2;
      }
    }

    return board;
  };

  // Draw board
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;

    for (let i = 0; i < BOARD_SIZE; i++) {
      const pos = MARGIN + i * CELL_SIZE;

      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(pos, MARGIN);
      ctx.lineTo(pos, height - MARGIN);
      ctx.stroke();

      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(MARGIN, pos);
      ctx.lineTo(width - MARGIN, pos);
      ctx.stroke();
    }

    // Draw star points (hoshi)
    const starPoints = [
      [3, 3],
      [3, 9],
      [3, 15],
      [9, 3],
      [9, 9],
      [9, 15],
      [15, 3],
      [15, 9],
      [15, 15],
    ];

    ctx.fillStyle = '#000';
    starPoints.forEach(([row, col]) => {
      const x = MARGIN + col * CELL_SIZE;
      const y = MARGIN + row * CELL_SIZE;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw coordinates
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < BOARD_SIZE; i++) {
      const col = String.fromCharCode('A'.charCodeAt(0) + i);
      const row = 19 - i;

      // Top labels
      ctx.fillText(col, MARGIN + i * CELL_SIZE, MARGIN - 20);
      // Bottom labels
      ctx.fillText(col, MARGIN + i * CELL_SIZE, height - MARGIN + 20);
      // Left labels
      ctx.fillText(String(row), MARGIN - 20, MARGIN + i * CELL_SIZE);
      // Right labels
      ctx.fillText(String(row), width - MARGIN + 20, MARGIN + i * CELL_SIZE);
    }

    // Draw stones
    const board = getBoardState(displayMove);

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const cell = board[row][col];
        if (cell === 0) continue;

        const x = MARGIN + col * CELL_SIZE;
        const y = MARGIN + row * CELL_SIZE;

        // Stone shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.beginPath();
        ctx.arc(x + 2, y + 2, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();

        // Stone
        ctx.fillStyle = cell === 1 ? '#000' : '#fff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Move number (last move)
        if (displayMove > 0 && displayMove === moves.length) {
          const lastMove = moves[displayMove - 1];
          const lastIndices = coordinateToIndices(lastMove.coordinate);
          if (lastIndices && lastIndices[0] === row && lastIndices[1] === col) {
            ctx.fillStyle = cell === 1 ? '#fff' : '#000';
            ctx.font = 'bold 10px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(displayMove), x, y);
          }
        }
      }
    }
  }, [displayMove, moves, width, height]);

  const handlePrevMove = () => {
    const newMove = Math.max(0, displayMove - 1);
    setDisplayMove(newMove);
    onMoveSelect?.(newMove);
  };

  const handleNextMove = () => {
    const newMove = Math.min(moves.length, displayMove + 1);
    setDisplayMove(newMove);
    onMoveSelect?.(newMove);
  };

  const handleFirstMove = () => {
    setDisplayMove(0);
    onMoveSelect?.(0);
  };

  const handleLastMove = () => {
    setDisplayMove(moves.length);
    onMoveSelect?.(moves.length);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border-2 border-gray-400 rounded-lg shadow-lg"
      />

      {/* Navigation controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleFirstMove}
          title="First move"
        >
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrevMove}
          title="Previous move"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <span className="text-sm font-medium px-4">
          Move {displayMove} / {moves.length}
        </span>

        <Button
          variant="outline"
          size="sm"
          onClick={handleNextMove}
          title="Next move"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLastMove}
          title="Last move"
        >
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      {/* Move history */}
      <div className="w-full max-h-40 overflow-y-auto border rounded p-3 bg-gray-50">
        <div className="grid grid-cols-10 gap-1">
          {moves.map((move, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDisplayMove(idx + 1);
                onMoveSelect?.(idx + 1);
              }}
              className={`p-1 text-xs rounded text-center cursor-pointer transition-colors ${
                displayMove === idx + 1
                  ? 'bg-blue-500 text-white font-bold'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
              title={`${move.player === 'black' ? '黑' : '白'} ${move.coordinate}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
