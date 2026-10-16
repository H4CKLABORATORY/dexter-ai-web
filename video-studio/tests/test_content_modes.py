import json
from pathlib import Path
import tempfile
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import content_modes as m

class ContentModesTest(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        root=Path(self.tmp.name)
        self.patchers=[
            patch.object(m,"LIBRARY",root/"lib"),
            patch.object(m,"SCRIPTS",root/"lib"/"scripts"),
            patch.object(m,"METHODS",root/"lib"/"content_methods.json"),
            patch.object(m,"KNOWLEDGE",root/"lib"/"dexter_knowledge.json"),
            patch.object(m,"CATALOG",root/"lib"/"script_catalog.json"),
        ]
        for p in self.patchers:
            p.start()
            self.addCleanup(p.stop)
        m.initialize()

    def test_seed_is_factual_not_full_guions(self):
        c=m.read_json(m.CATALOG,{})
        self.assertEqual(c["entries"],[])
        self.assertIn("Cazando interesadas",c["known_titles_only"])
        self.assertIn("botsito",m.read_json(m.KNOWLEDGE,{})["terms"])

    def test_detect_novela(self):
        x=m.detect(title="Free Fire Cazando interesadas",script="botsito chacalita en Isla Social")
        self.assertEqual(x["status"],"detected")
        self.assertEqual(x["mode"]["id"],"free-fire-novela")
        self.assertGreaterEqual(x["confidence"],.5)

    def test_unknown_asks_not_assumes(self):
        x=m.detect(title="Un video que grabé",filename="untitled.mp4")
        self.assertEqual(x["status"],"unknown")
        self.assertIsNone(x["mode"])
        self.assertGreaterEqual(len(x["questions"]),3)

    def test_ambiguous_asks(self):
        x=m.detect(title="Video Free Fire")
        self.assertEqual(x["status"],"ambiguous")
        self.assertIsNone(x["mode"])

    def test_custom_method(self):
        new=m.add_method("Mi Ciencia",["experimento","quimica","laboratorio"],
                         "tiktok","fit","short","educar")
        x=m.detect(title="Experimento de quimica en laboratorio")
        self.assertEqual(x["mode"]["id"],new["id"])
        self.assertEqual(x["mode"]["platform"],"tiktok")

    def test_import_dedup(self):
        folder=Path(self.tmp.name)/"input"
        folder.mkdir()
        (folder/"escena.md").write_text("Un guion completo de prueba.",encoding="utf-8")
        (folder/"duplicado.md").write_text("Un guion completo de prueba.",encoding="utf-8")
        result=m.import_folder(folder)
        self.assertEqual(len(result["added"]),1)
        self.assertEqual(result["duplicates"],1)
        self.assertEqual(m.import_folder(folder)["duplicates"],2)
        catalog=m.read_json(m.CATALOG,{})
        saved=Path(catalog["entries"][0]["path"])
        self.assertTrue(saved.is_file())

    def test_no_overwrite_knowledge(self):
        m.atomic_json(m.KNOWLEDGE,{"custom":"mantener"})
        m.initialize()
        self.assertEqual(m.read_json(m.KNOWLEDGE,{})["custom"],"mantener")

if __name__=="__main__":
    unittest.main()
