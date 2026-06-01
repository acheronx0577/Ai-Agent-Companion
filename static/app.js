document.addEventListener('DOMContentLoaded', () => {
    const appShell = document.querySelector('.app-shell');
    const textInput = document.getElementById('text-input');
    const sendButton = document.getElementById('send-button');
    const characterImage = document.getElementById('character-image');
    const voiceSelect = document.getElementById('voice-select');
    const messageList = document.getElementById('message-list');
    const conversationList = document.getElementById('conversation-list');
    const newChatButton = document.getElementById('new-chat-button');
    const deleteAllChatsButton = document.getElementById('delete-all-chats-button');
    const changeProfileButton = document.getElementById('change-profile-button');
    const profileUploadInput = document.getElementById('profile-upload-input');
    const profilePreview = document.getElementById('profile-preview');
    const toggleHistoryButton = document.getElementById('toggle-history-button');
    const mobileHistoryToggle = document.getElementById('mobile-history-toggle');
    const historyBackdrop = document.getElementById('history-backdrop');
    const conversationTitle = document.getElementById('conversation-title');

    const imageCacheBust = Math.random().toString(36).substring(2, 10);
    const openMouthImg = `/static/images/char-mouth-open.png?v=${imageCacheBust}`;
    const closedMouthImg = `/static/images/char-mouth-closed.png?v=${imageCacheBust}`;
    const builtInUserAvatar = `/static/images/user-default.png?v=${imageCacheBust}`;
    let defaultUserAvatar = builtInUserAvatar;

    characterImage.src = closedMouthImg;
    const preloadOpen = new Image();
    preloadOpen.src = openMouthImg;
    const preloadClosed = new Image();
    preloadClosed.src = closedMouthImg;

    let voices = [];
    let lipSyncInterval;
    let lastVoiceSignature = '';
    const femaleNameHints = [
        'female', 'woman', 'girl', 'zira', 'hazel', 'aria', 'jenny', 'sara', 'samantha', 'alloy', 'nova',
        'kyoko', 'nanami', 'haruka', 'sayaka', 'mizuki'
    ];
    const animeVoiceHints = ['anime', 'kawaii', 'cute'];

    const conversations = [];
    let activeConversationId = null;
    let activeMenuConversationId = null;
    const sidebarStorageKey = 'wakuwaku.sidebarCollapsed';
    const userAvatarStorageKey = 'wakuwaku.userAvatar';

    const floatingMenu = document.createElement('div');
    floatingMenu.className = 'floating-conversation-menu';
    floatingMenu.innerHTML = `
        <button type="button" data-action="rename">Rename</button>
        <button type="button" data-action="delete">Delete</button>
    `;
    document.body.appendChild(floatingMenu);

    function setSidebarCollapsed(collapsed) {
        if (!appShell || !toggleHistoryButton) {
            return;
        }
        appShell.classList.toggle('sidebar-collapsed', collapsed);
        toggleHistoryButton.textContent = collapsed ? '⟩' : '⟨';
        toggleHistoryButton.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
        toggleHistoryButton.setAttribute('title', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
        if (mobileHistoryToggle) {
            mobileHistoryToggle.setAttribute('aria-label', collapsed ? 'Open sidebar' : 'Close sidebar');
            mobileHistoryToggle.setAttribute('title', collapsed ? 'Open sidebar' : 'Close sidebar');
        }
        try {
            window.localStorage.setItem(sidebarStorageKey, collapsed ? '1' : '0');
        } catch (_error) {
            // ignore storage failures
        }
    }

    function newConversation() {
        const id = `conv-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
        return {
            id,
            title: 'New Conversation',
            createdAt: Date.now(),
            manualTitle: false,
            messages: []
        };
    }

    function getActiveConversation() {
        return conversations.find((conversation) => conversation.id === activeConversationId) || null;
    }

    function closeAllConversationMenus() {
        conversationList.querySelectorAll('.conversation-item.menu-open').forEach((item) => {
            item.classList.remove('menu-open');
        });
        floatingMenu.classList.remove('open');
        delete floatingMenu.dataset.conversationId;
        activeMenuConversationId = null;
    }

    function selectTitleText() {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(conversationTitle);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    function renameConversation(conversationId) {
        const conversation = conversations.find((item) => item.id === conversationId);
        if (!conversation) {
            return;
        }
        activeConversationId = conversation.id;
        renderConversationList();
        renderMessages();
        conversationTitle.focus();
        selectTitleText();
    }

    function deleteConversation(conversationId) {
        const conversation = conversations.find((item) => item.id === conversationId);
        if (!conversation) {
            return;
        }
        const index = conversations.findIndex((item) => item.id === conversationId);
        if (index >= 0) {
            conversations.splice(index, 1);
        }

        if (!conversations.length) {
            activeConversationId = null;
            renderConversationList();
            renderMessages();
            return;
        }

        if (activeConversationId === conversationId) {
            activeConversationId = conversations[0].id;
            renderMessages();
        }
        renderConversationList();
    }

    function openConversationMenu(row, menuButton, conversationId) {
        const wasOpen = row.classList.contains('menu-open');
        closeAllConversationMenus();
        if (wasOpen) {
            return;
        }

        row.classList.add('menu-open');
        activeMenuConversationId = conversationId;
        floatingMenu.dataset.conversationId = conversationId;

        const rect = menuButton.getBoundingClientRect();
        const menuWidth = 120;
        const menuHeight = 76;
        let left = rect.right - menuWidth + 4;
        let top = rect.top + 50;

        if (left < 8) {
            left = 8;
        }
        if (top + menuHeight > window.innerHeight - 8) {
            top = rect.top - menuHeight - 6;
        }
        if (top < 8) {
            top = 8;
        }

        floatingMenu.style.left = `${left}px`;
        floatingMenu.style.top = `${top}px`;
        floatingMenu.classList.add('open');
    }

    function renderConversationList() {
        conversationList.innerHTML = '';
        conversations.forEach((conversation) => {
            const row = document.createElement('div');
            row.className = `conversation-item${conversation.id === activeConversationId ? ' active' : ''}`;

            const selectButton = document.createElement('button');
            selectButton.type = 'button';
            selectButton.className = 'conversation-main';
            selectButton.innerHTML = `
                <span>${conversation.title}</span>
                <span class="conversation-meta">${new Date(conversation.createdAt).toLocaleDateString()} ${new Date(conversation.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            `;
            selectButton.addEventListener('click', () => {
                activeConversationId = conversation.id;
                renderConversationList();
                renderMessages();
            });

            const menuButton = document.createElement('button');
            menuButton.type = 'button';
            menuButton.className = 'conversation-menu-button';
            menuButton.setAttribute('aria-label', 'Conversation options');
            menuButton.textContent = '⋯';

            menuButton.addEventListener('click', (event) => {
                event.stopPropagation();
                openConversationMenu(row, menuButton, conversation.id);
            });

            row.appendChild(selectButton);
            row.appendChild(menuButton);
            conversationList.appendChild(row);
        });
    }

    function isNearBottom(element, threshold = 80) {
        return (element.scrollHeight - element.scrollTop - element.clientHeight) <= threshold;
    }

    function renderMessages(options = {}) {
        const { forceScrollBottom = false } = options;
        const conversation = getActiveConversation();
        const previousScrollTop = messageList.scrollTop;
        const previousScrollHeight = messageList.scrollHeight;
        const shouldStickToBottom = forceScrollBottom || isNearBottom(messageList);

        messageList.innerHTML = '';
        if (!conversation) {
            const empty = document.createElement('div');
            empty.className = 'message-empty';
            empty.textContent = 'No conversation selected. Click "New Chat" to start.';
            messageList.appendChild(empty);
            conversationTitle.textContent = 'No Conversation';
            return;
        }

        if (!conversation.messages.length) {
            const empty = document.createElement('div');
            empty.className = 'message-empty';
            empty.textContent = 'Start chatting. Your messages and replies will appear here.';
            messageList.appendChild(empty);
            conversationTitle.textContent = conversation.title;
            return;
        }

        conversationTitle.textContent = conversation.title;
        conversation.messages.forEach((entry) => {
            const row = document.createElement('div');
            row.className = `message ${entry.role === 'user' ? 'user' : 'ai'}`;

            const header = document.createElement('div');
            header.className = 'message-header';

            const avatar = document.createElement('span');
            avatar.className = `message-avatar ${entry.role === 'user' ? 'user' : 'ai'}`;
            if (entry.role === 'ai') {
                const avatarImage = document.createElement('img');
                avatarImage.className = 'message-avatar-image';
                avatarImage.src = closedMouthImg;
                avatarImage.alt = 'WakuWaku';
                avatar.appendChild(avatarImage);
            } else {
                const avatarImage = document.createElement('img');
                avatarImage.className = 'message-avatar-image';
                avatarImage.src = defaultUserAvatar;
                avatarImage.alt = 'You';
                avatar.appendChild(avatarImage);
            }

            const author = document.createElement('span');
            author.className = 'message-author';
            author.textContent = entry.role === 'user' ? 'You' : 'WakuWaku';

            const content = document.createElement('div');
            content.className = 'message-content';
            content.textContent = entry.text;

            header.appendChild(avatar);
            header.appendChild(author);
            row.appendChild(header);
            row.appendChild(content);
            messageList.appendChild(row);
        });

        if (shouldStickToBottom) {
            messageList.scrollTop = messageList.scrollHeight;
            return;
        }

        // Preserve viewport position when user is browsing older messages.
        const nextScrollHeight = messageList.scrollHeight;
        const heightDelta = nextScrollHeight - previousScrollHeight;
        messageList.scrollTop = Math.max(0, previousScrollTop + heightDelta);
    }

    function appendMessage(role, text) {
        const conversation = getActiveConversation();
        if (!conversation) {
            return;
        }
        conversation.messages.push({ role, text, at: Date.now() });
        if (conversation.messages.length === 1 && role === 'user' && !conversation.manualTitle) {
            conversation.title = text.slice(0, 34) || 'Conversation';
        }
        renderConversationList();
        renderMessages({ forceScrollBottom: role === 'user' });
    }

    function commitConversationTitle() {
        const conversation = getActiveConversation();
        if (!conversation) {
            return;
        }
        const nextTitle = conversationTitle.textContent.trim();
        conversation.title = nextTitle || 'Conversation';
        conversation.manualTitle = true;
        conversationTitle.textContent = conversation.title;
        renderConversationList();
    }

    function setVoiceSelectUnavailable(message) {
        voiceSelect.innerHTML = '';
        const option = document.createElement('option');
        option.textContent = message;
        option.value = '';
        voiceSelect.appendChild(option);
        voiceSelect.disabled = true;
    }

    function buildVoiceSignature(voiceList) {
        return voiceList.map((voice) => `${voice.name}|${voice.lang}`).join('||');
    }

    function isLikelyFemaleVoice(voice) {
        const normalizedName = voice.name.toLowerCase();
        return femaleNameHints.some((hint) => normalizedName.includes(hint));
    }

    function isLikelyAnimeVoice(voice) {
        const normalizedName = voice.name.toLowerCase();
        return animeVoiceHints.some((hint) => normalizedName.includes(hint));
    }

    function isGoogleVoice(voice) {
        return voice.name.toLowerCase().includes('google');
    }

    function isJapaneseLanguageCode(languageCode) {
        return languageCode.toLowerCase().startsWith('ja');
    }

    function pickOneVoicePerLanguage(allVoices) {
        const groupedByLanguage = new Map();
        allVoices.forEach((voice) => {
            if (!groupedByLanguage.has(voice.lang)) {
                groupedByLanguage.set(voice.lang, []);
            }
            groupedByLanguage.get(voice.lang).push(voice);
        });

        const selected = [];
        groupedByLanguage.forEach((languageVoices, languageCode) => {
            const googleVoices = languageVoices.filter(isGoogleVoice);
            const prioritizedVoices = googleVoices.length ? googleVoices : languageVoices;

            if (isJapaneseLanguageCode(languageCode)) {
                const animeFemaleVoice = prioritizedVoices.find((voice) => isLikelyFemaleVoice(voice) && isLikelyAnimeVoice(voice));
                const femaleVoice = prioritizedVoices.find(isLikelyFemaleVoice);
                selected.push(animeFemaleVoice || femaleVoice || prioritizedVoices[0]);
                return;
            }

            const femaleVoice = prioritizedVoices.find(isLikelyFemaleVoice);
            selected.push(femaleVoice || prioritizedVoices[0]);
        });

        return selected.sort((a, b) => a.lang.localeCompare(b.lang));
    }

    function populateVoiceList(force = false) {
        if (!('speechSynthesis' in window)) {
            voices = [];
            setVoiceSelectUnavailable('Speech not supported');
            return;
        }

        const allVoices = speechSynthesis.getVoices();
        const nextSignature = buildVoiceSignature(allVoices);
        if (!force && nextSignature === lastVoiceSignature) {
            return;
        }
        lastVoiceSignature = nextSignature;

        voices = pickOneVoicePerLanguage(allVoices);
        voiceSelect.innerHTML = '';
        voiceSelect.disabled = false;

        if (!voices.length) {
            setVoiceSelectUnavailable('Loading voices...');
            return;
        }

        let usVoiceIndex = -1;
        let japaneseVoiceIndex = -1;

        voices.forEach((voice, i) => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.setAttribute('data-lang', voice.lang);
            option.setAttribute('data-name', voice.name);
            voiceSelect.appendChild(option);

            if (voice.lang === 'en-US' && usVoiceIndex === -1) {
                usVoiceIndex = i;
            }

            if (isJapaneseLanguageCode(voice.lang) && japaneseVoiceIndex === -1) {
                japaneseVoiceIndex = i;
            }
        });

        if (japaneseVoiceIndex !== -1) {
            voiceSelect.selectedIndex = japaneseVoiceIndex;
        } else if (usVoiceIndex !== -1) {
            voiceSelect.selectedIndex = usVoiceIndex;
        }
    }

    function speak(text) {
        if (!('speechSynthesis' in window)) {
            return;
        }

        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
        clearInterval(lipSyncInterval);

        const utterance = new SpeechSynthesisUtterance(text);
        const selectedOption = voiceSelect.selectedOptions[0];
        const selectedVoiceName = selectedOption ? selectedOption.getAttribute('data-name') : null;
        const selectedVoice = voices.find((voice) => voice.name === selectedVoiceName) || voices[0];
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.onstart = () => {
            let mouthOpen = true;
            lipSyncInterval = setInterval(() => {
                characterImage.src = mouthOpen ? openMouthImg : closedMouthImg;
                mouthOpen = !mouthOpen;
            }, 150);
        };

        utterance.onend = () => {
            clearInterval(lipSyncInterval);
            characterImage.src = closedMouthImg;
        };

        utterance.onerror = () => {
            clearInterval(lipSyncInterval);
            characterImage.src = closedMouthImg;
        };

        speechSynthesis.speak(utterance);
    }

    async function handleSendMessage() {
        const message = textInput.value.trim();
        const conversation = getActiveConversation();
        if (!message || !conversation) {
            return;
        }

        textInput.value = '';
        textInput.style.height = '50px';
        appendMessage('user', message);

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message, session_id: conversation.id })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            const responseText = (data.response || '').trim() || '(No response returned)';
            appendMessage('ai', responseText);
            speak(responseText);
        } catch (error) {
            console.error('Error:', error);
            const errorMessage = 'Sorry, something went wrong. Please try again.';
            appendMessage('ai', errorMessage);
        }
    }

    function createConversationAndActivate() {
        const conversation = newConversation();
        conversations.unshift(conversation);
        activeConversationId = conversation.id;
        renderConversationList();
        renderMessages({ forceScrollBottom: true });
    }

    sendButton.addEventListener('click', handleSendMessage);
    newChatButton.addEventListener('click', createConversationAndActivate);
    deleteAllChatsButton.addEventListener('click', () => {
        conversations.length = 0;
        activeConversationId = null;
        closeAllConversationMenus();
        renderConversationList();
        renderMessages();
    });
    changeProfileButton.addEventListener('click', () => {
        profileUploadInput.click();
    });
    profileUploadInput.addEventListener('change', () => {
        const file = profileUploadInput.files && profileUploadInput.files[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const result = typeof reader.result === 'string' ? reader.result : '';
            if (!result) {
                return;
            }
            defaultUserAvatar = result;
            profilePreview.src = defaultUserAvatar;
            renderMessages();
            try {
                window.localStorage.setItem(userAvatarStorageKey, result);
            } catch (_error) {
                // ignore storage failures
            }
        };
        reader.readAsDataURL(file);
        profileUploadInput.value = '';
    });
    toggleHistoryButton.addEventListener('click', () => {
        const collapsed = !appShell.classList.contains('sidebar-collapsed');
        setSidebarCollapsed(collapsed);
    });
    if (mobileHistoryToggle) {
        mobileHistoryToggle.addEventListener('click', () => {
            const collapsed = !appShell.classList.contains('sidebar-collapsed');
            setSidebarCollapsed(collapsed);
        });
    }
    if (historyBackdrop) {
        historyBackdrop.addEventListener('click', () => {
            setSidebarCollapsed(true);
        });
    }

    textInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    });

    textInput.addEventListener('input', () => {
        textInput.style.height = 'auto';
        textInput.style.height = `${textInput.scrollHeight}px`;
    });

    document.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) {
            return;
        }
        if (!event.target.closest('.conversation-item') && !event.target.closest('.floating-conversation-menu')) {
            closeAllConversationMenus();
        }
    });
    floatingMenu.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!(event.target instanceof Element)) {
            return;
        }
        const actionButton = event.target.closest('button[data-action]');
        const conversationId = floatingMenu.dataset.conversationId || activeMenuConversationId;
        if (!actionButton || !conversationId) {
            return;
        }
        const action = actionButton.getAttribute('data-action');
        if (action === 'rename') {
            renameConversation(conversationId);
        } else if (action === 'delete') {
            deleteConversation(conversationId);
        }
        closeAllConversationMenus();
    });
    window.addEventListener('resize', closeAllConversationMenus);
    conversationList.addEventListener('scroll', closeAllConversationMenus);

    conversationTitle.setAttribute('contenteditable', 'true');
    conversationTitle.setAttribute('spellcheck', 'false');
    conversationTitle.addEventListener('focus', () => {
        selectTitleText();
    });
    conversationTitle.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            conversationTitle.blur();
        }
        if (event.key === 'Escape') {
            event.preventDefault();
            const conversation = getActiveConversation();
            conversationTitle.textContent = conversation ? conversation.title : 'Conversation';
            conversationTitle.blur();
        }
    });
    conversationTitle.addEventListener('blur', commitConversationTitle);

    populateVoiceList(true);
    if ('speechSynthesis' in window && speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = () => populateVoiceList(true);
    }

    let voiceRetryCount = 0;
    const voiceRetryTimer = setInterval(() => {
        if (!('speechSynthesis' in window)) {
            clearInterval(voiceRetryTimer);
            return;
        }
        voiceRetryCount += 1;
        const availableVoices = speechSynthesis.getVoices();
        if (availableVoices.length > 1 || voiceRetryCount >= 10) {
            populateVoiceList(true);
            clearInterval(voiceRetryTimer);
            return;
        }
        populateVoiceList();
    }, 500);

    try {
        const stored = window.localStorage.getItem(sidebarStorageKey);
        if (stored === null) {
            setSidebarCollapsed(window.innerWidth <= 1024);
        } else if (stored === '1') {
            setSidebarCollapsed(true);
        } else {
            setSidebarCollapsed(false);
        }
    } catch (_error) {
        setSidebarCollapsed(window.innerWidth <= 1024);
    }

    try {
        const storedAvatar = window.localStorage.getItem(userAvatarStorageKey);
        if (storedAvatar) {
            defaultUserAvatar = storedAvatar;
        }
    } catch (_error) {
        defaultUserAvatar = builtInUserAvatar;
    }
    profilePreview.src = defaultUserAvatar;

    createConversationAndActivate();
});
