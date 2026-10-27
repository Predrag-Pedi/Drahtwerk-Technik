# Wärmeberechnung

Neue Kachel auf der Startseite, Einstieg: `waermeberechnung.html`. Statische Browser-Anwendung ohne Server oder API-Schlüssel. Original-Excel und Kunden-PDFs werden bewusst nicht im öffentlichen Repository gespeichert.

## Verwendung

1. Ursprüngliche Drahtwerk-XLSX-Vorlage auswählen (nicht einen Webapp-Export).
2. Schema und Dispo gemeinsam oder nacheinander auswählen; die Importart wird je Datei erkannt. Separate Dispos haben Vorrang. Mehrere zusammengehörige Anlagen eines Auftrags gemeinsam importieren und auswerten. Textbasierte TinLine-Schemas werden anhand von Betriebsmittelkennzeichen und Beschriftungen gelesen. Dispo liefert explizit beschriftete Abmessungen; Scan/OCR und rein grafische Geräteerkennung sind nicht enthalten.
3. Projektdaten und Geräte prüfen. Anschluss-/Umgebungsbedingungen werden übersprungen. Die Quelle jeder erkannten Geräteposition bleibt sichtbar. Fehlende/mehrdeutige Artikel manuell zuordnen; zusätzliche Geräte, Einspeisung und Zubehör ergänzen.
4. Bis zu fünf Felder mit Typ und Massen erfassen. SBR nutzt TAL/MT, ARS/GZK das andere Max.-Pv-Blatt. Pro Feld Schätzung (Max. Pv × Einbaugrad), erfasste Geräte oder manuelle Wattzahl wählen.
5. Prüfung bestätigen, Excel erstellen und über den angebotenen Speicherlink herunterladen. In Excel öffnen und neu berechnen lassen.

Hager ist die Referenz für FI/LS und LS ohne Smissline. Bei erkanntem Smissline-Hinweis oder manueller Auswahl werden ausschliesslich Smissline-Kandidaten angeboten. Mehrere passende Hager-Baureihen erfordern eine Auswahl. Fehlende Daten werden nicht mit null Watt gleichgesetzt. Die Gerätemethode wertet die arithmetischen Formeln der Vorlage bis F739 aus, mit getrennten Mengen je Feld. Geteilte Formeln werden aufgelöst. Unterstützt werden Zellbezüge, einspaltige Bereiche, SUM und Grundrechenarten; unbekannte Formeln führen zu einer Fehlermeldung. Die nachgewiesene doppelte Smissline-Zählung in F727 wird im Arbeitsspeicher und Export korrigiert.

Die Max.-Pv-Gleichungen bilden die bestehende Vorlage ab; dies ist keine neue normative Bewertung der Berechnungsmethode. Bei mehreren Feldern enthalten die ursprünglichen Rechenblätter die Abmessungen des ersten Felds ihrer Bauart, die Feld-Totalwerte jedoch alle Felder. Das zusätzliche Blatt `Webapp Eingaben` dokumentiert alle Feldmasse, Methoden und Gerätequellen.

## Export

JSZip liest und patcht OOXML direkt, damit Bilder, Druckeinstellungen, Formatierung, Beziehungen und nicht betroffene Formeln erhalten bleiben. Mengen werden in Spalte A der Artikelzeile geschrieben; die Feldwerte gehen nach `F746:F750` sowie in die jeweiligen Max.-Pv-Feldsummen. Projektdaten `D32` wird von `E748` auf `F748` korrigiert. Ort/EW verwendet einen exakten Lookup. Veraltete Formel-Caches und die Berechnungskette werden entfernt; Excel berechnet beim Öffnen neu. Keine Berechnung in einer nativen Excel-Installation wurde automatisiert.

Externe, fest versionierte Bibliotheken: JSZip 3.10.1 und PDF.js 4.10.38 über jsDelivr. Dafür ist eine Internetverbindung erforderlich. Dokumentinhalte bleiben im Browser. Die Originalvorlage wird in IndexedDB nur auf diesem Gerät/Browser gespeichert. Sie kann ersetzt oder gelöscht werden. Browserdaten löschen entfernt sie ebenfalls. PDFs und bearbeitete Projektdaten bleiben nur in der aktuellen Sitzung.

## Tests

`node --test tests/*.test.mjs`

Zusätzliche Integrationsprüfung mit bereitgestelltem PDF und Originalvorlage: Dimensionen, Stadt, 160-A-Angabe, 24 FI/LS-Abgänge sowie Artikelzuordnung und Excel-Export. Kundenunterlagen sind keine öffentlichen Test-Fixtures.

## Mehrere Anlagen und Felder

Die Anlagenübersicht trennt zusammengehörige Schemaabschnitte anhand ihrer Dispos und Namen. Eine separate Dispo hat Vorrang vor eingebetteten Kundendispos; ohne separate Dispo gelten die eingebetteten Masse. Erkannte Schrankbezeichnungen, Hausbezeichnungen und Dispotitel dienen zur Gruppierung. Unbekannte reine Schema-Dateien bleiben zur manuellen Zuordnung offen. Die verwendete Dispo ist pro Anlage sichtbar. Nach weiteren Imports ist eine erneute Auswertung nötig; bis dahin ist der Export blockiert. Eine Neuauswertung ersetzt manuelle Änderungen, deshalb Unterlagen vor der Bearbeitung vollständig importieren.

Breitenangaben wie `B1758/758x H1600x T165mm` ergeben zwei Felder. Rein grafische Massbeschriftungen werden konservativ als Vorschlag übernommen; fehlende Tiefe bleibt leer. Bei zwei Feldern können eindeutige Massbeschriftungen und Gerätepositionen der bevorzugten Dispo eine Feldzuordnung vorschlagen. Sonst bleibt «Bitte zuordnen» stehen. Mehr als zwei Felder können angelegt werden; ihre Gerätezuordnung erfolgt manuell. Pro Anlage maximal fünf Felder entsprechend der Vorlage. Geräte werden nur innerhalb derselben Anlage dedupliziert. Das ist eine regelbasierte Erkennung textbasierter Pläne, keine allgemeine CAD-/OCR-Erkennung.

Jede Anlage muss separat geprüft werden. Der Sammel-Export prüft alle Anlagen vor der Dateierzeugung und bietet einzelne XLSX-Dateien sowie ein ZIP. Fehlende Masse, offene Feldzuordnungen, ungeprüfte Anlagen und ausstehende Imports verhindern den Export. Native Excel-Neuberechnung und iPad-Safari-Dateispeicherung müssen zusätzlich am Zielgerät geprüft werden.

Geprüft mit den bereitgestellten Unterlagen: Puurehuus ergibt drei Anlagen mit 2/1/1 Feldern, Decathlon zwei Anlagen mit 2/1 Feldern, Dufour eine Anlage mit einem Feld. Originalunterlagen bleiben ausserhalb des Repositories. Der Browser-Integrationstest in `tests/export-browser.html` prüft zusätzlich drei unabhängige Arbeitsmappen im ZIP, Feldwerte, Formatvorlagen und eingebettete Bilder.

## Getrennte Schema-/Dispo-Dateien

Die Dateierkennung lässt Geräteseiten auch dann zu, wenn eine ältere Oberfläche beim Import die Rolle «Dispo» mitgegeben hat. Reine Dispo-Dateien werden anhand ihres Inhalts erkannt und gegenüber eingebetteten Dispos priorisiert. Unterschiedlich benannte Schema-/Dispo-Gruppen können über gemeinsame Projekt-/Dateinamenmerkmale und mindestens drei übereinstimmende Gerätekennzeichen zusammengeführt werden. Widersprechende Hausbezeichnungen oder mehrere mögliche Ziele verhindern die automatische Zusammenführung. Für diese Fälle gibt es eine manuelle Anlagen-Zusammenführung.

Weitere Imports werden automatisch gemeinsam ausgewertet, solange noch keine Eingaben bearbeitet wurden. Bereits bearbeitete Daten werden erst durch explizites Neuauswerten ersetzt. Gerätekennzeichen mit Punkt-Unterpositionen werden berücksichtigt. Eine dritte H-Angabe in einer B/H/H-Masskette wird als Tiefe vorgeschlagen und mit einem Prüfhinweis gekennzeichnet.

## Auftragsbestätigung und Geräteberechnung

Auftragsbestätigungen werden getrennt von Dispo-/Schemaseiten erkannt. Bei passender AU-Nummer werden Kunde, Kundennummer (Text mit führenden Nullen), Datum, Lieferort und Ansprechpartner als prüfbarer PL-Vorschlag übernommen. Ohne eindeutige Übereinstimmung bleibt die Datei zur Zuordnung offen. Die Bestelldatum-Zelle H8 erhält beim Export ein Excel-Datum.

Neue Felder verwenden standardmässig die Gerätemethode, nicht die 50-Prozent-Schätzung. Max. Pv bleibt die aus den Schrankmassen bestimmte Vergleichsgrösse; die tatsächliche Verlustleistung folgt dem Gerätetotal der Vorlage. Schätzung und manueller Gesamtwert bleiben ausdrücklich wählbar.

SPD, Überspannungsschutz und Überspannungsableiter werden je Kennzeichen als ein vierpoliges Gerät erfasst. Die Vorlage enthält fünf Referenzzeilen mit 0 W/«keine Angaben» und ohne Summenformeln. Diese Nullen werden nicht als belastbare Verlustleistung ausgegeben: Ein manuell bestätigter Verlustwert je Gerät ist erforderlich. Als erste Referenz wird Zeile 37 vorgeschlagen; dies legt nicht den tatsächlich verbauten Hersteller fest. Die exportierten SPD-Zeilen erhalten Mengenformeln und F49 die zugehörige Summe. Einzelwerte stammen vom Benutzer, nicht aus einer frei erfundenen Verlustleistung.

Geräteerkennung (Version 20261027-5): Neben F werden S-, P-, K- und Y-Kennzeichen erfasst und gleiche Kennzeichen innerhalb einer Anlage einmal gezählt. Schmelzsicherungen ohne LS-Charakteristik werden nach Nennstrom DII (bis 25 A), DIII (bis 63 A) oder NH zugeordnet. Fehlt ein Nennstrom in der Vorlage, wird der nächsthöhere Eintrag angeboten (z. B. 13 A → 16 A), mit Prüfhinweis. Mehrdeutige Hauptschalter und Schütze bleiben zur Artikelauswahl offen. Schaltuhren verwenden als vereinbarte Referenz Hager EG103; Zähler bei gleichen Verlustwerten den ersten Eintrag; Dämmerungsschalter Hager Dämmerungsautomat.

Grenze: Dies ist keine allgemeine grafische Symbolerkennung. Für das bereitgestellte Abelia-Schema sind die vom Nutzer erläuterten symbolischen Geräte als bestätigte Zuordnungen hinterlegt (Dateiname und mehrere Kennzeichen müssen passen). Diese Regeln werden nicht auf andere Projekte übertragen. Die referenzierten Minuterien verwenden TLA-1/230, das NH-Element die Silas-NH00-Referenz; Referenzartikel und Feldzuordnung sind vor Export zu prüfen. Unbekannte P-/K-/Y-Geräte werden sichtbar zur manuellen Zuordnung aufgenommen, statt unterschlagen. Hauptschalter 10S2 benötigt mangels eindeutiger Variante eine Artikelauswahl. Schütze verwenden seit Version 20261027-6 automatisch Hager-Referenzen gemäss der nachstehenden Regel. Kundendokumente werden nicht mitgeliefert.

Version 20261027-6: PL wird ausschliesslich aus vollständigem Kunden-Empfänger oder Kundenanrede gelesen, niemals aus dem internen Feld „Ihr Ansprechpartner“. Ohne vollständigen Namen bleibt PL leer. Normale kWh-/Wirkleistungszähler werden ausgeschlossen; ausdrücklich erkannte Privatzähler bzw. die bestätigte Privatzähler-Zuordnung bleiben enthalten. Der bestätigte Zähler 15P2.2 wird ausgeschlossen. Auslassungen werden als Hinweis protokolliert.

Schütze: Hager ESC225S/ESC240S/ESC263S bzw. ESC425S/ESC440S/ESC463S. Explizite Nennströme werden auf die nächste passende Stufe 25/40/63 A abgebildet, erkennbare 2S/4S-Kontakte berücksichtigt. Ohne diese Angaben gilt die vom Nutzer vorgegebene Annahme 25 A / 4S. Eine elektrische Netzverfolgung vom vorgeschalteten Schutzorgan zur Spule findet nicht statt. Über 63 A bleibt eine fehlende passende Referenz offen.

Felder: Kennzeichenpositionen relativ zu erkannten Feldmasslinien haben Vorrang (auch mehr als zwei Felder). Nicht lokalisierte Geräte werden mit gewichteter Verteilung nach Feldbreite und Platzeinheiten zugeordnet: LS LN=1, LS 3LN=3, FI/LS LN=2, FI/LS 3LN=4. Für sonstige Geräte dienen 2 bzw. 4 Einheiten als Näherung. Diese Verteilung ist kein Beleg für die tatsächliche Einbauposition. Quelle/Näherung und Referenzannahmen werden in „Webapp Eingaben“ exportiert.

Version 20261027-7: Allgemeine Zählererkennung berücksichtigt kWh, MID, Strom-/Energie-/Wirkleistungszähler und den Schreibfehler „Stormzähler“, unabhängig von Dateiname und Kennzeichen. Explizite Privatzähler bleiben gemäss früherer Vorgabe enthalten; erkannte Schaltuhren werden nicht wegen benachbarter Zählertexte entfernt. Unbekannte Kommunikationsgeräte wie eine RS485-Schnittstelle sind keine automatisch anzunehmenden Zähler und bleiben zur Zuordnung offen. Die spezielle Ausschlussregel nur für 15P2.2 wurde entfernt.

Bei mehreren passenden Referenzen wird ein vorhandener Artikel nahe dem Median der unterschiedlichen W-Werte gewählt (bei Gleichstand höherer Wert, danach stabile Artikel-ID). Geräteart, System, bekannter Nennstrom/Polzahl/Fehlerstrom bleiben Filter; die bisherigen Strombereichsregeln für Sicherungen bleiben erhalten. Die bereits vereinbarte Hager-Schützregel hat Vorrang. Fehlende Polzahlen werden aus der Referenz übernommen und ausdrücklich als Annahme angezeigt. Unbekannte Gerätearten erhalten keinen beliebigen Ersatzartikel. Die Medianregel ersetzt die früheren festen Uhr-/Dämmerungs-/NH-Referenzvorschläge. Sie ist eine Näherung, keine Zusicherung des tatsächlich verbauten Verlustwerts.

Version 20261027-8: SPD erhalten nach Nutzervorgabe 5 W pro vollständigem vierpoligem Gerät (nicht pro Pol). Oberfläche, Berechnung, Export und Protokoll verwenden denselben Standard, manuelle abweichende Werte bleiben erhalten. Das ist eine Projektvorgabe, kein aus der Vorlage abgeleiteter Herstellerwert.

RSE/NKE, ZFA, RS485 und als Res./Reserve beschriftete Messgeräte werden allgemein ausgeschlossen. Beschriftungen unmittelbar am Kennzeichen sowie räumlich nahe Beschriftungen aus den PDF-Textkoordinaten werden ausgewertet; Seitenüberschriften allein führen nicht zum Ausschluss aller Geräte. Auslassungen bleiben in den Erkennungshinweisen sichtbar. Erkannte Steuerschalter (Beschriftung oder H/0/A-Schaltstellungen) verwenden immer den Schrack H–0–A-Eintrag aus der Excel-Vorlage. Hauptschalter bleiben eine eigene Geräteart. Diese Regeln ersetzen die früheren offenen RS485- und SPD-Hinweise.
