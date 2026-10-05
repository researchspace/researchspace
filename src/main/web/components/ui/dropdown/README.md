# Anchored dropdowns

Use `rs-dropdown` for menus that must remain readable inside narrow or scrolling
panels. Keep the existing Bootstrap toggle, menu and action wrappers:

```html
<rs-dropdown id="search-actions" pull-right=true menu-width=280>
  <bs-dropdown-toggle aria-label="Search actions">Actions</bs-dropdown-toggle>
  <bs-dropdown-menu>
    <mp-event-trigger id="export" type="Component.TemplateUpdate" targets='["export-target"]'>
      <bs-menu-item>Export results</bs-menu-item>
    </mp-event-trigger>
  </bs-dropdown-menu>
</rs-dropdown>
```

| Attribute | Default | Behaviour |
| --- | --- | --- |
| `menu-width` | `280` | Preferred width in CSS pixels; constrained by the viewport. |
| `match-trigger-width` | `false` | Expand to at least the trigger width when space permits. |
| `max-menu-height` | `400` | Maximum height in CSS pixels; also limited by space above/below the trigger. |
| `pull-right` | `false` | Align the menu's right edge with the trigger instead of its left edge. |

The component also accepts `id`, `class`, `title` and `disabled`. Menu children stay
mounted and retain their React and template contexts. Bootstrap owns outside-click
dismissal; `DropdownOverlay` handles wrapped actions, keyboard navigation, observer
cleanup and closing when the trigger leaves its visible scroll area.

`AnchoredMenuOverlay` is the lower-level positioning utility for other controls,
including form media navigation. It supports preferred width, trigger-width
matching, alignment, viewport margin, trigger gap and maximum height. It promotes
the existing element to the native popover top layer without moving its DOM node.
Without native popovers it fits the menu inside clipping ancestors; this fallback
cannot escape those ancestors. `dispose()` restores the original inline styles
and popover attribute.

Import `AnchoredMenuOverlay` from this directory for custom overlay consumers.
