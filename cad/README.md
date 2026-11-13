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
Der Tab **Vorlagen** öffnet standardmässig eine visuelle Bibliothek mit 1’136 Bildkacheln, Suche und Schema-/Dispo-Filter. Die Trennkante rechts von der Bibliothek lässt sich ziehen oder mit den Pfeiltasten verschieben. Die Breite wird im Browser gespeichert; je nach Breite erscheinen mehrere Spalten. Vorschaubilder sind komprimierte PNGs in eigenständigen SVG-Dateien; die Zeichnung selbst bleibt vektorbasiert.

### Blatt und Platzierung
A3 quer ist exakt 420 × 297 mm. Der Zeichenbereich endet oberhalb des Schriftfelds. Neue Vorlagen werden innerhalb dieses Bereichs gehalten; zu grosse Vorlagen werden nicht unbemerkt abgeschnitten. Die Mausvorschau verwendet dieselbe Platzierungsfunktion wie der Klick. Dispo-Abmessungen bleiben in realen mm und folgen dem Seitenmassstab.

### Automatische Anschlüsse
84 Schema-Makros enthalten im Original eindeutig benannte Versorgungsleiter auf den TinLine-Sammelschienenhöhen. Diese Anschlüsse werden bei eingeschaltetem **Auto-Anschluss** und Drehung 0° an L1/L2/L3/N ausgerichtet. Die Zuordnung stammt aus den originalen DXF-Layern, nicht aus der Reihenfolge sichtbarer Linien. Die passende Leiterhöhe wird übernommen, auch bei nur L3/N. Beim Verschieben folgen die erzeugten Verbindungsstrecken. Anschlüsse oberhalb der zugehörigen Schiene werden nicht rückwärts verbunden. Im Eigenschaftenbereich kann die Anbindung abgeschaltet werden. SVG/PDF enthalten die Verbindungen.

Vorlagen ohne eindeutig erkannte Versorgungspunkte werden nicht automatisch elektrisch zugeordnet. Für deren Verbindungen bleibt das Verbindungswerkzeug nötig. Es gibt weiterhin kein automatisches Hindernisrouting und keine elektrische Prüfung.

### Gerätekennzeichen
Die Schema-Konvertierung erhält sichtbare BMK-Attribute und Gerätetypen aus ATTDEF bzw. den Original-Symbolcodes als lebende Textfelder. Bei der Platzierung entstehen Kennzeichen aus **Blattnummer + Gerätebuchstabe + Strompfad**, z. B. `10F4`, `10P4`, `10X4`. Bei Verschieben, Blattnummeränderung und Seitenkopien werden diese erneut aus der Position ermittelt. Wiederholungen desselben ursprünglichen BMK innerhalb eines Makros bleiben identisch; mehrere unabhängige Geräte gleicher Klasse im gleichen Pfad erhalten `.2`, `.3` usw. Leiterbezeichnungen L1/L2/L3/N/PE werden nicht umnummeriert. Zusätzliche manuelle Beschriftungen sind weiterhin möglich.

Zielseiten von Querverweisen werden nicht automatisch ermittelt; diese benötigen eine explizite Zielzuordnung. Andere Originaltexte bleiben als Vektorpfade erhalten. Weisse Abdeckflächen werden bei Schema-Vorlagen als weiss erhalten und nicht mehr schwarz eingefärbt.

### Bestehende Projekte
Vorlagen sind in den Projekten eingebettet. Bereits platzierte ältere Grafikvorlagen werden nicht stillschweigend ersetzt. Für die neuen automatischen Kennzeichen und Anschlüsse muss eine ältere Vorlage aus der Bibliothek neu eingesetzt werden; der Eigenschaftenbereich weist darauf hin. JSON-Backup und Import erhalten die neuen Felder.

### Reproduktion und Tests
Konvertierung: `tools/tinline/README.md`. Prüfungen: `node --test tests/cad*.test.mjs`.

### Drahtwerk-Aufbau und Schemaübernahme

Die automatische Dispo übernimmt die physischen Funktionen aus den Schemaseiten.
Normale Abgangsklemmen bleiben im Drahtwerk-Aufbau aus der Dispo ausgeschlossen.
`X0` sowie Texte mit Einspeisung/Zuleitung/Hauptklemme schlagen eine Einspeiseklemme
vor; die Checkbox in der Geräteauswahl kann diese Zuordnung korrigieren. Kontakte
bleiben ihrer Spule zugeordnet und erzeugen kein zusätzliches physisches Gerät.

Die Rahmenplanung unterstützt 250/500/750-mm-Platten, Restspalten von 250 mm,
Geräteplatten neben Zählerplätzen, kurze Gerätezonen sowie anpassbare obere und
untere Zonen. Ohne Bezügersicherungen oder grosse Hauptschalter wird keine untere
Sicherungszone reserviert. Mehrere Felder können individuelle Breiten erhalten;
deren Summe muss der Gesamtbreite entsprechen. Benannte Stromkreisgruppen bleiben
bei der automatischen Feldverteilung zusammen. Ohne eindeutige Gruppennamen bleiben
Geräte im ersten Feld; die Platzprüfung meldet Überfüllung statt Geräte zu verlieren.

Die 2D-Geräte stammen weiterhin aus den zugeordneten Originalvorlagen. Nicht gewählte
Strukturvorlagen werden nicht als neue 2D-Grafiken eingesetzt; ihre räumlichen
Aufbauteile bleiben am Rahmen gespeichert und in 3D sichtbar. Das Löschen des
Rahmens entfernt auch diese integrierte Struktur. Die integrierte Struktur folgt Position und Drehung des Rahmens.

3D zeigt vorbereitete Zählerplätze standardmässig ohne eingesetzten Zähler, mit
Befestigungsschiene, Querträger und Anschlussblock. Die Umschaltung auf eingesetzte
Zähler, PVC-Rückwand, abnehmbare Frontplatten und Rückansicht stehen im Dialog zur
Verfügung. Rundkörper bilden DII/DIII-Sicherungsköpfe ab. Profile, Klemmen,
Anschlussblöcke und Geräte bleiben vereinfachte Planungsmodelle; exakte
Herstellergeometrie, EW-spezifische Anschlussvarianten und Verdrahtung sind noch
nicht hinterlegt. SP-165-Rahmen erfordern weiterhin mindestens 165 mm Tiefe.

Validierung: CAD-Regressionstests inklusive Klemmenfilter, kompakter Anlagen,
ungleicher Felder, gemischter Plattenzonen und Export/Import der 3D-Struktur.
