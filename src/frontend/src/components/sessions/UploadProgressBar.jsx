const UploadProgressBar = ({ progress, label }) => (
  <div className="upload-progress">
    <div className="inline-progress-track">
      <div
        className="inline-progress-fill"
        style={{ width: `${typeof progress === 'number' ? progress : 100}%` }}
      />
    </div>
    <p>{label}</p>
  </div>
);

export default UploadProgressBar;
