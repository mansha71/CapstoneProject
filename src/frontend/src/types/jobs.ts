export type JobStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface ProcessingJob {
  id: string;
  status: JobStatus;
  progress?: number;
  createdAt: string;
  updatedAt: string;
  sessionId?: string;
  error?: string;
  input?: {
    sessionName?: string;
    courseCode?: string;
    sessionDate?: string;
    fileName?: string;
  };
}

export interface ImportSessionResponse {
  jobId: string;
  sessionId?: string;
}
