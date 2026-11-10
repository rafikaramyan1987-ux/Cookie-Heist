/** Every house, registered synchronously (node scripts, tests). The game loads houses 2–5 lazily instead. */
import { registerHouses } from './index';
import { REST } from './houses/rest';
registerHouses(REST);
export { getSnackLevel } from './snack';
export { LEVEL_SRC, getLevel, levelId, HOUSE_COUNT, LEVELS_PER_HOUSE, loadHouses, housesLoaded, registerHouses } from './index';
