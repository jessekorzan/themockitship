/**
 * Texture Management
 * Handles creating and applying textures to 3D models
 */

import { findScreenMaterial } from './materials.js';

/**
 * Set a black/grey screen texture when no image is loaded
 * @param {Object} modelViewer - The model-viewer element
 * @param {Object} activeDevice - The active device configuration
 */
export async function setBlackScreen(modelViewer, activeDevice) {
  if (!modelViewer?.model || !activeDevice) {
    return;
  }

  const material = findScreenMaterial(modelViewer.model.materials);
  if (!material) {
    return;
  }

  activeDevice.screenMaterialName = material.name;

  // Create a grey texture for default screen
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#3a3a3a"; // Medium grey for default screen
  ctx.fillRect(0, 0, 16, 16);

  const dataUrl = canvas.toDataURL("image/png");
  const texture = await modelViewer.createTexture(dataUrl);

  const preferredSlot = activeDevice.screenTextureSlot || "baseColorTexture";
  const candidateSlots = [preferredSlot];
  if (!candidateSlots.includes("baseColorTexture")) {
    candidateSlots.push("baseColorTexture");
  }
  if (!candidateSlots.includes("emissiveTexture")) {
    candidateSlots.push("emissiveTexture");
  }

  let applied = false;

  for (const slot of candidateSlots) {
    if (typeof material.setTexture === "function") {
      try {
        await material.setTexture(slot, texture);
        if (slot === "emissiveTexture") {
          if (typeof material.setEmissiveFactor === "function") {
            material.setEmissiveFactor([0, 0, 0]);
          } else if (material.emissiveFactor) {
            material.emissiveFactor = [0, 0, 0];
          }
        }
        applied = true;
        break;
      } catch (err) {
        // Ignore and try other assignment paths.
      }
    }

    const texInfo = material[slot];
    if (texInfo && typeof texInfo.setTexture === "function") {
      await texInfo.setTexture(texture);
      if (slot === "emissiveTexture") {
        if (typeof material.setEmissiveFactor === "function") {
          material.setEmissiveFactor([0, 0, 0]);
        } else if (material.emissiveFactor) {
          material.emissiveFactor = [0, 0, 0];
        }
      }
      applied = true;
      break;
    }

    if (texInfo && "texture" in texInfo) {
      texInfo.texture = texture;
      if (slot === "emissiveTexture") {
        if (typeof material.setEmissiveFactor === "function") {
          material.setEmissiveFactor([0, 0, 0]);
        } else if (material.emissiveFactor) {
          material.emissiveFactor = [0, 0, 0];
        }
      }
      applied = true;
      break;
    }

    const pbr = material.pbrMetallicRoughness;
    if (pbr) {
      if (
        slot === "baseColorTexture" &&
        typeof pbr.setBaseColorTexture === "function"
      ) {
        pbr.setBaseColorTexture(texture);
        applied = true;
        break;
      }
      const pbrTexInfo = pbr[slot];
      if (pbrTexInfo && typeof pbrTexInfo.setTexture === "function") {
        await pbrTexInfo.setTexture(texture);
        applied = true;
        break;
      }
      if (pbrTexInfo && "texture" in pbrTexInfo) {
        pbrTexInfo.texture = texture;
        applied = true;
        break;
      }
    }
  }

  if (applied && typeof modelViewer.requestRender === "function") {
    modelViewer.requestRender();
  }
}

/**
 * Update the model viewer with a user-uploaded texture
 * @param {Object} modelViewer - The model-viewer element
 * @param {Object} activeDevice - The active device configuration
 * @param {Object} activeDeviceAssets - The loaded device assets
 * @param {Image} userImage - The user's uploaded image
 */
export async function updateModelViewerTexture(modelViewer, activeDevice, activeDeviceAssets, userImage) {
  if (
    !modelViewer?.model ||
    typeof modelViewer.createTexture !== "function" ||
    !activeDevice ||
    !userImage
  ) {
    return;
  }

  const material = findScreenMaterial(modelViewer.model.materials);
  if (!material) {
    console.warn("No screen material found for device:", activeDevice.name);
    return;
  }

  activeDevice.screenMaterialName = material.name;
  console.log("Found screen material:", material.name);

  // First, clear any existing base color texture that might be blocking
  const pbr = material.pbrMetallicRoughness;
  if (pbr?.baseColorTexture) {
    console.log("Clearing existing baseColorTexture");
    if (typeof pbr.setBaseColorTexture === "function") {
      try {
        await pbr.setBaseColorTexture(null);
      } catch (e) {
        console.warn("Could not clear baseColorTexture via setter");
      }
    }
    if (typeof pbr.baseColorTexture?.setTexture === "function") {
      try {
        await pbr.baseColorTexture.setTexture(null);
      } catch (e) {
        console.warn("Could not clear baseColorTexture via texInfo.setTexture");
      }
    } else if (
      pbr.baseColorTexture &&
      Object.prototype.hasOwnProperty.call(pbr.baseColorTexture, "texture")
    ) {
      pbr.baseColorTexture.texture = null;
    }
  }

  const baseColorFactor = activeDevice.screenUnlit
    ? [1, 1, 1, 1]
    : [0, 0, 0, 1];

  // Set base color factor to expected baseline
  let baseColorSet = false;
  if (pbr && typeof pbr.setBaseColorFactor === "function") {
    pbr.setBaseColorFactor(baseColorFactor);
    baseColorSet = true;
  } else if (typeof material.setBaseColorFactor === "function") {
    material.setBaseColorFactor(baseColorFactor);
    baseColorSet = true;
  }

  if (!baseColorSet) {
    const targetFactor =
      (pbr && pbr.baseColorFactor) ||
      material.baseColorFactor ||
      null;
    if (targetFactor && typeof targetFactor.length === "number") {
      targetFactor[0] = baseColorFactor[0];
      targetFactor[1] = baseColorFactor[1];
      targetFactor[2] = baseColorFactor[2];
      targetFactor[3] = baseColorFactor[3];
      baseColorSet = true;
    }
  }

  // Reduce reflective contribution from the screen mesh
  if (typeof material.setAlphaMode === "function") {
    try {
      material.setAlphaMode("OPAQUE");
    } catch (_) {
      material.alphaMode = "OPAQUE";
    }
  } else {
    material.alphaMode = "OPAQUE";
  }

  // Use device-specific emissive strength or default to 1
  const emissiveStrength = activeDevice.emissiveStrength ?? 1;

  if (typeof material.setEmissiveFactor === "function") {
    material.setEmissiveFactor([emissiveStrength, emissiveStrength, emissiveStrength]);
  } else if (Array.isArray(material.emissiveFactor)) {
    material.emissiveFactor[0] = emissiveStrength;
    material.emissiveFactor[1] = emissiveStrength;
    material.emissiveFactor[2] = emissiveStrength;
  }
  if (typeof material.setEmissiveStrength === "function") {
    try {
      material.setEmissiveStrength(emissiveStrength);
    } catch (_) {
      // ignore feature detection failures
    }
  } else if ("emissiveStrength" in material) {
    try {
      material.emissiveStrength = emissiveStrength;
    } catch (_) {
      // ignore read-only errors
    }
  }

  const forceScalar = (target, property, value) => {
    if (!target) {
      return;
    }
    const setterName = `set${property.charAt(0).toUpperCase()}${property.slice(1)}`;
    if (typeof target[setterName] === "function") {
      try {
        target[setterName](value);
        return;
      } catch (_) {
        // ignore and fall back
      }
    }
    try {
      target[property] = value;
    } catch (_) {
      // ignore read-only errors
    }
  };

  forceScalar(pbr, "metallicFactor", 0);
  forceScalar(pbr, "roughnessFactor", 1);
  forceScalar(material, "metallicFactor", 0);
  forceScalar(material, "roughnessFactor", 1);
  forceScalar(material, "clearcoatFactor", 0);
  forceScalar(material, "clearcoatRoughnessFactor", 1);

  const clearTextureSlot = async (target, slot) => {
    if (!target) {
      return;
    }
    if (typeof target.setTexture === "function") {
      try {
        await target.setTexture(slot, null);
      } catch (_) {
        // ignore
      }
    }

    const capitalized = slot.charAt(0).toUpperCase() + slot.slice(1);
    const setterName = `set${capitalized}`;
    if (typeof target[setterName] === "function") {
      try {
        await target[setterName](null);
        return;
      } catch (_) {
        // ignore
      }
    }

    const info = target[slot];
    if (info && typeof info.setTexture === "function") {
      try {
        await info.setTexture(null);
        return;
      } catch (_) {
        // ignore
      }
    }

    if (info && "texture" in info) {
      try {
        info.texture = null;
      } catch (_) {
        // ignore
      }
    }
  };

  // Clear existing emissive texture that might be baked into the model
  await clearTextureSlot(material, "emissiveTexture");
  await clearTextureSlot(material, "normalTexture");
  await clearTextureSlot(material, "metallicRoughnessTexture");
  await clearTextureSlot(material, "occlusionTexture");
  await clearTextureSlot(pbr, "metallicRoughnessTexture");
  await clearTextureSlot(pbr, "emissiveTexture");

  if (activeDevice.screenUnlit) {
    if (typeof material.setUnlit === "function") {
      try {
        material.setUnlit(true);
      } catch (_) {
        // Fall back to direct assignment below.
      }
    }
    try {
      material.unlit = true;
    } catch (_) {
      // Ignore read-only assignment failures.
    }
  }

  // For devices with 2D assets, use the mask bounds
  // For devices without 2D assets (like iMac), use screen dimensions
  let screenWidth, screenHeight;

  if (activeDeviceAssets?.maskBounds) {
    const { maskBounds } = activeDeviceAssets;
    if (!maskBounds?.width || !maskBounds?.height) {
      return;
    }
    screenWidth = maskBounds.width;
    screenHeight = maskBounds.height;
  } else if (activeDevice.screenWidth && activeDevice.screenHeight) {
    // Use configured screen dimensions for 3D-only devices
    screenWidth = activeDevice.screenWidth;
    screenHeight = activeDevice.screenHeight;
  } else {
    console.warn("No screen dimensions available for device:", activeDevice.name);
    return;
  }

  const screenCanvas = document.createElement("canvas");
  screenCanvas.width = screenWidth;
  screenCanvas.height = screenHeight;
  const screenCtx = screenCanvas.getContext("2d");
  screenCtx.imageSmoothingQuality = "high";

  const { drawWidth, drawHeight, offsetX, offsetY } = computeCoverFit(
    userImage,
    { width: screenWidth, height: screenHeight }
  );

  const screenOffsetY = activeDevice.screenTextureOffset ?? 0;

  screenCtx.drawImage(
    userImage,
    offsetX,
    offsetY + screenOffsetY,
    drawWidth,
    drawHeight
  );

  const textureSize = activeDevice.screenTextureSize || screenWidth;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = textureSize;
  textureCanvas.height = textureSize;

  const textureCtx = textureCanvas.getContext("2d");
  textureCtx.fillStyle = "#000";
  textureCtx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
  textureCtx.imageSmoothingQuality = "high";

  const uv = activeDevice.screenTextureUV || {
    uMin: 0,
    vMin: 0,
    uMax: 1,
    vMax: 1,
  };

  const rectLeft = uv.uMin * textureCanvas.width;
  const rectRight = uv.uMax * textureCanvas.width;
  const rectTop = (1 - uv.vMax) * textureCanvas.height;
  const rectBottom = (1 - uv.vMin) * textureCanvas.height;
  const rectWidth = rectRight - rectLeft;
  const rectHeight = rectBottom - rectTop;
  const rectCenterX = rectLeft + rectWidth / 2;
  const rectCenterY = rectTop + rectHeight / 2;

  const rotation =
    activeDevice.screenTextureRotation != null
      ? activeDevice.screenTextureRotation
      : 0;
  const extraScaleX = activeDevice.screenTextureScaleX || 1;
  const extraScaleY = activeDevice.screenTextureScaleY || 1;
  const translateXAbsolute = activeDevice.screenTextureTranslateX || 0;
  const translateYAbsolute = activeDevice.screenTextureTranslateY || 0;
  const translateXPercent = activeDevice.screenTextureTranslatePercentX || 0;
  const translateYPercent = activeDevice.screenTextureTranslatePercentY || 0;
  const translateX = translateXAbsolute + rectWidth * translateXPercent;
  const translateY = translateYAbsolute + rectHeight * translateYPercent;

  const swapsAxes = Math.abs(Math.round(rotation / (Math.PI / 2))) % 2 === 1;
  const widthForScale = swapsAxes
    ? screenCanvas.height
    : screenCanvas.width;
  const heightForScale = swapsAxes
    ? screenCanvas.width
    : screenCanvas.height;

  const baseScaleX = rectWidth / widthForScale;
  const baseScaleY = rectHeight / heightForScale;
  const scaleX = baseScaleX * extraScaleX;
  const scaleY = baseScaleY * extraScaleY;

  textureCtx.save();
  textureCtx.translate(rectCenterX + translateX, rectCenterY + translateY);
  if (rotation) {
    textureCtx.rotate(rotation);
  }
  if (scaleX !== 1 || scaleY !== 1) {
    textureCtx.scale(scaleX, scaleY);
  }
  textureCtx.drawImage(
    screenCanvas,
    -screenCanvas.width / 2,
    -screenCanvas.height / 2,
    screenCanvas.width,
    screenCanvas.height
  );
  textureCtx.restore();

  const dataUrl = textureCanvas.toDataURL("image/png");
  const texture = await modelViewer.createTexture(dataUrl);

  const preferredSlot = activeDevice.screenTextureSlot || "baseColorTexture";
  const candidateSlots = [preferredSlot];
  if (!candidateSlots.includes("baseColorTexture")) {
    candidateSlots.push("baseColorTexture");
  }
  if (!candidateSlots.includes("emissiveTexture")) {
    candidateSlots.push("emissiveTexture");
  }

  console.log("Trying to apply texture to slots:", candidateSlots);
  console.log("Material has setTexture method:", typeof material.setTexture === "function");

  const appliedSlots = new Set();

  const recordEmissiveFactor = () => {
    if (typeof material.setEmissiveFactor === "function") {
      material.setEmissiveFactor([
        emissiveStrength,
        emissiveStrength,
        emissiveStrength,
      ]);
    } else if (material.emissiveFactor) {
      material.emissiveFactor = [
        emissiveStrength,
        emissiveStrength,
        emissiveStrength,
      ];
    }
  };

  for (const slot of candidateSlots) {
    console.log("Attempting slot:", slot);
    if (typeof material.setTexture === "function") {
      try {
        await material.setTexture(slot, texture);
        if (slot === "emissiveTexture") {
          recordEmissiveFactor();
        }
        console.log("Applied texture to slot:", slot, "via material.setTexture");
        appliedSlots.add(slot);
        continue;
      } catch (err) {
        console.warn("Failed to apply via material.setTexture for slot:", slot, err);
      }
    }

    const texInfo = material[slot];
    console.log("  texInfo exists:", !!texInfo, "has setTexture:", typeof texInfo?.setTexture === "function");
    if (texInfo && typeof texInfo.setTexture === "function") {
      await texInfo.setTexture(texture);
      if (slot === "emissiveTexture") {
        recordEmissiveFactor();
      }
      console.log("Applied texture to slot:", slot, "via texInfo.setTexture");
      appliedSlots.add(slot);
      continue;
    }

    console.log("  texInfo has texture property:", texInfo && "texture" in texInfo);
    if (texInfo && "texture" in texInfo) {
      texInfo.texture = texture;
      if (slot === "emissiveTexture") {
        recordEmissiveFactor();
      }
      console.log("Applied texture to slot:", slot, "via texInfo.texture");
      appliedSlots.add(slot);
      continue;
    }

    const pbrLocal = material.pbrMetallicRoughness;
    console.log("  pbr exists:", !!pbrLocal);
    if (pbrLocal) {
      if (
        slot === "baseColorTexture" &&
        typeof pbrLocal.setBaseColorTexture === "function"
      ) {
        pbrLocal.setBaseColorTexture(texture);
        console.log("Applied texture to slot:", slot, "via pbr.setBaseColorTexture");
        appliedSlots.add(slot);
        continue;
      }
      const pbrTexInfo = pbrLocal[slot];
      console.log("  pbrTexInfo exists:", !!pbrTexInfo, "has setTexture:", typeof pbrTexInfo?.setTexture === "function");
      if (pbrTexInfo && typeof pbrTexInfo.setTexture === "function") {
        await pbrTexInfo.setTexture(texture);
        console.log("Applied texture to slot:", slot, "via pbrTexInfo.setTexture");
        appliedSlots.add(slot);
        continue;
      }
      console.log("  pbrTexInfo has texture property:", pbrTexInfo && "texture" in pbrTexInfo);
      if (pbrTexInfo && "texture" in pbrTexInfo) {
        pbrTexInfo.texture = texture;
        console.log("Applied texture to slot:", slot, "via pbrTexInfo.texture");
        appliedSlots.add(slot);
        continue;
      }
    }
  }

  if (appliedSlots.size === 0) {
    console.error("Screen material structure", {
      materialName: material.name,
      availableKeys: Object.keys(material),
      preferredSlot,
    });
    throw new Error("Unable to assign texture to screen material");
  }
  if (typeof modelViewer.requestRender === "function") {
    modelViewer.requestRender();
  }
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
