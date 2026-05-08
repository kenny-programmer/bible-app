import SwiftUI

@main
struct SpiritualStudyBuddyApp: App {
    @State private var appSession = AppSession()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(appSession)
                .tint(Theme.gold)
                .preferredColorScheme(.light)
        }
    }
}
