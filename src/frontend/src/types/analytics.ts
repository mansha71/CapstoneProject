/**
 * Canonical analytics shapes expected from the gaze-analytics backend.
 * These types are intentionally versioned and forward-compatible so the frontend
 * can safely evolve with newer analytics pipelines without disruptive refactors.
 */

/** Generic envelope for versioned analytics responses. */
export interface AnalyticsEnvelope<TPayload, TVersion extends string = "v1"> {
  version: TVersion;
  generatedAt: string; // ISO string
  source?: string; // e.g., "socialeyes", "visionaries-pipeline"
  payload: TPayload;
  warnings?: string[];
  debug?: Record<string, unknown>;
}

/** Simple fraction helper for ratios that should render as both count and percent. */
export interface Fraction {
  numerator: number;
  denominator: number;
}

/** Per-timestamp generic time-series point. */
export interface TimeSeriesPoint<T = number> {
  ts: string; // ISO timestamp or an RFC3339 duration offset like PT30S
  value: T;
}

/** Common aggregation bucket for categorical splits. */
export interface DistributionBucket {
  label: string;
  value: number;
  percent?: number; // optional precalculated percent
}

/** Heatmap grid cell or point sample. */
export interface HeatmapSample {
  x: number; // normalized 0-1 or pixel coordinate based on coordinateSpace
  y: number;
  intensity: number; // 0-1 range recommended
  durationMs?: number;
}

export type CoordinateSpace = "normalized" | "pixels";

export interface HeatmapLayer {
  coordinateSpace: CoordinateSpace;
  width?: number; // required if coordinateSpace === "pixels"
  height?: number; // required if coordinateSpace === "pixels"
  samples: HeatmapSample[];
}

/** Grid-based heatmap compatible with SocialEyes outputs (number[][] intensity). */
export interface HeatmapGrid {
  sessionId: string;
  participantId?: string;
  resolution: [number, number]; // [width, height]
  data: number[][]; // normalized 0-1 values
  sigma: number;
  timestampRange?: [number, number]; // seconds
}

/** Focus and attention metrics tied to a session or participant. */
export interface AttentionMetrics {
  currentFocusPercent?: number;
  focusDistribution?: DistributionBucket[]; // e.g., screen vs instructor vs offscreen
  focusOverTime?: TimeSeriesPoint<number>[];
  focusBySlide?: { slide: number; focusPercent: number }[];
  engagementScore?: number; // 0-1
  learningScore?: number; // 0-1
  /** SocialEyes attention ratios (0-1) if provided. */
  attentionOnBoard?: number;
  attentionElsewhere?: number;
}

export interface AudioMetrics {
  talkingMs?: number;
  silenceMs?: number;
  speechBySlide?: { slide: number; hasSpeech: boolean; speechMs?: number }[];
}

export interface SessionHealth {
  validDataPercent?: number;
  avgActiveDevices?: Fraction;
  maxDropout?: Fraction;
  warnings?: string[];
}

export type SessionStatus = "live" | "scheduled" | "completed" | "archived";

/** High-level session summary for list views. */
export interface SessionSummary {
  sessionId: string;
  /** Prefer using name/startedAt in UI; accept SocialEyes fields as inputs. */
  name?: string;
  startedAt?: string; // ISO
  /** Accept SocialEyes naming without breaking existing consumers. */
  sessionName?: string;
  startTime?: string;
  endTime?: string;
  durationSeconds?: number;
  centralVideoUrl?: string;
  durationMs?: number;
  instructor?: string;
  status: SessionStatus;
  participantsTotal?: number;
  activeParticipants?: number;
  participantIds?: string[];
  metadata?: Record<string, unknown>;
  attention?: Pick<AttentionMetrics, "currentFocusPercent" | "engagementScore">;
}

/** More detailed per-participant rollup. */
export interface ParticipantSummary {
  participantId: string;
  displayName?: string;
  deviceId?: string; // alias if backends use device id separate from participant id
  status?: "present" | "absent" | "dropped";
  deviceType?: string;
  attention?: AttentionMetrics;
  audio?: AudioMetrics;
  heatmaps?: HeatmapLayer[]; // point-based layers
  heatmapGrid?: HeatmapGrid; // SocialEyes-style grid heatmap
  totalGazeSamples?: number;
  validGazeSamples?: number;
  gazeQuality?: number;
  socialEyesMetrics?: SocialEyesParticipantMetrics;
}

/** Full session detail including participants and supporting metrics. */
export interface SessionDetail {
  session: SessionSummary;
  attention: AttentionMetrics;
  audio?: AudioMetrics;
  health?: SessionHealth;
  heatmaps?: HeatmapLayer[];
  heatmapsGrid?: {
    aggregated?: HeatmapGrid;
    participants?: Record<string, HeatmapGrid>;
  };
  participants?: ParticipantSummary[];
  slides?: {
    slide: number;
    attentionPercent?: number;
    dwellMs?: number;
    best?: boolean;
    worst?: boolean;
  }[];
  heatmapGridAggregated?: HeatmapGrid; // SocialEyes groupHeatmap
  groupMetrics?: GroupMetrics;
}

/** SocialEyes participant metrics (passthrough for richer detail). */
export interface SocialEyesParticipantMetrics {
  spatialEntropy: number;
  gazeSpread: number;
  meanGazeX: number;
  meanGazeY: number;
  meanVelocity: number;
  meanAcceleration: number;
  meanJerk: number;
  attentionOnBoard: number;
  attentionElsewhere: number;
  fixationCount: number;
  averageFixationDuration: number;
  timeSeries?: LabeledTimeSeriesPoint[];
  rawTimeSeries?: Array<Record<string, unknown>>; // keep raw if backend sends arbitrary shape
}

export interface LabeledTimeSeriesPoint extends TimeSeriesPoint<number> {
  label?: string;
  [key: string]: unknown;
}

export interface GroupMetrics {
  averageAttentionOnBoard: number;
  participantCount: number;
  groupHeatmap: HeatmapGrid;
  attentionSynchrony?: number;
}

export type SessionsListResponse = AnalyticsEnvelope<{
  sessions: SessionSummary[];
}>;

export type SessionDetailResponse = AnalyticsEnvelope<SessionDetail>;

export type ParticipantDetailResponse = AnalyticsEnvelope<ParticipantSummary>;

/** Mock/example payloads to drive UI scaffolding while the backend is evolving. */

// Constants for consistent mock data - ensures all participant-related metrics are aligned
const MOCK_PARTICIPANTS_TOTAL = 32; // Total registered participants
const MOCK_ACTIVE_PARTICIPANTS = 30; // Currently active participants
const MOCK_AVG_ACTIVE_DEVICES_NUMERATOR = 27; // Average active devices (numerator)
const MOCK_MAX_DROPOUT_NUMERATOR = 4; // Maximum concurrent dropouts (numerator)

export const exampleSessionsList: SessionsListResponse = {
  version: "v1",
  generatedAt: new Date().toISOString(),
  source: "mock",
  payload: {
    sessions: [
      {
        sessionId: "sess-001",
        name: "Intro to ML",
        startedAt: "2024-11-20T10:00:00Z",
        durationMs: 75 * 60 * 1000,
        instructor: "Dr. Smith",
        status: "completed",
        participantsTotal: MOCK_PARTICIPANTS_TOTAL,
        activeParticipants: MOCK_ACTIVE_PARTICIPANTS,
        attention: {
          currentFocusPercent: 76,
          engagementScore: 0.78,
        },
      },
      {
        sessionId: "sess-002",
        name: "Data Viz Workshop",
        startedAt: "2024-11-21T15:00:00Z",
        durationMs: 60 * 60 * 1000,
        instructor: "Prof. Patel",
        status: "live",
        participantsTotal: 25,
        activeParticipants: 24,
        attention: {
          currentFocusPercent: 82,
          engagementScore: 0.81,
        },
      },
    ],
  },
};

export const exampleSessionDetail: SessionDetailResponse = {
  version: "v1",
  generatedAt: new Date().toISOString(),
  payload: {
    session: exampleSessionsList.payload.sessions[0],
    heatmapsGrid: {
      aggregated: {
        sessionId: "sess-001",
        resolution: [640, 480],
        data: Array.from({ length: 4 }, () =>
          Array.from({ length: 4 }, () => Math.random())
        ),
        sigma: 15,
      },
    },
    attention: {
      currentFocusPercent: 76,
      engagementScore: 0.78,
      attentionOnBoard: 0.74,
      attentionElsewhere: 0.26,
      focusDistribution: [
        { label: "screen", value: 52, percent: 52 },
        { label: "instructor", value: 24, percent: 24 },
        { label: "offScreen", value: 24, percent: 24 },
      ],
      focusOverTime: [
        { ts: "PT0M", value: 40 },
        { ts: "PT5M", value: 60 },
        { ts: "PT10M", value: 80 },
      ],
      focusBySlide: [
        { slide: 1, focusPercent: 65 },
        { slide: 2, focusPercent: 70 },
        { slide: 3, focusPercent: 55 },
      ],
      learningScore: 0.78,
    },
    audio: {
      talkingMs: 18 * 60 * 1000,
      silenceMs: 5 * 60 * 1000,
      speechBySlide: [
        { slide: 1, hasSpeech: true, speechMs: 120000 },
        { slide: 2, hasSpeech: true, speechMs: 180000 },
        { slide: 3, hasSpeech: false },
      ],
    },
    health: {
      validDataPercent: 94,
      avgActiveDevices: { numerator: MOCK_AVG_ACTIVE_DEVICES_NUMERATOR, denominator: MOCK_ACTIVE_PARTICIPANTS },
      maxDropout: { numerator: MOCK_MAX_DROPOUT_NUMERATOR, denominator: MOCK_ACTIVE_PARTICIPANTS },
    },
    heatmaps: [
      {
        coordinateSpace: "normalized",
        samples: [
          { x: 0.45, y: 0.35, intensity: 0.9, durationMs: 850 },
          { x: 0.62, y: 0.52, intensity: 0.65, durationMs: 420 },
        ],
      },
    ],
    heatmapGridAggregated: {
      sessionId: "sess-001",
      resolution: [640, 480],
      data: Array.from({ length: 4 }, () =>
        Array.from({ length: 4 }, () => Math.random())
      ),
      sigma: 15,
    },
    groupMetrics: {
      averageAttentionOnBoard: 0.74,
      participantCount: MOCK_ACTIVE_PARTICIPANTS,
      groupHeatmap: {
        sessionId: "sess-001",
        resolution: [640, 480],
        data: Array.from({ length: 4 }, () =>
          Array.from({ length: 4 }, () => Math.random())
        ),
        sigma: 15,
      },
      attentionSynchrony: 0.62,
    },
    participants: [
      {
        participantId: "P-101",
        displayName: "G011",
        status: "present",
        attention: {
          currentFocusPercent: 83,
          focusOverTime: [
            { ts: "PT0M", value: 50 },
            { ts: "PT5M", value: 75 },
          ],
        },
        heatmapGrid: {
          sessionId: "sess-001",
          participantId: "P-101",
          resolution: [640, 480],
          data: Array.from({ length: 4 }, () =>
            Array.from({ length: 4 }, () => Math.random())
          ),
          sigma: 12,
        },
        totalGazeSamples: 1200,
        validGazeSamples: 1150,
        gazeQuality: 0.96,
        socialEyesMetrics: {
          spatialEntropy: 0.42,
          gazeSpread: 18.2,
          meanGazeX: 320.5,
          meanGazeY: 241.3,
          meanVelocity: 0.12,
          meanAcceleration: 0.02,
          meanJerk: 0.005,
          attentionOnBoard: 0.78,
          attentionElsewhere: 0.22,
          fixationCount: 45,
          averageFixationDuration: 220,
          timeSeries: [
            { ts: "PT0M", value: 0.5, label: "attention" },
            { ts: "PT1M", value: 0.7, label: "attention" },
          ],
        },
        heatmaps: [
          {
            coordinateSpace: "normalized",
            samples: [{ x: 0.5, y: 0.4, intensity: 0.8 }],
          },
        ],
      },
      // Additional participants to match session summary
      // Note: In a real scenario, all MOCK_ACTIVE_PARTICIPANTS active participants would be listed here
      // For the example, we include a few representative samples with different statuses
      {
        participantId: "P-102",
        displayName: "G012",
        status: "present",
        attention: {
          currentFocusPercent: 75,
        },
      },
      {
        participantId: "P-103",
        displayName: "G013",
        status: "dropped",
        attention: {
          currentFocusPercent: 45,
        },
      },
      {
        participantId: "P-104",
        displayName: "G014",
        status: "dropped",
        attention: {
          currentFocusPercent: 50,
        },
      },
      {
        participantId: "P-105",
        displayName: "G015",
        status: "absent",
      },
      {
        participantId: "P-106",
        displayName: "G016",
        status: "absent",
      },
    ],
    slides: [
      { slide: 1, attentionPercent: 73, dwellMs: 135000, best: false },
      { slide: 2, attentionPercent: 89, dwellMs: 180000, best: true },
      { slide: 3, attentionPercent: 42, dwellMs: 90000, worst: true },
    ],
  },
};

export const exampleParticipantDetail: ParticipantDetailResponse = {
  version: "v1",
  generatedAt: new Date().toISOString(),
  payload: exampleSessionDetail.payload.participants?.[0] ?? {
    participantId: "placeholder",
  },
};
