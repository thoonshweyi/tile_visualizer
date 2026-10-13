
import { useEffect, useRef, useState } from "react";
import cvModule from "@techstark/opencv-js";

const API_URL = "http://127.0.0.1:8000";

// OpenCV.js initialization
let cvPromise;

function getOpenCV() {
  if (!cvPromise) {
    cvPromise = Promise.resolve(cvModule).then(async (module) => {
      if (module?.Mat) {
        return module;
      }

      if (module instanceof Promise) {
        return await module;
      }

      return await new Promise((resolve) => {
        module.onRuntimeInitialized = () => resolve(module);
      });
    });
  }

  return cvPromise;
}

// Mask contour ရဲ့ point ၄ ခုကို TL, TR, BR, BL စီမယ်
function orderCorners(points) {
  const sum = points.map((p) => p.x + p.y);
  const diff = points.map((p) => p.x - p.y);

  const tl = points[sum.indexOf(Math.min(...sum))];
  const br = points[sum.indexOf(Math.max(...sum))];
  const tr = points[diff.indexOf(Math.max(...diff))];
  const bl = points[diff.indexOf(Math.min(...diff))];

  return [tl, tr, br, bl];
}

// Mask ထဲက အကြီးဆုံး contour ကိုရှာပြီး corner ၄ ခု ခန့်မှန်းမယ်
function findWallCorners(cv, maskCanvas) {
  const maskMat = cv.imread(maskCanvas);
  const gray = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    cv.cvtColor(maskMat, gray, cv.COLOR_RGBA2GRAY);
    cv.threshold(gray, gray, 127, 255, cv.THRESH_BINARY);

    cv.findContours(
      gray,
      contours,
      hierarchy,
      cv.RETR_EXTERNAL,
      cv.CHAIN_APPROX_SIMPLE
    );

    if (contours.size() === 0) {
      throw new Error("Mask ထဲမှာ contour မတွေ့ပါ။");
    }

    let largestContour = null;
    let largestArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);

      if (area > largestArea) {
        largestArea = area;
        largestContour = contour;
      }
    }

    if (!largestContour || largestArea < 100) {
      throw new Error("ရွေးထားတဲ့ region က သေးလွန်းနေပါတယ်။");
    }

    const perimeter = cv.arcLength(largestContour, true);
    let corners = null;

    // Mask shape ပေါ်မူတည်ပြီး approximation tolerance ကို စမ်းမယ်
    for (const ratio of [0.01, 0.02, 0.03, 0.04, 0.06]) {
      const approx = new cv.Mat();

      cv.approxPolyDP(
        largestContour,
        approx,
        ratio * perimeter,
        true
      );

      if (approx.rows === 4) {
        corners = [];

        for (let i = 0; i < 4; i++) {
          corners.push({
            x: approx.data32S[i * 2],
            y: approx.data32S[i * 2 + 1],
          });
        }

        approx.delete();
        break;
      }

      approx.delete();
    }

    if (!corners) {
      // ၄ ထောင့်မရရင် bounding rectangle ကို fallback အဖြစ်သုံးမယ်
      const rect = cv.boundingRect(largestContour);

      corners = [
        { x: rect.x, y: rect.y },
        { x: rect.x + rect.width, y: rect.y },
        { x: rect.x + rect.width, y: rect.y + rect.height },
        { x: rect.x, y: rect.y + rect.height },
      ];
    }

    return orderCorners(corners);
  } finally {
    maskMat.delete();
    gray.delete();
    contours.delete();
    hierarchy.delete();
  }
}

export default function TileVisualizer() {
  const roomRef = useRef(null);
  const overlayRef = useRef(null);
  const maskRef = useRef(null);
  const resultRef = useRef(null);

  const [roomFile, setRoomFile] = useState(null);
  const [roomUrl, setRoomUrl] = useState("");
  const [tileUrl, setTileUrl] = useState("");
  const [maskBase64, setMaskBase64] = useState("");
  const [corners, setCorners] = useState([]);
  const [status, setStatus] = useState("Room photo ကို upload လုပ်ပါ။");
  const [busy, setBusy] = useState(false);
  const [cvReady, setCvReady] = useState(false);

  useEffect(() => {
    let active = true;

    getOpenCV()
      .then(() => {
        if (active) setCvReady(true);
      })
      .catch((error) => {
        console.error(error);
        if (active) setStatus("OpenCV.js load မအောင်မြင်ပါ။");
      });

    return () => {
      active = false;
    };
  }, []);

  // Upload လုပ်ထားတဲ့ file အသစ်တွေရဲ့ object URL ကို သန့်ရှင်းမယ်
  useEffect(() => {
    return () => {
      if (roomUrl) URL.revokeObjectURL(roomUrl);
    };
  }, [roomUrl]);

  useEffect(() => {
    return () => {
      if (tileUrl) URL.revokeObjectURL(tileUrl);
    };
  }, [tileUrl]);

  function handleRoomUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setRoomFile(file);
    setRoomUrl(URL.createObjectURL(file));
    setMaskBase64("");
    setCorners([]);
    setStatus("Wall သို့မဟုတ် Floor ကို click လုပ်ပါ။");
    clearCanvas(overlayRef.current);
    clearCanvas(resultRef.current);
  }

  function handleTileUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setTileUrl(URL.createObjectURL(file));
    clearCanvas(resultRef.current);
  }

  function clearCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Image load ပြီးရင် canvas ကို original image dimensions နဲ့ညှိမယ်
  function handleRoomLoad() {
    const img = roomRef.current;
    if (!img) return;

    for (const ref of [overlayRef, resultRef]) {
      const canvas = ref.current;
      if (!canvas) continue;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }
  }

  async function handleRoomClick(event) {
    if (!roomFile || busy) return;

    const img = roomRef.current;
    const rect = img.getBoundingClientRect();

    // Screen coordinate မဟုတ်ဘဲ မူရင်းပုံရဲ့ pixel coordinate ကိုပို့မယ်
    const x = Math.floor(
      ((event.clientX - rect.left) / rect.width) * img.naturalWidth
    );

    const y = Math.floor(
      ((event.clientY - rect.top) / rect.height) * img.naturalHeight
    );

    setBusy(true);
    setStatus("SAM က region ကိုရှာနေပါတယ်...");
    setCorners([]);
    clearCanvas(overlayRef.current);
    clearCanvas(resultRef.current);

    try {
      const formData = new FormData();
      formData.append("image", roomFile);
      formData.append("x", String(x));
      formData.append("y", String(y));

      const response = await fetch(`${API_URL}/api/mask`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();

      if (!data.success || !data.mask) {
        throw new Error("API က mask ပြန်မပေးခဲ့ပါ။");
      }

      setMaskBase64(data.mask);

      // API mask ကို browser image အဖြစ်ဖွင့်မယ်
      const maskImage = new Image();

      maskImage.onload = async () => {
        try {
          const canvas = maskRef.current;
          const ctx = canvas.getContext("2d", {
            willReadFrequently: true,
          });

          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          // Mask နဲ့ original image dimensions မတူရင် အရွယ်ညှိမယ်
          ctx.drawImage(
            maskImage,
            0,
            0,
            canvas.width,
            canvas.height
          );

          // အဖြူရောင် mask pixel တွေကို အပြာရောင် overlay အဖြစ်ပြမယ်
          const imageData = ctx.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );

          for (let i = 0; i < imageData.data.length; i += 4) {
            const value = imageData.data[i];

            if (value > 127) {
              imageData.data[i] = 0;
              imageData.data[i + 1] = 120;
              imageData.data[i + 2] = 255;
              imageData.data[i + 3] = 105;
            } else {
              imageData.data[i + 3] = 0;
            }
          }

          ctx.putImageData(imageData, 0, 0);

          const cv = await getOpenCV();
          const detectedCorners = findWallCorners(cv, canvas);

          setCorners(detectedCorners);
          setStatus(
            `Mask ရပါပြီ။ Corner ${detectedCorners.length} ခု ခန့်မှန်းပြီးပါပြီ။`
          );
        } catch (error) {
          console.error(error);
          setStatus(`Mask ရပါပြီ၊ corner ရှာရာမှာ error: ${error.message}`);
        } finally {
          setBusy(false);
        }
      };

      maskImage.onerror = () => {
        setBusy(false);
        setStatus("Mask image ကိုဖွင့်လို့မရပါ။");
      };

      maskImage.src = `data:image/png;base64,${data.mask}`;
    } catch (error) {
      console.error(error);
      setBusy(false);
      setStatus(`API error: ${error.message}`);
    }
  }

  // Tile image ကို detected quadrilateral အတိုင်း warp လုပ်မယ်
  async function applyPerspective() {
    if (!tileUrl || corners.length !== 4 || !maskRef.current) {
      setStatus("Room, tile နဲ့ corner ၄ ခု လိုအပ်ပါတယ်။");
      return;
    }

    try {
      const cv = await getOpenCV();
      const room = roomRef.current;
      const output = resultRef.current;
      const maskCanvas = maskRef.current;

      const tileImage = new Image();

      await new Promise((resolve, reject) => {
        tileImage.onload = resolve;
        tileImage.onerror = reject;
        tileImage.src = tileUrl;
      });

      // Room image ကို Mat အဖြစ်ယူမယ်
      const roomMat = cv.imread(room);
      const tileMat = cv.imread(tileImage);
      const maskMat = cv.imread(maskCanvas);
      const maskGray = new cv.Mat();

      const warpedTile = new cv.Mat();
      const result = new cv.Mat();
      const transform = new cv.Mat();

      const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        tileMat.cols - 1, 0,
        tileMat.cols - 1, tileMat.rows - 1,
        0, tileMat.rows - 1,
      ]);

      const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [
        corners[0].x, corners[0].y,
        corners[1].x, corners[1].y,
        corners[2].x, corners[2].y,
        corners[3].x, corners[3].y,
      ]);

      try {
        cv.cvtColor(maskMat, maskGray, cv.COLOR_RGBA2GRAY);
        cv.threshold(
          maskGray,
          maskGray,
          127,
          255,
          cv.THRESH_BINARY
        );

        transform.delete();
        const perspective = cv.getPerspectiveTransform(
          srcPoints,
          dstPoints
        );

        cv.warpPerspective(
          tileMat,
          warpedTile,
          perspective,
          new cv.Size(roomMat.cols, roomMat.rows),
          cv.INTER_LINEAR,
          cv.BORDER_CONSTANT,
          new cv.Scalar(0, 0, 0, 0)
        );

        // မူရင်း room ကို copy လုပ်ပြီး mask အတွင်းမှာပဲ tile ထည့်မယ်
        roomMat.copyTo(result);
        warpedTile.copyTo(result, maskGray);

        output.width = roomMat.cols;
        output.height = roomMat.rows;
        cv.imshow(output, result);

        perspective.delete();
        setStatus("Perspective preview ပြီးပါပြီ။");
      } finally {
        roomMat.delete();
        tileMat.delete();
        maskMat.delete();
        maskGray.delete();
        warpedTile.delete();
        result.delete();
        srcPoints.delete();
        dstPoints.delete();
        transform.delete();
      }
    } catch (error) {
      console.error(error);
      setStatus(`Perspective error: ${error.message}`);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "24px auto", padding: 16 }}>
      <h2>2D Tile Visualizer</h2>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <label>
          Room Photo
          <input
            type="file"
            accept="image/*"
            onChange={handleRoomUpload}
          />
        </label>

        <label>
          Tile Image
          <input
            type="file"
            accept="image/*"
            onChange={handleTileUpload}
          />
        </label>
      </div>

      <p>{status}</p>
      <p>OpenCV.js: {cvReady ? "Ready" : "Loading..."}</p>

      <h3>1. Click Wall / Floor</h3>

      <div
        style={{
          position: "relative",
          width: "100%",
          lineHeight: 0,
        }}
      >
        {roomUrl && (
          <>
            <img
              ref={roomRef}
              src={roomUrl}
              alt="Room"
              onLoad={handleRoomLoad}
              onClick={handleRoomClick}
              style={{
                display: "block",
                width: "100%",
                height: "auto",
                cursor: busy ? "wait" : "crosshair",
              }}
            />

            <canvas
              ref={overlayRef}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            />
          </>
        )}
      </div>

      {/* OpenCV အတွက် original-size mask canvas */}
      <canvas ref={maskRef} style={{ display: "none" }} />

      <h3>2. Perspective Preview</h3>

      <canvas
        ref={resultRef}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          border: "1px solid #ccc",
        }}
      />

      <button
        type="button"
        onClick={applyPerspective}
        disabled={!cvReady || !tileUrl || corners.length !== 4 || busy}
        style={{ marginTop: 12, padding: "10px 16px" }}
      >
        Apply Perspective
      </button>

      {corners.length === 4 && (
        <div style={{ marginTop: 12 }}>
          <strong>Detected corners (original image pixels)</strong>
          <pre>{JSON.stringify(corners, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
