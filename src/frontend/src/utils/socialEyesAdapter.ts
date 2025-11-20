import type {
  AttentionMetrics,
  GroupMetrics,
  HeatmapGrid,
  ParticipantSummary,
  SessionDetail,
  SessionDetailResponse,
  SessionStatus,
  SessionSummary,
  SocialEyesParticipantMetrics,
} from '../types/analytics';

export interface SocialEyesTimeSeriesPoint {
  ts: string;
  value: number;
  label?: string;
  [key: string]: unknown;
}

export interface SocialEyesParticipantMetricsInput
  extends Omit<SocialEyesParticipantMetrics, 'timeSeries' | 'rawTimeSeries'> {
  timeSeries?: Array<Record<string, unknown>>;
}

export interface SocialEyesParticipantSummary {
  participantId: string;
  sessionId: string;
  displayName?: string;
  totalGazeSamples?: number;
  validGazeSamples?: number;
  gazeQuality?: number;
  metrics?: SocialEyesParticipantMetricsInput;
}

export interface SocialEyesHeatmapData {
  sessionId: string;
  participantId?: string;
  resolution?: [number, number] | number[];
  data?: number[][];
  sigma?: number;
  timestampRange?: [number, number];
}

export interface SocialEyesGroupMetrics {
  averageAttentionOnBoard?: number;
  participantCount?: number;
  groupHeatmap?: SocialEyesHeatmapData;
  attentionSynchrony?: number;
}

export interface SocialEyesSessionDetails {
  sessionId: string;
  sessionName?: string;
  startTime?: string;
  endTime?: string;
  durationSeconds?: number;
  participantCount?: number;
  participantIds?: string[];
  centralVideoUrl?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  participants?: SocialEyesParticipantSummary[];
  groupMetrics?: SocialEyesGroupMetrics;
  heatmaps?: {
    aggregated?: SocialEyesHeatmapData;
    participants?: Record<string, SocialEyesHeatmapData>;
  };
}

export interface SocialEyesAdapterOptions {
  version?: string;
  generatedAt?: string;
  source?: string;
}

const SESSION_STATUS_MAP: Record<string, SessionStatus> = {
  live: 'live',
  scheduled: 'scheduled',
  completed: 'completed',
  archived: 'archived',
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

const normalizeSessionStatus = (status?: string): SessionStatus => {
  if (!status) return 'completed';
  const normalized = status.toLowerCase();
  return SESSION_STATUS_MAP[normalized] ?? 'completed';
};

const adaptHeatmapGrid = (heatmap?: SocialEyesHeatmapData): HeatmapGrid | undefined => {
  if (!heatmap) return undefined;

  const [width = 640, height = 480] = heatmap.resolution ?? [];

  return {
    sessionId: heatmap.sessionId,
    participantId: heatmap.participantId,
    resolution: [width, height],
    data: heatmap.data ?? [],
    sigma: heatmap.sigma ?? 15,
    timestampRange: heatmap.timestampRange,
  };
};

const adaptTimeSeries = (
  points?: Array<Record<string, unknown>>
): SocialEyesTimeSeriesPoint[] | undefined => {
  if (!points) return undefined;

  return points
    .map((point) => {
      const rawTs = point.ts;
      const ts =
        typeof rawTs === 'string'
          ? rawTs
          : rawTs !== undefined
            ? String(rawTs)
            : undefined;
      const rawValue = point.value;
      const value =
        typeof rawValue === 'number'
          ? rawValue
          : rawValue !== undefined
            ? Number(rawValue)
            : undefined;

      if (!ts || value === undefined || Number.isNaN(value)) {
        return undefined;
      }

      const { ts: _discardTs, value: _discardValue, ...rest } = point;
      return {
        ts,
        value,
        ...(rest as Record<string, unknown>),
      };
    })
    .filter((entry): entry is SocialEyesTimeSeriesPoint => Boolean(entry));
};

const adaptParticipantMetrics = (
  metrics?: SocialEyesParticipantMetricsInput
): SocialEyesParticipantMetrics | undefined => {
  if (!metrics) return undefined;

  const typedTimeSeries = adaptTimeSeries(metrics.timeSeries);

  return {
    ...metrics,
    timeSeries: typedTimeSeries,
    rawTimeSeries: metrics.timeSeries,
  };
};

const adaptParticipant = (
  participant: SocialEyesParticipantSummary,
  participantHeatmap?: SocialEyesHeatmapData
): ParticipantSummary => {
  const metrics = adaptParticipantMetrics(participant.metrics);

  const attention: AttentionMetrics = {};
  const attentionOnBoard = metrics?.attentionOnBoard;

  if (isFiniteNumber(attentionOnBoard)) {
    attention.currentFocusPercent = Math.round(clamp01(attentionOnBoard) * 100);
    attention.attentionOnBoard = clamp01(attentionOnBoard);
    attention.attentionElsewhere = clamp01(1 - attentionOnBoard);
  }

  return {
    participantId: participant.participantId,
    displayName: participant.displayName,
    attention: Object.keys(attention).length ? attention : undefined,
    heatmapGrid: adaptHeatmapGrid(participantHeatmap),
    totalGazeSamples: participant.totalGazeSamples,
    validGazeSamples: participant.validGazeSamples,
    gazeQuality: participant.gazeQuality,
    socialEyesMetrics: metrics,
  };
};

const adaptSessionSummary = (
  session: SocialEyesSessionDetails,
  participantCount: number,
  participantIds: string[]
): SessionSummary => ({
  sessionId: session.sessionId,
  name: session.sessionName,
  sessionName: session.sessionName,
  startedAt: session.startTime,
  startTime: session.startTime,
  endTime: session.endTime,
  durationSeconds: session.durationSeconds,
  durationMs: isFiniteNumber(session.durationSeconds)
    ? session.durationSeconds * 1000
    : undefined,
  centralVideoUrl: session.centralVideoUrl,
  status: normalizeSessionStatus(session.status),
  participantsTotal: session.participantCount ?? participantCount,
  activeParticipants: participantCount,
  participantIds: participantIds.length ? participantIds : undefined,
  metadata: session.metadata,
});

const adaptSessionAttention = (groupMetrics?: SocialEyesGroupMetrics): AttentionMetrics => {
  const attention: AttentionMetrics = {};

  if (isFiniteNumber(groupMetrics?.averageAttentionOnBoard)) {
    const normalized = clamp01(groupMetrics!.averageAttentionOnBoard!);
    attention.currentFocusPercent = Math.round(normalized * 100);
    attention.attentionOnBoard = normalized;
    attention.attentionElsewhere = clamp01(1 - normalized);
  }

  if (isFiniteNumber(groupMetrics?.attentionSynchrony)) {
    attention.engagementScore = clamp01(groupMetrics!.attentionSynchrony!);
  }

  return attention;
};

const adaptGroupMetrics = (
  groupMetrics: SocialEyesGroupMetrics | undefined,
  aggregatedHeatmap: HeatmapGrid | undefined,
  participantCount: number
): GroupMetrics | undefined => {
  if (!groupMetrics && !aggregatedHeatmap) {
    return undefined;
  }

  const averageAttention = clamp01(groupMetrics?.averageAttentionOnBoard ?? 0);
  const resolvedParticipantCount = groupMetrics?.participantCount ?? participantCount;

  return {
    averageAttentionOnBoard: averageAttention,
    participantCount: resolvedParticipantCount,
    groupHeatmap: aggregatedHeatmap ?? adaptHeatmapGrid(groupMetrics?.groupHeatmap) ?? {
      sessionId: 'unknown',
      resolution: [640, 480],
      data: [],
      sigma: 15,
    },
    attentionSynchrony: groupMetrics?.attentionSynchrony,
  };
};

/**
 * Convert a SocialEyes session JSON payload into the AnalyticsEnvelope<SessionDetail> shape.
 *
 * @example
 * ```ts
 * const socialEyesData = await fetch('/sessions/summary.json').then((res) => res.json());
 * const analyticsReady = adaptSocialEyesSessionToAnalytics(socialEyesData);
 * ```
 */
export const adaptSocialEyesSessionToAnalytics = (
  session: SocialEyesSessionDetails,
  options: SocialEyesAdapterOptions = {}
): SessionDetailResponse => {
  const participantHeatmapMap =
    session.heatmaps?.participants ?? ({} as Record<string, SocialEyesHeatmapData>);
  const participants = (session.participants ?? []).map((participant) =>
    adaptParticipant(participant, participantHeatmapMap[participant.participantId])
  );

  const participantIds =
    session.participantIds ?? participants.map((participant) => participant.participantId);

  const aggregatedHeatmap = adaptHeatmapGrid(session.heatmaps?.aggregated);
  const participantHeatmapsEntries = Object.entries(participantHeatmapMap)
    .map(([participantId, heatmap]) => {
      const adaptedHeatmap = adaptHeatmapGrid(heatmap);
      return adaptedHeatmap ? [participantId, adaptedHeatmap] : undefined;
    })
    .filter((entry): entry is [string, HeatmapGrid] => Boolean(entry));

  const heatmapsGrid =
    aggregatedHeatmap || participantHeatmapsEntries.length
      ? {
          aggregated: aggregatedHeatmap,
          participants: participantHeatmapsEntries.length
            ? Object.fromEntries(participantHeatmapsEntries)
            : undefined,
        }
      : undefined;

  const sessionSummary = adaptSessionSummary(
    session,
    participants.length,
    participantIds
  );

  const attention = adaptSessionAttention(session.groupMetrics);
  const groupMetrics = adaptGroupMetrics(
    session.groupMetrics,
    aggregatedHeatmap,
    participants.length || session.participantCount || 0
  );

  const payload: SessionDetail = {
    session: sessionSummary,
    attention,
    participants,
    groupMetrics,
    heatmapGridAggregated: aggregatedHeatmap,
    heatmapsGrid,
  };

  return {
    version: options.version ?? 'v1',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    source: options.source ?? 'socialeyes',
    payload,
  };
};

export type { SocialEyesSessionDetails as SocialEyesSessionDetailsPayload };

