export type LiveSessionStatus = 'idle' | 'running' | 'ended';

export type LiveSessionState = {
  status: LiveSessionStatus;
  connected: boolean;
  lastMessageAt: number | null;
  statusSinceMs: number | null;
};

export type GazePointEvent = {
  tMs: number;
  participantId: string;
  x: number;
  y: number;
  confidence?: number;
};

export type StatusListener = (state: LiveSessionState) => void;
export type GazePointListener = (event: GazePointEvent) => void;
export type Unsubscribe = () => void;

export interface LiveSessionProvider {
  connect(): Promise<void>;
  disconnect(): void;
  startSession(liveRunId: string): Promise<void>;
  endSession(liveRunId: string): Promise<void>;
  onStatus(cb: StatusListener): Unsubscribe;
  onGazePoint(cb: GazePointListener): Unsubscribe;
  getState(): LiveSessionState;
}
