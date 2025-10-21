/**
 * Canvas Rendering
 * Handles 2D canvas rendering for device mockups
 */

/**
 * Render the mockup to the 2D canvas
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {CanvasRenderingContext2D} ctx - The canvas context
 * @param {Object} activeDeviceAssets - The loaded device assets
 * @param {Image} userImage - The user's uploaded image (optional)
 */
export function renderMockup(canvas, ctx, activeDeviceAssets, userImage) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!activeDeviceAssets) {
    return;
  }

  const { bgImage, maskImage, maskBounds, chromeOffset } = activeDeviceAssets;

  ctx.drawImage(bgImage, 0, 0);

  if (!userImage) {
    return;
  }

  const offscreenCanvas = document.createElement("canvas");
  const offscreenCtx = offscreenCanvas.getContext("2d");
  offscreenCanvas.width = bgImage.width;
  offscreenCanvas.height = bgImage.height;
  offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

  offscreenCtx.drawImage(maskImage, 0, 0);
  offscreenCtx.globalCompositeOperation = "source-in";

  const { drawWidth, drawHeight, offsetX, offsetY } = computeCoverFit(
    userImage,
    maskBounds
  );

  offscreenCtx.drawImage(
    userImage,
    maskBounds.x + offsetX,
    maskBounds.y + offsetY + chromeOffset,
    drawWidth,
    drawHeight
  );

  offscreenCtx.globalCompositeOperation = "source-over";
  ctx.drawImage(offscreenCanvas, 0, 0);
}

/**
 * Compute cover-fit dimensions for an image
 * @param {Image} image - The image to fit
 * @param {Object} bounds - The bounds to fit within
 * @returns {Object} Draw dimensions and offsets
 */
function computeCoverFit(image, bounds) {
  const widthScale = bounds.width / image.width;
  const heightScale = bounds.height / image.height;
  const scale = Math.max(widthScale, heightScale);

  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const offsetX = (bounds.width - drawWidth) / 2;
  const offsetY = (bounds.height - drawHeight) / 2;

  return { drawWidth, drawHeight, offsetX, offsetY };
}

/**
 * Extract the bounding box of non-transparent pixels from a mask image
 * @param {Image} maskImage - The mask image
 * @returns {Object} The bounding box {x, y, width, height}
 */
export function extractMaskBounds(maskImage) {
  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = maskImage.width;
  tempCanvas.height = maskImage.height;
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.drawImage(maskImage, 0, 0);

  const { data } = tempCtx.getImageData(
    0,
    0,
    maskImage.width,
    maskImage.height
  );

  let minX = maskImage.width;
  let minY = maskImage.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < maskImage.height; y += 1) {
    for (let x = 0; x < maskImage.width; x += 1) {
      const alpha = data[(y * maskImage.width + x) * 4 + 3];
      if (alpha > 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX === -1 || maxY === -1) {
    return { x: 0, y: 0, width: maskImage.width, height: maskImage.height };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}
