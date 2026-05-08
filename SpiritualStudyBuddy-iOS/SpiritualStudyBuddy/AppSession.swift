import Foundation
import Observation
import Supabase

struct Profile: Codable, Sendable, Equatable {
    let id: UUID
    var display_name: String?
    var preferred_bible_version: String
    var last_read_book: String?
    var last_read_chapter: Int?
}

@Observable @MainActor
final class AppSession {
    let client: SupabaseClient

    private(set) var user: User?
    private(set) var profile: Profile?
    private(set) var authLoading = true

    init() {
        client = SupabaseClient(
            supabaseURL: AppConfig.supabaseURL,
            supabaseKey: AppConfig.supabaseAnonKey
        )
        Task { await subscribeAuth() }
    }

    private func subscribeAuth() async {
        for await (_, session) in await client.auth.authStateChanges {
            user = session?.user
            if let uid = session?.user.id {
                await fetchProfile(userId: uid)
            } else {
                profile = nil
            }
            authLoading = false
        }
    }

    func fetchProfile(userId: UUID) async {
        do {
            let p: Profile = try await client.from("profiles")
                .select()
                .eq("id", value: userId)
                .single()
                .execute()
                .value
            profile = p
        } catch {
            profile = nil
        }
    }

    func refreshProfile() async {
        guard let uid = user?.id else { return }
        await fetchProfile(userId: uid)
    }

    func signIn(email: String, password: String) async throws {
        _ = try await client.auth.signIn(email: email, password: password)
    }

    func signUp(email: String, password: String, displayName: String) async throws {
        _ = try await client.auth.signUp(
            email: email,
            password: password,
            data: ["display_name": .string(displayName)]
        )
    }

    func signOut() async throws {
        try await client.auth.signOut()
    }

    func updatePreferredVersion(_ option: BibleVersionOption) async throws {
        guard let uid = user?.id else { return }
        struct Row: Encodable {
            let preferred_bible_version: String
        }
        try await client.from("profiles")
            .update(Row(preferred_bible_version: option.rawValue.uppercased()))
            .eq("id", value: uid)
            .execute()
        await refreshProfile()
    }

    func saveReadingProgress(book: String, chapter: Int) async {
        guard let uid = user?.id else { return }
        struct Row: Encodable {
            let last_read_book: String
            let last_read_chapter: Int
        }
        try? await client.from("profiles")
            .update(Row(last_read_book: book, last_read_chapter: chapter))
            .eq("id", value: uid)
            .execute()
    }

    // MARK: - Bookmarks

    func fetchBookmarkedVerses(book: String, chapter: Int) async -> Set<Int> {
        guard let uid = user?.id else { return [] }
        struct Row: Decodable {
            let verse: Int
        }
        do {
            let rows: [Row] = try await client.from("bookmarks")
                .select("verse")
                .eq("user_id", value: uid)
                .eq("book", value: book)
                .eq("chapter", value: chapter)
                .execute()
                .value
            return Set(rows.map(\.verse))
        } catch {
            return []
        }
    }

    func setBookmarked(_ on: Bool, book: String, chapter: Int, verse: Int) async {
        guard let uid = user?.id else { return }
        struct Insert: Encodable {
            let user_id: UUID
            let book: String
            let chapter: Int
            let verse: Int
        }
        do {
            if on {
                try await client.from("bookmarks").insert(Insert(user_id: uid, book: book, chapter: chapter, verse: verse)).execute()
            } else {
                try await client.from("bookmarks")
                    .delete()
                    .eq("user_id", value: uid)
                    .eq("book", value: book)
                    .eq("chapter", value: chapter)
                    .eq("verse", value: verse)
                    .execute()
            }
        } catch {}
    }

    // MARK: - Daily verse

    func hasDailyVerseRecord(for date: String) async -> Bool {
        guard let uid = user?.id else { return true }
        struct Row: Decodable { let id: UUID }
        do {
            let rows: [Row] = try await client.from("daily_verse_views")
                .select("id")
                .eq("user_id", value: uid)
                .eq("view_date", value: date)
                .limit(1)
                .execute()
                .value
            return !rows.isEmpty
        } catch {
            return true
        }
    }

    func markDailyVerseSeen(for date: String) async {
        guard let uid = user?.id else { return }
        struct Insert: Encodable {
            let user_id: UUID
            let view_date: String
        }
        try? await client.from("daily_verse_views").insert(Insert(user_id: uid, view_date: date)).execute()
    }
}
