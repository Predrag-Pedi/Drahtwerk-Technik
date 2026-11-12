# Schema & Dispo

Erste browserbasierte CAD-Version für den Büro-Bereich. Einstieg über `cad.html` oder die gemeinsame Navigation.

## Bedienung
- Projekt erstellen oder Beispielprojekt öffnen; Änderungen werden in IndexedDB (`drahtwerk-cad`) im aktuellen Browser gespeichert.
- Seiten: Deckblatt, Inhaltsverzeichnis, Elektroschema und Disposition; Nummern, Reihenfolge, Kopien und Titel bearbeiten.
- Symbol auswählen, auf dem Blatt platzieren und mit Auswahl verschieben. Rechts Kennzeichen, Typ, Text, Position und Drehung bearbeiten.
- Verbindungen: Anschluss oder freien Startpunkt anklicken, Zwischenpunkte setzen, am Zielanschluss oder mit Enter abschliessen. An Symbolen befestigte Enden folgen Verschiebungen und Drehungen.
- Dispo: Abmessungen von Schränken, Schienen, Kanälen und Einbaugeräten in mm; Darstellung über den Seitenmassstab. Zeichnungspositionen verwenden Blattkoordinaten.
- Seitenverweise zeigen Zielblatt und Pfad 0–9; Blattnummeränderungen aktualisieren die Verweise.
- Sichern exportiert ein JSON-Projekt; Import legt eine unabhängige Kopie an. SVG exportiert die aktuelle Seite als Vektor. PDF lädt alle Seiten in Projekt-Reihenfolge als A3 quer herunter (gerenderte Rasterseiten).
- Tastatur: V Auswahl, W Verbindung, R Drehen, Entf Löschen, Strg+D Duplizieren, Strg+Z/Strg+Y Rückgängig/Wiederholen, Esc Abbrechen.

## Grenzen
Kein Ersatz für den vollständigen TinLine-Funktionsumfang: vereinfachte Symbolbibliothek, keine Normzertifizierung oder elektrische Prüfung, keine automatische Stromkreis-/Klemmenlistenberechnung, kein DWG/DXF/PDF-Import, kein Hindernisrouting. Bestehende TinLine-Pläne werden nicht automatisch übernommen. Speicherung ist lokal im Browser; JSON-Sicherungen für Gerätewechsel und Datensicherung verwenden. Maximal 200 Seiten und 5000 Zeichnungsobjekte pro Seite beim Import. Grosse PDF-Exporte benötigen entsprechend Browser-Arbeitsspeicher.

## Prüfung
`node --test tests/cad.test.mjs`

Browser-Smoke-Test: Beispiel speichern und nach Neuladen öffnen, Seite anlegen, FI/LS platzieren, Verbindung zeichnen, Undo/Redo, Dispo ansehen, direkter PDF-Download. Die beigefügten Kundenpläne werden nicht als Testdaten im Repository gespeichert.

### Platzierungsvorschau
Beim Einfügen folgt eine halbtransparente Vorschau dem Mauszeiger. Vorschau und Klick verwenden identische Rasterkoordinaten, Abmessungen und Drehungen. R oder die Drehen-Schaltfläche drehen das noch nicht platzierte Symbol. Esc beendet das Werkzeug. Die Vorschau wird beim Verlassen des Blatts ausgeblendet und weder gespeichert noch exportiert. Auf Touch-Geräten wird weiterhin durch Antippen platziert (kein Maus-Hover).

## TinLine-Vorlagenbibliothek
Der Tab **Vorlagen** enthält 1’136 konvertierte Vorlagen aus dem bereitgestellten ZIP: 519 Schema- und 617 Dispo-Vorlagen. Suche umfasst Namen und Ordner; Bereichsfilter trennt Schema und Dispo. Einzeldateien werden erst beim Auswählen geladen.

Die ursprüngliche Geometrie wird als SVG-Vektorgruppe platziert, mit Vorschau am Mauszeiger, Rotation, Kopieren, Undo/Redo und Abmessungen in mm. Dispo-Vorlagen folgen dem Seitenmassstab; Schema-Vorlagen verwenden Blattmillimeter. Breite/Höhe beschreiben die gesamte konvertierte Begrenzung inklusive ursprünglicher Beschriftungen. Sehr grosse Makros müssen passend positioniert oder verkleinert werden. Mindestlinienstärke 0.75 Zeichenpunkte sichert die Lesbarkeit im verkleinerten Massstab.

Vorlagen sind derzeit grafische Gruppen: ursprüngliche Texte (auch BMK-/QV-Platzhalter) sind Vektorpfade und nicht einzeln editierbar. Kennzeichen, Wert und zusätzliche Beschriftung werden ergänzend angezeigt. Es gibt noch keine elektrischen Anschlusspunkte oder automatisch aktualisierten Querverweise innerhalb dieser Vorlagen. Leitungen können mit freien Endpunkten ergänzt werden. Das ist kein allgemeiner DWG-/TinLine-Projektimport.

Die ausgewählte Geometrie wird im Projekt und JSON-Backup eingebettet; spätere Änderungen am Katalog verändern bestehende Projekte nicht. SVG und PDF enthalten die platzierten Vorlagen. Nicht alle 5’209 DWGs des ZIP sind übernommen: ausgewählt wurden die Schema-, Aufbauplan- und eigenen Makroordner, nicht die gesamte Installations-/Herstellerbibliothek.

Konvertierung und Quellen: `tools/tinline/README.md`. Prüfungen: `node --test tests/cad*.test.mjs`.
