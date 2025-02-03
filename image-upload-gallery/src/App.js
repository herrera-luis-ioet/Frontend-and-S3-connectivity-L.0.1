import { useState, useEffect } from 'react';
import './App.css';
import ImageUpload from './components/ImageUpload';
import ImageGallery from './components/ImageGallery';
import { configureS3 } from './utils/s3Config';

// eslint-disable-next-line no-undef
const { REACT_APP_AWS_ACCESS_KEY_ID, REACT_APP_AWS_SECRET_ACCESS_KEY, REACT_APP_AWS_REGION, REACT_APP_S3_BUCKET } = process.env;
function App() {
  const [s3, setS3] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      // Configure S3 with your credentials
      const s3Instance = configureS3({
        accessKeyId: REACT_APP_AWS_ACCESS_KEY_ID,
        secretAccessKey: REACT_APP_AWS_SECRET_ACCESS_KEY,
        region: REACT_APP_AWS_REGION,
        bucket: REACT_APP_S3_BUCKET
      });
      setS3(s3Instance);
    } catch (err) {
       
      console.error('Error configuring S3:', err);
      setError('Failed to configure S3. Please check your credentials.');
    }
  }, []);

  if (error) {
    return (
      <div className="App">
        <h1>Image Upload and Display Component</h1>
        <div style={{ color: 'red', margin: '20px' }}>{error}</div>
      </div>
    );
  }

  return (
    <div className="App">
      <h1>Image Upload and Display Component</h1>
      <ImageUpload s3={s3} bucket={REACT_APP_S3_BUCKET} />
      <div style={{ margin: '40px 0' }}>
        <h2>Uploaded Images</h2>
        {s3 && <ImageGallery s3={s3} bucket={REACT_APP_S3_BUCKET} />}
      </div>
    </div>
  );
}

export default App;
