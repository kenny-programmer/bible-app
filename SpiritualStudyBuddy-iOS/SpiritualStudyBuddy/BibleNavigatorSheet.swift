import SwiftUI

struct BibleNavigatorSheet: View {
    @Binding var book: String
    @Binding var chapter: Int
    let version: BibleVersionOption
    let onDone: () -> Void

    @State private var selectedBook: String = ""

    private var isTagalogUI: Bool {
        version == .tagalog || version == .asnd
    }

    var body: some View {
        NavigationStack {
            GeometryReader { geo in
                HStack(alignment: .top, spacing: 0) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text(isTagalogUI ? "Mga Aklat" : "Books")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Theme.inkMuted)
                            .textCase(.uppercase)
                            .padding(.horizontal, 12)
                            .padding(.bottom, 8)
                        ScrollView {
                            LazyVStack(alignment: .leading, spacing: 4) {
                                ForEach(BibleCatalog.books) { b in
                                    Button {
                                        selectedBook = b.name
                                    } label: {
                                        Text(BibleCatalog.displayName(book: b.name, version: version))
                                            .font(.subheadline)
                                            .multilineTextAlignment(.leading)
                                            .frame(maxWidth: .infinity, alignment: .leading)
                                            .padding(.vertical, 10)
                                            .padding(.horizontal, 12)
                                            .background(
                                                RoundedRectangle(cornerRadius: 10)
                                                    .fill(selectedBook == b.name ? Theme.gold : Color.clear)
                                            )
                                            .foregroundStyle(selectedBook == b.name ? Color.white : Theme.ink)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.trailing, 8)
                        }
                    }
                    .frame(width: max(geo.size.width * 0.44, 150), alignment: .leading)

                    Divider()

                    VStack(alignment: .leading, spacing: 0) {
                        let count = BibleCatalog.books.first { $0.name == selectedBook }?.chapters ?? 0
                        Text(isTagalogUI ? "Mga Kabanata (\(count))" : "Chapters (\(count))")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(Theme.inkMuted)
                            .textCase(.uppercase)
                            .padding(.horizontal, 12)
                            .padding(.bottom, 8)
                        ScrollView {
                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 52), spacing: 8)], spacing: 8) {
                                ForEach(1 ... count, id: \.self) { ch in
                                    Button {
                                        book = selectedBook
                                        chapter = ch
                                        onDone()
                                    } label: {
                                        Text("\(ch)")
                                            .font(.subheadline.weight(.medium))
                                            .frame(maxWidth: .infinity, minHeight: Theme.minTap)
                                            .background(
                                                RoundedRectangle(cornerRadius: 10)
                                                    .stroke(Theme.gold.opacity(0.35), lineWidth: 1)
                                                    .background(
                                                        RoundedRectangle(cornerRadius: 10)
                                                            .fill(selectedBook == book && ch == chapter ? Theme.gold : Color.white)
                                                    )
                                            )
                                            .foregroundStyle(selectedBook == book && ch == chapter ? Color.white : Theme.ink)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                            .padding(.horizontal, 10)
                            .padding(.bottom, 24)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .navigationTitle(isTagalogUI ? "Aklat at Kabanata" : "Book & Chapter")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { onDone() }
                }
            }
            .onAppear {
                selectedBook = book
            }
        }
        .background(Theme.parchment)
    }
}
