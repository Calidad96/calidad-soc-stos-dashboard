import hubRegistry from '../../../data/hub-registry.json';

export type HubRegistry = typeof hubRegistry;

export function loadHubRegistry(): HubRegistry {
  return hubRegistry;
}
