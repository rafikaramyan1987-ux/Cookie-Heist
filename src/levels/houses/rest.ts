import type { LevelSrc } from '../../game/types';
import { FAMILY } from './family';
import { COTTAGE } from './cottage';
import { CHALET } from './chalet';
import { MANSION } from './mansion';

/** houses 2–5 (a lazy chunk in the game) */
export { getSnackLevel } from '../snack';
export const REST: LevelSrc[][] = [FAMILY, COTTAGE, CHALET, MANSION];
