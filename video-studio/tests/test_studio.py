import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import studio

class Tests(unittest.TestCase):
    def test_presets(self):
        self.assertEqual(studio.PRESETS["youtube"], (1920, 1080))
        self.assertEqual(studio.PRESETS["tiktok"], (1080, 1920))
    def test_slug(self):
        self.assertEqual(studio.slugify("Cazando Interesadas 01"), "cazando-interesadas-01")
        with self.assertRaises(ValueError):
            studio.project("../private")
    def test_render_is_argument_array(self):
        cmd = studio.ffmpeg_args("input.mp4", "output.mp4", "shorts", start=10, duration=20)
        self.assertIsInstance(cmd, list)
        self.assertIn("libx264", cmd)
        self.assertIn("-t", cmd)
    def test_fit_preserves_content(self):
        self.assertIn("pad=", studio.video_filter(1920, 1080, "fit"))
        self.assertIn("crop=", studio.video_filter(1080, 1920, "crop"))

if __name__ == "__main__":
    unittest.main()
