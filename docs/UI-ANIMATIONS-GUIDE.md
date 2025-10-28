# UI Animations Guide

## Overview
This document describes the animation system implemented across the POS Frontend application to create smooth, pleasant transitions and interactions.

## Page Transitions

### Implementation
Page transitions are handled by the `PageTransition` component which wraps the main content area in `DashboardLayout`.

**Location:** `src/components/PageTransition.tsx`

### Features
- **Fade In/Out**: Pages fade out when navigating away and fade in when loading
- **Vertical Movement**: Subtle upward movement (20px) creates depth
- **Scale Effect**: Slight scale change (0.98 to 1.0) adds polish
- **Duration**: 400ms for smooth but responsive feel
- **Timing**: Uses `cubic-bezier(0.4, 0, 0.2, 1)` for natural easing

### Animation Sequence
1. User clicks navigation link
2. Current page fades out and moves up slightly (`fadeOutUp`)
3. New page content loads
4. New page fades in and moves into position (`fadeInUp`)

### Accessibility
- Respects `prefers-reduced-motion` media query
- Users who prefer reduced motion see instant page changes without animation

## Navigation Transitions

### Sidebar Links
Navigation links in the sidebar have smooth transitions:
- **Duration**: 200ms
- **Properties**: Background color, text color, shadow
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)`

### Effects
- Hover states transition smoothly
- Active link background transitions in/out
- Icon containers maintain smooth color changes

## Button Animations

### Hover Effects
All buttons have subtle hover animations:
```css
button:hover {
  transform: translateY(-1px);
}
```

### Active/Press Effects
Buttons respond to clicks with visual feedback:
```css
button:active {
  transform: translateY(0);
}
```

### Timing
- Transition duration: 150ms
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)`

## Card Animations

### Hover Effect
Cards lift slightly on hover to indicate interactivity:
- **Transform**: `translateY(-2px)`
- **Shadow**: Enhanced box-shadow
- **Duration**: 250ms

### Use Cases
- Product cards
- Statistics cards
- Dashboard widgets
- List items that are clickable

## Table Animations

### Row Hover
Table rows highlight smoothly on hover:
- **Background**: Subtle indigo tint (`rgba(99, 102, 241, 0.03)`)
- **Duration**: 150ms
- **Timing**: ease

## Modal Animations

### Entry/Exit
Modals use scale and fade animations:
- **Entry**: Scale from 0.95 to 1.0 with fade in
- **Duration**: 300ms
- **Easing**: `cubic-bezier(0.4, 0, 0.2, 1)`

## Dropdown Animations

### Slide In Effect
Dropdowns animate into view:
```css
@keyframes dropdownSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

### Duration
- 200ms for quick but smooth appearance

## Alert Animations

### Slide In From Left
Alerts slide in from the left side:
- **Distance**: 20px horizontal movement
- **Duration**: 300ms
- **Includes**: Fade in effect

## Spinner Animations

### Smooth Rotation
Loading spinners use enhanced easing:
- **Timing**: `cubic-bezier(0.4, 0, 0.2, 1)`
- Provides smoother rotation than default linear timing

## Animation Principles

### 1. Performance
- All animations use `transform` and `opacity` for GPU acceleration
- No layout-triggering properties (width, height, top, left)
- Smooth 60fps performance on modern devices

### 2. Consistency
- Similar interactions use similar animations
- Duration matches interaction importance:
  - Quick interactions: 150-200ms
  - Standard transitions: 250-300ms
  - Page transitions: 400ms

### 3. Subtlety
- Animations enhance, don't distract
- Movement distances are small (1-20px)
- Timing feels natural, not mechanical

### 4. Purpose
Every animation serves a purpose:
- **Feedback**: Confirm user actions (button press)
- **Hierarchy**: Show relationships (dropdown from button)
- **Continuity**: Maintain context (page transitions)
- **Attention**: Guide focus (alerts sliding in)

## Customization

### Adjusting Animation Duration
All animations use CSS custom properties or direct values. To adjust globally:

1. **Page Transitions**: Edit `src/components/PageTransition.css`
2. **General Animations**: Edit `src/index.css`

### Disabling Animations
Animations automatically disable for users with `prefers-reduced-motion` setting enabled.

To disable specific animations, add:
```css
@media (prefers-reduced-motion: reduce) {
  .your-element {
    animation: none;
    transition: none;
  }
}
```

## Browser Support

All animations use standard CSS properties supported by:
- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Modern mobile browsers

## Performance Tips

1. **Limit Concurrent Animations**: Too many simultaneous animations can cause jank
2. **Use `will-change` Sparingly**: Only for elements about to animate
3. **Prefer `transform` and `opacity`**: GPU-accelerated properties
4. **Test on Lower-End Devices**: Ensure smooth performance across devices

## Future Enhancements

Potential animation improvements:
- [ ] Loading skeleton screens with shimmer effect
- [ ] Staggered list animations (items appear one by one)
- [ ] Parallax effects for hero sections
- [ ] Micro-interactions for form inputs
- [ ] Success/error state animations
- [ ] Chart data animation transitions

## Related Files

- `src/components/PageTransition.tsx` - Page transition component
- `src/components/PageTransition.css` - Page transition styles
- `src/index.css` - Global animation styles
- `src/features/dashboard/DashboardLayout.tsx` - Navigation implementation

## Testing Animations

### Manual Testing
1. Navigate between pages - observe smooth transitions
2. Hover over buttons/cards - verify lift effect
3. Open modals/dropdowns - check entry animations
4. Enable "Reduce Motion" in OS settings - verify animations disable

### Performance Testing
1. Open DevTools Performance panel
2. Record while navigating
3. Check for 60fps during animations
4. Verify no layout thrashing

## Conclusion

The animation system creates a cohesive, pleasant user experience while maintaining excellent performance and accessibility. All animations are purposeful, subtle, and enhance rather than distract from the user's tasks.
