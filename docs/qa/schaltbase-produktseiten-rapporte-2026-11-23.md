# Produktseiten, Werkzeugrechte und Regierapporte – 23.11.2026

## Automatisierte Prüfung

`npm test`: 682 Tests bestanden, keine Fehler. Neue Prüfungen decken Rapportvalidierung, gemeinsame Firmenablage, firmenübergreifende Isolation, Leserechte, CSRF, veraltete Revisionen, serverseitige Unterschriftsmetadaten, unveränderbare unterschriebene Inhalte, Kopien, Abrechnungsstatus, Persistenz und die einmalige Paketmigration ab. Die Werkstatttests prüfen einen normalen Mitarbeiter mit gezieltem Schienen-Schreibrecht sowie EW-Dateiverwaltung mit Schreibrecht. Benutzer-/Firmenverwaltung bleibt für diese Mitarbeiter gesperrt.

## Browserprüfung

Lokaler tatsächlicher Node-Server mit ausschliesslich synthetischen Firmenkonten und Beispieldaten, bedient über den Cloud-Browser. Keine Produktionsdaten geändert. Der QA-Wrapper und seine Sitzungen gehören nicht zum Repository.

- Öffentliches Produktmenü und Detailseiten auf Desktop und 390-px-Vorschau geöffnet; Menü bleibt auf kleinen Bildschirmen bedienbar.
- Dashboard mit Suche: «Rapport» zeigt nur das passende Werkzeug und blendet die leere Werkstattgruppe aus.
- Mitarbeiter mit nur Schienenfreigabe sieht weder Büro-Werkzeuge noch die Büro-Überschrift in Dashboard oder Seitenleiste.
- Derselbe Mitarbeiter bearbeitet die 165-mm-Firmenvorlage und speichert den Abzug; keine Benutzerverwaltung sichtbar.
- Rapport mit Kunde, Ort, 2,5 Stunden Tätigkeit, 24 km, 0,5 Stunden Fahrt und 12 Materialeinheiten erstellt und gespeichert.
- Teststriche auf der Unterschriftsfläche gezeichnet und gespeichert. Der bestätigte Rapport zeigt die gespeicherten Striche, Name, Zeitpunkt und erfassten Stand; Eingabefelder sind danach gesperrt.
- Abrechnungsstatus geändert; zweiter Mitarbeiter mit Leserecht öffnet denselben Rapport ohne Bearbeitungsaktionen.
- CAD-Beispielprojekt im Editor geöffnet; Zeichenfläche und Bedienleisten kontrolliert. Offertenübersicht geprüft und den Kontrast im Kontomenü korrigiert.
- Mobiles Rapportformular bei 390 px ohne horizontalen Überlauf geprüft.
- Druckfunktion baut Tätigkeits-/Materialtabellen, Summen und Unterschrift auf. Browser-Druckdialog liefert die PDF-Ausgabe; kein externer PDF-Dienst.

Die schmale Vorschau prüft das responsive Layout. Eine Prüfung auf physischer iPad-/Touch-Hardware erfolgte nicht.

## Inhaltliche Grundlage

Die Feldstruktur orientiert sich am Schweizer Elektro-Regierapport von EIT Thurgau (Auftrag, Datum, Kunde, Arbeiten, Monteurstunden, Spesen, Material, Abschluss, Unterschrift):
https://www.eit-thurgau.ch/fileadmin/sections/vthei/documents/Elektrofachschule_Kreuzlingen/EI02-Regierapporte_EIT_ueK_4.pdf

Eigenständige Oberfläche und Dokumentgestaltung; keine Logos, Formulare oder Signaturversprechen des Vorlagenanbieters übernommen.

## Bereitstellung

Pull Request übernehmen, auf Infomaniak den Code aktualisieren und die Node-Anwendung neu starten. Schema 4 ergänzt Regierapporte in den Standardpaketen; bestehende Benutzer benötigen die separate Werkzeugfreigabe. Siehe `docs/FIRMENPORTAL.md`. Keine produktive Bereitstellung im Rahmen dieser Prüfung.
