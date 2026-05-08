import SwiftUI

struct HomeView: View {
    @Environment(AppSession.self) private var session

    @State private var book = "John"
    @State private var chapter = 1
    @State private var localVersion: BibleVersionOption = .kjv
    @State private var seededVersionForUser: UUID?
    @State private var seededReading = false

    @State private var showNavigator = false
    @State private var showSettings = false
    @State private var showAI = false

    @State private var showDaily = false
    @State private var dailyText: String?
    @State private var dailyRef: String?

    private var maxChapter: Int {
        BibleCatalog.maxChapter(for: book)
    }

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottomTrailing) {
                Theme.parchment.ignoresSafeArea()

                BibleReaderView(
                    book: book,
                    chapter: chapter,
                    version: localVersion,
                    onChapterChange: { chapter = $0 },
                    maxChapter: maxChapter
                )

                Button {
                    showAI = true
                } label: {
                    Label("AI Chat", systemImage: "message.circle.fill")
                        .font(.subheadline.weight(.semibold))
                        .padding(.horizontal, 18)
                        .padding(.vertical, 14)
                }
                .buttonStyle(.borderedProminent)
                .tint(Theme.gold)
                .clipShape(Capsule())
                .shadow(color: .black.opacity(0.12), radius: 10, y: 4)
                .padding(.trailing, 16)
                .padding(.bottom, 8)
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Bible")
                        .font(.system(.title3, design: .serif).weight(.semibold))
                        .foregroundStyle(Theme.ink)
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showNavigator = true
                    } label: {
                        Label(
                            "\(BibleCatalog.displayName(book: book, version: localVersion)) \(chapter)",
                            systemImage: "book.fill"
                        )
                        .labelStyle(.titleAndIcon)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Theme.ink)
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape.fill")
                            .font(.body.weight(.medium))
                            .foregroundStyle(Theme.ink)
                    }
                }
            }
        }
        .sheet(isPresented: $showNavigator) {
            BibleNavigatorSheet(
                book: $book,
                chapter: $chapter,
                version: localVersion,
                onDone: { showNavigator = false }
            )
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showSettings) {
            SettingsSheet(version: $localVersion, onDismiss: { showSettings = false })
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showAI) {
            AIAssistantSheet(onClose: { showAI = false })
        }
        .sheet(isPresented: $showDaily) {
            NavigationStack {
                VStack(alignment: .leading, spacing: 20) {
                    HStack(spacing: 10) {
                        Image(systemName: "sparkles")
                            .foregroundStyle(Theme.gold)
                        Text("Daily Bread")
                            .font(.system(.title2, design: .serif).weight(.semibold))
                    }
                    if let dailyText {
                        Text(dailyText)
                            .font(.system(.body, design: .serif))
                            .italic()
                            .foregroundStyle(Theme.ink)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    if let dailyRef {
                        Text(dailyRef)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(Theme.inkMuted)
                            .frame(maxWidth: .infinity, alignment: .trailing)
                            .padding(.top, 8)
                            .overlay(alignment: .top) {
                                Divider().offset(y: -10)
                            }
                    }
                    Spacer(minLength: 0)
                }
                .padding(24)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") {
                            Task {
                                await session.markDailyVerseSeen(for: todayUTCString())
                                showDaily = false
                            }
                        }
                        .fontWeight(.semibold)
                    }
                }
            }
            .presentationDetents([.medium])
        }
        .onChange(of: session.user?.id) { _, newId in
            if newId == nil {
                seededVersionForUser = nil
                seededReading = false
            }
        }
        .onChange(of: session.profile) { _, newProfile in
            guard let p = newProfile, let uid = session.user?.id else { return }
            if seededVersionForUser != uid {
                localVersion = BibleCatalog.normalizeVersion(from: p.preferred_bible_version)
                seededVersionForUser = uid
            }
            if !seededReading, p.last_read_book != nil, p.last_read_chapter != nil {
                if let b = p.last_read_book { book = b }
                if let c = p.last_read_chapter { chapter = c }
                seededReading = true
            }
        }
        .task(id: session.user?.id) {
            await refreshDailyIfNeeded()
        }
    }

    private func todayUTCString() -> String {
        var utc = Calendar(identifier: .gregorian)
        utc.timeZone = TimeZone(secondsFromGMT: 0)!
        let c = utc.dateComponents([.year, .month, .day], from: Date())
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    private func refreshDailyIfNeeded() async {
        guard session.user != nil else { return }
        let day = todayUTCString()
        if await session.hasDailyVerseRecord(for: day) { return }
        guard let verse = await BibleAPIService.fetchRandomVerse(version: localVersion) else { return }
        dailyText = verse.text
        dailyRef = verse.reference
        showDaily = true
    }
}
