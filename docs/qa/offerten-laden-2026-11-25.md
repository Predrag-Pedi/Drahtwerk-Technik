# Offerten beim Werkzeugwechsel zuverlässig laden

## Ursache und Änderung

Die Initialisierung wartete gemeinsam auf Offerten, eigene Artikel und den vollständigen importierten Katalog. Währenddessen waren Erstellen und Importieren bereits möglich. Ein neuer Entwurf wurde vor `ready` nicht gespeichert; die spätere Ladeantwort ersetzte die Arbeitsliste und wählte wieder die erste bestehende Offerte aus. Auch ein Katalogfehler verhinderte die Anzeige der Offerten.

- Offerten, Artikelstamm und Auftragsverknüpfungen laden unabhängig voneinander.
- Bis zum erfolgreichen Lesen der Offerten bleiben Erstellen und Importieren gesperrt. Ladefehler zeigen einen erneuten Ladeversuch an und werden nicht als leere Sammlung behandelt.
- Spätere Katalog- und Auftragsantworten wechseln weder die ausgewählte Offerte noch die Arbeitsliste.
- Gespeicherte Offerten bleiben bei einem Katalogfehler verfügbar. Katalogbearbeitung und Import bleiben gesperrt, bis dessen Laden erfolgreich war.
- Schreibvorgänge verwenden geordnete, unveränderliche Momentaufnahmen. Die bestehende serverseitige Revisionsprüfung bleibt erhalten.
- Die Auftragserstellung behält die genehmigte Quellofferte unverändert bei; dafür wurde eine API-Regressionprüfung ergänzt. Keine Datenmigration.

## Browserprüfung

Chromium mit lokalem Node-Server, isolierter SQLite-Datenbank und ausschliesslich erfundenen Firmen, Benutzern und Dokumenten. Ladeverzögerungen von acht Sekunden bzw. HTTP-503-Antworten wurden gezielt im lokalen Vorschau-Server ausgelöst.

1. Vorhandene genehmigte Offerten erscheinen, während der Artikelstamm noch lädt.
2. Neue Offerte mit Kunde, Projekt, freier Position und Preis erstellt, genehmigt und in einen Auftrag umgewandelt. Auftragsbestätigung enthält die Ausgangsofferte, Position und korrekten Betrag.
3. Rückkehr vom Auftrag zu Offerten sowie erneuter Wechsel über Regierapporte: Quellofferte bleibt genehmigt sichtbar, einschliesslich Kunde, Projekt und Betrag.
4. Eine weitere neue Offerte hat leere Kunden- und Projektfelder und den Status Offen; das spätere Katalogladen ersetzt diesen Entwurf nicht.
5. Verzögertes Lesen der Offerten zeigt einen Ladehinweis und deaktiviert Erstellen. Nach der Antwort werden die vorhandenen Dokumente angezeigt und Erstellen freigegeben.
6. Fehlgeschlagenes Lesen der Offerten zeigt eine Fehlermeldung und hält Erstellen gesperrt. Nach Wiederherstellung der Verbindung lädt «Erneut laden» dieselben sechs Dokumente.
7. Fehlgeschlagenes Katalogladen lässt die Offerten verfügbar. Ein neuer Entwurf kann gespeichert werden. «Artikelstamm erneut laden» stellt den Katalogzugang wieder her und behält den neuen Entwurf; nach Navigation sind alle sieben Testofferten vorhanden.

Kein Test auf einem physischen iPad/Safari und kein Zugriff auf Produktionsdaten oder den echten VSAS-Katalog. Die Verzögerung simuliert dessen langsames Laden; es wurde kein 159'000-Artikel-Katalog im Browser importiert.

## Automatische Prüfungen

- `tests/offer-collection.test.mjs`: langsames Lesen, Mutationssperre vor erfolgreichem Laden, fehlgeschlagene/ungültige Antworten, Wiederholung, mehrfaches Wiederöffnen, unabhängige neue Dokumente, geordnete Speicherungen und Schreibfehler.
- `tests/platform-documents.test.mjs`: Erstellung eines Auftrags verändert weder Wert noch Revision der genehmigten Quellofferte.
- `npm test`: 769 Tests erfolgreich, keine Fehler oder übersprungenen Tests.
- `node --check offerten/app.mjs`, `node --check offerten/collection.mjs` und `git diff --check` erfolgreich.
