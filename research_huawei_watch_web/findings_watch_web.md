# Huawei Watch Web Findings

## Sources

- Huawei Watch 5 official specs: https://consumer.huawei.com/en/wearables/watch-5/specs/
- Android Wear design principles: https://developer.android.com/design/ui/wear/guides/m2-5/foundations/design-principles
- Android Wear screen sizes: https://developer.android.com/design/ui/wear/guides/m2-5/foundations/screen-sizes
- Android Wear adaptive layouts: https://developer.android.com/design/ui/wear/guides/m2-5/foundations/adaptive-layouts
- W3C target-size technique: https://www.w3.org/WAI/WCAG21/Techniques/css/C44

## Practical Constraints

- Huawei Watch 5 display is 466 x 466 pixels on both 46 mm and 42 mm models, with 1.5 inch and 1.38 inch AMOLED variants.
- Treat the watch page as a glanceable task surface, not a shrunken desktop dashboard.
- Keep watch flows focused on one or two critical actions, with short interactions that avoid wrist fatigue.
- Test the smallest practical watch viewport first; avoid clipped text, clipped buttons, bad margins, and inconsistent scaling.
- Use proportional outer margins for round-screen layouts to reduce edge clipping.
- Prefer scrolling/card layouts for dense content on round screens, with visible hierarchy and larger tap targets when space permits.
- Keep interactive controls at least 44 x 44 CSS pixels where possible.

## Implementation Checks For This App

- Desktop keeps the existing two-column console.
- Mobile becomes a single-column console with labeled rows instead of table columns.
- Watch mode uses swipeable panels, compact sticky status, 44 px controls, proportional edge padding, no decorative background clutter, and no table headers.
