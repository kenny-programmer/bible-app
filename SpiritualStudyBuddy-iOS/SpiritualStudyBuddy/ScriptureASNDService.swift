import Foundation

/// Ang Salita ng Dios (ASND) via [scripture.api.bible](https://scripture.api.bible/) — same source as the Next.js `/api/bible/scripture` route.
enum ScriptureASNDService {
    private static let base = "https://api.scripture.api.bible/v1"
    private static var cachedBibleId: String?

    private static func stripHtml(_ html: String) -> String {
        var s = html
        s = s.replacingOccurrences(of: "<script[^>]*>[\\s\\S]*?</script>", with: " ", options: .regularExpression)
        s = s.replacingOccurrences(of: "<style[^>]*>[\\s\\S]*?</style>", with: " ", options: .regularExpression)
        s = s.replacingOccurrences(of: "<br[^>]*>", with: " ", options: .regularExpression)
        s = s.replacingOccurrences(of: "</p>", with: " ", options: .regularExpression)
        s = s.replacingOccurrences(of: "<[^>]+>", with: " ", options: .regularExpression)
        s = s.replacingOccurrences(of: "&nbsp;", with: " ")
        s = s.replacingOccurrences(of: "&amp;", with: "&")
        s = s.replacingOccurrences(of: "&lt;", with: "<")
        s = s.replacingOccurrences(of: "&gt;", with: ">")
        s = s.replacingOccurrences(of: "&quot;", with: "\"")
        s = s.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
        return s.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private static func verseNumber(fromVerseId id: String) -> Int? {
        let parts = id.split(separator: ".")
        guard let last = parts.last, let n = Int(last) else { return nil }
        return n
    }

    private static func scriptureRequest(path: String, apiKey: String) -> URLRequest {
        let url = URL(string: base + path)!
        var r = URLRequest(url: url)
        r.setValue(apiKey, forHTTPHeaderField: "api-key")
        r.setValue("application/json", forHTTPHeaderField: "Accept")
        return r
    }

    private static func resolveBibleId(apiKey: String) async throws -> String {
        if let id = AppConfig.scriptureAsndBibleId { return id }
        if let c = cachedBibleId { return c }

        var pageToken: String?
        for _ in 0 ..< 30 {
            var path = "/bibles?abbreviation=ASND"
            if let t = pageToken { path += "&pageToken=\(t.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? t)" }
            let (data, resp) = try await URLSession.shared.data(for: scriptureRequest(path: path, apiKey: apiKey))
            guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { break }
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let rows = json?["data"] as? [[String: Any]] ?? []
            if let id = rows.compactMap({ row -> String? in
                guard let id = row["id"] as? String else { return nil }
                let abbr = (row["abbreviation"] as? String)?.uppercased() ?? ""
                let name = (row["name"] as? String) ?? ""
                let lang = ((row["language"] as? [String: Any])?["name"] as? String) ?? ""
                if abbr == "ASND" { return id }
                if name.range(of: #"ang\s+salita\s+ng\s+(diyos|dios)"#, options: .regularExpression) != nil { return id }
                if lang.range(of: "tagalog", options: .caseInsensitive) != nil, name.range(of: "salita", options: .caseInsensitive) != nil { return id }
                return nil
            }).first {
                cachedBibleId = id
                return id
            }
            pageToken = (json?["meta"] as? [String: Any])?["nextPageToken"] as? String
            if pageToken == nil { break }
        }

        pageToken = nil
        for _ in 0 ..< 40 {
            var path = "/bibles"
            if let t = pageToken { path += "?pageToken=\(t.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? t)" }
            let (data, resp) = try await URLSession.shared.data(for: scriptureRequest(path: path, apiKey: apiKey))
            guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { break }
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            let rows = json?["data"] as? [[String: Any]] ?? []
            if let id = rows.compactMap({ row -> String? in
                guard let id = row["id"] as? String else { return nil }
                let abbr = (row["abbreviation"] as? String)?.uppercased() ?? ""
                let name = (row["name"] as? String) ?? ""
                let lang = ((row["language"] as? [String: Any])?["name"] as? String) ?? ""
                if abbr == "ASND" { return id }
                if name.range(of: #"ang\s+salita\s+ng\s+(diyos|dios)"#, options: .regularExpression) != nil { return id }
                if lang.range(of: "tagalog", options: .caseInsensitive) != nil, name.range(of: "salita", options: .caseInsensitive) != nil { return id }
                return nil
            }).first {
                cachedBibleId = id
                return id
            }
            pageToken = (json?["meta"] as? [String: Any])?["nextPageToken"] as? String
            if pageToken == nil { break }
        }

        throw NSError(domain: "ASND", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not resolve ASND Bible id. Set SCRIPTURE_ASND_BIBLE_ID in Info.plist."])
    }

    private static func versesFromList(bibleId: String, chapterId: String, apiKey: String) async throws -> [BibleVerse]? {
        let path = "/bibles/\(bibleId)/chapters/\(chapterId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? chapterId)/verses"
        let (data, resp) = try await URLSession.shared.data(for: scriptureRequest(path: path, apiKey: apiKey))
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { return nil }
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let rows = json?["data"] as? [[String: Any]] ?? []
        if rows.isEmpty { return nil }

        var parsed: [BibleVerse] = []
        for row in rows {
            guard let id = row["id"] as? String, let vn = verseNumber(fromVerseId: id) else { continue }
            let raw = (row["content"] as? String)
                ?? (row["text"] as? String)
                ?? (row["plainText"] as? String)
                ?? ""
            if raw.isEmpty {
                parsed = []
                break
            }
            parsed.append(BibleVerse(verse: vn, text: stripHtml(raw)))
        }
        if parsed.count == rows.count, !parsed.isEmpty {
            return parsed.sorted { $0.verse < $1.verse }
        }
        return nil
    }

    private static func versesFromChapterHtml(bibleId: String, chapterId: String, apiKey: String) async throws -> [BibleVerse]? {
        let path = "/bibles/\(bibleId)/chapters/\(chapterId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? chapterId)"
        let (data, resp) = try await URLSession.shared.data(for: scriptureRequest(path: path, apiKey: apiKey))
        guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { return nil }
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let dataObj = json?["data"] as? [String: Any]
        let html = (dataObj?["content"] as? String) ?? ""
        if html.isEmpty { return nil }
        return parseVersesFromChapterHtml(html)
    }

    private static func parseVersesFromChapterHtml(_ html: String) -> [BibleVerse]? {
        let idRe = try? NSRegularExpression(pattern: #"data-id="([A-Z0-9]+)\.(\d+)\.(\d+)""#, options: .caseInsensitive)
        if let idRe {
            let range = NSRange(html.startIndex..., in: html)
            var markers: [(index: Int, verse: Int)] = []
            idRe.enumerateMatches(in: html, range: range) { match, _, _ in
                guard let match, match.numberOfRanges >= 4,
                      let r3 = Range(match.range(at: 3), in: html),
                      let v = Int(String(html[r3])) else { return }
                markers.append((match.range.location, v))
            }
            if !markers.isEmpty {
                var out: [BibleVerse] = []
                for i in markers.indices {
                    let start = markers[i].index
                    let end = i + 1 < markers.count ? markers[i + 1].index : html.count
                    let sIdx = html.index(html.startIndex, offsetBy: start)
                    let eIdx = html.index(html.startIndex, offsetBy: end)
                    let slice = String(html[sIdx ..< eIdx])
                    out.append(BibleVerse(verse: markers[i].verse, text: stripHtml(slice)))
                }
                return out.sorted { $0.verse < $1.verse }
            }
        }
        let plain = stripHtml(html)
        if !plain.isEmpty { return [BibleVerse(verse: 1, text: plain)] }
        return nil
    }

    static func fetchChapter(book: String, chapter: Int) async -> ChapterPayload? {
        guard let apiKey = AppConfig.scriptureAPIKey else { return nil }
        guard let cid = BookUSFM.chapterId(bookName: book, chapter: chapter) else { return nil }
        do {
            let bibleId = try await resolveBibleId(apiKey: apiKey)
            if let v = try await versesFromList(bibleId: bibleId, chapterId: cid, apiKey: apiKey) {
                return ChapterPayload(verses: v, reference: "\(book) \(chapter)")
            }
            if let v = try await versesFromChapterHtml(bibleId: bibleId, chapterId: cid, apiKey: apiKey) {
                return ChapterPayload(verses: v, reference: "\(book) \(chapter)")
            }
        } catch {}
        return nil
    }

    static func fetchVerse(reference: String) async -> (text: String, reference: String)? {
        guard let apiKey = AppConfig.scriptureAPIKey else { return nil }
        let pattern = #"^(\d?\s*[\w\s]+?)\s+(\d+):(\d+)(?:-(\d+))?$"#
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
              let m = regex.firstMatch(in: reference, range: NSRange(reference.startIndex..., in: reference)),
              m.numberOfRanges >= 4 else { return nil }
        let bookRange = Range(m.range(at: 1), in: reference)!
        let chRange = Range(m.range(at: 2), in: reference)!
        let startRange = Range(m.range(at: 3), in: reference)!
        let book = String(reference[bookRange]).replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression).trimmingCharacters(in: .whitespaces)
        guard let ch = Int(String(reference[chRange])), let start = Int(String(reference[startRange])) else { return nil }
        let end: Int
        if m.numberOfRanges > 4, m.range(at: 4).location != NSNotFound, let er = Range(m.range(at: 4), in: reference) {
            end = Int(String(reference[er])) ?? start
        } else {
            end = start
        }
        guard let usfm = BookUSFM.bookNameToUsfm(book) else { return nil }
        do {
            let bibleId = try await resolveBibleId(apiKey: apiKey)
            var parts: [String] = []
            for v in start ... end {
                let verseId = "\(usfm).\(ch).\(v)"
                let path =
                    "/bibles/\(bibleId)/verses/\(verseId.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? verseId)?include-chapter-numbers=false&include-verse-numbers=false"
                let (data, resp) = try await URLSession.shared.data(for: scriptureRequest(path: path, apiKey: apiKey))
                guard let http = resp as? HTTPURLResponse, http.statusCode == 200 else { continue }
                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                let d = json?["data"] as? [String: Any]
                let raw = (d?["content"] as? String) ?? ""
                let t = stripHtml(raw)
                if !t.isEmpty { parts.append(t) }
            }
            if parts.isEmpty { return nil }
            return (parts.joined(separator: " "), reference.trimmingCharacters(in: .whitespacesAndNewlines))
        } catch {
            return nil
        }
    }
}
