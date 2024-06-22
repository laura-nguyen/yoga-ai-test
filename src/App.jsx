import { useState, useRef, useEffect } from 'react';
import './App.css';
import * as ml5 from 'ml5';
import Webcam from "react-webcam";

function App() {
  const messageRef = useRef(null);
  const numbersRef = useRef(null);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const [poses, setPoses] = useState([]);
  let poseNet = null;
  let neuralNetwork = null;

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.strokeStyle = 'red';
    ctx.fillStyle = 'red';
    ctx.lineWidth = 3;
    ctx.translate(640, 0);
    ctx.scale(-1, 1);

    // Debugging fetch request
    fetch('/model/model.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => console.log('Model data:', data))
      .catch(error => {
        console.error('Error fetching model.json:', error);
        // Print the response text for more debugging information
        fetch('/model/model.json')
          .then(response => response.text())
          .then(text => console.log('Response text:', text))
          .catch(innerError => console.error('Error fetching response text:', innerError));
      });

    neuralNetwork = ml5.neuralNetwork({ task: 'classification' });

    const modelInfo = {
      model: '/model/model.json',
      metadata: '/model/model_meta.json',
      weights: '/model/model.weights.bin',
    };

    neuralNetwork.load(modelInfo, yogaModelLoaded);

    function yogaModelLoaded() {
      console.log('Yoga model loaded');
      messageRef.current.innerHTML = 'Yoga model loaded';
      poseNet = ml5.poseNet(webcamRef.current.video, 'single', poseModelReady);
      poseNet.on('pose', gotPoses);
      drawCameraAndPoses();
    }

    function poseModelReady() {
      console.log('Pose model loaded');
      messageRef.current.innerHTML = 'Pose model loaded';
      poseNet.singlePose(webcamRef.current.video);
    }

    function gotPoses(results) {
      console.log('Poses:', results);
      setPoses(results);
    }

    function drawCameraAndPoses() {
      if (webcamRef.current && webcamRef.current.video.readyState === 4) {
        const video = webcamRef.current.video;
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        // Set video and canvas dimensions
        webcamRef.current.video.width = videoWidth;
        webcamRef.current.video.height = videoHeight;
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-videoWidth, 0);
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        ctx.restore();

        drawKeypoints();
        drawSkeleton();
      } else {
        console.log('Video is not ready yet');
      }
      window.requestAnimationFrame(drawCameraAndPoses);
    }

    function drawKeypoints() {
      for (let i = 0; i < poses.length; i += 1) {
        for (let j = 0; j < poses[i].pose.keypoints.length; j += 1) {
          let keypoint = poses[i].pose.keypoints[j];
          if (keypoint.score > 0.2) {
            ctx.beginPath();
            ctx.arc(keypoint.position.x, keypoint.position.y, 10, 0, 2 * Math.PI);
            ctx.stroke();
          }
        }
      }
    }

    function drawSkeleton() {
      for (let i = 0; i < poses.length; i += 1) {
        for (let j = 0; j < poses[i].skeleton.length; j += 1) {
          let partA = poses[i].skeleton[j][0];
          let partB = poses[i].skeleton[j][1];
          ctx.beginPath();
          ctx.moveTo(partA.position.x, partA.position.y);
          ctx.lineTo(partB.position.x, partB.position.y);
          ctx.stroke();
        }
      }
    }

    function classifyKeyPoints() {
      if (poses.length > 0) {
        let points = [];
        for (let keypoint of poses[0].pose.keypoints) {
          points.push(Math.round(keypoint.position.x));
          points.push(Math.round(keypoint.position.y));
        }
        numbersRef.current.innerHTML = points.toString();
        neuralNetwork.classify(points, yogaResult);
      }
    }

    function yogaResult(error, result) {
      if (error) {
        console.error('Error in yogaResult:', error);
      } else {
        console.log('Yoga result:', result);
        messageRef.current.innerHTML = `Pose: "${result[0].label}" --- confidence: ${result[0].confidence.toFixed(2)}`;
      }
    }
  }, [poses]);

  return (
    <>
      <div id="message" ref={messageRef}></div>
      <div id="numbers" ref={numbersRef}></div>
      <Webcam ref={webcamRef} width="640" height="360" style={{
        width: "0.1px",
        textAlign: "center",
        zindex: 9,
        transform: "scaleX(-1)", // Mirror the webcam video
      }}/>
      <canvas ref={canvasRef} width="640" height="360" className='canvas-mirror'></canvas>
    </>
  );
}

export default App;
