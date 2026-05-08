import Foundation

struct BibleVerse: Identifiable, Hashable {
    var id: Int { verse }
    let verse: Int
    let text: String
}

struct ChapterPayload: Sendable {
    let verses: [BibleVerse]
    let reference: String
}

enum BibleAPIService {
    private static let supportedBibleAPI = Set([
        "kjv", "web", "bsb", "asv", "bbe", "clementine", "darby", "ylt",
    ])

    private static let tagalogBookNr: [String: Int] = [
        "Genesis": 1, "Exodus": 2, "Leviticus": 3, "Numbers": 4, "Deuteronomy": 5,
        "Joshua": 6, "Judges": 7, "Ruth": 8, "1 Samuel": 9, "2 Samuel": 10,
        "1 Kings": 11, "2 Kings": 12, "1 Chronicles": 13, "2 Chronicles": 14, "Ezra": 15,
        "Nehemiah": 16, "Esther": 17, "Job": 18, "Psalms": 19, "Proverbs": 20,
        "Ecclesiastes": 21, "Song of Solomon": 22, "Isaiah": 23, "Jeremiah": 24,
        "Lamentations": 25, "Ezekiel": 26, "Daniel": 27, "Hosea": 28, "Joel": 29,
        "Amos": 30, "Obadiah": 31, "Jonah": 32, "Micah": 33, "Nahum": 34,
        "Habakkuk": 35, "Zephaniah": 36, "Haggai": 37, "Zechariah": 38, "Malachi": 39,
        "Matthew": 40, "Mark": 41, "Luke": 42, "John": 43, "Acts": 44,
        "Romans": 45, "1 Corinthians": 46, "2 Corinthians": 47, "Galatians": 48,
        "Ephesians": 49, "Philippians": 50, "Colossians": 51, "1 Thessalonians": 52,
        "2 Thessalonians": 53, "1 Timothy": 54, "2 Timothy": 55, "Titus": 56,
        "Philemon": 57, "Hebrews": 58, "James": 59, "1 Peter": 60, "2 Peter": 61,
        "1 John": 62, "2 John": 63, "3 John": 64, "Jude": 65, "Revelation": 66,
    ]

    private static func apiVersion(for v: BibleVersionOption) -> String {
        switch v {
        case .kjv, .web, .bsb, .asv, .bbe, .clementine, .darby, .ylt:
            return supportedBibleAPI.contains(v.rawValue) ? v.rawValue : "kjv"
        default:
            return "kjv"
        }
    }

    static func fetchChapter(book: String, chapter: Int, version: BibleVersionOption) async -> ChapterPayload? {
        if version == .tagalog {
            return await fetchTagalogChapter(book: book, chapter: chapter)
        }
        if version == .asnd {
            return await ScriptureASNDService.fetchChapter(book: book, chapter: chapter)
        }

        let apiV = apiVersion(for: version)
        let formattedBook = book.replacingOccurrences(of: " ", with: "+")
        let urlString = "https://bible-api.com/\(formattedBook)+\(chapter)?translation=\(apiV)"
        guard let url = URL(string: urlString) else { return nil }

        do {
            var req = URLRequest(url: url)
            req.setValue("application/json", forHTTPHeaderField: "Accept")
            let (data, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                if version != .kjv { return await fetchChapter(book: book, chapter: chapter, version: .kjv) }
                return nil
            }
            return try parseChapterJSON(data: data, fallbackRef: "\(book) \(chapter)")
        } catch {
            if version != .kjv { return await fetchChapter(book: book, chapter: chapter, version: .kjv) }
            return nil
        }
    }

    static func fetchVerse(reference: String, version: BibleVersionOption) async -> (text: String, reference: String)? {
        if version == .tagalog {
            return await fetchTagalogVerse(reference: reference)
        }
        if version == .asnd {
            return await ScriptureASNDService.fetchVerse(reference: reference)
        }

        let apiV = apiVersion(for: version)
        let ref = reference.replacingOccurrences(of: " ", with: "+")
        guard let url = URL(string: "https://bible-api.com/\(ref)?translation=\(apiV)") else { return nil }
        do {
            var req = URLRequest(url: url)
            req.setValue("application/json", forHTTPHeaderField: "Accept")
            let (data, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
                if version != .kjv { return await fetchVerse(reference: reference, version: .kjv) }
                return nil
            }
            let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let text = (obj?["text"] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !text.isEmpty else { return nil }
            let r = (obj?["reference"] as? String) ?? reference
            return (text, r)
        } catch {
            if version != .kjv { return await fetchVerse(reference: reference, version: .kjv) }
            return nil
        }
    }

    static func fetchRandomVerse(version: BibleVersionOption) async -> (text: String, reference: String)? {
        let pool = [
            "Philippians 4:13", "Jeremiah 29:11", "Proverbs 3:5-6", "Romans 8:28", "Psalm 23:1",
            "John 3:16", "Isaiah 41:10", "Matthew 6:33", "Psalm 46:1", "Joshua 1:9",
            "Proverbs 16:3", "Psalm 119:105", "Romans 12:2", "2 Timothy 1:7", "Philippians 4:6-7",
            "Isaiah 40:31", "Matthew 11:28", "Psalm 27:1", "Colossians 3:23", "James 1:2-3",
        ]
        let pick = pool.randomElement()!
        return await fetchVerse(reference: pick, version: version)
    }

    // MARK: - bible-api.com JSON

    private static func parseChapterJSON(data: Data, fallbackRef: String) throws -> ChapterPayload? {
        let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        if let verses = obj?["verses"] as? [[String: Any]], !verses.isEmpty {
            let mapped: [BibleVerse] = verses.compactMap { v in
                guard let n = v["verse"] as? Int, let t = v["text"] as? String else { return nil }
                return BibleVerse(verse: n, text: t.trimmingCharacters(in: .whitespacesAndNewlines))
            }.sorted { $0.verse < $1.verse }
            let ref = (obj?["reference"] as? String) ?? fallbackRef
            return ChapterPayload(verses: mapped, reference: ref)
        }
        if let text = obj?["text"] as? String {
            let n = obj?["verse"] as? Int ?? 1
            let ref = (obj?["reference"] as? String) ?? fallbackRef
            return ChapterPayload(verses: [BibleVerse(verse: n, text: text.trimmingCharacters(in: .whitespacesAndNewlines))], reference: ref)
        }
        return nil
    }

    // MARK: - Tagalog (getbible)

    private static func fetchTagalogChapter(book: String, chapter: Int) async -> ChapterPayload? {
        guard let nr = tagalogBookNr[book] else { return nil }
        guard let url = URL(string: "https://api.getbible.net/v2/tagalog/\(nr)/\(chapter).json") else { return nil }
        do {
            var req = URLRequest(url: url)
            req.setValue("application/json", forHTTPHeaderField: "Accept")
            let (data, response) = try await URLSession.shared.data(for: req)
            guard let http = response as? HTTPURLResponse, http.statusCode == 200 else { return nil }
            let root = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            guard let verseRows = root?["verses"] as? [[String: Any]] else { return nil }
            let verses: [BibleVerse] = verseRows.compactMap { row in
                guard let v = row["verse"] as? Int else { return nil }
                let t = (row["text"] as? String) ?? ""
                return BibleVerse(verse: v, text: t.trimmingCharacters(in: .whitespacesAndNewlines))
            }.sorted { $0.verse < $1.verse }
            let ref = (root?["name"] as? String) ?? "\(book) \(chapter)"
            return ChapterPayload(verses: verses, reference: ref)
        } catch {
            return nil
        }
    }

    private static func fetchTagalogVerse(reference: String) async -> (text: String, reference: String)? {
        let pattern = #"^(\d?\s*\w+(?:\s+\w+)*)\s+(\d+):(\d+)(?:-(\d+))?$"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
              let m = regex.firstMatch(in: reference, range: NSRange(reference.startIndex..., in: reference)),
              m.numberOfRanges >= 4 else { return nil }
        let bookRange = Range(m.range(at: 1), in: reference)!
        let chRange = Range(m.range(at: 2), in: reference)!
        let startRange = Range(m.range(at: 3), in: reference)!
        let bookName = String(reference[bookRange]).trimmingCharacters(in: .whitespaces)
        guard let ch = Int(String(reference[chRange])), let start = Int(String(reference[startRange])) else { return nil }
        let end: Int
        if m.numberOfRanges > 4, m.range(at: 4).location != NSNotFound, let er = Range(m.range(at: 4), in: reference) {
            end = Int(String(reference[er])) ?? start
        } else {
            end = start
        }
        guard let payload = await fetchTagalogChapter(book: bookName, chapter: ch) else { return nil }
        let joined = payload.verses
            .filter { $0.verse >= start && $0.verse <= end }
            .sorted { $0.verse < $1.verse }
            .map(\.text)
            .joined(separator: " ")
        return (joined, reference)
    }
}
