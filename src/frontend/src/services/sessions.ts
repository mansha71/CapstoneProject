import { del, get, post } from './apiClient';
import { createMockJob, getMockJobsSnapshot } from './jobs';
import { exampleSessionDetail, exampleSessionsList } from '../types/analytics';

const buildDefaultTracking = (videoWidth = 1280, videoHeight = 720) => {
  const frameDetections = Array.from({ length: 120 }, (_, index) => {
    const tMs = index * 500;
    const centerX = 0.5 + Math.sin(index / 15) * 0.12;
    const centerY = 0.45 + Math.cos(index / 18) * 0.08;
    const w = 0.14;
    const h = 0.28;
    return {
      tMs,
      bbox: index % 37 === 0 ? null : {
        x: centerX - w / 2,
        y: centerY - h / 2,
        w,
        h,
      },
      conf: index % 37 === 0 ? null : 0.88,
    };
  });

  const trackPoints = frameDetections
    .filter((frame) => frame.bbox)
    .map((frame) => ({
      tMs: frame.tMs,
      trackId: 1,
      cx: frame.bbox.x + frame.bbox.w / 2,
      cy: frame.bbox.y + frame.bbox.h / 2,
      quality: 'measured',
    }));

  return {
    coordinateSystem: 'normalized',
    video: { width: videoWidth, height: videoHeight, fps: 2 },
    processingMeta: {
      detector: 'YOLOv8n',
      detectorRuntime: 'onnxruntime',
      tracker: 'IoU-Tracker',
      trackerParams: { iouThreshold: 0.3 },
      cleaning: { minConf: 0.4, maxGapFrames: 10 },
    },
    frameDetections,
    trackPoints,
    derivedMetrics: {
      coverage: 0.91,
      gapCount: 3,
      longestGapMs: 2500,
      distance: 520,
      jitter: 0.08,
    },
  };
};

const normalizeSessionResource = (rawSession) => {
  // Backend v1 shape: { session, media, processing, relatedJobId, hasInstructorTrackingResult }
  if (rawSession?.session && rawSession?.media) {
    return {
      session: rawSession.session,
      analyticsDetail: rawSession.analyticsDetail ?? null,
      media: {
        heatmapVideoUrl: rawSession.media?.heatmapVideoUrl ?? null,
        centralCamUrl: rawSession.media?.centralCamUrl ?? null,
        slideDeckUrl: rawSession.media?.slideDeckUrl ?? null,
      },
      tracking: rawSession.tracking ?? null,
      processing: rawSession.processing ?? null,
      relatedJobId: rawSession.relatedJobId ?? null,
    };
  }

  // Legacy / mock shape (exampleSessionDetail-style payloads)
  const payload = rawSession?.payload ?? rawSession?.session ?? rawSession;
  return {
    session: payload?.session ?? payload?.metadata ?? payload ?? null,
    analyticsDetail: payload?.attention ? payload : null,
    media: payload?.media ?? {
      heatmapVideoUrl: payload?.heatmapVideoUrl ?? null,
      centralCamUrl: payload?.centralCamUrl ?? null,
      slideDeckUrl: payload?.slideDeckUrl ?? null,
    },
    tracking: payload?.tracking ?? null,
    processing: payload?.processing ?? null,
    relatedJobId: payload?.relatedJobId ?? null,
  };
};

const deriveSessionsFromMockJobs = () => {
  const jobs = getMockJobsSnapshot();
  return jobs
    .filter((job) => job.status === 'completed' && job.sessionId)
    .map((job) => ({
      sessionId: job.sessionId,
      name: job.input?.sessionName || 'Imported Session',
      startedAt: job.input?.sessionDate || job.updatedAt,
      status: 'completed',
      relatedJobId: job.id,
      metadata: {
        source: 'local-import',
        courseCode: job.input?.courseCode || '',
      },
    }));
};

export const listSessions = async () => {
  try {
    const data = await get('/sessions');
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.sessions)) return data.sessions;
    if (Array.isArray(data?.payload?.sessions)) return data.payload.sessions;
    return [];
  } catch (_error) {
    return [
      ...exampleSessionsList.payload.sessions.filter((session) => session.status === 'completed'),
      ...deriveSessionsFromMockJobs(),
    ];
  }
};

export const getSession = async (sessionId) => {
  try {
    const data = await get(`/sessions/${sessionId}`);
    const resource = normalizeSessionResource(data);
    
    // Fetch tracking results separately if available
    if (data?.hasInstructorTrackingResult) {
      try {
        const trackingData = await get(`/sessions/${sessionId}/results/instructor-tracking`);
        resource.tracking = trackingData?.data ?? null;
      } catch (_trackingError) {
        // Tracking endpoint failed, leave tracking as null
        resource.tracking = null;
      }
    }
    
    return resource;
  } catch (_error) {
    const mockJob = getMockJobsSnapshot().find((job) => job.sessionId === sessionId);
    if (sessionId === exampleSessionDetail.payload.session.sessionId) {
      return {
        session: exampleSessionDetail.payload.session,
        analyticsDetail: exampleSessionDetail.payload,
        media: {
          heatmapVideoUrl: null,
          centralCamUrl: null,
          slideDeckUrl: null,
        },
        tracking: buildDefaultTracking(),
        processing: {
          status: 'completed',
          detector: 'YOLOv8n',
          tracker: 'IoU-Tracker',
          postProcessingSteps: ['bbox smoothing', 'gap interpolation', 'confidence filtering'],
          label: 'Post-processed (not real-time)',
        },
        relatedJobId: null,
      };
    }
    if (mockJob?.status === 'completed') {
      return {
        session: {
          sessionId: mockJob.sessionId,
          name: mockJob.input?.sessionName || 'Imported Session',
          startedAt: mockJob.input?.sessionDate || mockJob.updatedAt,
          status: 'completed',
          metadata: { source: 'local-import' },
        },
        analyticsDetail: exampleSessionDetail.payload,
        media: {
          heatmapVideoUrl: null,
          centralCamUrl: null,
          slideDeckUrl: null,
        },
        tracking: buildDefaultTracking(),
        processing: {
          status: 'completed',
          detector: 'YOLOv8n',
          tracker: 'IoU-Tracker',
          postProcessingSteps: ['bbox smoothing', 'gap interpolation', 'confidence filtering'],
          label: 'Post-processed (not real-time)',
        },
        relatedJobId: mockJob.id,
      };
    }
    if (mockJob?.status === 'failed') {
      return {
        session: null,
        analyticsDetail: null,
        media: null,
        tracking: null,
        processing: { status: 'failed', error: mockJob.error || 'Processing failed' },
        relatedJobId: mockJob.id,
      };
    }
    if (mockJob) {
      return {
        session: null,
        analyticsDetail: null,
        media: null,
        tracking: null,
        processing: { status: mockJob.status, progress: mockJob.progress ?? 0 },
        relatedJobId: mockJob.id,
      };
    }
    throw new Error('Session not found');
  }
};

export const importSession = async (formData) => {
  try {
    const data = await post('/sessions/import', formData);
    return {
      jobId: data?.jobId ?? data?.job?.id,
      sessionId: data?.sessionId,
    };
  } catch (_error) {
    const metadataRaw = formData.get('metadata');
    let metadata = {};
    if (typeof metadataRaw === 'string') {
      try {
        metadata = JSON.parse(metadataRaw);
      } catch (_parseError) {
        metadata = {};
      }
    }

    const videoFile = formData.get('video');
    const mockJob = createMockJob({
      ...metadata,
      fileName: typeof videoFile === 'object' ? videoFile?.name : undefined,
    });
    return { jobId: mockJob.id, sessionId: mockJob.sessionId };
  }
};

export const deleteSession = async (sessionId) => {
  await del(`/sessions/${sessionId}`);
};
