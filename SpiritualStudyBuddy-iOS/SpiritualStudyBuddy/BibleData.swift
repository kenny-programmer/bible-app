import Foundation

struct BibleBook: Identifiable, Hashable {
    var id: String { name }
    let name: String
    let tagalog: String
    let chapters: Int
}

enum BibleVersionOption: String, CaseIterable, Identifiable, Hashable {
    case kjv, web, bsb, asv, bbe, clementine, darby, ylt, tagalog, asnd

    var id: String { rawValue }

    var label: String {
        switch self {
        case .kjv: return "King James Version (KJV)"
        case .web: return "World English Bible (WEB)"
        case .bsb: return "Berean Study Bible (BSB)"
        case .asv: return "American Standard Version (ASV)"
        case .bbe: return "Bible in Basic English (BBE)"
        case .clementine: return "Clementine Latin Vulgate"
        case .darby: return "Darby Translation"
        case .ylt: return "Young's Literal Translation"
        case .tagalog: return "Ang Biblia (Tagalog)"
        case .asnd: return "Ang Salita ng Dios (Tagalog ASND)"
        }
    }

    var apiCode: String { rawValue }
}

enum BibleCatalog {
    static let books: [BibleBook] = [
        .init(name: "Genesis", tagalog: "Genesis", chapters: 50),
        .init(name: "Exodus", tagalog: "Exodo", chapters: 40),
        .init(name: "Leviticus", tagalog: "Levitico", chapters: 27),
        .init(name: "Numbers", tagalog: "Mga Bilang", chapters: 36),
        .init(name: "Deuteronomy", tagalog: "Deuteronomio", chapters: 34),
        .init(name: "Joshua", tagalog: "Josue", chapters: 24),
        .init(name: "Judges", tagalog: "Mga Hukom", chapters: 21),
        .init(name: "Ruth", tagalog: "Ruth", chapters: 4),
        .init(name: "1 Samuel", tagalog: "1 Samuel", chapters: 31),
        .init(name: "2 Samuel", tagalog: "2 Samuel", chapters: 24),
        .init(name: "1 Kings", tagalog: "1 Mga Hari", chapters: 22),
        .init(name: "2 Kings", tagalog: "2 Mga Hari", chapters: 25),
        .init(name: "1 Chronicles", tagalog: "1 Cronica", chapters: 29),
        .init(name: "2 Chronicles", tagalog: "2 Cronica", chapters: 36),
        .init(name: "Ezra", tagalog: "Ezra", chapters: 10),
        .init(name: "Nehemiah", tagalog: "Nehemias", chapters: 13),
        .init(name: "Esther", tagalog: "Esther", chapters: 10),
        .init(name: "Job", tagalog: "Job", chapters: 42),
        .init(name: "Psalms", tagalog: "Mga Awit", chapters: 150),
        .init(name: "Proverbs", tagalog: "Mga Kawikaan", chapters: 31),
        .init(name: "Ecclesiastes", tagalog: "Eclesiastes", chapters: 12),
        .init(name: "Song of Solomon", tagalog: "Awit ni Solomon", chapters: 8),
        .init(name: "Isaiah", tagalog: "Isaias", chapters: 66),
        .init(name: "Jeremiah", tagalog: "Jeremias", chapters: 52),
        .init(name: "Lamentations", tagalog: "Mga Panaghoy", chapters: 5),
        .init(name: "Ezekiel", tagalog: "Ezekiel", chapters: 48),
        .init(name: "Daniel", tagalog: "Daniel", chapters: 12),
        .init(name: "Hosea", tagalog: "Oseas", chapters: 14),
        .init(name: "Joel", tagalog: "Joel", chapters: 3),
        .init(name: "Amos", tagalog: "Amos", chapters: 9),
        .init(name: "Obadiah", tagalog: "Abdias", chapters: 1),
        .init(name: "Jonah", tagalog: "Jonas", chapters: 4),
        .init(name: "Micah", tagalog: "Miqueas", chapters: 7),
        .init(name: "Nahum", tagalog: "Nahum", chapters: 3),
        .init(name: "Habakkuk", tagalog: "Habacuc", chapters: 3),
        .init(name: "Zephaniah", tagalog: "Sofonias", chapters: 3),
        .init(name: "Haggai", tagalog: "Hageo", chapters: 2),
        .init(name: "Zechariah", tagalog: "Zacarias", chapters: 14),
        .init(name: "Malachi", tagalog: "Malaquias", chapters: 4),
        .init(name: "Matthew", tagalog: "Mateo", chapters: 28),
        .init(name: "Mark", tagalog: "Marcos", chapters: 16),
        .init(name: "Luke", tagalog: "Lucas", chapters: 24),
        .init(name: "John", tagalog: "Juan", chapters: 21),
        .init(name: "Acts", tagalog: "Mga Gawa", chapters: 28),
        .init(name: "Romans", tagalog: "Mga Taga-Roma", chapters: 16),
        .init(name: "1 Corinthians", tagalog: "1 Mga Taga-Corinto", chapters: 16),
        .init(name: "2 Corinthians", tagalog: "2 Mga Taga-Corinto", chapters: 13),
        .init(name: "Galatians", tagalog: "Mga Taga-Galacia", chapters: 6),
        .init(name: "Ephesians", tagalog: "Mga Taga-Efeso", chapters: 6),
        .init(name: "Philippians", tagalog: "Mga Taga-Filipos", chapters: 4),
        .init(name: "Colossians", tagalog: "Mga Taga-Colosas", chapters: 4),
        .init(name: "1 Thessalonians", tagalog: "1 Mga Taga-Tesalonica", chapters: 5),
        .init(name: "2 Thessalonians", tagalog: "2 Mga Taga-Tesalonica", chapters: 3),
        .init(name: "1 Timothy", tagalog: "1 Timoteo", chapters: 6),
        .init(name: "2 Timothy", tagalog: "2 Timoteo", chapters: 4),
        .init(name: "Titus", tagalog: "Tito", chapters: 3),
        .init(name: "Philemon", tagalog: "Filemon", chapters: 1),
        .init(name: "Hebrews", tagalog: "Mga Hebreo", chapters: 13),
        .init(name: "James", tagalog: "Santiago", chapters: 5),
        .init(name: "1 Peter", tagalog: "1 Pedro", chapters: 5),
        .init(name: "2 Peter", tagalog: "2 Pedro", chapters: 3),
        .init(name: "1 John", tagalog: "1 Juan", chapters: 5),
        .init(name: "2 John", tagalog: "2 Juan", chapters: 1),
        .init(name: "3 John", tagalog: "3 Juan", chapters: 1),
        .init(name: "Jude", tagalog: "Judas", chapters: 1),
        .init(name: "Revelation", tagalog: "Pahayag", chapters: 22),
    ]

    static func displayName(book name: String, version: BibleVersionOption) -> String {
        guard let b = books.first(where: { $0.name == name }) else { return name }
        switch version {
        case .tagalog, .asnd: return b.tagalog
        default: return b.name
        }
    }

    static func maxChapter(for book: String) -> Int {
        books.first { $0.name == book }?.chapters ?? 1
    }

    static func normalizeVersion(from profileValue: String?) -> BibleVersionOption {
        let key = profileValue?.lowercased().trimmingCharacters(in: .whitespacesAndNewlines) ?? "kjv"
        return BibleVersionOption(rawValue: key) ?? .kjv
    }
}
