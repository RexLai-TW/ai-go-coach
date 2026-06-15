export const COOKIE_NAME = "app_session_id";
export const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;
export const AXIOS_TIMEOUT_MS = 30_000;
export const UNAUTHED_ERR_MSG = 'Please login (10001)';
export const NOT_ADMIN_ERR_MSG = 'You do not have required permission (10002)';

/**
 * Move evaluation vocabulary shared by the analysis prompt, the API validation,
 * and the frontend display so the labels never drift apart.
 */
export const MOVE_EVALUATIONS = [
  'excellent',
  'good',
  'unclear',
  'mistake',
  'blunder',
] as const;

export type MoveEvaluation = (typeof MOVE_EVALUATIONS)[number];

export const GOOD_EVALUATIONS: readonly MoveEvaluation[] = ['excellent', 'good'];
export const BAD_EVALUATIONS: readonly MoveEvaluation[] = ['mistake', 'blunder'];

/** Traditional Chinese labels for each evaluation. */
export const EVALUATION_LABELS: Record<MoveEvaluation, string> = {
  excellent: '優秀',
  good: '不錯',
  unclear: '待商榷',
  mistake: '失誤',
  blunder: '大惡手',
};
