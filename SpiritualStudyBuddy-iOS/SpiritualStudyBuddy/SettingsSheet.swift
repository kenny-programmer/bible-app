import SwiftUI

struct SettingsSheet: View {
    @Environment(AppSession.self) private var session
    @Binding var version: BibleVersionOption
    let onDismiss: () -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Bible version", selection: $version) {
                        ForEach(BibleVersionOption.allCases) { v in
                            Text(v.label).tag(v)
                        }
                    }
                    .onChange(of: version) { _, newValue in
                        Task {
                            try? await session.updatePreferredVersion(newValue)
                        }
                    }
                } header: {
                    Text("Reading")
                }

                if let u = session.user {
                    Section {
                        HStack(spacing: 14) {
                            ZStack {
                                Circle()
                                    .fill(Theme.gold.opacity(0.2))
                                    .frame(width: 48, height: 48)
                                Text(initial(for: session.profile?.display_name, email: u.email))
                                    .font(.headline.weight(.semibold))
                                    .foregroundStyle(Theme.gold)
                            }
                            VStack(alignment: .leading, spacing: 4) {
                                Text(session.profile?.display_name?.isEmpty == false ? (session.profile?.display_name ?? "") : "Reader")
                                    .font(.headline)
                                    .foregroundStyle(Theme.ink)
                                Text(u.email ?? "")
                                    .font(.caption)
                                    .foregroundStyle(Theme.inkMuted)
                                    .lineLimit(2)
                            }
                        }
                        .padding(.vertical, 4)
                    } header: {
                        Text("Account")
                    }
                }

                Section {
                    Button(role: .destructive) {
                        Task {
                            try? await session.signOut()
                            onDismiss()
                        }
                    } label: {
                        Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { onDismiss() }
                }
            }
        }
    }

    private func initial(for name: String?, email: String?) -> String {
        if let c = name?.trimmingCharacters(in: .whitespaces).first {
            return String(c).uppercased()
        }
        if let c = email?.first { return String(c).uppercased() }
        return "U"
    }
}
