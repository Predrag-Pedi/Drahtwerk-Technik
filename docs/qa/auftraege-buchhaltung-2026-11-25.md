# Aufträge, Dokumentvorlagen und Buchhaltung

## Bedienung

- Eine gespeicherte Offerte mit Status **Genehmigt**, Kunde, Nummer und mindestens einer Position kann über **Auftrag erstellen** übernommen werden. Erforderlich sind Schreibrechte für Offerten und Aufträge. Weitere Klicks öffnen denselben Auftrag.
- **Aufträge** zeigt eine firmenweite Tabelle mit Suche, Zeitraum und Status. Lieferdatum, Kundenreferenz, interne Notizen und Status sind bearbeitbar. Preise, Positionen, Kundendaten und Absender bleiben als bestätigter Datenstand erhalten. Die ursprüngliche Offerte bleibt separat bestehen.
- Die Auftragsbestätigung lässt sich als PDF herunterladen und anschliessend mit dem eigenen E-Mail-Programm versenden. SchaltBase versendet keine E-Mails automatisch.
- Über das Kontomenü oder das Firmenportal öffnen Firmenadministratoren **Offerten & Aufträge · Vorlagen**. Für beide Dokumentarten gibt es getrennte Präfixe, Stellenzahl, nächste Laufnummer sowie Einleitungs- und Schlusstexte. AN- und AU- sind Vorgaben. Die optionale Jahreszahl setzt den Zähler nicht zurück. Aufträge übernehmen bestehende Bedingungen aus der genehmigten Offerte.
- Nummern werden auf dem Server pro Firma und Dokumentart vergeben. Bereits verwendete Nummern werden übersprungen; parallele Anfragen erhalten verschiedene Nummern. Eine reservierte Nummer wird nicht wiederverwendet, auch wenn die neue Offerte anschliessend nicht gespeichert oder später entfernt wird. Bestehende Dokumente werden nicht umnummeriert.
- Unter **Mitarbeitende → Rechte bearbeiten → Rolle** kann der Firmenadmin **Buchhaltung** zuordnen. Entwickler können diese Rolle auch bei der Benutzererstellung auswählen. Weitere Werkzeugrechte bleiben separat einstellbar. Eine Rollenänderung beendet vorhandene andere Sitzungen des betroffenen Benutzers.
- **Buchhaltung** ist nur für diese Rolle und Firmenadmins verfügbar. Der Bereich zeigt Offerten, Aufträge und unterschriebene/abgerechnete Regierapporte. Die Auswahl kann nach Datum, Kunde/Projekt/Nummer und Status gefiltert werden. Exportiert wird genau diese Auswahl als Übersicht, Positionen-CSV oder JSON-Sicherung; einzelne Dokumente haben eine PDF-Ausgabe bzw. bei Rapporten die Druckfunktion.
- Aufträge und Rapporte sind keine Rechnungen. Das Tool bereitet die Übergabe vor; Rechnungsstellung, Kontierung und Buchungen erfolgen im externen Programm. CSV ist eine allgemeine Datenübergabe, keine zugesicherte bexio-Importschnittstelle.

## Daten und Rechte

- Neue Tabellen `document_numbers` und `order_sources` sowie die Spalte `users.accounting_role` entstehen beim normalen Serverstart. Die vorhandene Benutzertabelle und ihre Fremdschlüssel werden nicht neu aufgebaut.
- Aufträge und Vorlagen liegen in den bestehenden Firmen-Records, unterliegen deren Speichergrenze und sind in der normalen SQLite-Sicherung enthalten. Nummernvergabe und Auftragserstellung erfolgen in einer Transaktion.
- Auftragsrechte folgen für bestehende Benutzer zunächst den Offertenrechten; sie können danach separat vergeben werden. Das Paketmodul Offerten umfasst auch Aufträge. Buchhaltung steht bei einem aktiven Paket mit Offerten oder Regierapporten zur Verfügung und zeigt nur die dort enthaltenen Dokumentarten.
- Ein frei übermitteltes `accounting`-Werkzeugrecht schaltet den Bereich nicht frei. Die Rolle wird serverseitig geprüft, ebenso direkte Seitenaufrufe, API-Zugriffe, Firmenkontext, CSRF und Versionskonflikte.
- Ein Entwickler sieht weiterhin seinen eigenen Arbeitsplatz. Die reine Auswahl eines Betriebs zur Verwaltung öffnet keine Betriebsdokumente. Zugriff auf fremde Firmenunterlagen erfordert den bestehenden freigegebenen Supportzugriff und endet mit dessen Beendigung.
- Die serverseitige Auftragskopie hält auch den ursprünglichen Offertendatenstand und Absender fest. Änderungen an der Offerte wirken sich nicht auf bereits erzeugte Aufträge aus.
- CSV maskiert Formeln in Textfeldern. Auf die Positionen verteilte Rabatte und MWST ergeben centgenau die Dokumenttotale. Rapporte enthalten Tätigkeiten, Material, Fahrt, Spesen, Kundenangaben und Bestätigungsdaten; JSON enthält zusätzlich den vollständigen Datenstand einschliesslich Unterschrift.

## Prüfung

- Gesamte Node-Testsammlung: `node --test tests/*.test.mjs`.
- Neue API-Tests prüfen parallele Nummernvergabe und Umwandlung, idempotente Auftragserstellung, veraltete Offertendaten, Rollenvergabe und Entzug, Paketgrenzen, Firmenisolation, direkte URL/API-Zugriffe, Vorlagenrevisionen sowie PDF- und CSV-Ausgaben.
- Erweiterte Supporttests prüfen Zugriff auf die neuen Dokumentendpunkte nur während einer gültigen Freigabe; alte Browserkontexte werden nach dem Beenden zurückgewiesen.
- Browserprüfung mit synthetischen Daten und separater In-Memory-Datenbank: genehmigte Offerte in Auftrag umwandeln; Referenz bearbeiten und speichern; PDF herunterladen; Präfix und nächste Nummer ändern und neue Offerte erstellen; Ansicht einer Person mit ausschliesslich Buchhaltungsrolle; CSV herunterladen; unterschriebenen Rapport mit Material und Unterschrift ansehen.
- Desktop und responsive Ansicht mit 820 px Breite visuell geprüft. Kein Test auf einem echten iPad/Safari in dieser Umgebung. Keine produktiven Firmendaten verwendet oder geändert.

## Einführung

Nach Review und Merge den üblichen Infomaniak-Updateablauf mit Datenbanksicherung und Neustart ausführen. Ein Datenbankreset ist nicht erforderlich. Danach als Firmenadmin die gewünschten Nummernkreise einstellen und die Buchhaltungsrolle den zuständigen Personen zuweisen.
