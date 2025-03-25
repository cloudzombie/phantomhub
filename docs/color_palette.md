# PhantomHub Color Palette

## Core Colors

### Brand Colors
- Primary Green: `#00F260` (brand.500)
  - Used for: Primary actions, success states, active indicators
  - CSS Class: `text-brand-500`, `bg-brand-500`, `border-brand-500`

- Electric Blue: `#0575E6` (accent.500)
  - Used for: Secondary actions, information, links
  - CSS Class: `text-accent-500`, `bg-accent-500`, `border-accent-500`

### Dark Theme

#### Backgrounds
- Primary Background: `#0f172a` (slate.900)
  - Main application background
  - CSS Class: `bg-slate-900`

- Secondary Background: `#1e293b` (slate.800)
  - Cards, modals, dropdowns
  - CSS Class: `bg-slate-800`

- Tertiary Background: `#334155` (slate.700)
  - Interactive elements, hover states
  - CSS Class: `bg-slate-700`

#### Text
- Primary Text: `#ffffff` (white)
  - Headings, important text
  - CSS Class: `text-white`

- Secondary Text: `#94a3b8` (slate.400)
  - Body text, descriptions
  - CSS Class: `text-slate-400`

- Muted Text: `#64748b` (slate.500)
  - Subtle text, placeholders
  - CSS Class: `text-slate-500`

#### Borders
- Primary Border: `#334155` (slate.700)
  - Card borders, main dividers
  - CSS Class: `border-slate-700`

- Secondary Border: `#475569` (slate.600)
  - Input fields, subtle borders
  - CSS Class: `border-slate-600`

### Status Colors

#### Success
- Solid: `#00F260` (brand.500)
- Background: `bg-green-500/10`
- Border: `border-green-500/30`
- Text: `text-green-400`

#### Info
- Solid: `#0575E6` (accent.500)
- Background: `bg-blue-900/30`
- Border: `border-blue-800/50`
- Text: `text-blue-400`

#### Error
- Background: `bg-red-900/20`
- Border: `border-red-500/30`
- Text: `text-red-400`

## Usage Guidelines

### Cards and Containers
```css
bg-slate-800 border border-slate-700 rounded-md
```

### Input Fields
```css
bg-slate-700 border border-slate-600 rounded
```

### Interactive Elements
```css
/* Default */
bg-slate-700 text-slate-400

/* Hover */
hover:bg-slate-600 hover:text-slate-200

/* Active/Selected */
bg-slate-800 text-white
```

### Status Messages
```css
/* Success */
bg-green-900/20 border border-green-500/30 text-green-400

/* Error */
bg-red-900/20 border border-red-500/30 text-red-400

/* Info */
bg-blue-900/30 border border-blue-800/50 text-blue-400
```

### Special Effects

#### Glowing Effects
```css
shadow-neon /* Green glow */
shadow-accent /* Blue glow */
shadow-glow /* White glow */
```

#### Animations
- Pulse: `animate-pulse-slow`
- Glow: `animate-glow`

## Accessibility

All color combinations in our palette meet WCAG 2.1 Level AA standards for contrast ratios:
- Text on backgrounds: minimum 4.5:1
- Large text on backgrounds: minimum 3:1
- UI components and graphical objects: minimum 3:1

## Theme Switching

Our application uses Tailwind's `darkMode: 'class'` strategy. The theme is controlled by the `ThemeService` which adds either `dark-theme` or `light-theme` to the root element.

### Implementation Example
```typescript
// Switch theme
ThemeService.setTheme('dark' | 'light' | 'system');

// Listen for theme changes
ThemeService.addListener((config) => {
  // Handle theme change
});
``` 