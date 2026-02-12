const SessionMetadataForm = ({ metadata, onChange }) => (
  <div className="metadata-form">
    <label>
      Session Name
      <input
        type="text"
        value={metadata.sessionName}
        onChange={(event) => onChange('sessionName', event.target.value)}
        placeholder="Optional session title"
      />
    </label>
    <label>
      Course Code
      <input
        type="text"
        value={metadata.courseCode}
        onChange={(event) => onChange('courseCode', event.target.value)}
        placeholder="Optional course code"
      />
    </label>
    <label>
      Date
      <input
        type="date"
        value={metadata.sessionDate}
        onChange={(event) => onChange('sessionDate', event.target.value)}
      />
    </label>
  </div>
);

export default SessionMetadataForm;
