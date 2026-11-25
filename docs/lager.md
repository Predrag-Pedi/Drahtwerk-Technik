# Lager, dynamischer Aufbau und Kundenmaterial

## Einführung

Das Werkzeug «Lager» steht im Dashboard unter Werkstatt und in der Navigation unter Produktion. Die Standardpakete erhalten das Modul beim nächsten Serverstart. Eigene Pakete können im Entwicklerportal um «Lagerverwaltung» ergänzt werden. Firmenadministratoren haben Zugriff; für Mitarbeitende wird Lesen oder Schreiben unter Lizenzen/Berechtigungen ausdrücklich vergeben. Bestehende Mitarbeiterrechte bleiben unverändert. Bestände und Buchungen sind pro Firma getrennt; Entwicklerzugriffe folgen der bestehenden Supportfreigabe.

Keine vorhandene Offerte und kein bestehender Auftrag wird nachträglich gebucht. Das Lager startet leer. Vor der ersten Auftragserstellung müssen die tatsächlichen Bestände erfasst werden.

## Material erfassen

Artikel können manuell oder aus dem firmeneigenen Offerten-Katalog übernommen werden. Artikelnummer und Einheit verbinden Offerten und Lager. Identische Artikelnummern sind innerhalb einer Firma eindeutig; Gross-/Kleinschreibung wird bei der Zuordnung ignoriert. Schreibweise/Einheit und Lagerart bleiben nach dem Anlegen fest, damit bestehende Buchungen nachvollziehbar bleiben.

- Mengenbestand: Geräte, Platten in Stück, Verbrauchsmaterial in Metern oder anderen Einheiten.
- Stangenmaterial: Einheit Meter, ganze Stangen, Stangenlänge (standardmässig 6000 mm), Schnittbreite und Reststücke. Schnittbreite passend zur tatsächlichen Säge einstellen; der Vorgabewert 3 mm ist anpassbar.
- Lagerplätze sind mit «Lagerplätze verwenden» optional für die Firma aktivierbar. Beim Ausschalten bleiben bereits hinterlegte Plätze gespeichert.
- Wareneingänge, Inventuren und Rückgaben werden über den aktuellen Bestand mit einem Buchungsgrund gespeichert. Die Bewegung enthält Benutzer, Zeitpunkt und Vorher-/Nachher-Menge. Gleichzeitige Änderungen überschreiben keine neueren Bestände.

## Offerte → Auftrag

Die Offerte zeigt den aktuellen Lagerstand, verfolgt aber keine Reservierung. Beim Erstellen des Auftrags aus einer genehmigten Offerte werden die dann vorhandenen Mengen automatisch abgebucht. Auftrag, Nummer, Bestand und Auszug werden in einer Datenbanktransaktion gespeichert. Wiederholte/gleichzeitige Klicks auf dieselbe Offerte erzeugen nur einen Auftrag und eine Abbuchung. Auch verschiedene gleichzeitig erstellte Aufträge können den Bestand nicht unter null setzen.

Fehlendes Material verhindert die Auftragserstellung nicht: vorhandenes Material wird gebucht, Fehlmengen bleiben am Auftrag rot sichtbar. Nach einem Wareneingang können im Lager unter «Abgebuchte Aufträge» die inzwischen verfügbaren Fehlmengen nachgebucht werden. Bereits gebuchte Mengen werden dabei nicht erneut abgezogen. Nicht im Lager erfasste Artikel erscheinen als nicht geführt und erzeugen keine Lagerbuchung.

Die ursprüngliche Offerte bleibt erhalten. Nachträgliche Offertenänderungen verändern weder den bestätigten Auftrag noch seine Lagerbuchung. Eine Stornierung bucht physisches Material nicht automatisch zurück: tatsächliche Rückgaben werden als begründete Bestandskorrektur erfasst. Eine bereits geschnittene Stange wird dadurch nicht fälschlich wieder als ganz geführt.

## SBR und Aufbau dynamisch

Im eigenen Artikelstamm sind «SBR – Dynamisch» und «Aufbau – Dynamisch» auswählbar. Komponenten können aus dem Artikelstamm oder frei ergänzt werden. Unterstützte Berechnungen:

- Breite, Höhe oder Tiefe, jeweils mit optionalem Abzug in Millimetern.
- Fixlänge mit optionalem Abzug.
- Stückposition, beispielsweise ein Gerät oder eine als Stück kalkulierte Platte.

Bei jedem Einsatz werden Masse und Anzahl je Komponente eingegeben. Die Menge der gesamten Offertenposition vervielfacht diese Komponenten. Materialpreis und Montagezeit ergeben den Positionspreis. Die Komponentendaten sind in der Offerte gespeichert; spätere Änderungen der Artikelvorlage verändern bestehende Offerten nicht.

Für die Lagerbuchung werden die gespeicherten Längen und Stückzahlen automatisch verwendet. Es ist keine erneute Erfassung nötig. Bei einer normalen Meterposition können die Zuschnitte über «Zuschnitte für Lager ergänzen» hinterlegt werden; ihre Summe ergibt die offerierte Menge. Stimmen separat geänderte Meter und Zuschnitte nicht überein, wird eine Auftragserstellung abgewiesen, bis die Angaben korrigiert sind.

Der Zuschnitt verwendet ein deterministisches Best-fit-Verfahren mit absteigenden Längen, vorhandenen Resten und ganzen Stangen. Einzelstücke werden nie zusammengesetzt. Jeder erforderliche Schnitt benötigt Schnittbreite; eine exakt passende, ungeschnittene ganze Länge benötigt keinen zusätzlichen Schnitt. Der Plan ist kein mathematischer Nachweis eines global minimalen Verschnitts.

Beispiel: viermal 1500 mm bei 6000 mm Stangenlänge und 3 mm Schnittbreite → zwei Stangen, 6000 mm Nutzlänge, 12 mm Schnittverlust, Reste 1491 und 4497 mm. Reste werden automatisch nachgeführt und in folgenden Zuschnittplänen berücksichtigt. Voraussetzung: die errechneten Reste werden tatsächlich aufbewahrt und sind auffindbar. Abweichende Werkstattzuschnitte oder entsorgte Reste müssen als Bestandskorrektur berücksichtigt werden. Die Lagerplanung ersetzt keine tatsächliche Materialkontrolle. Materialpreise der Offerte werden durch Lagerverluste nicht nachträglich verändert.

## Angeliefertes Material

Unter «Kalkulation & Export» einer Offerte kann eine Liste mit Artikel, Materialbezeichnung, Menge, Einheit und Bemerkung erfasst werden. Sie erscheint in Text, HTML und PDF als vom Kunden bereitzustellendes, unbepreistes Material. Sie erhöht die Angebotssumme nicht und erzeugt keine eigene Lagerentnahme.

Bei der Auftragserstellung wird die Liste übernommen. Pro Position werden erhaltene Teilmengen oder «Vollständig erhalten» eingetragen und mit «Angaben speichern» gesichert. Bis alle Mengen eingetroffen sind, bleibt der Status rot. Danach wird er grün. Erfassender Benutzer und Zeitpunkt werden gespeichert. Der Kunde muss nicht auf SchaltBase angemeldet sein.

## Auszüge und Export

«Abgebuchte Aufträge» zeigt die gebuchten Mengen, Fehlmengen, Stangen, Schnittverlust und Restlängen je Auftrag. Nachbuchungen bleiben nachvollziehbar. Bestandsübersicht, Auftragspositionen und Bestandskorrekturen können jeweils aus der gefilterten Auswahl als CSV exportiert werden. Ein Datenbankbackup sichert Bestände, Dokumente und Buchungen gemeinsam.
