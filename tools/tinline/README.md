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


## Additional libraries (revision 3, 17 November 2026)

The user supplied the complete symbol tree in the linked Drive folder. The observed
path and file-size inventory matches the corresponding members of the previously
uploaded source archive; a downloaded MDT sample also matched byte for byte.
`extend.py` can restrict input to that inventory (`path`, `size` fields). Keep the
inventory and the original archive outside the repository. Internal support folders
`ZZ01`, `tinData`, and `tinContact` are not independent picker entries.

Run these steps **instead of rebuilding the old snapshot** to preserve original IDs
and engineering corrections:

```sh
python tools/tinline/extend.py '/path/to/TinLine vorlagen.zip' /tmp/tinline-extra /path/to/drive-inventory.json
node tools/tinline/convert.mjs /tmp/tinline-extra /path/to/node_modules/@mlightcad/libredwg-web/wasm/
python tools/tinline/render.py /tmp/tinline-extra /tmp/tinline-rendered
python tools/tinline/enrich.py /tmp/tinline-extra /tmp/tinline-rendered
python tools/tinline/compact.py /tmp/tinline-rendered
python tools/tinline/merge.py /tmp/tinline-rendered
```

Then run `details.py WORKDIR NEW_ID ...` with the new IDs from the extension catalog
(to extract editable text and conservative conductor ends), then `python tools/tinline/embed-details.py`, followed by
`node --test tests/cad*.test.mjs`. `details.py` merges its results into the existing
`template-details.json`; the embed step moves extension records into their own lazy-loaded template JSON files to keep startup payload unchanged. Filled glyph paths are never compacted, preserving their
text-replacement hashes. Consecutive unfilled strokes are only compacted if a drawing
would exceed the existing 15,000-path validation budget; paint order and absolute
path coordinates are preserved.

This extension prepared 3,182 drawings and accepted 3,149; 33 are excluded with
explicit reasons in `catalog.json`. All previous 1,136 entries remain unchanged.
Display names come from XML descriptions and type codes, while all original names
and source paths remain searchable. Fachbereich/Hersteller/Funktionsgruppe are
computed in `cad/library.mjs`; no original IDs are renamed. Preview images are now
rendered lazily from the same restricted JSON geometry as the canvas.
