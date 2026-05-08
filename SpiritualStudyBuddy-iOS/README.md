# Spiritual Study Buddy (iOS)

Native **SwiftUI** port of the Next.js Bible app, optimized for **iPhone** (single-column layout, large tap targets, bottom sheets, portrait-first). **Supabase** handles auth, profiles, bookmarks, and daily-verse tracking. **On-device Apple Intelligence** powers the study assistant via Apple’s **FoundationModels** framework (no Gemini or Grok API keys in the app binary).

## Requirements

- **Xcode 26** (or newer) with the **iOS 26 SDK**, so the `FoundationModels` module is available to build the AI path. On older Xcode versions the project still builds, but the AI sheet shows that Apple Intelligence is unavailable until you build with a current SDK.
- A **physical device** (or simulator) where **Apple Intelligence** is supported and turned on, if you want real model replies. See Apple’s documentation for device and region eligibility.
- Your **Supabase** project (same tables/RLS as the web app: `profiles`, `bookmarks`, `daily_verse_views`).

## Open the project

1. Open `SpiritualStudyBuddy.xcodeproj` in Xcode.
2. Wait for Swift Package Manager to resolve **supabase-swift** (from GitHub).
3. Select the **SpiritualStudyBuddy** scheme and an iPhone run destination.

## Configure secrets

Edit `SpiritualStudyBuddy/Info.plist` (or use a **Debug** `.xcconfig` / build settings if you prefer not to commit secrets):

| Key | Purpose |
|-----|--------|
| `SUPABASE_URL` | Project URL (same as `NEXT_PUBLIC_SUPABASE_URL`). |
| `SUPABASE_ANON_KEY` | Anon key (same as `NEXT_PUBLIC_SUPABASE_ANON_KEY`). |
| `SCRIPTURE_API_KEY` | Optional. Needed only for **ASND** (Ang Salita ng Dios) via [scripture.api.bible](https://scripture.api.bible/). |
| `SCRIPTURE_ASND_BIBLE_ID` | Optional. Pin the ASND Bible id to skip discovery requests. |

For App Store builds, prefer **xcconfig** files that are **not** committed, or Xcode’s **User-Defined** build settings, instead of storing production keys in plist source.

## App Store checklist (short)

- Set **Bundle Identifier** and **Development Team** in the target’s **Signing & Capabilities** tab.
- Add a real **1024×1024** icon in `Assets.xcassets` → **AppIcon** (template leaves placeholder metadata only).
- Complete **App Privacy** labels (network: Supabase, bible-api.com, getbible, optional scripture.api.bible).
- Add **Terms / support URL** as required by App Store Connect.

## Behaviour vs the web app

- **Reader & versions**: Same public sources as the web app (`bible-api.com`, Tagalog JSON, optional ASND).
- **AI**: Uses **`LanguageModelSession`** on device (Apple Intelligence stack). The Supabase **Edge Function** that called Gemini/Grok is **not** used by this iOS target.
- **Daily Bread**: Same UTC date key and `daily_verse_views` insert as the web client.

## Project layout

- `SpiritualStudyBuddy/` — SwiftUI app sources and `Info.plist`.
- `SpiritualStudyBuddy.xcodeproj/` — Xcode project with SPM link to `supabase-swift`.
