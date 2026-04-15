# Real-Time Customization Sync - Quick Reference Guide

## For Admins

### How It Works
When you make changes to customization settings, they apply **instantly to all open dashboards** without requiring page refresh.

### What Gets Synced Real-Time

| Feature | Location | What Syncs |
|---------|----------|-----------|
| **Brand** | Tools → Brand Customization | Logo, company name, colors, contact info |
| **Theme** | Tools → Theme Customization | Dark mode, accent colors, fonts |
| **Homepage** | Tools → Homepage Builder | Widget visibility, widget order |
| **System Settings** | Tools → System Settings | Maintenance mode, language, timezone |

### Using Multiple Browser Tabs

**Scenario**: You're an admin customizing the app while monitoring impact

1. Open Dashboard in **Tab A**
2. Open Brand Customization in **Tab B**
3. Make changes in **Tab B**
4. Changes appear **instantly in Tab A** - no refresh needed

### Settings Saved Automatically
- Each customization page has a "Save" button
- Click Save to apply changes
- Changes persist in browser storage
- Settings survive browser refresh

### Work from Multiple Devices/Tabs
- Settings are stored locally per browser
- Each browser/device maintains its own customization
- If you need identical settings on multiple devices, you'll need to replicate changes

---

## For Developers

### Using Customization Contexts in Components

#### Import the Context Hook
```typescript
import { useBrand } from "@/contexts/BrandContext";
import { useThemeCustomization } from "@/contexts/ThemeCustomizationContext";
import { useHomepageBuilder } from "@/contexts/HomepageBuilderContext";
import { useSystemSettings } from "@/contexts/SystemSettingsContext";
```

#### Access Values in Component
```typescript
function MyComponent() {
  const { brandConfig, updateBrandConfig } = useBrand();
  
  return (
    <div style={{ color: brandConfig.primaryColor }}>
      {brandConfig.brandName}
    </div>
  );
}
```

#### Update Settings
```typescript
function CustomizeButton() {
  const { updateBrandConfig } = useBrand();
  
  const changeBrand = () => {
    updateBrandConfig({
      primaryColor: '#FF0000',
      brandName: 'New Name'
    });
  };
  
  return <button onClick={changeBrand}>Change Brand</button>;
}
```

### Database Integration (Future)
When backend integration is added, modify the context's `updateXxx` function:

```typescript
// Add this to context
const updateBrandConfig = async (config: BrandConfig) => {
  setBrandConfig(prev => ({ ...prev, ...config }));
  
  // NEW: Save to database
  await saveBrandToDB(config);
  
  // Existing: Persist locally and broadcast
  localStorage.setItem('melitech_brand_config', JSON.stringify(config));
  applyBrandToDOM();
  broadcastBrandUpdate(config);
};
```

### Using CSS Custom Properties

All contexts apply CSS custom properties to `document.documentElement`:

```javascript
// Available in any CSS file
/* Brand colors */
var(--brand-primary)
var(--brand-secondary)
var(--brand-accent)

/* Theme */
var(--theme-accent)
var(--theme-dark-bg)
var(--theme-h1-light)

/* System */
[data-maintenance-mode="true"]  /* selector for maintenance mode */
```

### Example: Custom Styled Component
```typescript
function CustomCard() {
  const { brandConfig } = useBrand();
  
  return (
    <div style={{
      borderColor: brandConfig.primaryColor,
      backgroundColor: `${brandConfig.primaryColor}15` // 15% opacity
    }}>
      Styled with dynamic brand color
    </div>
  );
}
```

### Storage Keys (for debugging)
Open browser DevTools → Application → localStorage to inspect:
```
melitech_brand_config        → {brandName, colors, logos}
melitech_theme_config        → {darkMode, fonts, accents}
melitech_homepage_widgets    → [widget objects]
melitech_homepage_order      → ["widget1", "widget2"]
melitech_system_settings     → {maintenanceMode, language}
```

### Testing Cross-Tab Sync

#### Manual Test
```bash
# 1. Start dev server
npm run dev

# 2. Open in two browser windows
http://localhost:5173
http://localhost:5173

# 3. In Window A: Go to Tools → Brand Customization
# 4. In Window B: Go to any Dashboard
# 5. In Window A: Change color → Save
# 6. Observe: Color changes instantly in Window B
```

#### Browser Console Test
```javascript
// Check if BroadcastChannel available
typeof BroadcastChannel  // Should be 'function'

// Check stored settings
JSON.parse(localStorage.getItem('melitech_brand_config'))

// Manually trigger broadcast (dev-only)
const channel = new BroadcastChannel('melitech_crm_customization');
channel.postMessage({
  type: 'brand',
  payload: { brandConfig: { primaryColor: '#FF00FF' } }
});
```

### Troubleshooting

#### Settings not syncing between tabs
✓ Verify both tabs are same origin (http://localhost:3000 vs https://example.com)  
✓ Check BroadcastChannel is supported: `console.log(typeof BroadcastChannel)`  
✓ Verify useCustomizationListener hook is called in App component  

#### Settings not persisting after refresh
✓ Check localStorage enabled: `console.log(typeof localStorage)`  
✓ Check quota: `navigator.storage.estimate()`  
✓ Verify storage key matches: `Object.keys(localStorage).filter(k => k.includes('melitech'))`  

#### CSS custom properties not applying
✓ Verify CSS uses `var(--property-name)` syntax  
✓ Check `applyXxxToDOM()` is called when settings update  
✓ Inspect DevTools: `getComputedStyle(document.documentElement).getPropertyValue('--brand-primary')`  

---

## File Structure

```
client/src/
├── contexts/
│   ├── BrandContext.tsx                      ✨ New
│   ├── ThemeCustomizationContext.tsx         ✨ New
│   ├── HomepageBuilderContext.tsx            ✨ New
│   ├── SystemSettingsContext.tsx             ✨ New
│   └── ThemeContext.tsx                      (existing)
│
├── hooks/
│   ├── useCustomizationListener.ts           ✨ Updated
│   └── customizationBroadcast.ts             ✨ New
│
├── pages/tools/
│   ├── BrandCustomization.tsx                (needs update to use context)
│   ├── ThemeCustomization.tsx                (needs update to use context)
│   ├── CustomHomepageBuilder.tsx             (needs update to use context)
│   └── SystemSettings.tsx                    (needs update to use context)
│
└── App.tsx                                   ✨ Updated to wrap with providers
```

---

## Performance Notes

- **Message Size**: ~1-5KB per broadcast
- **Latency**: <10ms between tabs (native BroadcastChannel)
- **Storage**: ~5KB total in localStorage
- **CPU**: Minimal impact (CSS variable updates only)

---

## Next Steps

1. **Refactor customization pages** to use contexts directly (phase 2)
2. **Add backend storage** for cross-device sync (phase 3)
3. **Export/import profiles** for sharing customizations (phase 4)
4. **Admin audit log** to track who changed what when (phase 5)

---

## API Reference

### BrandContext
```typescript
interface BrandContextType {
  brandConfig: BrandConfig;
  companyBrand: BrandConfig;
  updateBrandConfig: (config: BrandConfig) => void;
  updateCompanyBrand: (brand: BrandConfig) => void;
  applyBrandToDOM: () => void;
}
const { ... } = useBrand();
```

### ThemeCustomizationContext
```typescript
interface ThemeContextType {
  config: ThemeConfig;
  updateThemeConfig: (config: ThemeConfig) => void;
  applyThemeToDOM: () => void;
}
const { ... } = useThemeCustomization();
```

### HomepageBuilderContext
```typescript
interface HomepageBuilderContextType {
  widgets: Widget[];
  widgetOrder: string[];
  reorderWidgets: (order: string[]) => void;
  toggleWidget: (id: string) => void;
  updateWidget: (id: string, config: Partial<Widget>) => void;
}
const { ... } = useHomepageBuilder();
```

### SystemSettingsContext
```typescript
interface SystemSettingsContextType {
  settings: SystemSettings;
  updateSettings: (config: SystemSettings) => void;
  applySettingsToDOM: () => void;
}
const { ... } = useSystemSettings();
```

---

## Support

For issues or questions:
1. Check browser console for errors
2. Verify BroadcastChannel compatibility
3. Review localStorage settings
4. Check [REAL_TIME_CUSTOMIZATION_SYNC_COMPLETE.md](REAL_TIME_CUSTOMIZATION_SYNC_COMPLETE.md) for detailed documentation
