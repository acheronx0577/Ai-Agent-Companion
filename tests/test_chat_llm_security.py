"""Resource-bound regressions for in-memory Groq conversation history."""

import unittest

from chat_llm import (
    MAX_HISTORY_SESSIONS,
    _append_history,
    _histories,
    _history_last_used,
    _messages_for_session,
)


class GroqHistoryBoundTests(unittest.TestCase):
    def setUp(self):
        _histories.clear()
        _history_last_used.clear()

    def test_reading_at_exact_session_cap_does_not_evict_history(self):
        for index in range(MAX_HISTORY_SESSIONS):
            _append_history(f"session-{index}", "user", "hello")

        messages = _messages_for_session("session-0", "next")

        self.assertEqual(len(_histories), MAX_HISTORY_SESSIONS)
        self.assertEqual(messages[1]["content"], "hello")


if __name__ == "__main__":
    unittest.main()
