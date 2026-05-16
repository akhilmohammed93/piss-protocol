# Play Store Assets — Piss Protocol

This document lists all assets and metadata required to publish Piss Protocol on Google Play.

## App Identity

| Field | Value |
|-------|-------|
| App name | Piss Protocol |
| App ID | com.pissprotocol.game |
| Default language | English (United States) |
| Category | Puzzle |
| Content rating | Everyone (Crude Humor) |

## Store Listing Copy

### Short Description (≤80 characters)
```
Navigate the unwritten rules of urinal etiquette. Don't pick wrong!
```

### Full Description (≤4000 characters)
```
Welcome to Piss Protocol — the only game that teaches you the sacred, unspoken 
rules of men's room diplomacy.

🚽 HOW TO PLAY
Choose the correct urinal from a row of options, following the strict (and 
hilarious) unwritten rules of bathroom etiquette:
• Never stand next to someone if there's a gap available
• Bosses get extra personal space — always
• Perverts lurk — avoid suspiciously positioned neighbors
• Janitors, cones, and phone guys block urinals
• Sometimes the only right answer is to hold it in

📈 500 LEVELS OF ESCALATING AWKWARDNESS
From simple 3-urinal choices to chaotic 10-urinal nightmares with bosses, 
perverts, pattern enforcers, and caution cones — every level is a new test of 
your social awareness and bladder control.

🏆 COMPETE ON THE LEADERBOARD
Post your score and climb the ranks. Can you reach PISSMASTER status?

⏱️ 30-SECOND TIMER
The pressure is on. Make your choice before time runs out or lose a life.

🎮 FEATURES
• 500 unique puzzle levels
• 8+ character types with unique rules
• Real-time leaderboard
• 8-bit background music and sound effects
• Haptic feedback on Android
• Works offline (leaderboard cached locally)
• Full-screen immersive mode

Perfect for:
✓ A quick laugh during a boring meeting
✓ Settling debates about bathroom etiquette
✓ Anyone who has ever stood in a bathroom wondering what to do

Disclaimer: No actual urinals were harmed in the making of this game.
```

## Icon

| Asset | Path | Size |
|-------|------|------|
| Source (1024×1024) | `attached_assets/ic_launcher_1024.png` | 1024×1024 px |
| Play Store icon (512×512) | Resize source to 512×512 | 512×512 px |
| mipmap-mdpi | `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` | 48×48 px |
| mipmap-hdpi | `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` | 72×72 px |
| mipmap-xhdpi | `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` | 96×96 px |
| mipmap-xxhdpi | `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` | 144×144 px |
| mipmap-xxxhdpi | `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` | 192×192 px |
| PWA icon 192 | `client/public/icons/icon-192.png` | 192×192 px |
| PWA icon 512 | `client/public/icons/icon-512.png` | 512×512 px |

**Icon description**: Lego-yellow background with a toilet rendered in Lego-brick style. "PP" monogram in dark navy. Dark blue accents.

## Feature Graphic

| Asset | Path | Size |
|-------|------|------|
| Feature Graphic | `attached_assets/play_store_feature_graphic.png` | 1024×500 px |

**Design**: Dark navy blue (#15192A) background. Yellow "PISS PROTOCOL" title in arcade/pixel font. Row of cartoon urinals. Humorous arcade game aesthetic.

> Note: Google Play requires the feature graphic to be exactly **1024×500 pixels**. If the generated image is a different size, resize it:
> ```bash
> convert attached_assets/play_store_feature_graphic.png -resize 1024x500! play_store_feature_graphic_final.png
> ```

## Screenshots

Google Play requires **at least 2 screenshots** for phone form factor.

### Committed Screenshot Files

| File | Size | Content |
|------|------|---------|
| `play_store_assets/screenshots/screenshot-1-gameplay.png` | 1008×2244 px | Main game: urinal selection screen with occupied spots and Hold It In button |
| `play_store_assets/screenshots/screenshot-2-gameplay.png` | 1008×2244 px | Gameplay in action with character reactions and feedback |

### Upload Instructions

Upload the files above directly to the Play Console screenshot section (phone). No resizing required — 1008×2244 is within the accepted range.

### Captions (optional but recommended)
1. *"Navigate the unwritten rules of urinal etiquette!"*
2. *"Characters react to your every move — choose wisely!"*

### Required Dimensions
- Phone: 1080×1920 px (portrait) or 1080×2340 px
- Minimum short side: 320 px
- Maximum short side: 3840 px
- Aspect ratio: 16:9 to 9:16

### Taking Additional Screenshots
```bash
# Via ADB from connected Android device or emulator
adb shell screencap /sdcard/screenshot.png
adb pull /sdcard/screenshot.png play_store_assets/screenshots/screenshot-3.png
```

## Content Rating

Complete the IARC questionnaire in Play Console with:
- **Violence**: None
- **Sexual content**: None  
- **Language**: Mild crude humor (toilet/bathroom references)
- **Controlled substances**: None
- **Intended audience**: 13+

Expected rating: **Everyone (Crude Humor)**

## Privacy Policy

URL: Must be hosted at a public URL. Options:
- Host `privacy_policy.md` on GitHub Pages
- Upload to your own domain as `privacy-policy.html`
- Use a service like termly.io

## Checklist Before Submission

- [ ] App icon 512×512 PNG (no alpha, no rounded corners — Google adds them)
- [ ] Feature graphic 1024×500 PNG
- [ ] At least 2 phone screenshots
- [ ] Short description filled (≤80 chars)
- [ ] Full description filled (≤4000 chars)
- [ ] Privacy policy URL added
- [ ] Content rating questionnaire completed
- [ ] Category set to "Puzzle"
- [ ] App signed with release keystore
- [ ] Version code incremented
- [ ] Tested on a physical Android device or emulator
