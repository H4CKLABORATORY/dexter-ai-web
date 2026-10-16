import sys
from pathlib import Path
import unittest

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import editor
import reference_lab as lab

class ReferenceTests(unittest.TestCase):
    def test_safe_tiktok_url(self):
        self.assertTrue(lab.validate_tiktok_url("https://www.tiktok.com/@owner/video/12345"))
        self.assertTrue(lab.validate_tiktok_url("https://vm.tiktok.com/ABcdEF"))
        self.assertFalse(lab.validate_tiktok_url("https://not-tiktok.com/tiktok.com"))
        self.assertFalse(lab.validate_tiktok_url("http://www.tiktok.com/@owner"))
        self.assertFalse(lab.validate_tiktok_url("https://evil.tiktok.com.attacker.com/"))

    def test_name_clean(self):
        self.assertEqual(lab.valid_name("Intro Épica Free Fire"),"intro-pica-free-fire")
        with self.assertRaises(ValueError):
            lab.valid_name("...")
    def test_metrics(self):
        m=lab.caption_metrics("1\n00:00:00,000 --> 00:00:01,000\nHola bro\n\n2\n00:00:02,000 --> 00:00:04,000\nBotsito\n")
        self.assertEqual(m["subtitles"],2)

class EditorTests(unittest.TestCase):
    def test_split_silences(self):
        self.assertEqual(editor.active_ranges(5.0,[[1.0,2.0]],pad=0),
                         [[0.0,1.0],[2.0,5.0]])
        self.assertEqual(editor.limit_duration([[0.0,1.0],[2.0,5.0]],2.0),
                         [[0.0,1.0],[2.0,3.0]])

    def test_caption_remap_across_jump(self):
        subs=[
            {"start":0.25,"end":0.75,"text":"Hola"},
            {"start":4.1,"end":5.9,"text":"Sorpresa"}
        ]
        got=editor.remap_captions(subs,[[0.0,1.0],[4.0,6.0]])
        self.assertEqual([x["text"] for x in got],["Hola","Sorpresa"])
        self.assertAlmostEqual(got[1]["start"],1.1)
        self.assertAlmostEqual(got[1]["end"],2.9)

    def test_srt_roundtrip(self):
        parsed=editor.parse_srt("1\n00:00:00,150 --> 00:00:01,250\n¡Bro!\n")
        self.assertEqual(parsed[0]["text"],"¡Bro!")
        self.assertAlmostEqual(parsed[0]["start"],.15)
        self.assertIn("00:00:00,150",editor.format_srt(parsed))

    def test_validate_rejects_unsorted(self):
        with self.assertRaises(ValueError):
            editor.validate_plan({"clips":[[2.0,4.0],[1.0,2.0]],
                                  "platform":"tiktok","layout":"fit"},10.0)

    def test_empty_captions(self):
        self.assertEqual(editor.remap_captions([],[[0.0,4.0]]),[])
        self.assertEqual(editor.suggest_memes([]),[])

if __name__=="__main__":
    unittest.main()
