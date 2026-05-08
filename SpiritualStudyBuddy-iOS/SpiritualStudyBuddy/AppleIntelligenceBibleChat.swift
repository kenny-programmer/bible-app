import Foundation

enum BibleChatError: LocalizedError {
    case appleIntelligenceUnavailable
    case emptyResponse

    var errorDescription: String? {
        switch self {
        case .appleIntelligenceUnavailable:
            return "Apple Intelligence is not available on this device. Enable it in Settings and use a supported iPhone (for example iPhone 15 Pro or newer), running iOS 26 or later."
        case .emptyResponse:
            return "The model returned an empty reply. Try a shorter question."
        }
    }
}

/// Base chat service (no cloud LLM keys in the app).
@MainActor
class BibleChatService {
    func reply(userMessage: String) async throws -> String {
        throw BibleChatError.appleIntelligenceUnavailable
    }

    func resetConversation() {}

    static func makeDefault() -> BibleChatService {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            return AppleIntelligenceBibleChatService()
        }
        #endif
        return BibleChatService()
    }

    static var isAppleIntelligenceRuntimeAvailable: Bool {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            return SystemLanguageModel.default.isAvailable
        }
        #endif
        return false
    }
}

#if canImport(FoundationModels)
import FoundationModels

@available(iOS 26.0, *)
private let bibleAssistantInstructions = """
You are a knowledgeable Bible study partner. Help users understand Scripture, explore theology, and apply the Bible thoughtfully—not as a replacement for pastors or counselors, but as a patient study companion.
Answer the question directly. Cite or paraphrase passages with references when helpful. Use 2–5 short paragraphs when needed. Warm, respectful tone.
For mental health crises, encourage professional help.
"""

/// On-device Apple Intelligence via `FoundationModels` (no Gemini/Grok API).
@available(iOS 26.0, *)
final class AppleIntelligenceBibleChatService: BibleChatService {
    private var session: LanguageModelSession?

    private func ensureSession() -> LanguageModelSession {
        if let session { return session }
        // See Apple’s `LanguageModelSession` overview: session + `respond(to:)`.
        let s = LanguageModelSession(instructions: bibleAssistantInstructions)
        session = s
        return s
    }

    override func reply(userMessage: String) async throws -> String {
        guard SystemLanguageModel.default.isAvailable else {
            throw BibleChatError.appleIntelligenceUnavailable
        }
        let s = ensureSession()
        let response = try await s.respond(to: userMessage)
        let text = response.content.trimmingCharacters(in: .whitespacesAndNewlines)
        if text.isEmpty { throw BibleChatError.emptyResponse }
        return text
    }

    override func resetConversation() {
        session = nil
    }
}
#endif
