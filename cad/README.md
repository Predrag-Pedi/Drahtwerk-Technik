# Schema & Dispo

Erste browserbasierte CAD-Version für den Büro-Bereich. Einstieg über `cad.html` oder die gemeinsame Navigation.

## Bedienung
- Projekt erstellen oder Beispielprojekt öffnen; Änderungen werden in IndexedDB (`drahtwerk-cad`) im aktuellen Browser gespeichert.
- Seiten: Deckblatt, Inhaltsverzeichnis, Elektroschema und Disposition; Nummern, Reihenfolge, Kopien und Titel bearbeiten.
- Symbol auswählen, auf dem Blatt platzieren und mit Auswahl verschieben. Rechts Kennzeichen, Typ, Text, Position und Drehung bearbeiten.
- Verbindungen: Anschluss oder freien Startpunkt anklicken, Zwischenpunkte setzen, am Zielanschluss oder mit Enter abschliessen. An Symbolen befestigte Enden folgen Verschiebungen und Drehungen.
- Dispo: Abmessungen von Schränken, Schienen, Kanälen und Einbaugeräten in mm; Darstellung über den Seitenmassstab. Zeichnungspositionen verwenden Blattkoordinaten.
- Der Dispo-Massstab bleibt beim automatischen Erzeugen und beim Wechsel des Aufbausystems (z. B. Smissline ↔ Standard) erhalten. Neue Seiten starten bei 1:10; Änderungen erfolgen manuell unter **Massstab 1 :**. Die automatische Schrankdimensionierung passt weiterhin die realen Schrankmasse an, ohne den Seitenmassstab zu ändern.
- Seitenverweise zeigen Zielblatt und Pfad 0–9; Blattnummeränderungen aktualisieren die Verweise.
- Sichern exportiert ein JSON-Projekt; Import legt eine unabhängige Kopie an. SVG exportiert die aktuelle Seite als Vektor. PDF lädt alle Seiten in Projekt-Reihenfolge als A3 quer herunter (gerenderte Rasterseiten).
- Tastatur: V Auswahl, W Verbindung, R Drehen, Entf Löschen, Strg+D Duplizieren, Strg+Z/Strg+Y Rückgängig/Wiederholen, Esc Abbrechen.

## Grenzen
Kein Ersatz für den vollständigen TinLine-Funktionsumfang: keine Normzertifizierung oder elektrische Prüfung, keine automatische Stromkreis-/Klemmenlistenberechnung, kein DWG/DXF/PDF-Import, kein Hindernisrouting. Bestehende TinLine-Pläne werden nicht automatisch übernommen. Speicherung ist lokal im Browser; JSON-Sicherungen für Gerätewechsel und Datensicherung verwenden. Maximal 200 Seiten und 5000 Zeichnungsobjekte pro Seite beim Import. Grosse PDF-Exporte benötigen entsprechend Browser-Arbeitsspeicher.

## Prüfung
`node --test tests/cad*.test.mjs`

Browser-Smoke-Test: Beispiel speichern und nach Neuladen öffnen, Seite anlegen, FI/LS platzieren, Verbindung zeichnen, Undo/Redo, Dispo ansehen, direkter PDF-Download. Die beigefügten Kundenpläne werden nicht als Testdaten im Repository gespeichert.

### Platzierungsvorschau
Beim Einfügen folgt eine halbtransparente Vorschau dem Mauszeiger. Vorschau und Klick verwenden identische Rasterkoordinaten, Abmessungen und Drehungen. R oder die Drehen-Schaltfläche drehen das noch nicht platzierte Symbol. Esc beendet das Werkzeug. Die Vorschau wird beim Verlassen des Blatts ausgeblendet und weder gespeichert noch exportiert. Auf Touch-Geräten wird weiterhin durch Antippen platziert (kein Maus-Hover).

## TinLine-Vorlagenbibliothek
Der Tab **Vorlagen** öffnet standardmässig eine visuelle Bibliothek mit 4’291 Bildkacheln, Suche sowie Filter für Schema/Dispo, Fachbereich, Hersteller und Funktion. Die Trennkante rechts von der Bibliothek lässt sich ziehen oder mit den Pfeiltasten verschieben. Die Breite wird im Browser gespeichert; je nach Breite erscheinen mehrere Spalten. Vorschaubilder werden bei Bedarf aus den geprüften Vektordaten erzeugt. 3’149 weitere Vorlagen wurden ergänzt; 33 nicht vollständig konvertierbare Dateien sind im Katalog und im [Importbericht](../docs/cad-tinline-basics.md) ausgewiesen.

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


### Manuelle Zeichenwerkzeuge (17.11.2026)

- **Objektfang**: Dispo-Geräte und Rahmen rasten beim Platzieren und Verschieben an benachbarten Kanten oder Mittellinien ein. Hilfslinien zeigen die Ausrichtung. Alt unterdrückt den Fang beim Ziehen; die Checkbox schaltet ihn dauerhaft ab.
- **Rahmen**: Breite/Höhe in realen Millimetern eingeben, anschliessend den Rahmen auf dem Blatt platzieren. Massstab und bestehende Schrankdarstellung bleiben erhalten.
- **Mass**: Zwei Messpunkte und anschliessend die Lage der Masslinie anklicken. Ecken und Kantenmitten werden gefangen; horizontal/vertikal ist automatisch oder manuell wählbar. Der Wert berücksichtigt den Dispo-Massstab. Messobjekte sind unabhängig, nicht an Geräte gebunden; nach Geräteänderungen neu bemassen.
- **Verbindung**: Ein bis fünf getrennte Leiter mit wählbarem Abstand (Blatt-mm). Rechtwinklige Knicke erscheinen bereits in der Vorschau; Tab oder die Knick-Schaltfläche wechselt die Richtung. Zu enge oder rückwärts laufende Bögen und Leiter ausserhalb des Zeichenbereichs werden abgewiesen. Vorhandene Anschlussreferenzen bleiben erhalten. Ein Leitungszug ist eine gemeinsame Undo-Aktion, nach dem Zeichnen bleiben Leiter einzeln bearbeitbar.
- **Schema-Vorlagen skalieren**: Symbolgrösse in Prozent oder «Symbol aufs Blatt einpassen» vor dem Platzieren; damit sind auch grosse Installationssymbole nutzbar. Dispo-Vorlagen behalten ihre echten Abmessungen.

Noch nicht enthalten: automatisch aufgetrennte Leitungen beim Einsetzen eines Geräts in die Mitte einer bestehenden Leitung, assoziative Bemassung, Hindernisrouting, externe Schema-PDF → Dispo sowie eine Lizenz-/Produkttrennung in Lite/Pro. Die vorhandene automatische Dispo aus dem eigenen Projekt bleibt verfügbar.

### Kleine Apparateplatten

Unter **Vorlagen → Dispo → Platten DW** stehen 1er-, 2er- und 3er-Platten
mit 250 oder 500 mm Breite zur Verfügung. Die Höhen sind 150, 275 und 400 mm.
Suche nach `1er`, `2er`, `3er` oder beispielsweise `500x275`.
Die sechs ergänzten Drahtwerk-Konstruktionen verwenden das vorhandene
125-mm-Reihenraster und 216 × 46 mm grosse Ausschnitte (500 mm: zwei
getrennte Ausschnitte je Reihe). Sie werden mit echten Millimetermassen
platziert. Die ursprünglichen 4er-Vorlagen mit 525 mm Höhe bleiben unverändert.

Reproduktion: `node tools/generate-dw-plates.mjs`. Der Generator aktualisiert
nur seine sechs eigenen IDs und zählt sie getrennt von importierten Vorlagen.


### Schema-Assistenten und Dispo-Einfügepunkte

- Neue Dispos starten mit **1:10**. Aufbauwechsel behalten den Massstab. Ein manueller Wechsel skaliert auch Positionen, Leitungen und Bemassungen gemeinsam; Gerätemasse bleiben reale Millimeter. Zoomen verändert nur die Ansicht.
- Dispo-Einfügepunkt: unten links, unten rechts, oben links, oben rechts oder Mitte; **Tab** wechselt während des Platzierens. Mit Objektfang bleiben passende Platten innerhalb des gewählten Rahmens und rasten an benachbarten Kanten ein. SBR-Rahmen berücksichtigen die beiden 4-mm-Seitenprofile.
- **Kontakte / Belegung**: am Schütz oder Relais Schliesser, Öffner und Wechsler mit Anschlüssen und Funktionstext konfigurieren. Freie Kontakte platzieren, belegte Kontakte direkt öffnen. Ein Anschluss darf pro Gerät nur einmal verwendet werden. Kopierte externe Kontakte müssen neu zugeordnet werden; eine zusammen kopierte Spule mit Kontakten bildet einen unabhängigen Stromkreis.
- **Klemmen**: Leiste, Startnummer, Anzahl, Beschriftungen und Abstand eingeben. Ein ausgewähltes natives Symbol kann automatisch mit seinen unteren Anschlüssen verbunden werden. Einzelne Klemmennummern sind rechts editierbar; beim Kopieren werden freie Nummern verwendet. Eingebettete Klemmen innerhalb importierter Makros werden nicht automatisch interpretiert oder verdoppelt.
- **Auswertungen**: Geräteliste, Klemmenliste, Kontakt-Belegung und Messprotokoll-Vorlage als CSV für Excel. Tatsächliche Messwerte bleiben leer.
- **PDF**: alle, aktuelle, Schema-, Dispo- oder einzeln gewählte Seiten exportieren. Seiten erhalten Lesezeichen; Querverweise zu enthaltenen Seiten bleiben anklickbar.

Aktor-/KNX-Kontakte können manuell einer Gerätefunktion zugeordnet werden. Herstellerabhängige Kanalbelegungen und Gerätekatalogdaten werden nicht automatisch erschlossen. Weitere Abgrenzungen und Prüfungen: [Video-Abgleich](../docs/cad-tinline-workflow.md).


### Aufbau einfügen wie im Vorgabevideo

Auf einer Dispo-Seite stehen unter **Zeichnen** die vier direkten Werkzeuge **Rahmen**, **Schrank**, **Kanal** und **Schiene**. Alle öffnen denselben Aufbauassistenten mit Bauteilauswahl links, bemasster Vorschau und Millimetereingaben. Die Vorschau aktualisiert sich beim Eingeben. Bei Rahmen und Schrank sind Randabstände einstellbar; beim Schrank zusätzlich der Sockel. Der Innenraum wird aus den Aussenmassen, Rändern und dem Sockel berechnet.

**Einsetzen** hängt das Teil an den Mauszeiger. Klicken platziert es, weitere Klicks setzen gleiche Teile; **R** dreht, **Tab** wechselt den Einfügepunkt und **Esc** beendet. Kabelkanal und Montageschiene können bereits im Assistenten waagrecht oder senkrecht gewählt werden. Der Seitenmassstab bleibt erhalten. Ungültige Masse oder ein durch Ränder/Sockel aufgebrauchter Innenraum werden abgewiesen.

Ein platziertes Teil auswählen und rechts **Aufbau bearbeiten** wählen, um denselben Assistenten zur Änderung zu öffnen. Die Parameter bleiben beim Speichern/Importieren erhalten und gelten auch für SVG/PDF und die 3D-Geometrie. Schränke sind frei bemasste Gehäuse; konkrete Herstellerartikel bleiben in der Originalvorlagenbibliothek.
