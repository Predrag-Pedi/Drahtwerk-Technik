# Makroauswahl, Kabel und Abgangname – 19.11.2026

Kompakte Auswahl im linken Makrobereich für Bemessungsstrom, Charakteristik, Fehlerstrom und Klemmenkennzeichnung. Abgangnamen werden vor der Platzierung eingegeben. «Grösse / Blatt prüfen» wurde aus diesem Bereich entfernt; die vorhandene Zeichenleistenfunktion zum Einpassen bleibt für zu grosse Schema-Vorlagen erreichbar.

## Kabelzuordnung

Die übergebene Drahtwerk-Tabelle ist als explizite Zuordnung hinterlegt (keine allgemeine Strombelastbarkeitsberechnung). 13 A ergibt 1.5 mm² Kabel und mindestens 2.5 mm² Klemmen; 20 A ergibt 4 mm²; 63 A ergibt 16 mm². Für Werte ohne Tabellenzeile, beispielsweise 50 A, wird keine Querschnittsgrösse erfunden. Der Nutzer erhält einen Hinweis zur manuellen Anpassung. Die Steuerstromzeile unter 8 A gilt nur bei als Steuersicherung/Steuerabgang bezeichneten Vorlagen.

Kabeltyp, Aderzahl und Schreibweise bleiben erhalten. Eingaben wie TT 3G10mm² und FE0 5x10mm2 werden erkannt. Eine manuelle Kabeländerung bleibt bei späteren Stromänderungen erhalten, bis «Automatisch» gewählt wird. Die Klemmen folgen dem erkannten Querschnitt, aufgerundet auf die nächste hinterlegte Klemmengrösse ab 2.5 mm². Datenleitungen mit Drahtdurchmesser, beispielsweise G51 2x2x0.8mm, werden nicht als Leistungskabel umgeschrieben. Bei nicht eindeutig zuordenbaren Sicherungen bleibt die Kabelangabe manuell.

## Prüfung

- Gesamte CAD-Testsuite: 434 Tests bestanden. Zehn neue Tests prüfen die Tabelle, manuelle Übersteuerung, Klemmenminimum, Mehrfachabgänge, Datenleitungen, Speicherung, Kopieren, Export und spätere Textbearbeitung.
- Alle 106 Original-Schema-Makros durchlaufen Erzeugung und Projektvalidierung mit den neuen Vorgaben. Dies ist eine Daten- und Funktionsprüfung, keine vollständige elektrische Prüfung jedes Makros.
- Live-Browser: FI/LS 13 A → 20 A → 4 mm² Kabel / Klemmen; manuell TT 3G10mm² → 63 A behält 10 mm²; «Automatisch» ergibt TT 3G16mm²; zurück auf 13 A ergibt 1.5 / 2.5 mm².
- 50 A zeigt den fehlenden Tabellenwert an; der gewählte zusätzliche Wert bleibt im eingeklappten Auswahlbereich lesbar.
- Entwurf bleibt beim Wechsel zwischen FI/LS-13-A- und FI/LS-16-A-Vorlage erhalten.
- Abgangname «Küche – Steckdosen» mit 20 A / 4 mm² auf Strompfad eingesetzt, gespeichert und erneut geöffnet. Name erscheint genau einmal. Doppelklick öffnet den Texteditor mit dem gespeicherten Namen.
- «Werkstatt – Steckdosen» mit manuell 10 mm² frei platziert; Name, Kabel und Klemmengrösse übernommen. Daneben automatisch konfigurierten 20-A-Abgang per Pfadwahl eingesetzt.
- Klemmenkennzeichnung oben/unten über Auswahlknöpfe; die vorhandene Markerfunktion verändert nur den Balken, die Geometrie bleibt unverändert (auch im Test abgesichert).
- WZU Contactless: Stromänderung lässt G51 2x2x0.8mm und 2.5-mm²-Klemmen unverändert.
- Bei 1363 × 938 Pixeln und 320 Pixel breiter Seitenleiste sind die üblichen FI/LS-Felder einschliesslich Oben/Unten ohne Scrollen erreichbar. Weitere Werte und Texte lassen sich aufklappen. Die Pfadwahl bleibt unten sichtbar.

