/** 阅读进度持久化（localStorage），与站点交互脚本解耦，便于复用。 */

export const PROGRESS_KEY = 'qc_progress_v1';

export type ProgressEntry = { read?: boolean; at?: number };
export type ProgressMap = Record<string, ProgressEntry>;

export function readProgress(): ProgressMap {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') as ProgressMap;
  } catch {
    return {};
  }
}

export function writeProgress(map: ProgressMap) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch {
    /* 隐私模式下放弃持久化 */
  }
}
