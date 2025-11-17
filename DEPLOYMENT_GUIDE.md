# Deployment Guide - Vocabulary Highlighting Feature

## What's New

### Vocabulary Highlighting System
- ✅ **Automatic word highlighting** - Vocabulary words are highlighted in yellow during practice
- ✅ **Click to view details** - Click any highlighted word to see its meaning and all forms
- ✅ **Bulk & single import** - Add vocabulary via JSON bulk import or one word at a time
- ✅ **Persistent storage** - Vocabulary saved in localStorage alongside your exercises

### App Stability Improvements
- ✅ **Version checking** - App now tracks version changes to prevent white screen issues
- ✅ **Better error handling** - Graceful handling of localStorage parsing errors
- ✅ **Service Worker updates** - Automatic cache clearing when new version is deployed
- ✅ **Data preservation** - Your data is never deleted automatically, even on errors

## Deployment Instructions

### Before Deploying

1. **Increment version numbers** (if making breaking changes):
   - Update `APP_VERSION` in `src/App.tsx` (e.g., '2.0.0' → '2.1.0')
   - Update `CACHE_NAME` in `public/sw.js` (e.g., 'german-trainer-v3' → 'german-trainer-v4')

2. **Build the app**:
   ```bash
   npm run build
   ```

3. **Test locally**:
   ```bash
   npm run preview
   ```

### Deploying to Vercel

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Add vocabulary highlighting feature"
   git push origin main
   ```

2. **Vercel auto-deploys** from your main branch
   - Wait for deployment to complete
   - Check deployment logs in Vercel dashboard

### After Deployment - Mobile Users

When you open the app on mobile after an update:

1. **First load after update**: 
   - Service worker will detect the update
   - Page will automatically reload once
   - Your data is preserved in localStorage

2. **If you see a white screen**:
   - **Option 1 (Recommended)**: Force refresh
     - Chrome Android: Tap menu → Settings → Site settings → Clear & reset
     - Safari iOS: Settings → Safari → Clear History and Website Data (WARNING: This clears ALL sites)
   
   - **Option 2**: Use incognito/private mode temporarily
     - Your data is still safe in normal mode
     - Go back to normal mode and export your data (Export button in sidebar)
     - Clear site data, then import your data back

3. **Preventing future issues**:
   - The app now handles updates automatically
   - Service worker clears old caches
   - Version checking prevents data corruption
   - You should NOT see white screens anymore

## Version Tracking

Current version system:
- **App Version**: `2.0.0` - Stored in localStorage as 'app-version'
- **Service Worker Cache**: `german-trainer-v3` - Cleared on each deployment

## Vocabulary Format

### Bulk Import JSON Format:
```json
{
  "vocabulary": [
    {
      "word": "lesen",
      "forms": ["lesen", "liest", "las", "gelesen"],
      "meaning": "to read"
    },
    {
      "word": "Fahrrad",
      "forms": ["das Fahrrad", "Fahrräder"],
      "meaning": "bicycle"
    }
  ]
}
```

### Single Word Add:
- **Word**: lesen
- **Forms**: lesen, liest, las, gelesen (comma-separated)
- **Meaning**: to read

## Troubleshooting

### White Screen After Update
**Cause**: Browser cached old JavaScript chunks that are incompatible with new code

**Solution**:
1. Clear browser cache for the site
2. Or wait 1-2 minutes and refresh - service worker will auto-update
3. Your localStorage data is safe and will reload

### localStorage Not Loading
**Cause**: Corrupted data or version mismatch

**Solution**:
1. Open browser console (F12)
2. Check for error messages
3. If data is corrupted, export what you can
4. Contact support with console logs

### Service Worker Not Updating
**Cause**: Old service worker still active

**Solution**:
```javascript
// In browser console:
navigator.serviceWorker.getRegistrations()
  .then(registrations => {
    registrations.forEach(reg => reg.unregister());
  })
  .then(() => location.reload());
```

## Development Notes

### Making Breaking Changes

If you change the localStorage data structure:

1. Increment `APP_VERSION` in App.tsx
2. Add migration logic in the `useEffect` that loads data
3. Test with old data format before deploying

### Service Worker Updates

The service worker now uses **network-first strategy** for all resources:
- Always fetches latest from network
- Falls back to cache only if offline
- This prevents caching issues but requires internet connection

### Cache Management

Old caches are automatically deleted when:
- Service worker activates with new cache name
- User opens the app after deployment
- Service worker detects version mismatch

## Support

If users report white screen issues after this deployment:

1. Ask them to try force refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. If that doesn't work, clear site data for the specific site
3. Their data is in localStorage and should persist
4. They can export their data before clearing if concerned

## Future Improvements

- [ ] Add update notification banner instead of auto-reload
- [ ] Implement data backup/restore from cloud
- [ ] Add offline mode indicator
- [ ] Version migration wizard for major updates
