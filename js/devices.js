/**
 * Device Configuration
 * Each device defines its assets, screen dimensions, materials, and texture settings
 */

export const DEVICE_LIBRARY = [
  {
    id: "iphone-17-pro",
    name: "iPhone 17 Pro",
    folder: "devices/iPhone 17 Pro ",
    assetPrefix: "iphone-17-pro",
    chromeOffset: 253,
    screenWidth: 402,
    screenHeight: 874,
    modelPath: "devices/iPhone 17 Pro /iphone-17-pro/source/iphone 17_4.glb",
    screenTextureSlot: "emissiveTexture",
    screenTextureSize: 2048,
    screenTextureUV: {
      uMin: 0.184886,
      vMin: 0.438856,
      uMax: 0.524024,
      vMax: 0.601318,
    },
    screenTextureRotation: -Math.PI / 2,
    screenTextureScaleX: 0.90,
    screenTextureScaleY: -1.02,
    screenTextureTranslateY: 80,
    screenTextureOffset: 100,
    bodyMaterials: [
      {
        name: "Plastic",
        color: [0.343, 0.360, 0.427, 1], // Deep blue-grey
        metallicFactor: 0.3,
        roughnessFactor: 0.75,
      },
      {
        name: "Screen_Rim",
        color: [0.326, 0.343, 0.410, 1], // Slightly darker variant
        metallicFactor: 0.25,
        roughnessFactor: 0.8,
      },
      {
        name: "Material.004",
        color: [0.335, 0.352, 0.419, 1], // Mid-tone variant
        metallicFactor: 0.25,
        roughnessFactor: 0.75,
      },
      {
        name: "Material.002",
        color: [0.326, 0.343, 0.410, 1], // Slightly darker variant
        metallicFactor: 0.2,
        roughnessFactor: 0.7,
      },
      {
        name: "Rim_Buttons",
        color: [0.335, 0.352, 0.419, 1], // Mid-tone variant
        metallicFactor: 0.3,
        roughnessFactor: 0.7,
      },
      {
        name: "Material.001",
        color: [0.343, 0.360, 0.427, 1], // Deep blue-grey
        metallicFactor: 0.25,
        roughnessFactor: 0.75,
      },
      {
        name: "Material.003",
        color: [0.335, 0.352, 0.419, 1], // Mid-tone variant
        metallicFactor: 0.25,
        roughnessFactor: 0.75,
      },
    ],
  },
  {
    id: "macbook-pro-m3-16",
    name: "MacBook Pro 16\" (M3)",
    folder: "devices/MacBook Pro M3 16\"",
    assetPrefix: "macbook-pro-m3-16",
    chromeOffset: 0,
    screenWidth: 3456,
    screenHeight: 2234,
    has2DAssets: false,
    modelPath: "devices/MacBook Pro M3 16\"/3d/macbook_pro_m3_16_inch_2024.glb",
    screenMaterialName: "sfCQkHOWyrsLmor",
    screenTextureSlot: "emissiveTexture",
    screenTextureSize: 2048,
    screenTextureUV: {
      uMin: 0.006531,
      vMin: 0.006531,
      uMax: 0.993469,
      vMax: 0.993509,
    },
    screenTextureScaleX: 1.01,
    screenTextureScaleY: -1.02,
    screenTextureTranslateY: 10,
    screenTextureScaleX: 1,
    screenTextureScaleY: -1,
    cameraOrbit: "0deg 75deg 105%",
    fieldOfView: "30deg",
    exposure: 0.5,
    screenUnlit: true,
    disableEnvironmentLighting: true,
    emissiveStrength: 0.3,
    bodyMaterials: [
      {
        name: "jwuTsnFxKtBUxpK",
        color: [0, 0, 0, 0],
        metallicFactor: 0,
        roughnessFactor: 0,
        hide: true,
      },
      {
        name: "fNHiBfcxHUJCahl",
        color: [0, 0, 0, 0],
        metallicFactor: 0,
        roughnessFactor: 0,
        hide: true,
      },
      {
        name: "ZCDwChwkbBfITSW",
        color: [0, 0, 0, 0],
        metallicFactor: 0,
        roughnessFactor: 0,
        hide: true,
      },
    ],
  },
  {
    id: "ipad-a16",
    name: "iPad A16",
    folder: "devices/iPad",
    assetPrefix: "ipad-a16",
    chromeOffset: 0,
    screenWidth: 768,
    screenHeight: 1024,
  },
  {
    id: "imac-24",
    name: "iMac 24\"",
    folder: "devices/iMac",
    assetPrefix: "imac",
    chromeOffset: 0,
    screenWidth: 2048,
    screenHeight: 1152,
    has2DAssets: false,
    modelPath: "devices/iMac/3d/imac_2021.glb",
    screenMaterialName: "Screen",
    screenTextureSlot: "emissiveTexture",
    screenTextureSize: 2048,
    screenTextureUV: {
      uMin: 0,
      vMin: 0,
      uMax: 1,
      vMax: 1,
    },
    screenTextureRotation: 0,
    screenTextureScaleX: 1,
    screenTextureScaleY: -0.56,
    screenTextureOffset: -10,
    screenTextureTranslateY: 25,
    exposure: 0.5,
    screenUnlit: true,
    disableEnvironmentLighting: true,
    emissiveStrength: 0.3,
    bodyMaterials: [
      {
        name: "LightBlue",
        color: [0.85, 0.85, 0.86, 1], // iMac Silver - lighter areas
        metallicFactor: 0.6,
        roughnessFactor: 0.4,
      },
      {
        name: "DarkBlue",
        color: [0.72, 0.72, 0.73, 1], // iMac Silver - darker areas
        metallicFactor: 0.55,
        roughnessFactor: 0.45,
      },
      {
        name: "Metal",
        color: [0.78, 0.78, 0.79, 1], // iMac Silver - metal parts
        metallicFactor: 0.65,
        roughnessFactor: 0.35,
      },
      {
        name: "Metal2",
        color: [0.78, 0.78, 0.79, 1], // iMac Silver - metal parts
        metallicFactor: 0.65,
        roughnessFactor: 0.35,
      },
      {
        name: "Black",
        color: [0.72, 0.72, 0.73, 1], // iMac Silver - darker variant
        metallicFactor: 0.5,
        roughnessFactor: 0.5,
      },
      {
        name: "Black.001",
        color: [0.72, 0.72, 0.73, 1], // iMac Silver - darker variant
        metallicFactor: 0.5,
        roughnessFactor: 0.5,
      },
      {
        name: "White",
        color: [0.22, 0.22, 0.23, 1], // Space Grey bezel around screen
        metallicFactor: 0.4,
        roughnessFactor: 0.5,
      },
    ],
  },
];
