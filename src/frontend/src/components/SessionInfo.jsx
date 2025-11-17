import { Calendar, Hash, FileText } from 'lucide-react';

const SessionInfo = ({ sessionName = 'Session 1', sessionId = 'SES-001', sessionDate = null }) => {
  // Format date - use provided date or current date as fallback
  const formatDate = (date) => {
    if (!date) {
      date = new Date();
    } else if (typeof date === 'string') {
      date = new Date(date);
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const displayDate = formatDate(sessionDate);

  return (
    <div className="session-info">
      <div className="session-info-item">
        <FileText size={16} className="session-info-icon" />
        <span className="session-info-label">Session:</span>
        <span className="session-info-value">{sessionName}</span>
      </div>
      <div className="session-info-item">
        <Hash size={16} className="session-info-icon" />
        <span className="session-info-label">ID:</span>
        <span className="session-info-value">{sessionId}</span>
      </div>
      <div className="session-info-item">
        <Calendar size={16} className="session-info-icon" />
        <span className="session-info-label">Date:</span>
        <span className="session-info-value">{displayDate}</span>
      </div>
    </div>
  );
};

export default SessionInfo;

