# PWA & Data Management Features

## 🎯 Overview

Your German B1 Trainer is now a **Progressive Web App (PWA)** with full offline support and data portability!

---

## 📱 PWA Features

### What is a PWA?
A Progressive Web App works like a native mobile app but runs in your browser. Key benefits:
- ✅ **Install on device** - Add to home screen (mobile/desktop)
- ✅ **Work offline** - Access exercises without internet
- ✅ **Fast loading** - Cached resources load instantly
- ✅ **App-like experience** - Fullscreen mode, no browser UI
- ✅ **Cross-platform** - Works on iOS, Android, Windows, Mac, Linux

### How to Install

#### On Mobile (iOS/Android):
1. Open the app in your browser (Chrome, Safari, Edge)
2. Look for the "Add to Home Screen" prompt
   - **iOS Safari**: Tap Share → Add to Home Screen
   - **Android Chrome**: Tap Menu (⋮) → Add to Home Screen
3. Confirm installation
4. App icon appears on your home screen

#### On Desktop (Windows/Mac/Linux):
1. Open the app in Chrome, Edge, or Brave
2. Look for the install icon (⊕) in the address bar
3. Click "Install"
4. App opens in its own window

### Offline Usage
Once installed, the app works completely offline:
- All exercises are stored locally
- UI loads from cache
- No internet needed for practice
- Data syncs when you export/import

---

## 💾 Export/Import Data

### Why Use Export/Import?
- **Backup** - Save all your exercises and progress
- **Transfer** - Move data between devices
- **Share** - Share exercise collections with friends
- **Restore** - Recover after clearing browser data
- **Version control** - Keep snapshots of your progress

### How to Export

1. **Find the Export button**:
   - Open any topic
   - Look for the purple **"Export"** button (with download icon)
   - Located below "Add Multiple Exercises"

2. **Click Export**:
   - A JSON file downloads automatically
   - Filename format: `german-trainer-backup-YYYY-MM-DD.json`
   - Example: `german-trainer-backup-2024-01-15.json`

3. **Save the file**:
   - Store in a safe location (cloud storage recommended)
   - File contains ALL topics, exercises, and progress

### What's Included in Export?
```json
[
  {
    "id": "topic-123",
    "name": "Dative Case Practice",
    "exercises": [
      {
        "id": "exercise-456",
        "name": "Verbs with Dative",
        "description": "Practice verbs that take dative...",
        "questions": [
          {
            "id": "q-789",
            "type": "fill-blank",
            "sentence": "Ich helfe ___ Kind.",
            "correctAnswer": "dem",
            "timesAnswered": 5,
            "timesCorrect": 4,
            "lastReviewed": "2024-01-15T10:30:00.000Z",
            "createdAt": "2024-01-10T08:00:00.000Z"
          }
        ]
      }
    ]
  }
]
```

**Contains**:
- ✅ All topics
- ✅ All exercises with names and descriptions
- ✅ All questions with full details
- ✅ Your progress (times answered, times correct)
- ✅ Review history (last reviewed dates)
- ✅ Timestamps (created dates)

### How to Import

1. **Find the Import button**:
   - Open any topic
   - Look for the orange **"Import"** button (with upload icon)
   - Right next to the Export button

2. **Click Import**:
   - File picker opens
   - Select your `.json` backup file

3. **Confirm overwrite**:
   - **⚠️ WARNING**: Import REPLACES all existing data
   - Confirmation dialog appears
   - Shows number of topics being imported
   - Click "OK" to proceed or "Cancel" to abort

4. **Data restored**:
   - All topics and exercises loaded
   - Progress restored
   - Success message shows topic count

### ⚠️ Important Notes

**Import Overwrites Everything**:
- Current data is REPLACED, not merged
- Always export before importing
- No undo after confirmation

**File Requirements**:
- Must be `.json` format
- Must be exported from this app
- Manual edits must maintain structure

**Validation**:
- App checks if file is valid JSON
- Verifies it's an array of topics
- Shows error if format is wrong

---

## 🔄 Workflow Examples

### Scenario 1: Backup Before Major Changes
```
1. Click Export (save: backup-before-changes.json)
2. Add 50 new exercises via bulk import
3. Test the new exercises
4. If issues: Import backup-before-changes.json to restore
```

### Scenario 2: Transfer to Another Device
```
DEVICE A (Phone):
1. Click Export
2. Save to Google Drive/Dropbox

DEVICE B (Laptop):
1. Download backup from cloud
2. Click Import
3. Select downloaded file
4. Confirm overwrite
5. All data now on Device B
```

### Scenario 3: Share with Study Partner
```
YOU:
1. Export your exercises
2. Send file via email/messaging

YOUR PARTNER:
1. Open app in browser
2. Click Import
3. Select your file
4. Now has all your exercises!
```

### Scenario 4: Weekly Backup Routine
```
Every Sunday:
1. Export data
2. Rename: backup-week-01.json, backup-week-02.json, etc.
3. Store in Dropbox/Google Drive
4. Keep last 4 weeks
5. Always have recent restore point
```

---

## 🛠️ Technical Details

### Service Worker
- Caches app shell (HTML, CSS, JS)
- Offline-first strategy
- Cache name: `german-trainer-v1`
- Auto-updates when new version deployed

### Manifest
- **Name**: German B1 Trainer
- **Short name**: B1 Trainer
- **Theme color**: #4f46e5 (indigo)
- **Display**: Standalone (fullscreen app)
- **Orientation**: Portrait (mobile)
- **Icons**: SVG (scalable, crisp on all devices)

### Data Storage
- **Location**: Browser localStorage
- **Key**: `german-practice-data`
- **Format**: JSON string
- **Size limit**: ~5-10MB (plenty for thousands of exercises)
- **Persistence**: Permanent until cleared

### Export Format
- **Type**: JSON
- **Encoding**: UTF-8
- **Pretty print**: Yes (2-space indent)
- **Size**: Typically 10-500KB depending on content

---

## 📊 Data Management Best Practices

### Regular Backups
- **Frequency**: Weekly or after major additions
- **Naming**: Include date in filename
- **Storage**: Cloud storage for safety
- **Retention**: Keep last 4-8 backups

### Before Risky Operations
Export before:
- ✅ Bulk importing large datasets
- ✅ Clearing browser data
- ✅ Testing new features
- ✅ Sharing device with others
- ✅ Browser updates

### Multi-Device Setup
If using on multiple devices:
1. Choose one "master" device
2. Export from master regularly
3. Import to other devices to sync
4. Or: Always export before switching devices

### Privacy & Security
- ✅ Data stored locally (not on servers)
- ✅ Export files are plain JSON (not encrypted)
- ✅ Don't share files with sensitive personal info
- ✅ Store backups in private cloud storage
- ✅ Delete old backups when no longer needed

---

## 🐛 Troubleshooting

### Export Issues

**Export button doesn't work**:
- Check if you have any topics created
- Empty topics still export (shows `[]`)
- Check browser console for errors

**File doesn't download**:
- Check browser download settings
- Disable pop-up blockers
- Try different browser

**File is empty**:
- Normal if you have no data yet
- Shows: `[]` (empty array)

### Import Issues

**"Invalid file format" error**:
- Ensure file is from this app
- Check file isn't corrupted
- Open in text editor - should start with `[`
- Must be valid JSON

**Import replaces wrong data**:
- Import ALWAYS overwrites everything
- No way to undo after confirming
- Always export current data first

**After import, data looks wrong**:
1. Export immediately (save corrupted state)
2. Try importing your backup again
3. Check backup file in text editor
4. Contact support if needed

### PWA Issues

**Install prompt doesn't appear**:
- Must use HTTPS (or localhost)
- Must meet PWA criteria
- Try hard refresh (Ctrl+Shift+R)
- Check browser support

**Offline mode not working**:
- Reload app while online first
- Service worker needs to install
- Check browser console for SW errors
- Clear cache and retry

**App doesn't update**:
- Service worker caches aggressively
- Hard refresh to force update
- Or: Uninstall and reinstall app

---

## 📱 Browser Compatibility

### Full PWA Support:
- ✅ Chrome (Desktop & Mobile)
- ✅ Edge (Desktop & Mobile)
- ✅ Brave (Desktop & Mobile)
- ✅ Samsung Internet
- ✅ Opera

### Partial Support:
- ⚠️ Safari (iOS/Mac) - Works but no install prompt
  - Use "Add to Home Screen" manually
- ⚠️ Firefox - Offline works, install limited

### Not Supported:
- ❌ Internet Explorer (use Edge instead)
- ❌ Very old browsers

---

## 🎓 Tips & Tricks

### Organize Your Backups
```
📁 German-B1-Backups/
  📄 2024-01-01-initial.json
  📄 2024-01-15-added-vocabulary.json
  📄 2024-02-01-pre-exam.json
  📄 2024-02-15-post-exam.json
```

### Create Topic-Specific Exports
Since export saves ALL topics:
1. Keep only topics you want to share
2. Delete others temporarily
3. Export
4. Import your full backup to restore

### Use Cloud Sync
- Store exports in Google Drive/Dropbox
- Auto-sync across devices
- Access anywhere
- Version history in cloud

### Regular Maintenance
Monthly routine:
1. Export full backup
2. Review old exercises
3. Delete unused topics
4. Export cleaned version
5. Keep both for reference

---

## 🚀 What's Next?

Now that you have PWA + Export/Import:
- ✅ Practice offline anywhere
- ✅ Never lose your progress
- ✅ Share exercises with others
- ✅ Keep backups for safety
- ✅ Transfer between devices easily

**You're all set for serious B1 exam preparation! 🇩🇪**

---

## 📞 Quick Reference

| Feature | Location | Icon | Purpose |
|---------|----------|------|---------|
| Export | Inside any topic | 🔽 Purple | Download backup |
| Import | Inside any topic | 🔼 Orange | Restore backup |
| Install | Browser address bar | ⊕ | Install as app |
| Offline | Automatic | ⚡ | Works without internet |

**File Format**: JSON  
**Storage**: localStorage  
**Backup**: Manual via Export  
**Sync**: Manual via Export/Import  
**Platform**: Any modern browser  
**Cost**: Free, no servers needed  

---

*Last updated: Based on implementation with 14 question types and full telc B1 coverage*
