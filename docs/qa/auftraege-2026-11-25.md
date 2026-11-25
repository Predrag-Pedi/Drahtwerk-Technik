# Aufträge und Dokumentvorlagen

## Bedienung

- Eine gespeicherte Offerte mit Status **Genehmigt**, Kunde, Nummer und mindestens einer Position kann über **Auftrag erstellen** übernommen werden. Erforderlich sind Schreibrechte für Offerten und Aufträge. Weitere Klicks öffnen denselben Auftrag.
- **Aufträge** zeigt eine firmenweite Tabelle mit Suche, Zeitraum und Status. Lieferdatum, Kundenreferenz, interne Notizen und Status sind bearbeitbar. Preise, Positionen, Kundendaten und Absender bleiben als bestätigter Datenstand erhalten. Die ursprüngliche Offerte bleibt separat bestehen.
- Die Auftragsbestätigung lässt sich als PDF herunterladen und anschliessend mit dem eigenen E-Mail-Programm versenden. SchaltBase versendet keine E-Mails automatisch.
- Über das Kontomenü oder das Firmenportal öffnen Firmenadministratoren **Offerten & Aufträge · Vorlagen**. Für beide Dokumentarten gibt es getrennte Präfixe, Stellenzahl, nächste Laufnummer sowie Einleitungs- und Schlusstexte. AN- und AU- sind Vorgaben. Die optionale Jahreszahl setzt den Zähler nicht zurück. Aufträge übernehmen bestehende Bedingungen aus der genehmigten Offerte.
- Nummern werden auf dem Server pro Firma und Dokumentart vergeben. Bereits verwendete Nummern werden übersprungen; parallele Anfragen erhalten verschiedene Nummern. Eine reservierte Nummer wird nicht wiederverwendet, auch wenn die neue Offerte anschliessend nicht gespeichert oder später entfernt wird. Bestehende Dokumente werden nicht umnummeriert.
- Die gefilterte Auftragsauswahl kann weiterhin als Übersicht, Positionen-CSV oder JSON exportiert werden. Auftragsbestätigungen sind keine Rechnungen. CSV ist eine allgemeine Datenübergabe, keine zugesicherte bexio-Importschnittstelle.

## Daten und Rechte

- Neue Tabellen `document_numbers` und `order_sources` entstehen beim normalen Serverstart. Die vorhandene Benutzertabelle und ihre Fremdschlüssel werden nicht neu aufgebaut.
- Aufträge und Vorlagen liegen in den bestehenden Firmen-Records, unterliegen deren Speichergrenze und sind in der normalen SQLite-Sicherung enthalten. Nummernvergabe und Auftragserstellung erfolgen in einer Transaktion.
- Auftragsrechte folgen für bestehende Benutzer zunächst den Offertenrechten; sie können danach separat vergeben werden. Das Paketmodul Offerten umfasst auch Aufträge.
- Werkzeugrechte, Firmenkontext, CSRF und Versionskonflikte werden serverseitig geprüft.
- Ein Entwickler sieht weiterhin seinen eigenen Arbeitsplatz. Die reine Auswahl eines Betriebs zur Verwaltung öffnet keine Betriebsdokumente. Zugriff auf fremde Firmenunterlagen erfordert den bestehenden freigegebenen Supportzugriff und endet mit dessen Beendigung.
- Die serverseitige Auftragskopie hält auch den ursprünglichen Offertendatenstand und Absender fest. Änderungen an der Offerte wirken sich nicht auf bereits erzeugte Aufträge aus.
- CSV maskiert Formeln in Textfeldern. Auf die Positionen verteilte Rabatte und MWST ergeben centgenau die Dokumenttotale.

## Entfernung der Buchhaltung

- Kachel, Kategorie, Navigation und Benutzerrolle Buchhaltung sind entfernt. `buchhaltung.html` und `/api/company/accounting` sind nicht mehr verfügbar. Auch eine alte Datei auf dem Server ist nicht mehr über die HTML-Freigabeliste erreichbar.
- Beim normalen Serverstart hebt die Migration die Datenbankversion auf 5. Bisherige Buchhaltungskonten bleiben Mitarbeitende: Passwort, Aktivierungsstatus, Pflicht zum Passwortwechsel, Sitzungen und alle übrigen Werkzeugrechte bleiben erhalten. Es werden keine zusätzlichen Zugriffe gewährt.
- Der alte Rollen-Zusatz wird auf 0 gesetzt. Das ehemalige Werkzeugrecht wird aus Benutzerrechten und gespeicherten Supportfreigaben entfernt. Die vorhandene Benutzertabelle wird nicht neu aufgebaut; die ungenutzte Altspalte bleibt auf bestehenden Installationen erhalten, neue Datenbanken legen sie nicht mehr an.
- Offerten, Aufträge, Rapporte, Nummernkreise und deren bestehende Exporte werden nicht gelöscht oder verändert. Die separat verfügbaren Werkzeuge werden weiterhin über ihre eigenen Rechte gesteuert.

## Prüfung

- Node-Testsammlung: `node --test tests/*.test.mjs` — 764 Tests bestanden.
- API-Tests: alte Buchhaltungs-URLs für alle Rollen gesperrt, alte Rollenwerte bei Erstellung/Bearbeitung abgelehnt, normale Benutzerverwaltung weiterhin möglich; Aufträge, Nummernvergabe, PDF/CSV, Firmenisolation und Supportfreigaben bleiben geprüft.
- Migrationstest mit bestehender SQLite-Datenbank: unveränderte Konten und Dokumente, bestehende Sitzung und Passwortanmeldung, deaktivierte Konten weiterhin gesperrt, unveränderte übrige Rechte, gültige Fremdschlüssel und wiederholbarer Neustart.

- Browserprüfung mit synthetischen Daten: Dashboard und Sidebar ohne Buchhaltung, Aufträge im Bürobereich, Mitarbeiterrechte ohne Zusatzrolle, neue Konten nur als Mitarbeiter oder Firmenadministrator, leere Werkzeugauswahl ohne zusätzliche Rechte. Auftrag geöffnet, Kundenreferenz gespeichert, PDF und Positionen-CSV heruntergeladen. Keine produktiven Firmendaten verwendet.

## Einführung

Nach Review und Merge den üblichen Infomaniak-Updateablauf mit Datenbanksicherung und Neustart ausführen. Ein Datenbankreset oder eine manuelle Änderung bestehender Konten ist nicht erforderlich.
