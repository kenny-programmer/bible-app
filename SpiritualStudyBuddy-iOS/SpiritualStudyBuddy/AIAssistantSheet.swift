import SwiftUI

private struct ChatBubble: Identifiable {
    let id = UUID()
    let role: Role
    let text: String
    enum Role { case user, assistant }
}

struct AIAssistantSheet: View {
    let onClose: () -> Void

    @State private var messages: [ChatBubble] = []
    @State private var input = ""
    @State private var sending = false
    @State private var banner: String?

    @State private var chatService: BibleChatService = BibleChatService.makeDefault()

    private var aiReady: Bool {
        BibleChatService.isAppleIntelligenceRuntimeAvailable
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if !aiReady {
                    Text("Apple Intelligence is required for on-device answers. Enable Apple Intelligence in Settings on a supported iPhone running iOS 26 or later.")
                        .font(.footnote)
                        .foregroundStyle(Theme.inkMuted)
                        .padding(12)
                        .frame(maxWidth: .infinity)
                        .background(Theme.gold.opacity(0.12))
                }

                if let banner {
                    Text(banner)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .padding(10)
                        .frame(maxWidth: .infinity)
                        .background(Color.red.opacity(0.08))
                }

                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 12) {
                            if messages.isEmpty {
                                VStack(spacing: 12) {
                                    Image(systemName: "message.circle.fill")
                                        .font(.system(size: 40))
                                        .foregroundStyle(Theme.gold.opacity(0.85))
                                    Text("How can I help you?")
                                        .font(.system(.title3, design: .serif).weight(.semibold))
                                    Text("Ask about the Bible, theology, or applying Scripture. Replies run on-device with Apple Intelligence—no Gemini or Grok keys in this app.")
                                        .font(.footnote)
                                        .foregroundStyle(Theme.inkMuted)
                                        .multilineTextAlignment(.center)
                                        .padding(.horizontal)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 36)
                            }

                            ForEach(messages) { m in
                                bubble(m)
                                    .id(m.id)
                            }
                            if sending {
                                HStack(spacing: 8) {
                                    ProgressView()
                                        .tint(Theme.gold)
                                    Text("Thinking…")
                                        .font(.footnote)
                                        .foregroundStyle(Theme.inkMuted)
                                }
                                .padding(12)
                                .background(RoundedRectangle(cornerRadius: 14).fill(Color.white))
                                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.gold.opacity(0.15), lineWidth: 1))
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .id("typing")
                            }
                        }
                        .padding(16)
                    }
                    .onChange(of: messages.count) { _, _ in
                        if let last = messages.last {
                            withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                        }
                    }
                    .onChange(of: sending) { _, on in
                        if on {
                            withAnimation { proxy.scrollTo("typing", anchor: .bottom) }
                        }
                    }
                }

                Divider().overlay(Theme.gold.opacity(0.15))

                HStack(alignment: .bottom, spacing: 10) {
                    TextField("Ask your question…", text: $input, axis: .vertical)
                        .textFieldStyle(.plain)
                        .lineLimit(1 ... 5)
                        .padding(12)
                        .background(RoundedRectangle(cornerRadius: 12).fill(Color.white))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.gold.opacity(0.35), lineWidth: 1))

                    Button {
                        Task { await send() }
                    } label: {
                        Image(systemName: sending ? "hourglass" : "arrow.up.circle.fill")
                            .font(.system(size: 34))
                            .symbolRenderingMode(.palette)
                            .foregroundStyle(Theme.gold, Theme.ink.opacity(0.15))
                    }
                    .disabled(sending || input.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || !aiReady)
                }
                .padding(12)
                .background(Theme.parchment)
            }
            .background(Theme.parchment)
            .navigationTitle("AI Assistant")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { onClose() }
                }
                ToolbarItem(placement: .primaryAction) {
                    if !messages.isEmpty {
                        Button("Clear") {
                            messages = []
                            banner = nil
                            chatService.resetConversation()
                            chatService = BibleChatService.makeDefault()
                        }
                    }
                }
            }
        }
    }

    @ViewBuilder
    private func bubble(_ m: ChatBubble) -> some View {
        HStack {
            if m.role == .user { Spacer(minLength: 40) }
            Text(m.text)
                .font(.system(.body, design: .default))
                .foregroundStyle(m.role == .user ? Color.white : Theme.ink)
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 16)
                        .fill(m.role == .user ? Theme.gold : Color.white)
                )
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(Theme.gold.opacity(m.role == .user ? 0 : 0.12), lineWidth: m.role == .user ? 0 : 1)
                )
                .frame(maxWidth: 320, alignment: m.role == .user ? .trailing : .leading)
            if m.role == .assistant { Spacer(minLength: 40) }
        }
    }

    private func send() async {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        banner = nil
        input = ""
        messages.append(ChatBubble(role: .user, text: text))
        sending = true
        defer { sending = false }
        do {
            let reply = try await chatService.reply(userMessage: text)
            messages.append(ChatBubble(role: .assistant, text: reply))
        } catch {
            banner = error.localizedDescription
        }
    }
}
