"""Tests for the public site view counter."""

import tempfile
import unittest
from pathlib import Path
from unittest import mock

from wakuwaku import site_views


class SiteViewsTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.store = Path(self.temp_dir.name) / "site_views.json"
        self.path_patch = mock.patch.object(site_views, "SITE_VIEWS_PATH", self.store)
        self.path_patch.start()

    def tearDown(self):
        self.path_patch.stop()
        self.temp_dir.cleanup()

    def test_starts_at_zero(self):
        self.assertEqual(site_views.get_site_view_count(), 0)

    def test_random_views_for_page_load_range(self):
        for _ in range(50):
            value = site_views.random_views_for_page_load()
            self.assertGreaterEqual(value, site_views.VIEWS_PER_PAGE_LOAD_MIN)
            self.assertLessEqual(value, site_views.VIEWS_PER_PAGE_LOAD_MAX)

    def test_record_increments_by_random_amount(self):
        with mock.patch.object(
            site_views, "random_views_for_page_load", side_effect=[8, 13]
        ):
            self.assertEqual(site_views.record_site_view(), 8)
            self.assertEqual(site_views.record_site_view(), 21)
            self.assertEqual(site_views.get_site_view_count(), 21)

    def test_system_stats_includes_view_count(self):
        with mock.patch.object(
            site_views, "random_views_for_page_load", return_value=10
        ):
            site_views.record_site_view()
        data = __import__(
            "wakuwaku.system_stats", fromlist=["system_stats_payload"]
        ).system_stats_payload(piper_model_loaded=False)
        self.assertEqual(data["viewCount"], 10)


if __name__ == "__main__":
    unittest.main()
