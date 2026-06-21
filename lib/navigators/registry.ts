/**
 * Navigator module registry. The sidebar, router, and AI layer iterate this so
 * new modules appear everywhere by adding a single definition here.
 */
import { NavigatorModule } from './types';
import { legalModule } from './legal';

export const NAVIGATOR_MODULES: NavigatorModule[] = [
  legalModule,
  // Future: immigrationModule, taxModule, benefitsModule, smallClaimsModule, ...
];

export function getModule(id: string): NavigatorModule | undefined {
  return NAVIGATOR_MODULES.find((m) => m.id === id);
}
