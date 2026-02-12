import { useRef } from 'react';

const VideoUploadDropzone = ({ file, onFileChange }) => {
  const fileInputRef = useRef(null);

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;
    onFileChange(selectedFile);
  };

  const onDrop = (event) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0];
    handleFile(dropped);
  };

  return (
    <div
      className="video-dropzone"
      onDrop={onDrop}
      onDragOver={(event) => event.preventDefault()}
      onClick={() => fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
      <h3>{file ? file.name : 'Drop a session recording here'}</h3>
      <p>{file ? `${Math.round(file.size / 1024 / 1024)} MB` : 'Click to choose a video file'}</p>
    </div>
  );
};

export default VideoUploadDropzone;
