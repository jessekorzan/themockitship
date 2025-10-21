# Device Mockup Studio - Modular JavaScript Structure

This directory contains the modularized JavaScript code for the Device Mockup Studio application.

## File Structure

```
js/
├── README.md          # This file
├── devices.js         # Device configuration library
├── materials.js       # Material management utilities
├── textures.js        # Texture creation and application
├── canvas.js          # 2D canvas rendering
└── app.js            # Main application orchestration
```

## Module Descriptions

### `devices.js`
**Purpose:** Device configuration and specifications

Contains the `DEVICE_LIBRARY` array with all device definitions. Each device includes:
- Basic info (id, name, folder, asset prefix)
- Screen dimensions and chrome offset
- 3D model path (optional)
- Texture mapping configuration (UV coords, rotation, scale)
- Body material definitions (colors, metallic/roughness factors)

**Adding a new device:**
```javascript
{
  id: "my-device",
  name: "My Device",
  folder: "devices/MyDevice",
  assetPrefix: "my-device",
  screenWidth: 1920,
  screenHeight: 1080,
  has2DAssets: false, // Set to false if only 3D model exists
  modelPath: "devices/MyDevice/model.glb",
  bodyMaterials: [
    {
      name: "MaterialName",
      color: [0.5, 0.5, 0.5, 1],
      metallicFactor: 0.5,
      roughnessFactor: 0.5,
    }
  ]
}
```

### `materials.js`
**Purpose:** Material detection and color application

Functions:
- `findScreenMaterial(materials)` - Intelligently finds the screen material in a 3D model
- `applyBodyMaterialTint(modelViewer, activeDevice)` - Applies colors to device body materials

### `textures.js`
**Purpose:** Texture creation and management

Functions:
- `setBlackScreen(modelViewer, activeDevice)` - Sets default grey screen when no image loaded
- `updateModelViewerTexture(modelViewer, activeDevice, activeDeviceAssets, userImage)` - Applies user image to 3D screen

Handles UV mapping, rotation, scaling, and proper texture slot application.

### `canvas.js`
**Purpose:** 2D canvas mockup rendering

Functions:
- `renderMockup(canvas, ctx, activeDeviceAssets, userImage)` - Renders the 2D mockup
- `extractMaskBounds(maskImage)` - Extracts screen bounds from mask image

### `app.js`
**Purpose:** Main application logic and orchestration

Manages:
- Application state (user image, active device, view mode)
- DOM elements and event listeners
- Device switching and asset loading
- View mode toggling (2D/3D)
- File upload and download

## Usage in HTML

The modules are loaded as ES6 modules:

```html
<script type="module" src="js/app.js"></script>
```

The `app.js` file automatically imports all other modules and initializes the application.

## Development Tips

### Adding a New Device
1. Prepare assets (2D: _bg.png + _screenmask.png, and/or 3D: .glb file)
2. Add device configuration to `DEVICE_LIBRARY` in `devices.js`
3. Test in both 2D and 3D modes (if applicable)

### Debugging Materials
Check the browser console for:
- "Available materials in model" - Shows all materials in the GLB
- "Material 'X' not found" - Material name mismatch
- "Applying tint to material 'X'" - Successful material tinting

### Modifying Colors
All color values are in normalized RGB format [r, g, b, a] where values are 0-1:
- Pure black: `[0, 0, 0, 1]`
- White: `[1, 1, 1, 1]`
- 50% grey: `[0.5, 0.5, 0.5, 1]`

Convert from hex:
- #4d567d → [77/255, 86/255, 125/255, 1] → [0.302, 0.337, 0.490, 1]

## Browser Compatibility

Requires ES6 module support (all modern browsers).
