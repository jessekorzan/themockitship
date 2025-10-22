/**
 * Device Mockup Studio - Main Application
 * Orchestrates the entire mockup generation flow
 */

import { DEVICE_LIBRARY } from './devices.js';
import { applyBodyMaterialTint } from './materials.js';
import { setBlackScreen, updateModelViewerTexture } from './textures.js';
import { renderMockup, extractMaskBounds } from './canvas.js';

// Global state
let userImage = null;
let activeDevice = null;
let activeDeviceAssets = null;
let viewMode = "2d";
let modelTextureDirty = false;

// DOM elements
const deviceSelect = document.getElementById("device-select");
const canvas = document.getElementById("mockup-canvas");
const ctx = canvas.getContext("2d");
const fileInput = document.getElementById("image-input");
const downloadButton = document.getElementById("download-button");
const copyButton = document.getElementById("copy-button");
const dropZone = document.getElementById("mockup-dropzone");
const viewSelectWrapper = document.getElementById("view-select-wrapper");
const viewSelect = document.getElementById("view-select");
const modelViewer = document.getElementById("mockup-model-viewer");
const screenDimensions = document.getElementById("screen-dimensions");

// Caches
const deviceAssetCache = new Map();
window.solidTextureCache = new Map();

function cloneDeviceConfig(device) {
  if (typeof structuredClone === "function") {
    return structuredClone(device);
  }
  return JSON.parse(JSON.stringify(device));
}

// Initialize on load
initializeDeviceSelection();
setupEventListeners();

/**
 * Initialize device selection dropdown
 */
function initializeDeviceSelection() {
  if (!deviceSelect) {
    return;
  }

  deviceSelect.innerHTML = "";
  DEVICE_LIBRARY.forEach((device, index) => {
    const option = document.createElement("option");
    option.value = device.id;
    option.textContent = device.name;
    deviceSelect.appendChild(option);

    if (index === 0) {
      setActiveDevice(device);
    }
  });

  deviceSelect.addEventListener("change", () => {
    const selected = DEVICE_LIBRARY.find(
      (device) => device.id === deviceSelect.value
    );
    if (selected && selected.name !== activeDevice?.name) {
      setActiveDevice(selected);
    }
  });
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // File input
  fileInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) {
      ingestFile(file);
    }
  });

  // Download button
  downloadButton.addEventListener("click", async () => {
    const fileBase = activeDevice?.assetPrefix ?? "device";
    const link = document.createElement("a");

    if (viewMode === "3d" && modelViewer) {
      // Download from 3D viewer
      try {
        // Store current camera state
        const currentOrbit = modelViewer.getCameraOrbit();

        // Zoom out slightly to ensure full model is captured
        const orbit = modelViewer.getCameraOrbit();
        orbit.radius *= 1.15; // Zoom out by 15%
        modelViewer.cameraOrbit = `${orbit.theta}rad ${orbit.phi}rad ${orbit.radius}m`;

        // Wait for camera to update
        await modelViewer.updateComplete;

        const blob = await modelViewer.toBlob({
          idealAspect: true,
          mimeType: "image/png",
        });

        // Restore original camera state
        modelViewer.cameraOrbit = `${currentOrbit.theta}rad ${currentOrbit.phi}rad ${currentOrbit.radius}m`;

        link.href = URL.createObjectURL(blob);
        link.download = `${fileBase}-3d-mockup.png`;
        link.click();
        URL.revokeObjectURL(link.href);
      } catch (error) {
        console.error("Failed to download 3D view", error);
      }
    } else {
      // Download from 2D canvas
      link.href = canvas.toDataURL("image/png");
      link.download = `${fileBase}-mockup.png`;
      link.click();
    }
  });

  // Copy to clipboard button
  if (copyButton) {
    copyButton.addEventListener("click", async () => {
      copyButton.disabled = true;
      try {
        const blob =
          viewMode === "3d" && modelViewer
            ? await modelViewer.toBlob({
                idealAspect: true,
                mimeType: "image/png",
              })
            : await canvasToPngBlob(canvas);

        if (!blob) {
          throw new Error("No image data available to copy.");
        }

        await writeBlobToClipboard(blob);
        console.log("Copied mockup image to clipboard");
      } catch (error) {
        console.error("Failed to copy mockup to clipboard", error);
      } finally {
        updateDownloadAvailability();
      }
    });
  }

  // Drag and drop
  if (dropZone) {
    dropZone.dataset.viewMode = viewMode;
    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone.dataset.dragActive = "true";
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.dataset.dragActive = "false";
    });

    dropZone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropZone.dataset.dragActive = "false";

      const file = event.dataTransfer?.files?.[0];
      if (file) {
        ingestFile(file);
      }
    });
  }

  // View mode select
  if (viewSelect) {
    viewSelect.addEventListener("change", () => {
      const mode = viewSelect.value;
      if (mode) {
        setViewMode(mode);
      }
    });
    updateViewModeUI();
  }

  // Model viewer load event
  if (modelViewer) {
    modelViewer.addEventListener("load", () => {
      // Always apply body material tint when model loads
      applyBodyMaterialTint(modelViewer, activeDevice).catch((error) =>
        console.error("Failed to apply body material tint on load", error)
      );

      if (!userImage) {
        // Set screen to grey when no image is loaded
        setBlackScreen(modelViewer, activeDevice).catch((error) =>
          console.error("Failed to set black screen on load", error)
        );
        return;
      }

      modelTextureDirty = true;
      configureModelViewer({ forceTextureUpdate: true }).catch((error) =>
        console.error("Failed to update 3D viewer texture after load", error)
      );
    });
  }

  // Paste support
  window.addEventListener("paste", (event) => {
    const items = event.clipboardData?.files;
    if (!items || items.length === 0) {
      return;
    }

    const file = items[0];
    ingestFile(file);
  });
}

/**
 * Set the active device
 * @param {Object} device - The device configuration
 */
async function setActiveDevice(device) {
  try {
    const deviceConfig = cloneDeviceConfig(device);
    console.log(
      "=== setActiveDevice ===",
      deviceConfig.name,
      "userImage exists:",
      !!userImage
    );

    if (deviceSelect && deviceSelect.value !== deviceConfig.id) {
      deviceSelect.value = deviceConfig.id;
    }

    activeDevice = deviceConfig;
    // Make it globally accessible for materials/textures modules
    window.activeDevice = deviceConfig;
    activeDeviceAssets = null;

    // Determine initial view mode based on available assets
    const has2DAssets = deviceConfig.has2DAssets !== false;
    const hasModel = Boolean(deviceConfig.modelPath);
    const initialMode = has2DAssets ? "2d" : (hasModel ? "3d" : "2d");

    console.log(
      "Initial mode:",
      initialMode,
      "has2D:",
      has2DAssets,
      "hasModel:",
      hasModel
    );

    setViewMode(initialMode, { suppressRender: true });
    updateDownloadAvailability();
    updateScreenDimensions();
    modelTextureDirty = Boolean(userImage);

    console.log("modelTextureDirty set to:", modelTextureDirty);

    updateViewToggleVisibility(deviceConfig);

    const assets = await loadDeviceAssets(deviceConfig);

    // Only update canvas if we have valid 2D assets
    if (assets) {
      activeDeviceAssets = {
        ...deviceConfig,
        ...assets,
      };

      canvas.width = assets.bgImage.width;
      canvas.height = assets.bgImage.height;
      canvas.setAttribute("aria-label", `${deviceConfig.name} preview`);
    } else {
      // No 2D assets available
      activeDeviceAssets = null;
      console.log("No 2D assets for", deviceConfig.name);
    }

    if (viewMode === "2d" && activeDeviceAssets) {
      renderMockup(canvas, ctx, activeDeviceAssets, userImage);
    } else if (viewMode === "3d") {
      console.log("Calling configureModelViewer with forceTextureUpdate");
      // Always force texture update when switching to a 3D device
      await configureModelViewer({ forceTextureUpdate: true }).catch((error) =>
        console.error("Failed to configure 3D viewer", error)
      );
    }
    updateDownloadAvailability();
  } catch (error) {
    console.error(`Failed to load assets for ${device.name}`, error);
  }
}

/**
 * Load device assets (background and mask images)
 * @param {Object} device - The device configuration
 * @returns {Promise<Object|null>} The loaded assets or null
 */
function loadDeviceAssets(device) {
  if (deviceAssetCache.has(device.name)) {
    return deviceAssetCache.get(device.name);
  }

  // If device explicitly has no 2D assets, return null immediately
  if (device.has2DAssets === false) {
    const nullPromise = Promise.resolve(null);
    deviceAssetCache.set(device.name, nullPromise);
    return nullPromise;
  }

  const bgImage = new Image();
  bgImage.src = `${device.folder}/${device.assetPrefix}_bg.png`;

  const maskImage = new Image();
  maskImage.src = `${device.folder}/${device.assetPrefix}_screenmask.png`;

  const assetPromise = Promise.all([
    imageReady(bgImage),
    imageReady(maskImage),
  ]).then(() => {
    return {
      bgImage,
      maskImage,
      maskBounds: extractMaskBounds(maskImage),
    };
  }).catch((error) => {
    console.warn(`Failed to load 2D assets for ${device.name}`, error);
    return null;
  });

  deviceAssetCache.set(device.name, assetPromise);
  return assetPromise;
}

/**
 * Wait for an image to be ready
 * @param {Image} image - The image element
 * @returns {Promise} Resolves when image is loaded
 */
function imageReady(image) {
  if (image.complete && image.naturalWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    image.addEventListener("load", resolve, { once: true });
    image.addEventListener(
      "error",
      () => reject(new Error(`Failed to load ${image.src}`)),
      { once: true }
    );
  });
}

/**
 * Ingest a file (image upload)
 * @param {File} file - The file to ingest
 */
function ingestFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const img = new Image();
    img.addEventListener("load", () => {
      userImage = img;
      renderMockup(canvas, ctx, activeDeviceAssets, userImage);
      updateDownloadAvailability();
      modelTextureDirty = true;
      if (activeDevice?.modelPath) {
        configureModelViewer({ forceTextureUpdate: true }).catch((error) =>
          console.error("Failed to update 3D viewer texture", error)
        );
      }
    });
    img.src = reader.result;
  });
  reader.readAsDataURL(file);
}

/**
 * Configure the model viewer with the current state
 * @param {Object} options - Configuration options
 */
async function configureModelViewer(options = {}) {
  console.log("=== configureModelViewer ===", "options:", options, "userImage:", !!userImage, "modelTextureDirty:", modelTextureDirty);

  if (
    !modelViewer ||
    typeof modelViewer.updateComplete === "undefined" ||
    !activeDevice?.modelPath
  ) {
    console.log("Skipping: no modelViewer or modelPath");
    return;
  }

  const encodedSrc = encodeURI(activeDevice.modelPath);
  const needsLoad = modelViewer.src !== encodedSrc;

  console.log("needsLoad:", needsLoad, "current src:", modelViewer.src, "target:", encodedSrc);

  if (needsLoad) {
    console.log("Loading new model:", activeDevice.name);
    modelViewer.src = encodedSrc;

    // Use device-specific exposure or default
    const exposure = activeDevice.exposure ?? 1.2;
    const environmentImage = activeDevice.environmentImage ?? "neutral";
    const environmentIntensity = activeDevice.disableEnvironmentLighting
      ? 0
      : activeDevice.environmentIntensity ?? 1;
    const shadowIntensity = activeDevice.disableEnvironmentLighting
      ? 0
      : activeDevice.shadowIntensity ?? 0.3;

    if (typeof modelViewer.setAttribute === "function") {
      modelViewer.setAttribute("environment-image", environmentImage);
      modelViewer.setAttribute("environment-intensity", String(environmentIntensity));
      modelViewer.setAttribute("shadow-intensity", String(shadowIntensity));
      modelViewer.setAttribute("exposure", String(exposure));

      // Apply device-specific camera settings
      if (activeDevice.cameraOrbit) {
        modelViewer.setAttribute("camera-orbit", activeDevice.cameraOrbit);
      }
      if (activeDevice.fieldOfView) {
        modelViewer.setAttribute("field-of-view", activeDevice.fieldOfView);
      }
    } else {
      modelViewer.environmentImage = environmentImage;
      modelViewer.environmentIntensity = environmentIntensity;
      modelViewer.shadowIntensity = shadowIntensity;
      modelViewer.exposure = exposure;

      // Apply device-specific camera settings
      if (activeDevice.cameraOrbit) {
        modelViewer.cameraOrbit = activeDevice.cameraOrbit;
      }
      if (activeDevice.fieldOfView) {
        modelViewer.fieldOfView = activeDevice.fieldOfView;
      }
    }
  }

  await modelViewer.updateComplete;

  if (!modelViewer.model) {
    console.warn("Model not ready yet, skipping texture configuration");
    return;
  }

  console.log("Model is ready");

  if (needsLoad) {
    modelViewer.setAttribute("alt", `${activeDevice.name} 3D mockup`);
    // Don't reset screenMaterialName - it should persist from device config or be discovered
  }

  // Apply user image texture first if available
  if (userImage && typeof modelViewer.createTexture === "function") {
    const shouldApply = needsLoad || options.forceTextureUpdate || modelTextureDirty;
    console.log("Should apply texture?", shouldApply, "(needsLoad:", needsLoad, "forceTextureUpdate:", options.forceTextureUpdate, "modelTextureDirty:", modelTextureDirty, ")");

    if (shouldApply) {
      console.log("Applying user image texture to 3D model");
      await updateModelViewerTexture(modelViewer, activeDevice, activeDeviceAssets, userImage);
      modelTextureDirty = false;
    }
  } else if (!userImage && typeof modelViewer.createTexture === "function") {
    // Only apply black screen when no image is loaded
    console.log("No user image, applying black screen");
    await setBlackScreen(modelViewer, activeDevice);
  }

  await applyBodyMaterialTint(modelViewer, activeDevice);
}

/**
 * Set the view mode (2D or 3D)
 * @param {string} mode - The view mode ("2d" or "3d")
 * @param {Object} options - Options
 */
function setViewMode(mode, options = {}) {
  if (viewMode === mode) {
    if (!options.suppressRender) {
      if (viewMode === "2d") {
        renderMockup(canvas, ctx, activeDeviceAssets, userImage);
      } else {
        configureModelViewer({
          forceTextureUpdate: modelTextureDirty,
        }).catch((error) =>
          console.error("Failed to configure 3D viewer", error)
        );
      }
    }
    return;
  }

  viewMode = mode;
  updateViewModeUI();
  if (!options.suppressRender) {
    if (viewMode === "2d") {
      renderMockup(canvas, ctx, activeDeviceAssets, userImage);
    } else {
      configureModelViewer({ forceTextureUpdate: true }).catch((error) =>
        console.error("Failed to configure 3D viewer", error)
      );
    }
  }
  updateDownloadAvailability();
}

/**
 * Update the view mode UI
 */
function updateViewModeUI() {
  if (dropZone) {
    dropZone.dataset.viewMode = viewMode;
  }

  if (viewSelect) {
    viewSelect.value = viewMode;
  }
}

/**
 * Update view toggle visibility based on device capabilities
 * @param {Object} device - The device configuration
 */
function updateViewToggleVisibility(device) {
  if (!viewSelectWrapper || !viewSelect) {
    return;
  }

  const hasModel = Boolean(device.modelPath);
  const has2DAssets = device.has2DAssets !== false;

  // Clear and repopulate options based on available modes
  viewSelect.innerHTML = "";

  if (has2DAssets) {
    const option2d = document.createElement("option");
    option2d.value = "2d";
    option2d.textContent = "2D Canvas";
    viewSelect.appendChild(option2d);
  }

  if (hasModel) {
    const option3d = document.createElement("option");
    option3d.value = "3d";
    option3d.textContent = "3D Viewer";
    viewSelect.appendChild(option3d);
  }

  // Show dropdown only if both modes available
  viewSelectWrapper.hidden = !(hasModel && has2DAssets);

  // Auto-switch to available mode if current mode is unavailable
  if (!hasModel && viewMode === "3d") {
    setViewMode("2d");
  } else if (!has2DAssets && viewMode === "2d" && hasModel) {
    setViewMode("3d");
  }

  if (!hasModel && modelViewer) {
    modelViewer.removeAttribute("src");
  }
}

/**
 * Update download button availability
 */
function updateDownloadAvailability() {
  let canDownload = false;
  let canCopy = false;

  if (viewMode === "3d") {
    canDownload = Boolean(activeDevice?.modelPath);
    canCopy = canDownload;
  } else {
    const has2DAssets = activeDevice?.has2DAssets !== false;
    const assetsReady = Boolean(userImage && activeDeviceAssets && has2DAssets);
    canDownload = assetsReady;
    canCopy = assetsReady;
  }

  downloadButton.disabled = !canDownload;
  if (copyButton) {
    copyButton.disabled = !canCopy;
  }
}

/**
 * Update screen dimensions display
 */
function updateScreenDimensions() {
  if (!screenDimensions || !activeDevice) {
    return;
  }

  if (activeDevice.screenWidth && activeDevice.screenHeight) {
    screenDimensions.textContent = `Recommended: ${activeDevice.screenWidth}px × ${activeDevice.screenHeight}px`;
  } else {
    screenDimensions.textContent = "";
  }
}

async function canvasToPngBlob(canvasElement) {
  return new Promise((resolve, reject) => {
    if (!canvasElement) {
      reject(new Error("No canvas element available"));
      return;
    }

    canvasElement.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create PNG blob from canvas"));
        }
      },
      "image/png",
      1
    );
  });
}

async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function writeBlobToClipboard(blob) {
  if (
    navigator.clipboard &&
    typeof navigator.clipboard.write === "function" &&
    typeof ClipboardItem !== "undefined"
  ) {
    const item = new ClipboardItem({ [blob.type]: blob });
    await navigator.clipboard.write([item]);
    return;
  }

  if (
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  ) {
    const dataUrl = await blobToDataURL(blob);
    await navigator.clipboard.writeText(dataUrl);
    return;
  }

  throw new Error("Clipboard API not supported in this browser");
}
