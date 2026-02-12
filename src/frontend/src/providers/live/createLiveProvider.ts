import { LiveStubProvider } from './LiveStubProvider';
import type { LiveSessionProvider } from './LiveSessionProvider';

export const createLiveProvider = (): LiveSessionProvider => {
  // Provider composition point: switch to LiveWebSocketProvider later.
  return new LiveStubProvider();
};
