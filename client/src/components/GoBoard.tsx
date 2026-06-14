import { useRef, useState, useEffect } from 'react';
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
  analyzedMoves?: number[];
}

/**
 * Interactive Go board component using Canvas
 * Displays 19x19 board with stones and move history
 */
export const GoBoard: React.FC<GoBoardProps> = ({
  moves,
  currentMoveNumber = 0,
  onMoveSelect,
  width = 700,
  height = 700,
  analyzedMoves = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayMove, setDisplayMove] = useState(currentMoveNumber);

  const BOARD_SIZE = 19;
  // Responsive margin based on board size
  const MARGIN = Math.max(30, Math.min(50, width * 0.07));
  const CELL_SIZE = (width - 2 * MARGIN) / (BOARD_SIZE - 1);

  // Coordinate conversion: "P16" -> [15, 3], "A10" -> [9, 0]
  const coordinateToIndices = (coord: string): [number, number] | null => {
    if (coord === 'pass') return null;
    if (coord.length < 2) return null;

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

    // Set canvas resolution to match display size (fix for high-DPI displays)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear canvas with proper dimensions
    ctx.clearRect(0, 0, width, height);
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
    ctx.font = 'bold 12px Arial';
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

        // Highlight last move with red circle
        if (displayMove > 0 && displayMove <= moves.length) {
          const lastMove = moves[displayMove - 1];
          const lastMoveIndices = coordinateToIndices(lastMove.coordinate);
          if (lastMoveIndices && lastMoveIndices[0] === row && lastMoveIndices[1] === col) {
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, y, CELL_SIZE / 2 + 2, 0, Math.PI * 2);
            ctx.stroke();
          }
        }

        // Mark analyzed moves with a small indicator
        for (let i = 0; i < moves.length; i++) {
          if (analyzedMoves.includes(i + 1)) {
            const moveIndices = coordinateToIndices(moves[i].coordinate);
            if (moveIndices && moveIndices[0] === row && moveIndices[1] === col) {
              ctx.fillStyle = '#22c55e';
              ctx.beginPath();
              ctx.arc(x + CELL_SIZE / 2 - 4, y - CELL_SIZE / 2 + 4, 4, 0, Math.PI * 2);
              ctx.fill();
              break;
            }
          }
        }
      }
    }
  }, [displayMove, moves, width, height, analyzedMoves]);

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input field
      if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          handlePrevMove();
          break;
        case 'ArrowRight':
          e.preventDefault();
          handleNextMove();
          break;
        case 'Home':
          e.preventDefault();
          handleFirstMove();
          break;
        case 'End':
          e.preventDefault();
          handleLastMove();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayMove, moves.length]);

  // Canvas click handler for move navigation
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate which intersection was clicked
    const clickCol = Math.round((x - MARGIN) / CELL_SIZE);
    const clickRow = Math.round((y - MARGIN) / CELL_SIZE);

    // Check if click is within board bounds
    if (clickCol >= 0 && clickCol < BOARD_SIZE && clickRow >= 0 && clickRow < BOARD_SIZE) {
      // Find the move at this position
      for (let i = 0; i < Math.min(displayMove, moves.length); i++) {
        const move = moves[i];
        const indices = coordinateToIndices(move.coordinate);
        if (indices && indices[0] === clickRow && indices[1] === clickCol) {
          // Found a stone at this position, navigate to this move
          setDisplayMove(i + 1);
          onMoveSelect?.(i + 1);
          return;
        }
      }
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          width: `${width}px`,
          height: `${height}px`,
          display: 'block',
          maxWidth: '100%',
          border: '2px solid #9ca3af',
          borderRadius: '0.5rem',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          cursor: 'pointer',
        }}
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

        <span className="text-sm font-medium px-4 text-gray-600">
          Move {displayMove} / {moves.length}
          <span className="text-xs text-gray-500 ml-2">(← → 上下鍵 | Home/End 首尾)</span>
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
      <div className="w-full">
        <p className="text-xs text-gray-600 mb-2 font-medium">落子序列 (點擊或按數字鍵跳轉)</p>
        <div className="max-h-40 overflow-y-auto border rounded p-3 bg-gray-50">
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
    </div>
  );
};
