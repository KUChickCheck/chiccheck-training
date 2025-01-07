import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  FaceDetector,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";

const FaceDetection = () => {
  const [faceDetector, setFaceDetector] = useState(null);
  const [detections, setDetections] = useState([]);
  const videoRef = useRef(null);
  const liveViewRef = useRef(null);
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);
  const [liveness, setLiveness] = useState([]);

  const [selectedApiPath, setSelectedApiPath] = useState("predict"); // Default path
  const [selectedLabel, setSelectedLabel] = useState("live"); // Default label for "train"

  const handleApiSelection = (event) => {
    setSelectedApiPath(event.target.value);
    // Reset label when switching from "train" to another option
    if (event.target.value !== "predict") {
      setSelectedLabel(""); // Clear label when not "train"
    }
  };

  const handleLabelSelection = (event) => {
    setSelectedLabel(event.target.value);
  };

  // Initialize the face detector
  useEffect(() => {
    const initializeFaceDetector = async () => {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
      );
      const detector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
      });
      setFaceDetector(detector);
    };

    initializeFaceDetector();

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Enable webcam and start detection
  const enableWebcam = async () => {
    if (!faceDetector) {
      alert("Face Detector is still loading. Please try again.");
      return;
    }

    const constraints = { video: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    videoRef.current.srcObject = stream;

    videoRef.current.onloadeddata = () => {
      startPrediction();
    };
  };

  // Start predictions at 30 FPS
  const startPrediction = () => {
    if (!faceDetector || !videoRef.current) return;

    intervalRef.current = setInterval(() => {
      const video = videoRef.current;
      const currentTime = performance.now();

      const result = faceDetector.detectForVideo(video, currentTime);
      setDetections(result.detections);

      //   const validDetections = result.detections.filter((detection) => {
      //     const { score } = detection.categories[0];
      //     return score > 0.9; // 90% threshold
      //   });

      //   if (validDetections.length === 0) {
      //     console.log("No face with a high enough score for liveness detection.");
      //     return;
      //   }

      //   captureAndSendImage()
    }, 0); // Use the default interval without specifying 33ms
  };

  // Capture the current frame and send it to the API for liveness check
  const captureAndSendImage = async () => {
    
    if (!videoRef.current || !canvasRef.current) return;

    if (selectedApiPath === "train" && !selectedLabel) {
      alert("Please select a label (live or spoof) for training.");
      return;
    }

    // Filter detections with score greater than 60%
    const validDetections = detections.filter((detection) => {
      const { score } = detection.categories[0];
      return score > 0.6; // 60% threshold
    });

    // Check if more than one face is detected
    if (validDetections.length > 1) {
      console.log("More than one face detected. Only one face is allowed.");
      return; // Do not process the image
    }

    if (validDetections.length === 0) {
      console.log("No face with a high enough score for liveness detection.");
      return;
    }

    // Draw the current video frame to the canvas
    const context = canvasRef.current.getContext("2d");
    context.drawImage(
      videoRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );

    // Convert the canvas to a Blob (image file)
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;

      // Create a unique filename using the current timestamp
      const timestamp = new Date().toISOString().replace(/[-:.]/g, "_");
      const filename = `captured_face_${timestamp}.jpg`;

      const file = new File([blob], filename, {
        type: "image/jpeg",
      });

      // Create FormData to send the file
      const formData = new FormData();
      formData.append("image", file);
      formData.append("label", selectedLabel);

      // Send the image file to the API using axios
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}/${selectedApiPath}`,
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          }
        );

        setLiveness(response.data); // Handle the liveness detection result here
        console.log(response.data);
      } catch (error) {
        console.error("Error sending image to API:", error);
      }
    }, "image/jpeg");
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "400px", // Limit the maximum width for mobile
        // height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center", // Center vertically
        alignItems: "center", // Center horizontally
        padding: "10px", // Add padding for better spacing on mobile
        boxSizing: "border-box", // Ensure padding doesn't overflow the container
      }}
    >

<div style={{ padding: "20px", textAlign: "center" }}>
      <h3>Select API Path:</h3>
      <div>
        <label>
          <input
            type="radio"
            name="apiPath"
            value="train"
            checked={selectedApiPath === "train"}
            onChange={handleApiSelection}
          />
          Train
        </label>
        <br />
        <label>
          <input
            type="radio"
            name="apiPath"
            value="predict"
            checked={selectedApiPath === "predict"}
            onChange={handleApiSelection}
          />
          Predict
        </label>
        <br />
        <label>
          <input
            type="radio"
            name="apiPath"
            value="retrain"
            checked={selectedApiPath === "retrain"}
            onChange={handleApiSelection}
          />
          Retrain
        </label>
      </div>

      {/* Conditional rendering for label selection if "train" is selected */}
      {selectedApiPath === "train" && (
        <div>
          <h4>Select Label:</h4>
          <label>
            <input
              type="radio"
              name="label"
              value="live"
              checked={selectedLabel === "live"}
              onChange={handleLabelSelection}
            />
            Live
          </label>
          <br />
          <label>
            <input
              type="radio"
              name="label"
              value="spoof"
              checked={selectedLabel === "spoof"}
              onChange={handleLabelSelection}
            />
            Spoof
          </label>
        </div>
      )}
    </div>
      {/* Webcam Detection */}
      <button onClick={enableWebcam} style={{ marginBottom: "10px" }}>
        Enable Webcam
      </button>
      <button onClick={captureAndSendImage}>
        Click to Call API
      </button>
      <div
        id="liveView"
        ref={liveViewRef}
        style={{
          position: "relative",
          width: "100%",
          height: "auto",
          overflow: "hidden",
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ width: "100%", height: "auto" }}
        ></video>
        {detections.map((detection, index) => {
          const { originX, originY, width, height } = detection.boundingBox;
          const { score } = detection.categories[0];

          // Calculate the scaling factors based on the video and canvas dimensions
          const videoWidth = videoRef.current.videoWidth;
          const videoHeight = videoRef.current.videoHeight;
          const scaleX = liveViewRef.current.offsetWidth / videoWidth;
          const scaleY = liveViewRef.current.offsetHeight / videoHeight;

          // Apply the scaling to the bounding box coordinates
          const scaledX = originX * scaleX;
          const scaledY = originY * scaleY;
          const scaledWidth = width * scaleX;
          const scaledHeight = height * scaleY;

          return (
            <div key={index}>
              <div
                className="bounding-box"
                style={{
                  position: "absolute",
                  border: "2px solid red",
                  borderRadius: "5px",
                  left: `${scaledX}px`,
                  top: `${scaledY}px`,
                  width: `${scaledWidth}px`,
                  height: `${scaledHeight}px`,
                  pointerEvents: "none",
                }}
              ></div>
              <div
                style={{
                  position: "absolute",
                  top: `${scaledY + scaledHeight + 5}px`,
                  left: `${scaledX}px`,
                  color: "white",
                  fontSize: "14px",
                  backgroundColor: "rgba(0, 0, 0, 0.5)",
                  padding: "2px 5px",
                  borderRadius: "3px",
                }}
              >
                {(score * 100).toFixed(2)}%, {liveness.prediction}
              </div>
            </div>
          );
        })}
      </div>

      {/* Canvas to capture image */}
      <canvas
        ref={canvasRef}
        style={{ display: "none" }}
        width="640"
        height="480"
      ></canvas>
    </div>
  );
};

export default FaceDetection;
