
import { useEffect, useRef } from "react";

export default function MaskedTilePreview({
  roomImageSrc,
  tileImageSrc,
  maskBase64,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!roomImageSrc || !tileImageSrc || !maskBase64) return;

    let cancelled = false;

    const loadImage = (src) =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(
          new Error(`Image load failed: ${src.slice(0, 40)}`)
        );
        image.src = src;
      });

    async function render() {
      try {
        const maskSrc = maskBase64.startsWith("data:")
          ? maskBase64
          : `data:image/png;base64,${maskBase64}`;

        const [room, tile, mask] = await Promise.all([
          loadImage(roomImageSrc),
          loadImage(tileImageSrc),
          loadImage(maskSrc),
        ]);

        if (cancelled) return;

        const width = room.naturalWidth;
        const height = room.naturalHeight;

        // 1. Canvas ကို Room Photo အရွယ်အစားအတိုင်းထားပါ
        const canvas = canvasRef.current;
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");

        // 2. မူလ Room Photo ကို အရင်ဆွဲပါ
        ctx.drawImage(room, 0, 0, width, height);

        // 3. Tile Pattern အတွက် canvas သီးသန့်ဖန်တီးပါ
        const patternCanvas = document.createElement("canvas");
        patternCanvas.width = width;
        patternCanvas.height = height;

        const pctx = patternCanvas.getContext("2d");
        const pattern = pctx.createPattern(tile, "repeat");

        pctx.fillStyle = pattern;
        pctx.fillRect(0, 0, width, height);

        // 4. Mask ကို canvas သီးသန့်တစ်ခုမှာ ဖတ်ပါ
        const maskCanvas = document.createElement("canvas");
        maskCanvas.width = width;
        maskCanvas.height = height;

        const mctx = maskCanvas.getContext("2d", {
          willReadFrequently: true,
        });

        mctx.drawImage(mask, 0, 0, width, height);

        const imageData = mctx.getImageData(
          0, 0, width, height
        );

        // Mask အဖြူ = Tile ပြမယ်
        // Mask အနက် = Tile မပြဘူး
        for (let i = 0; i < imageData.data.length; i += 4) {
          const isSelected = imageData.data[i] > 127;

          imageData.data[i] = 255;
          imageData.data[i + 1] = 255;
          imageData.data[i + 2] = 255;
          imageData.data[i + 3] = isSelected ? 255 : 0;
        }

        mctx.putImageData(imageData, 0, 0);

        // 5. Mask ရှိတဲ့နေရာမှာပဲ Pattern ကိုထားပါ
        pctx.globalCompositeOperation = "destination-in";
        pctx.drawImage(maskCanvas, 0, 0);

        // 6. Pattern ကို Room Photo ပေါ်တင်ပါ
        ctx.drawImage(patternCanvas, 0, 0);
      } catch (error) {
        console.error("Tile preview error:", error);
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [roomImageSrc, tileImageSrc, maskBase64]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width: "100%",
        height: "auto",
      }}
    />
  );
}
