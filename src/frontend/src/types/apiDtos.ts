export interface SessionImportDto {
  jobId: string;
  sessionId?: string;
}

export interface JobDto {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  createdAt: string;
  updatedAt: string;
  sessionId?: string;
  error?: string;
}

export interface SessionResourceDto {
  session?: Record<string, unknown>;
  media?: {
    heatmapVideoUrl?: string;
    centralCamUrl?: string;
    slideDeckUrl?: string;
  };
  tracking?: Record<string, unknown>;
  processing?: Record<string, unknown>;
  relatedJobId?: string;
}
