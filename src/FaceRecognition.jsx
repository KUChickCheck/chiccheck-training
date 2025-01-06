import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

const FaceRecognition = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [detections, setDetections] = useState([]);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const loadModels = async () => {
        try {
          const modelUrl = 'http://localhost:5174/models';
          console.log("Loading models from: ", modelUrl); // Check the full model URL
          await faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl);
          await faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl);
          await faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl);
          await faceapi.nets.faceExpressionNet.loadFromUri(modelUrl);
          await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
          setIsLoaded(true);
        } catch (err) {
          console.error("Error loading models:", err);
        }
      };
      
      

    loadModels();

    const video = videoRef.current;
    if (video) {
      video.addEventListener('play', () => {
        const canvas = faceapi.createCanvasFromMedia(video);
        canvasRef.current = canvas;
        document.body.append(canvas);
        const displaySize = { width: video.width, height: video.height };
        faceapi.matchDimensions(canvas, displaySize);

        const interval = setInterval(async () => {
          const detections = await faceapi.detectAllFaces(video)
            .withFaceLandmarks()
            .withFaceDescriptors()
            .withFaceExpressions();

          setDetections(detections);
          canvas?.clear();
          canvas?.drawDetections(detections);
          canvas?.drawFaceLandmarks(detections);
          canvas?.drawFaceExpressions(detections);
        }, 100);

        return () => clearInterval(interval); // cleanup interval
      });
    }
  }, []);

  const startVideo = () => {
    navigator.mediaDevices
      .getUserMedia({ video: {} })
      .then((stream) => {
        videoRef.current.srcObject = stream;
      })
      .catch((err) => console.error('Error accessing webcam: ', err));
  };

  return (
    <div>
      <h1>Face Recognition</h1>
      {!isLoaded ? (
        <p>Loading models...</p>
      ) : (
        <>
          <video
            ref={videoRef}
            width="720"
            height="560"
            autoPlay
            muted
            onPlay={startVideo}
          />
          <div>
            {detections.length > 0 && (
              <p>Detected faces: {detections.length}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FaceRecognition;
