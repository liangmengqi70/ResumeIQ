// Keep the selected file in browser memory during client-side navigation only.
export type BackgroundAnswers = { identity: string; applications: string; difficulties: string[]; question: string };
export const diagnosisDraft: { file: File | null; jd: string; background: BackgroundAnswers } = {
  file: null, jd: '', background: { identity: '', applications: '', difficulties: [], question: '' },
};
