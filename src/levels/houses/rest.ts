import type { LevelSrc } from '../../game/types';
import { FAMILY } from './family';
import { COTTAGE } from './cottage';
import { CHALET } from './chalet';
import { MANSION } from './mansion';
import { FARMHOUSE } from './farmhouse';
import { BEACHHOUSE } from './beachhouse';
import { CASTLE } from './castle';

/** houses 2–8 (a lazy chunk in the game) */
export { getSnackLevel } from '../snack';
export const REST: LevelSrc[][] = [FAMILY, COTTAGE, CHALET, MANSION, FARMHOUSE, BEACHHOUSE, CASTLE];
