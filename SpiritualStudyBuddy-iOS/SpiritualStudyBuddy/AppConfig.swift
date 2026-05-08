import Foundation

enum AppConfig {
    static var supabaseURL: URL {
        let s = (Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        guard let url = URL(string: s), let scheme = url.scheme?.lowercased(),
              scheme == "https" || scheme == "http", !s.contains("REPLACE") else {
            fatalError("Set SUPABASE_URL in Info.plist to your Supabase project URL (https).")
        }
        return url
    }

    static var supabaseAnonKey: String {
        guard let s = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
              !s.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
              !s.contains("REPLACE") else {
            fatalError("Set SUPABASE_ANON_KEY in Info.plist.")
        }
        return s.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    /// Optional [scripture.api.bible](https://scripture.api.bible/) key for Ang Salita ng Dios (ASND).
    static var scriptureAPIKey: String? {
        let s = (Bundle.main.object(forInfoDictionaryKey: "SCRIPTURE_API_KEY") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return s.isEmpty ? nil : s
    }

    static var scriptureAsndBibleId: String? {
        let s = (Bundle.main.object(forInfoDictionaryKey: "SCRIPTURE_ASND_BIBLE_ID") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return s.isEmpty ? nil : s
    }
}
