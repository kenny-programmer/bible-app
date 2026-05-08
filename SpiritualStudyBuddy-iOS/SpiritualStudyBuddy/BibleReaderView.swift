import SwiftUI

struct BibleReaderView: View {
    @Environment(AppSession.self) private var session

    let book: String
    let chapter: Int
    let version: BibleVersionOption
    let onChapterChange: (Int) -> Void
    let maxChapter: Int

    @State private var verses: [BibleVerse] = []
    @State private var reference = ""
    @State private var loading = true
    @State private var translating = false
    @State private var error: String?
    @State private var bookmarked = Set<Int>()
    @State private var lastSuccess: (book: String, chapter: Int, version: BibleVersionOption)?

    private var loadKey: String { "\(book)|\(chapter)|\(version.rawValue)" }

    var body: some View {
        VStack(spacing: 0) {
            if translating {
                HStack(spacing: 8) {
                    ProgressView()
                        .tint(Theme.gold)
                    Text("Switching translation…")
                        .font(.footnote)
                        .foregroundStyle(Theme.inkMuted)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(Theme.parchment.opacity(0.95))
            }

            HStack {
                Button {
                    onChapterChange(chapter - 1)
                } label: {
                    Label("Previous", systemImage: "chevron.left")
                        .font(.subheadline.weight(.medium))
                }
                .disabled(chapter <= 1)

                Spacer()

                Text(reference.isEmpty ? "\(book) \(chapter)" : reference)
                    .font(.system(.headline, design: .serif).weight(.semibold))
                    .foregroundStyle(Theme.ink)
                    .multilineTextAlignment(.center)
                    .minimumScaleFactor(0.85)

                Spacer()

                Button {
                    onChapterChange(chapter + 1)
                } label: {
                    HStack(spacing: 4) {
                        Text("Next")
                        Image(systemName: "chevron.right")
                    }
                    .font(.subheadline.weight(.medium))
                }
                .disabled(chapter >= maxChapter)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 12)
            .background(Theme.parchment.opacity(0.98))

            Divider().overlay(Theme.gold.opacity(0.2))

            if loading {
                Spacer()
                ProgressView()
                    .tint(Theme.gold)
                    .scaleEffect(1.1)
                Text("Loading…")
                    .font(.footnote)
                    .foregroundStyle(Theme.inkMuted)
                    .padding(.top, 8)
                Spacer()
            } else {
                ScrollView {
                    LazyVStack(alignment: .leading, spacing: 18) {
                        if let error {
                            Text(error)
                                .font(.footnote)
                                .foregroundStyle(.red)
                                .padding(.horizontal)
                        }
                        ForEach(verses) { v in
                            HStack(alignment: .top, spacing: 12) {
                                Button {
                                    Task { await toggleBookmark(v.verse) }
                                } label: {
                                    Image(systemName: bookmarked.contains(v.verse) ? "bookmark.fill" : "bookmark")
                                        .font(.body)
                                        .foregroundStyle(bookmarked.contains(v.verse) ? Theme.gold : Theme.ink.opacity(0.35))
                                        .frame(width: Theme.minTap, height: Theme.minTap)
                                }
                                .buttonStyle(.plain)

                                Text(verbatim: "\(v.verse)")
                                    .font(.system(.caption, design: .serif).weight(.semibold))
                                    .foregroundStyle(Theme.gold)
                                    .frame(minWidth: 22, alignment: .leading)

                                Text(v.text)
                                    .font(.system(.body, design: .serif))
                                    .foregroundStyle(Theme.ink)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                            }
                            .padding(.horizontal, 16)
                        }
                    }
                    .padding(.vertical, 16)
                    .padding(.bottom, 96)
                }
            }
        }
        .task(id: loadKey) {
            await loadChapter()
        }
        .task(id: "\(book)|\(chapter)|\(String(describing: session.user?.id))") {
            bookmarked = await session.fetchBookmarkedVerses(book: book, chapter: chapter)
        }
    }

    private func loadChapter() async {
        let versionOnlyChange = lastSuccess.map {
            $0.book == book && $0.chapter == chapter && $0.version != version
        } ?? false

        error = nil
        if versionOnlyChange {
            translating = true
        } else {
            loading = true
        }

        let snapKey = loadKey
        let data = await BibleAPIService.fetchChapter(book: book, chapter: chapter, version: version)

        guard snapKey == loadKey else { return }

        if let data {
            verses = data.verses
            reference = data.reference
            error = nil
            lastSuccess = (book, chapter, version)
            await session.saveReadingProgress(book: book, chapter: chapter)
        } else if versionOnlyChange {
            error = "Unable to load this translation. Try another version in Settings."
        } else {
            verses = []
            reference = "\(BibleCatalog.displayName(book: book, version: version)) \(chapter)"
            error = "Unable to load this chapter. Check your connection and try again."
        }

        loading = false
        translating = false
    }

    private func toggleBookmark(_ verse: Int) async {
        let on = !bookmarked.contains(verse)
        await session.setBookmarked(on, book: book, chapter: chapter, verse: verse)
        if on {
            bookmarked.insert(verse)
        } else {
            bookmarked.remove(verse)
        }
    }
}
