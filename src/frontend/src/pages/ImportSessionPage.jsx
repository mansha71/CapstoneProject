import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import VideoUploadDropzone from '../components/sessions/VideoUploadDropzone';
import SessionMetadataForm from '../components/sessions/SessionMetadataForm';
import UploadProgressBar from '../components/sessions/UploadProgressBar';
import { importSession } from '../services/sessions';

const ImportSessionPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState({
    sessionName: '',
    courseCode: '',
    sessionDate: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [statusLabel, setStatusLabel] = useState('');
  const canSubmit = Boolean(file) && !submitting;

  const updateMetadata = (key, value) => {
    setMetadata((previous) => ({ ...previous, [key]: value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Please upload a video file to continue.');
      return;
    }

    setSubmitting(true);
    setError('');
    setStatusLabel('Uploading session and creating processing job...');

    const formData = new FormData();
    formData.append('video', file);
    formData.append('metadata', JSON.stringify(metadata));

    try {
      const result = await importSession(formData);
      setStatusLabel('Processing job created. Redirecting...');
      navigate(`/jobs/${result.jobId}`);
    } catch (submitError) {
      setError(submitError.message || 'Unable to import session.');
      setStatusLabel('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-shell import-session-page">
      <div className="page-header-row import-session-header">
        <div>
          <h1>Import Session</h1>
          <p>
            Upload a recording to run instructor detection and tracking post-processing.
          </p>
        </div>
      </div>

      <form className="import-form import-session-form" onSubmit={onSubmit}>
        <div className="page-panel sessions-page-panel import-panel">
          <h2>Upload Recording</h2>
          <VideoUploadDropzone file={file} onFileChange={setFile} />
          <p className="helper-text import-dropzone-hint">
            {file
              ? `Selected file: ${file.name} (${Math.round(file.size / 1024 / 1024)} MB)`
              : 'Drag-and-drop an MP4 or click the area above to choose a file.'}
          </p>
        </div>

        <div className="page-panel sessions-page-panel import-panel">
          <h2>Session Details</h2>
          <SessionMetadataForm metadata={metadata} onChange={updateMetadata} />
        </div>

        {submitting ? <UploadProgressBar progress={65} label={statusLabel} /> : null}
        {statusLabel && !error && !submitting ? (
          <p className="import-status-label">{statusLabel}</p>
        ) : null}
        {error ? <p className="job-error">{error}</p> : null}

        <div className="row-actions import-session-actions">
          <Link to="/sessions" className="secondary-link">
            Back to Sessions
          </Link>
          <button type="submit" className="primary-link" disabled={!canSubmit}>
            {submitting ? 'Importing...' : 'Start Processing'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default ImportSessionPage;
