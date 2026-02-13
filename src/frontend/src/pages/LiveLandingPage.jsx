import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LiveLandingPage = () => {
  const navigate = useNavigate();
  const [courseName, setCourseName] = useState('');
  const [room, setRoom] = useState('');
  const [cameraSource, setCameraSource] = useState('');

  const handleStartLiveSession = () => {
    navigate('/live/run', {
      state: {
        draftConfig: {
          courseName: courseName.trim(),
          room: room.trim(),
          cameraSource: cameraSource.trim(),
        },
      },
    });
  };

  return (
    <section className="page-shell live-landing-page">
      <div className="page-header-row">
        <div>
          <h1>Live Analysis</h1>
          <p>Start an operational live run without depending on stored session recordings.</p>
        </div>
      </div>

      <div className="page-panel live-landing-panel">
        <h2>Live Session Setup</h2>
        <p className="helper-text">
          These fields are optional and currently used as local run context for the `/live/run` screen.
        </p>
        <div className="live-landing-form">
          <label>
            Course Name (optional)
            <input
              type="text"
              value={courseName}
              onChange={(event) => setCourseName(event.target.value)}
              placeholder="e.g., CS101 Lecture 4"
            />
          </label>
          <label>
            Room (optional)
            <input
              type="text"
              value={room}
              onChange={(event) => setRoom(event.target.value)}
              placeholder="e.g., ENG-201"
            />
          </label>
          <label>
            Camera Source (optional)
            <input
              type="text"
              value={cameraSource}
              onChange={(event) => setCameraSource(event.target.value)}
              placeholder="e.g., USB Camera 0"
            />
          </label>
        </div>
        <div className="row-actions">
          <button type="button" className="primary-link" onClick={handleStartLiveSession}>
            Start Live Session
          </button>
        </div>
      </div>
    </section>
  );
};

export default LiveLandingPage;
