import SwiftUI

struct RootView: View {
    @Environment(AppSession.self) private var session

    var body: some View {
        Group {
            if session.authLoading {
                ZStack {
                    Theme.parchment.ignoresSafeArea()
                    ProgressView()
                        .tint(Theme.gold)
                        .scaleEffect(1.2)
                }
            } else if session.user == nil {
                AuthView()
            } else {
                HomeView()
            }
        }
    }
}
