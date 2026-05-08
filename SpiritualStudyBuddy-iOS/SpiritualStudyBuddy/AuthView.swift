import SwiftUI

struct AuthView: View {
    @Environment(AppSession.self) private var session
    @State private var mode = 0
    @State private var email = ""
    @State private var password = ""
    @State private var displayName = ""
    @State private var busy = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 8) {
                    Text("Spiritual Study Buddy")
                        .font(.system(.title, design: .serif).weight(.semibold))
                        .foregroundStyle(Theme.ink)
                        .multilineTextAlignment(.center)
                    Text("Your Bible study companion")
                        .font(.subheadline)
                        .foregroundStyle(Theme.inkMuted)
                }
                .frame(maxWidth: .infinity)
                .padding(.top, 32)

                Picker("", selection: $mode) {
                    Text("Sign In").tag(0)
                    Text("Sign Up").tag(1)
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)

                VStack(alignment: .leading, spacing: 16) {
                    if mode == 1 {
                        labeledField("Display name", text: $displayName, contentType: .name)
                    }
                    labeledField("Email", text: $email, contentType: .emailAddress)
                    labeledField("Password", text: $password, contentType: .password, secure: true)

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task { await submit() }
                    } label: {
                        if busy {
                            ProgressView()
                                .tint(.white)
                                .frame(maxWidth: .infinity, minHeight: Theme.minTap)
                        } else {
                            Text(mode == 0 ? "Sign In" : "Create account")
                                .font(.headline)
                                .frame(maxWidth: .infinity, minHeight: Theme.minTap)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Theme.gold)
                    .disabled(busy || !formValid)
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
        }
        .background(Theme.parchment)
    }

    private var formValid: Bool {
        if email.trimmingCharacters(in: .whitespaces).isEmpty { return false }
        if password.count < 6 { return false }
        if mode == 1, displayName.trimmingCharacters(in: .whitespaces).isEmpty { return false }
        return true
    }

    @ViewBuilder
    private func labeledField(
        _ title: String,
        text: Binding<String>,
        contentType: TextContentType?,
        secure: Bool = false
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(Theme.ink)
            Group {
                if secure {
                    SecureField("Required", text: text)
                } else {
                    TextField("Required", text: text)
                }
            }
            .textContentType(contentType)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .padding(14)
            .background(RoundedRectangle(cornerRadius: 12).fill(Color.white))
            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Theme.gold.opacity(0.35), lineWidth: 1))
        }
    }

    private func submit() async {
        busy = true
        errorMessage = nil
        defer { busy = false }
        do {
            if mode == 0 {
                try await session.signIn(email: email.trimmingCharacters(in: .whitespaces), password: password)
            } else {
                try await session.signUp(
                    email: email.trimmingCharacters(in: .whitespaces),
                    password: password,
                    displayName: displayName.trimmingCharacters(in: .whitespaces)
                )
            }
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
