# Device Mockup Studio - CSS Structure

This directory contains the modularized CSS styles for the application.

## File Structure

```
css/
├── README.md          # This file
├── base.css           # Root variables, resets, and foundational styles
├── layout.css         # Grid layout, sections, and responsive structure
└── components.css     # Individual UI components (buttons, inputs, etc.)
```

## Module Descriptions

### `base.css`
**Purpose:** Foundation styles and CSS variables

Contains:
- `:root` variables and color scheme
- Font family definitions
- Body and background styles

### `layout.css`
**Purpose:** Page structure and responsive layout

Contains:
- Main grid layout
- Control pane structure
- Workspace and canvas stage
- Media queries for responsive design
- Model viewer and canvas display rules

### `components.css`
**Purpose:** Individual UI components

Contains:
- Typography (headings, text)
- Form controls (select, file input)
- Buttons (upload, download)
- View toggle
- Screen dimensions display

## Modifying Styles

### Adding New Colors
Edit `base.css` to add CSS custom properties:
```css
:root {
  --primary-color: #147ce5;
  --accent-color: #2d6df6;
}
```

### Changing Layout
Edit `layout.css` for:
- Grid columns/rows
- Spacing and padding
- Responsive breakpoints

### Styling New Components
Add to `components.css`:
```css
.my-component {
  /* styles here */
}
```

## Browser Compatibility

All styles use modern CSS features:
- CSS Grid
- Flexbox
- CSS Custom Properties (variables)
- Backdrop filters

Supported browsers: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
