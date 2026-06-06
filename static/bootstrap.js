(function () {
    try {
        const stored = localStorage.getItem('wakuwaku.sidebarCollapsed');
        const isMobile = window.innerWidth <= 900;
        if (stored === '0' || (stored === null && !isMobile)) {
            document.documentElement.classList.add('sidebar-init-expanded');
        }
    } catch (_error) {
        // Local storage can be disabled by the browser.
    }

    document.addEventListener('DOMContentLoaded', () => {
        try {
            const raw = localStorage.getItem('wakuwaku.chatHistory');
            const data = raw ? JSON.parse(raw) : null;
            if (!data?.activeConversationId || !Array.isArray(data.conversations)) {
                return;
            }
            const active = data.conversations.find(
                (conversation) => conversation.id === data.activeConversationId
            );
            const title = document.getElementById('conversation-title');
            if (active?.title && title) {
                title.textContent = active.title;
            }
        } catch (_error) {
            // Ignore malformed or blocked local storage.
        }
    });
})();
