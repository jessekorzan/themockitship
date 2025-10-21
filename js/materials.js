/**
 * Material Management
 * Handles finding and applying materials to 3D models
 */

/**
 * Find the screen material in a model's materials list
 * @param {Array} materials - Array of materials from the model
 * @returns {Object|null} The screen material or null if not found
 */
export function findScreenMaterial(materials) {
  if (!materials?.length) {
    return null;
  }

  // Check if we have a cached screen material name
  if (window.activeDevice?.screenMaterialName) {
    const cached = materials.find(
      (mat) => mat.name === window.activeDevice.screenMaterialName
    );
    if (cached) {
      return cached;
    }
  }

  // Search for screen material by name scoring
  let bestMaterial = null;
  let bestScore = -Infinity;

  materials.forEach((material) => {
    const name = (material?.name ?? "").toLowerCase();
    let score = 0;

    if (name.includes("screen") && name.includes("bg")) {
      score += 8;
    } else if (name.includes("screen")) {
      score += 6;
    }

    if (name.includes("display")) {
      score += 4;
    }

    if (name.includes("glass")) {
      score -= 3;
    }

    if (name.includes("panel")) {
      score += 2;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMaterial = material;
    }
  });

  return bestMaterial ?? materials[0] ?? null;
}

/**
 * Apply color tints to body materials
 * @param {Object} modelViewer - The model-viewer element
 * @param {Object} activeDevice - The active device configuration
 */
export async function applyBodyMaterialTint(modelViewer, activeDevice) {
  if (
    !modelViewer?.model ||
    !activeDevice?.bodyMaterials ||
    activeDevice.bodyMaterials.length === 0
  ) {
    return;
  }

  const getSolidTexture = async (color) => {
    const key = color.join(",");
    if (window.solidTextureCache.has(key)) {
      return window.solidTextureCache.get(key);
    }

    if (typeof modelViewer.createTexture !== "function") {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    const [r, g, b, a = 1] = color;
    ctx.fillStyle = `rgba(${Math.round(r * 255)}, ${Math.round(
      g * 255
    )}, ${Math.round(b * 255)}, ${a})`;
    ctx.fillRect(0, 0, 1, 1);

    const dataUrl = canvas.toDataURL("image/png");
    const texture = await modelViewer.createTexture(dataUrl);
    window.solidTextureCache.set(key, texture);
    return texture;
  };

  const clamp01 = (value) => Math.max(0, Math.min(1, value));

  for (const descriptor of activeDevice.bodyMaterials) {
    const {
      name,
      color = [0.07, 0.07, 0.09, 1],
      metallicFactor,
      roughnessFactor,
      emissiveFactor,
      hide = false,
    } = descriptor;

    if (!name) {
      continue;
    }

    const material = modelViewer.model.materials.find(
      (mat) => (mat.name ?? "").toLowerCase() === name.toLowerCase()
    );

    if (!material) {
      console.log(`Material "${name}" not found in model`);
      continue;
    }

    console.log(`Applying tint to material "${name}":`, color);

    const pbr = material.pbrMetallicRoughness;

    const clearTextureSlot = async (target, slot) => {
      if (!target) {
        return;
      }
      const texInfo = target[slot];
      if (typeof target.setTexture === "function") {
        try {
          await target.setTexture(slot, null);
        } catch (_) {
          // Some APIs throw when nulling; fall through to manual methods.
        }
      }
      if (typeof target[`set${slot.charAt(0).toUpperCase()}${slot.slice(1)}`] === "function") {
        try {
          await target[`set${slot.charAt(0).toUpperCase()}${slot.slice(1)}`](null);
          return;
        } catch (_) {
          // Ignore failures and try fallback paths below.
        }
      }
      if (texInfo && typeof texInfo.setTexture === "function") {
        try {
          await texInfo.setTexture(null);
          return;
        } catch (_) {
          // Fall through to property assignment.
        }
      }
      if (texInfo && "texture" in texInfo) {
        try {
          texInfo.texture = null;
        } catch (_) {
          // Ignore read-only assignments.
        }
      }
    };

    if (hide) {
      await clearTextureSlot(material, "baseColorTexture");
      await clearTextureSlot(material, "normalTexture");
      await clearTextureSlot(material, "metallicRoughnessTexture");
      await clearTextureSlot(material, "occlusionTexture");
      await clearTextureSlot(material, "emissiveTexture");

      if (pbr) {
        await clearTextureSlot(pbr, "baseColorTexture");
        await clearTextureSlot(pbr, "metallicRoughnessTexture");
        await clearTextureSlot(pbr, "emissiveTexture");
      }

      try {
        if (typeof material.setAlphaMode === "function") {
          material.setAlphaMode("MASK");
        } else {
          material.alphaMode = "MASK";
        }
      } catch (_) {
        material.alphaMode = "MASK";
      }

      if ("alphaCutoff" in material) {
        try {
          material.alphaCutoff = 1;
        } catch (_) {
          // Ignore read-only assignment failures.
        }
      }

      if (pbr) {
        if (typeof pbr.setBaseColorFactor === "function") {
          pbr.setBaseColorFactor([0, 0, 0, 0]);
        }
        try {
          pbr.baseColorFactor = [0, 0, 0, 0];
        } catch (_) {
          // Some implementations keep this read-only.
        }
        if (typeof pbr.setMetallicFactor === "function") {
          pbr.setMetallicFactor(0);
        } else {
          pbr.metallicFactor = 0;
        }
        if (typeof pbr.setRoughnessFactor === "function") {
          pbr.setRoughnessFactor(1);
        } else {
          pbr.roughnessFactor = 1;
        }
      }

      if (typeof material.setBaseColorFactor === "function") {
        material.setBaseColorFactor([0, 0, 0, 0]);
      } else {
        try {
          material.baseColorFactor = [0, 0, 0, 0];
        } catch (_) {
          // Ignore read-only assignment failures.
        }
      }

      if (typeof material.setEmissiveFactor === "function") {
        material.setEmissiveFactor([0, 0, 0]);
      }

      if ("emissiveFactor" in material) {
        try {
          material.emissiveFactor = [0, 0, 0];
        } catch (_) {
          // Ignore read-only assignment failures.
        }
      }

      continue;
    }

    const applyColorFactor = () => {
      const alpha = typeof color[3] === "number" ? color[3] : 1;
      if (pbr && typeof pbr.setBaseColorFactor === "function") {
        pbr.setBaseColorFactor(color);
      } else if (typeof material.setBaseColorFactor === "function") {
        material.setBaseColorFactor(color);
      } else {
        try {
          material.baseColorFactor = color;
        } catch (_) {
          // Property is read-only
        }
      }
      if (pbr) {
        try {
          pbr.baseColorFactor = color;
        } catch (_) {
          // Property is read-only, already set via setter above
        }
      }
      if (alpha < 1) {
        if (typeof material.setAlphaMode === "function") {
          try {
            material.setAlphaMode("BLEND");
          } catch (_) {
            // Some implementations throw if already set
          }
        } else {
          material.alphaMode = "BLEND";
        }
        if ("alphaCutoff" in material) {
          try {
            material.alphaCutoff = 0;
          } catch (_) {
            // Ignore read-only assignment failures
          }
        }
      }
    };

    const clearBaseColorTexture = async () => {
      if (pbr?.baseColorTexture) {
        if (typeof pbr.setBaseColorTexture === "function") {
          try {
            await pbr.setBaseColorTexture(null);
          } catch (_) {
            // swallow and fall back to manual nulling.
          }
        }
        if (typeof pbr.baseColorTexture?.setTexture === "function") {
          try {
            pbr.baseColorTexture.setTexture(null);
          } catch (_) {
            // ignore if setTexture doesn't work
          }
        }
        // Try to set to null, but ignore if it's read-only
        try {
          pbr.baseColorTexture = null;
        } catch (_) {
          // Property is read-only, use setter methods instead
        }
      }

      if (typeof material.setTexture === "function") {
        try {
          await material.setTexture("baseColorTexture", null);
        } catch (_) {
          // ignore errors from APIs that disallow null.
        }
      }
    };

    await clearBaseColorTexture();
    applyColorFactor();

    if (typeof metallicFactor === "number") {
      if (pbr && typeof pbr.setMetallicFactor === "function") {
        pbr.setMetallicFactor(clamp01(metallicFactor));
      } else {
        material.metallicFactor = clamp01(metallicFactor);
      }
    }

    if (typeof roughnessFactor === "number") {
      if (pbr && typeof pbr.setRoughnessFactor === "function") {
        pbr.setRoughnessFactor(clamp01(roughnessFactor));
      } else {
        material.roughnessFactor = clamp01(roughnessFactor);
      }
    }

    if (emissiveFactor && typeof material.setEmissiveFactor === "function") {
      material.setEmissiveFactor(emissiveFactor);
    }

    const texture = await getSolidTexture(color);
    if (!texture) {
      continue;
    }

    if (typeof material.setTexture === "function") {
      try {
        await material.setTexture("baseColorTexture", texture);
      } catch (_) {
        // ignore, fallback to lower-level APIs below.
      }
    }

    if (pbr) {
      if (typeof pbr.setBaseColorTexture === "function") {
        try {
          await pbr.setBaseColorTexture(texture);
          continue;
        } catch (_) {
          // fall back to manual application.
        }
      }

      if (pbr.baseColorTexture) {
        const info = pbr.baseColorTexture;
        if (typeof info.setTexture === "function") {
          info.setTexture(texture);
        } else {
          info.texture = texture;
        }
      }
    }
  }

  if (typeof modelViewer.requestRender === "function") {
    modelViewer.requestRender();
  }
}
