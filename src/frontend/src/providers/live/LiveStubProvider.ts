import type {
  GazePointListener,
  LiveSessionProvider,
  LiveSessionState,
  StatusListener,
} from './LiveSessionProvider';

export const LIVE_STUB_PROVIDER_ERROR = 'Live backend not connected';

export class LiveStubProvider implements LiveSessionProvider {
  private state: LiveSessionState = {
    status: 'idle',
    connected: false,
    lastMessageAt: null,
    statusSinceMs: null,
  };

  private statusListeners = new Set<StatusListener>();
  private gazePointListeners = new Set<GazePointListener>();

  async connect(): Promise<void> {
    this.state = {
      ...this.state,
      connected: false,
      lastMessageAt: Date.now(),
      status: 'idle',
      statusSinceMs: null,
    };
    this.emitStatus();
  }

  disconnect(): void {
    this.state = {
      status: 'idle',
      connected: false,
      lastMessageAt: Date.now(),
      statusSinceMs: null,
    };
    this.emitStatus();
  }

  async startSession(_liveRunId: string): Promise<void> {
    this.state = {
      ...this.state,
      status: 'idle',
      lastMessageAt: Date.now(),
      statusSinceMs: null,
    };
    this.emitStatus();
    throw new Error(LIVE_STUB_PROVIDER_ERROR);
  }

  async endSession(_liveRunId: string): Promise<void> {
    this.state = {
      ...this.state,
      status: 'idle',
      lastMessageAt: Date.now(),
      statusSinceMs: null,
    };
    this.emitStatus();
    throw new Error(LIVE_STUB_PROVIDER_ERROR);
  }

  onStatus(cb: StatusListener): () => void {
    this.statusListeners.add(cb);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  onGazePoint(cb: GazePointListener): () => void {
    this.gazePointListeners.add(cb);
    return () => {
      this.gazePointListeners.delete(cb);
    };
  }

  getState(): LiveSessionState {
    return { ...this.state };
  }

  private emitStatus() {
    for (const cb of this.statusListeners) cb(this.getState());
  }
}
