/**
 * SGF (Smart Game Format) Parser for Go
 * Implements FF[4] specification
 * Reference: https://www.red-bean.com/sgf/
 */

export interface SGFMetadata {
  playerBlack?: string;
  playerWhite?: string;
  result?: string;
  komi?: number;
  handicap?: number;
  date?: string;
  event?: string;
  round?: string;
  gameComment?: string;
}

export interface Move {
  moveNumber: number;
  player: 'black' | 'white';
  coordinate: string; // e.g., "Q16"
  comment?: string;
}

export interface ParsedGame {
  metadata: SGFMetadata;
  moves: Move[];
  totalMoves: number;
}

/**
 * Convert SGF coordinates to standard Go coordinates
 * SGF uses: a-s (columns), a-s (rows, top to bottom)
 * Standard Go: A-S (columns), 1-19 (rows, bottom to top)
 */
function sgfToStandardCoord(sgfCoord: string): string {
  if (!sgfCoord || sgfCoord.length !== 2) {
    return '';
  }

  const col = sgfCoord.charCodeAt(0) - 'a'.charCodeAt(0); // 0-18
  const row = sgfCoord.charCodeAt(1) - 'a'.charCodeAt(0); // 0-18

  if (col < 0 || col > 18 || row < 0 || row > 18) {
    return '';
  }

  // Convert to standard notation
  const standardCol = String.fromCharCode('A'.charCodeAt(0) + col);
  const standardRow = 19 - row;

  return `${standardCol}${standardRow}`;
}

/**
 * Parse SGF property value
 * Handles both simple values and composed values
 */
function parsePropertyValue(value: string): string {
  // Remove leading/trailing whitespace
  return value.trim();
}

/**
 * Extract properties from SGF node
 * Format: [key1]value1[key2]value2...
 */
function extractProperties(nodeStr: string): Record<string, string[]> {
  const properties: Record<string, string[]> = {};
  const propRegex = /([A-Z]+)\[([^\]]*)\]/g;
  let match;

  while ((match = propRegex.exec(nodeStr)) !== null) {
    const key = match[1];
    const value = match[2];

    if (!properties[key]) {
      properties[key] = [];
    }
    properties[key].push(value);
  }

  return properties;
}

/**
 * Parse SGF game tree
 * Returns array of nodes, each containing properties
 */
function parseGameTree(sgfContent: string): Record<string, string[]>[] {
  // Remove whitespace outside of properties
  let cleaned = sgfContent.replace(/\s+/g, ' ');

  // Find all nodes (content between semicolons)
  const nodes: Record<string, string[]>[] = [];
  const nodeRegex = /;([^;]*?)(?=;|$)/g;
  let match;

  while ((match = nodeRegex.exec(cleaned)) !== null) {
    const nodeContent = match[1];
    const properties = extractProperties(nodeContent);
    if (Object.keys(properties).length > 0) {
      nodes.push(properties);
    }
  }

  return nodes;
}

/**
 * Validate SGF format
 */
function validateSGF(sgfContent: string): boolean {
  if (!sgfContent || typeof sgfContent !== 'string') {
    return false;
  }

  // Must start with (
  if (!sgfContent.trim().startsWith('(')) {
    return false;
  }

  // Must end with )
  if (!sgfContent.trim().endsWith(')')) {
    return false;
  }

  // Must contain at least one semicolon (game start node)
  if (!sgfContent.includes(';')) {
    return false;
  }

  return true;
}

/**
 * Parse SGF content and extract game information and moves
 */
export function parseSGF(sgfContent: string): ParsedGame | null {
  // Validate format
  if (!validateSGF(sgfContent)) {
    console.error('[SGF Parser] Invalid SGF format');
    return null;
  }

  try {
    // Remove outer parentheses and parse game tree
    const cleaned = sgfContent.trim().slice(1, -1);
    const nodes = parseGameTree(cleaned);

    if (nodes.length === 0) {
      console.error('[SGF Parser] No nodes found in SGF');
      return null;
    }

    // Extract metadata from first node
    const firstNode = nodes[0];
    const metadata: SGFMetadata = {
      playerBlack: firstNode.PB?.[0],
      playerWhite: firstNode.PW?.[0],
      result: firstNode.RE?.[0],
      date: firstNode.DT?.[0],
      event: firstNode.EV?.[0],
      round: firstNode.RO?.[0],
      gameComment: firstNode.GC?.[0],
    };

    // Parse komi
    if (firstNode.KM?.[0]) {
      metadata.komi = parseFloat(firstNode.KM[0]);
    }

    // Parse handicap
    if (firstNode.HA?.[0]) {
      metadata.handicap = parseInt(firstNode.HA[0], 10);
    }

    // Extract moves (starting from second node if first is root properties)
    const moves: Move[] = [];
    let moveNumber = 1;
    let currentPlayer: 'black' | 'white' = 'black';

    for (let i = 1; i < nodes.length; i++) {
      const node = nodes[i];

      // Check for black move
      if (node.B) {
        const sgfCoord = node.B[0];
        const coordinate = sgfCoord ? sgfToStandardCoord(sgfCoord) : 'pass';

        moves.push({
          moveNumber,
          player: 'black',
          coordinate,
          comment: node.C?.[0],
        });

        moveNumber++;
        currentPlayer = 'white';
      }
      // Check for white move
      else if (node.W) {
        const sgfCoord = node.W[0];
        const coordinate = sgfCoord ? sgfToStandardCoord(sgfCoord) : 'pass';

        moves.push({
          moveNumber,
          player: 'white',
          coordinate,
          comment: node.C?.[0],
        });

        moveNumber++;
        currentPlayer = 'black';
      }
    }

    return {
      metadata,
      moves,
      totalMoves: moves.length,
    };
  } catch (error) {
    console.error('[SGF Parser] Error parsing SGF:', error);
    return null;
  }
}

/**
 * Simulate board state after each move
 * Returns a 2D array representing the board (0=empty, 1=black, 2=white)
 */
export function getBoardStateAfterMove(moves: Move[], upToMoveNumber: number): number[][] {
  const board: number[][] = Array(19)
    .fill(null)
    .map(() => Array(19).fill(0));

  for (let i = 0; i < Math.min(upToMoveNumber, moves.length); i++) {
    const move = moves[i];

    if (move.coordinate === 'pass') {
      continue;
    }

    // Convert coordinate to array indices
    const col = move.coordinate.charCodeAt(0) - 'A'.charCodeAt(0);
    const row = 19 - parseInt(move.coordinate.slice(1), 10);

    if (col >= 0 && col < 19 && row >= 0 && row < 19) {
      board[row][col] = move.player === 'black' ? 1 : 2;
    }
  }

  return board;
}

/**
 * Convert board state to ASCII representation for display/debugging
 */
export function boardToASCII(board: number[][]): string {
  let ascii = '   A B C D E F G H J K L M N O P Q R S T\n';

  for (let row = 0; row < 19; row++) {
    ascii += String(19 - row).padStart(2, ' ') + ' ';

    for (let col = 0; col < 19; col++) {
      const cell = board[row][col];
      if (cell === 0) {
        ascii += '. ';
      } else if (cell === 1) {
        ascii += '● ';
      } else if (cell === 2) {
        ascii += '○ ';
      }
    }

    ascii += String(19 - row) + '\n';
  }

  ascii += '   A B C D E F G H J K L M N O P Q R S T\n';
  return ascii;
}

/**
 * Get last N moves for context
 */
export function getLastMoves(moves: Move[], upToMoveNumber: number, count: number = 5): string[] {
  const start = Math.max(0, upToMoveNumber - count);
  return moves.slice(start, upToMoveNumber).map(m => m.coordinate);
}

/**
 * Determine game phase based on move number
 */
export function getGamePhase(moveNumber: number, totalMoves: number): 'opening' | 'midgame' | 'endgame' {
  const progress = moveNumber / totalMoves;

  if (progress < 0.3) {
    return 'opening';
  } else if (progress < 0.7) {
    return 'midgame';
  } else {
    return 'endgame';
  }
}
