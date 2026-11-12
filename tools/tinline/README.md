# Rebuild the TinLine vector library

Source: user-provided `TinLine vorlagen.zip`. Original DWG/XML/PNG files are not included in this repository. The catalogue preserves each selected DWG's source path and German XML description (falling back to its filename). IDs are stable within this snapshot.

Selected folders: `Makros/13_Elektroschema`, `Makros/20_Dispositionen`, `Makros/40_Eigene Makros`, `Symbole TinLine/182-Elektroschema`, `Symbole TinLine/182-Elektroschema-Diverse-Hersteller`, `Symbole TinLine/184-Aufbauplan1`, `Symbole TinLine/184-Aufbauplan2`.

The initial conversion used `@mlightcad/libredwg-web@0.8.8` and `ezdxf==1.4.4`. These are offline development dependencies, not shipped browser dependencies. Install them in an isolated development environment; make the Node package resolvable from `convert.mjs` and pass its `wasm/` directory explicitly.

From the repository root:

```sh
python tools/tinline/prepare.py '/path/to/TinLine vorlagen.zip' /tmp/tinline-work
node tools/tinline/convert.mjs /tmp/tinline-work /path/to/node_modules/@mlightcad/libredwg-web/wasm/
python tools/tinline/render.py /tmp/tinline-work cad/templates
node --test tests/cad*.test.mjs
```

Rendering uses modelspace, black/white paths, text outlines, and physical extents. The output is a restricted path schema, not arbitrary SVG/HTML. The renderer catches errors and reported unsupported entities, records excluded entries in `catalog.json`, and does not expose failed entries in the picker. Initial result: 1,136 conversions, zero reported exclusions. A successful conversion does **not** establish that every original CAD entity or font is semantically equivalent: sample visual checks and engineering review remain necessary.

Browser QA covered the 250 × 525 mm custom Dispo plate, a schema contact, mouse preview, placement, persistence after reload and PDF download. Automated tests validate every shipped vector payload and catalogue reference, dimensions, project round trips, independent page copies, escaping, export embedding and minimum display line weight.

Original embedded BMK/QV strings are outlines, not live attributes. Templates are graphic groups, without electrical ports or generated cross-references. Existing project geometry is embedded rather than linked to mutable catalogue files. No conversion code or WASM is downloaded by the web app.

## Semantic enrichment and visual previews (revision 2)
After the original conversion, run:

```sh
python tools/tinline/enrich.py /tmp/tinline-work cad/templates
node tools/tinline/previews.mjs
```

The preview builder requires `sharp` (development only). The schema rebuild retains white WIPEOUT backgrounds, renders existing geometry, and exports visible BMK attributes / ATTDEF defaults as restricted text metadata. It uses the original rendering bounds and transformation matrix so text and geometry stay registered. Phase labels are excluded from renumbering. Named conductor layers at the original supply levels 285/280/275/270 become explicit L1/L2/L3/N ports; unrecognised connections are not guessed. The catalogue records support per template.

The initial paragraphs above describe revision 1. Revision 2 replaces its outlined BMKs in supported schema drawings, while existing embedded project templates retain their original data. Dispo physical dimensions are unchanged. Neither version infers cross-reference destinations or implements a general DWG editor.
