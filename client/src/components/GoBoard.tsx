import { useRef, useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, SkipBack, SkipForward } from 'lucide-react';
import { computeBoardState, coordToIndices, BOARD_DIM } from '@shared/go-board';

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
  showMoveList?: boolean;
}

/**
 * Interactive Go board component using Canvas.
 * Displays a 19x19 board with capture-aware stone placement and move history.
 */
export const GoBoard: React.FC<GoBoardProps> = ({
  moves,
  currentMoveNumber = 0,
  onMoveSelect,
  width = 700,
  height = 700,
  analyzedMoves = [],
  showMoveList = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayMove, setDisplayMove] = useState(currentMoveNumber);

  const MARGIN = Math.max(30, Math.min(50, width * 0.07));
  const CELL_SIZE = (width - 2 * MARGIN) / (BOARD_DIM - 1);

  // Keep the board in sync when the parent drives the current move.
  useEffect(() => {
    setDisplayMove(currentMoveNumber);
  }, [currentMoveNumber]);

  const selectMove = (moveNumber: number) => {
    setDisplayMove(moveNumber);
    onMoveSelect?.(moveNumber);
  };

  // Set of "row,col" keys for analyzed moves so the draw loop can look them up in O(1).
  const analyzedKeys = useMemo(() => {
    const set = new Set<string>();
    const analyzedSet = new Set(analyzedMoves);
    moves.forEach((move, idx) => {
      if (!analyzedSet.has(idx + 1)) return;
      const indices = coordToIndices(move.coordinate);
      if (indices) set.add(`${indices[0]},${indices[1]}`);
    });
    return set;
  }, [moves, analyzedMoves]);

  // Draw board
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match the backing store to the device pixel ratio for crisp rendering.
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#DEB887';
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    for (let i = 0; i < BOARD_DIM; i++) {
      const pos = MARGIN + i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(pos, MARGIN);
      ctx.lineTo(pos, height - MARGIN);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(MARGIN, pos);
      ctx.lineTo(width - MARGIN, pos);
      ctx.stroke();
    }

    // Star points (hoshi)
    const starPoints = [
      [3, 3], [3, 9], [3, 15],
      [9, 3], [9, 9], [9, 15],
      [15, 3], [15, 9], [15, 15],
    ];
    ctx.fillStyle = '#000';
    starPoints.forEach(([row, col]) => {
      const x = MARGIN + col * CELL_SIZE;
      const y = MARGIN + row * CELL_SIZE;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Coordinates
    ctx.fillStyle = '#000';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < BOARD_DIM; i++) {
      const col = String.fromCharCode('A'.charCodeAt(0) + i);
      const row = BOARD_DIM - i;
      ctx.fillText(col, MARGIN + i * CELL_SIZE, MARGIN - 20);
      ctx.fillText(col, MARGIN + i * CELL_SIZE, height - MARGIN + 20);
      ctx.fillText(String(row), MARGIN - 20, MARGIN + i * CELL_SIZE);
      ctx.fillText(String(row), width - MARGIN + 20, MARGIN + i * CELL_SIZE);
    }

    // Stones (capture-aware position)
    const board = computeBoardState(moves, displayMove);
    const lastMoveIndices =
      displayMove > 0 && displayMove <= moves.length
        ? coordToIndices(moves[displayMove - 1].coordinate)
        : null;

    for (let row = 0; row < BOARD_DIM; row++) {
      for (let col = 0; col < BOARD_DIM; col++) {
        const cell = board[row][col];
        if (cell === 0) continue;

        const x = MARGIN + col * CELL_SIZE;
        const y = MARGIN + row * CELL_SIZE;

        // Shadow
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

        // Highlight the last played stone
        if (lastMoveIndices && lastMoveIndices[0] === row && lastMoveIndices[1] === col) {
          ctx.strokeStyle = '#ff0000';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(x, y, CELL_SIZE / 2 + 2, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Mark analyzed moves whose stone is still on the board
        if (analyzedKeys.has(`${row},${col}`)) {
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(x + CELL_SIZE / 2 - 4, y - CELL_SIZE / 2 + 4, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }, [displayMove, moves, width, height, MARGIN, CELL_SIZE, analyzedKeys]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          selectMove(Math.max(0, displayMove - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          selectMove(Math.min(moves.length, displayMove + 1));
          break;
        case 'Home':
          e.preventDefault();
          selectMove(0);
          break;
        case 'End':
          e.preventDefault();
          selectMove(moves.length);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayMove, moves.length]);

  // Canvas click navigates to a played stone's move
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const clickCol = Math.round((x - MARGIN) / CELL_SIZE);
    const clickRow = Math.round((y - MARGIN) / CELL_SIZE);

    if (clickCol >= 0 && clickCol < BOARD_DIM && clickRow >= 0 && clickRow < BOARD_DIM) {
      for (let i = Math.min(displayMove, moves.length) - 1; i >= 0; i--) {
        const indices = coordToIndices(moves[i].coordinate);
        if (indices && indices[0] === clickRow && indices[1] === clickCol) {
          selectMove(i + 1);
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
        role="img"
        aria-label={`圍棋棋盤，目前顯示第 ${displayMove} 手，共 ${moves.length} 手`}
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
        <Button variant="outline" size="sm" onClick={() => selectMove(0)} title="First move">
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => selectMove(Math.max(0, displayMove - 1))} title="Previous move">
          <ChevronLeft className="w-4 h-4" />
        </Button>

        <span className="text-sm font-medium px-4 text-gray-600">
          第 {displayMove} / {moves.length} 手
          <span className="text-xs text-gray-500 ml-2">(← → 上下鍵 | Home/End 首尾)</span>
        </span>

        <Button variant="outline" size="sm" onClick={() => selectMove(Math.min(moves.length, displayMove + 1))} title="Next move">
          <ChevronRight className="w-4 h-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => selectMove(moves.length)} title="Last move">
          <SkipForward className="w-4 h-4" />
        </Button>
      </div>

      {/* Move history */}
      {showMoveList && (
        <div className="w-full">
          <p className="text-xs text-gray-600 mb-2 font-medium">落子序列（點擊跳轉）</p>
          <div className="max-h-40 overflow-y-auto border rounded p-3 bg-gray-50">
            <div className="grid grid-cols-10 gap-1">
              {moves.map((move, idx) => (
                <button
                  key={`${idx}-${move.coordinate}`}
                  onClick={() => selectMove(idx + 1)}
                  className={`p-1 text-xs rounded text-center cursor-pointer transition-colors ${
                    displayMove === idx + 1
                      ? 'bg-emerald-600 text-white font-bold'
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
      )}
    </div>
  );
};
