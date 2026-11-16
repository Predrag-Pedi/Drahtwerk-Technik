# Tarifdrähte zwischen RSE und Zählern

Im Schema zeigt die Auswahl eines Zählers oder einer RSE-Vorlage rechts den Bereich **Tarifdrähte / RSE-Verweise**.

- Am Zähler wird für jeden der beiden Anschlüsse der RSE und dessen Leiter (0–5) gewählt.
- Beim RSE lassen sich unter jedem Ausgang einzelne Zähleranschlüsse hinzufügen oder entfernen. Bereits zugeordnete Eingänge sind im Auswahltext ausdrücklich als Ersetzung markiert.
- Ausgang 0 (Steuerneutralleiter) wird ebenfalls ausdrücklich zugeordnet. Es gibt keine automatische Verbindung aufgrund räumlicher Nähe oder eines Musterverweises.
- Die bestehende, pro RSE editierbare Legende liefert die Bezeichnungen der Ausgänge.
- Ein Ausgang kann mehrere Zähler versorgen. Jeder Zielanschluss hat einen eigenen klickbaren Blatt/Strompfad-Verweis. Im Editor wird das Zielgerät ausgewählt, im PDF dessen Schemaseite geöffnet.
- Verschieben und Umnummerieren ändern die Verweise automatisch. Beim Kopieren einer ganzen Seite werden interne Quellen auf die Kopien umgebogen; externe Quellen bleiben erhalten. Gelöschte Quellen erscheinen im Inspector als fehlend und werden nicht automatisch durch andere Geräte ersetzt.

## Vorlagen und Darstellung

Geprüft wurden die Originaltexte/Anschlusspunkte von `235_RSE` (tl-0014) und `200_Zähler`, `220_Zähler_Zusatzabgänge_3LN`, `225_Zähler_2`, `230_Zähler_Zusatzabgänge_WZU` (tl-0007/0011/0012/0013), die mitgelieferten Screenshots sowie ein RSE-Referenzschema aus dem Vorlagenordner (Tarifapparate-Steuerung, Blatt 200, Zeichnung 2409007-02-HVN1/02-11).

Die Tarifnummer steht weiterhin am vorhandenen Draht; daneben steht der dynamische Blatt/Strompfad-Verweis. Die Bibliotheks-Musterwerte `1.2`/`10.7` werden ausgeblendet, auch solange noch kein Ziel zugeordnet ist. Die Originalgeometrie und Bibliotheksdateien bleiben unverändert. Bei mehreren Zielen werden einzelne Verweise nebeneinander gesetzt und bei Bedarf umgebrochen. Die Geräte-BMK ist im Editor über den Verweis-Titel und in der Zuordnungsliste ersichtlich.

Diese Zuordnung gilt für die oben genannten Makros mit den tatsächlich gezeichneten Tarifanschlüssen. Die elf Legendenzeilen erzeugen keine zusätzlichen physischen RSE-Ausgänge. Einzelne Gerätesymbole, Smart-Me-Schnittstellen und andere Makros ohne diese geprüften Anschlusspunkte werden nicht automatisch als Tarifanschlüsse interpretiert.

## Prüfung

`node --test tests/cad-*.test.mjs`: 285 Tests erfolgreich, darunter acht neue Prüfungen für Zuordnung, mehrere Ziele, Löschen, Speichern, Seitenkopien, Umnummerieren, originale Mustertexte, Inspector-Aktionen und PDF-Zielattribute. Schema-SVGs mit RSE und drei Zählern wurden gerastert und visuell geprüft. Ein vollständiger interaktiver Browser-/PDF-Viewer-Test steht noch aus.
