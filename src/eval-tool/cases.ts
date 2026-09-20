import 'server-only';
import cases from './data/cases.json';
import type { EvalCase } from './types';

export function listCases(): EvalCase[] { return cases as EvalCase[]; }
export function getCase(id: string) { return listCases().find(item => item.id === id) || null; }
