import unittest
import os
import re
import urllib.request

REPO_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class TestRepositoryFiles(unittest.TestCase):
    def test_required_files_exist(self):
        required = ["index.html", "style.css", "script.js", "README.md", "AGENTS.md"]
        for fname in required:
            fpath = os.path.join(REPO_DIR, fname)
            self.assertTrue(os.path.isfile(fpath), f"File {fname} is missing")
            self.assertGreater(os.path.getsize(fpath), 50, f"File {fname} is too small or empty")

class TestHtmlDomIntegrity(unittest.TestCase):
    def setUp(self):
        with open(os.path.join(REPO_DIR, "index.html"), "r", encoding="utf-8") as f:
            self.html = f.read()
        with open(os.path.join(REPO_DIR, "script.js"), "r", encoding="utf-8") as f:
            self.js = f.read()

    def test_leaflet_assets_present(self):
        self.assertIn("leaflet.css", self.html, "Leaflet CSS link is missing in index.html")
        self.assertIn("leaflet.js", self.html, "Leaflet JS script is missing in index.html")
        self.assertIn('id="map"', self.html, "Map container <div id='map'> is missing")

    def test_dom_ids_matching_script(self):
        referenced_ids = set(re.findall(r"document\.getElementById\(['\"]([^'\"]+)['\"]\)", self.js))
        self.assertGreater(len(referenced_ids), 0, "No element IDs found in script.js")
        
        for elem_id in referenced_ids:
            pattern = f'id="{elem_id}"'
            self.assertIn(pattern, self.html, f"DOM Element with id='{elem_id}' referenced in script.js is missing in index.html")

class TestJavaScriptIntegrity(unittest.TestCase):
    def setUp(self):
        with open(os.path.join(REPO_DIR, "script.js"), "r", encoding="utf-8") as f:
            self.js = f.read()

    def test_tile_layers_defined(self):
        expected_layers = ["standard", "satellite", "hybrid", "terrain", "dark"]
        for layer in expected_layers:
            self.assertIn(f"{layer}:", self.js, f"Layer '{layer}' is not defined in script.js")

    def test_tile_url_templates(self):
        urls = re.findall(r"https?://[^\s'\"]+\{z\}/\{x\}/\{y\}[^\s'\"]*", self.js)
        self.assertGreaterEqual(len(urls), 3, "Tile URL templates with {z}/{x}/{y} must be present")

    def test_balanced_braces(self):
        open_b = self.js.count('{')
        close_b = self.js.count('}')
        self.assertEqual(open_b, close_b, f"Unbalanced braces in script.js: {open_b} open vs {close_b} close")

class TestCssIntegrity(unittest.TestCase):
    def setUp(self):
        with open(os.path.join(REPO_DIR, "style.css"), "r", encoding="utf-8") as f:
            self.css = f.read()

    def test_core_classes_present(self):
        core_classes = [".search-container", ".layers-container", ".map-controls", ".place-card", ".status-bar", ".measure-banner"]
        for cls in core_classes:
            self.assertIn(cls, self.css, f"Core class '{cls}' is missing in style.css")

    def test_balanced_css_braces(self):
        open_b = self.css.count('{')
        close_b = self.css.count('}')
        self.assertEqual(open_b, close_b, f"Unbalanced braces in style.css: {open_b} open vs {close_b} close")

class TestTileEndpointsAvailability(unittest.TestCase):
    def test_tile_servers_respond(self):
        test_tiles = [
            ("CartoDB Voyager", "https://a.basemaps.cartocdn.com/rastertiles/voyager/0/0/0.png"),
            ("Esri World Imagery", "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/0/0/0"),
            ("CartoDB Dark Matter", "https://a.basemaps.cartocdn.com/dark_all/0/0/0.png")
        ]
        headers = {"User-Agent": "MriyaMapTests/1.0"}
        for name, url in test_tiles:
            req = urllib.request.Request(url, headers=headers)
            try:
                with urllib.request.urlopen(req, timeout=5) as resp:
                    self.assertEqual(resp.status, 200, f"Tile server {name} returned status {resp.status}")
            except Exception as e:
                self.fail(f"Tile server {name} failed: {e}")


class TestPolygonTools(unittest.TestCase):
    def setUp(self):
        with open(os.path.join(REPO_DIR, "index.html"), "r", encoding="utf-8") as f:
            self.html = f.read()
        with open(os.path.join(REPO_DIR, "script.js"), "r", encoding="utf-8") as f:
            self.js = f.read()
        with open(os.path.join(REPO_DIR, "style.css"), "r", encoding="utf-8") as f:
            self.css = f.read()

    def test_polygon_controls_are_present_and_wired(self):
        required_ids = [
            "areaDrawBtn", "finishAreaBtn", "clearAreaBtn", "polygonCard",
            "copyPolygonBtn", "pastePolygonBtn", "polygonRotateSlider",
            "polygonScaleSlider", "deletePolygonBtn", "cancelPasteBtn"
        ]
        for elem_id in required_ids:
            self.assertIn(f'id="{elem_id}"', self.html, f"Missing polygon control: {elem_id}")
            self.assertIn(f"getElementById('{elem_id}')", self.js, f"Unwired polygon control: {elem_id}")

    def test_polygon_drawing_requires_three_points_and_can_close(self):
        self.assertIn("areaDrawPoints.length < 3", self.js)
        self.assertIn("finishPolygonDrawing()", self.js)
        self.assertIn("addAreaDrawPoint(e.latlng)", self.js)

    def test_polygon_transform_copy_and_paste_are_implemented(self):
        for behavior in [
            "computeTransformedLatLngs", "poly.rotation", "poly.scale",
            "copySelectedPolygon", "pastePolygonAt", "setPasteMode(true)"
        ]:
            self.assertIn(behavior, self.js, f"Missing polygon behavior: {behavior}")

    def test_polygon_controls_have_responsive_styles(self):
        self.assertIn(".polygon-card", self.css)
        self.assertIn(".area-banner", self.css)
        self.assertIn("@media (max-width: 600px)", self.css)

if __name__ == "__main__":
    unittest.main()


class TestSatelliteAndImageryTerritoryFeatures(unittest.TestCase):
    def setUp(self):
        with open(os.path.join(REPO_DIR, "index.html"), "r", encoding="utf-8") as f:
            self.html = f.read()
        with open(os.path.join(REPO_DIR, "script.js"), "r", encoding="utf-8") as f:
            self.js = f.read()
        with open(os.path.join(REPO_DIR, "style.css"), "r", encoding="utf-8") as f:
            self.css = f.read()

    def test_satellite_is_default_layer(self):
        self.assertIn("activeLayerKey = 'satellite'", self.js, "Default activeLayerKey must be 'satellite'")
        self.assertIn("crossOrigin: 'anonymous'", self.js, "Satellite tileLayer must declare crossOrigin anonymous")

    def test_quick_chips_removed_from_dom(self):
        self.assertNotIn('<div class="quick-chips">', self.html, "Quick location chips must be removed from index.html")

    def test_satellite_territory_imagery_overlay(self):
        self.assertIn("TerritoryOverlay", self.js, "TerritoryOverlay class must be defined")
        self.assertIn("capturePolygonImagery", self.js, "capturePolygonImagery function must be defined")
        self.assertIn("polygonOpacitySlider", self.js, "polygonOpacitySlider must be wired in script.js")
        self.assertIn('id="polygonOpacitySlider"', self.html, "polygonOpacitySlider must be present in index.html")
        self.assertIn(".territory-overlay-canvas", self.css, ".territory-overlay-canvas style must be defined")

    def test_polygon_closure_enhancements(self):
        self.assertIn("latLngToContainerPoint", self.js, "Closing detection must calculate screen container point distance")
        self.assertIn("dblclick", self.js, "Double-click polygon closing must be supported")
        self.assertIn("e.key === 'Enter'", self.js, "Enter key polygon closing must be supported")
