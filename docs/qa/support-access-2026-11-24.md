# Supportfreigabe – 24.11.2026

## Verhalten

«Lizenzen & Berechtigungen → Betrieb öffnen» wählt jetzt ausschliesslich den Betrieb für die Verwaltung. Regierapporte, Offerten, CAD, Kunden, Wärmeprojekte, Artikelkataloge, Werkstattvorlagen und Uploads bleiben im eigenen Entwickler-Arbeitsplatz, bis eine Freigabe vorliegt und der Support ausdrücklich geöffnet wird. Dies gilt auch für bereits vor dem Update gespeicherte Entwicklersitzungen mit ausgewähltem Betrieb. Bestehende Firmendaten werden weder verschoben noch kopiert.

Oben in den Firmendaten und der Mitarbeitendenliste erscheint «Supportzugriff anfordern». Der Entwickler wählt angemeldete Personen, einen Grund, «Lesen und bearbeiten» oder «Nur lesen» sowie 15, 30 oder 60 Minuten. Sichtbare Werkzeugseiten melden ihre Anwesenheit und prüfen Anfragen alle acht Sekunden; nach Rückkehr zum Tab wird sofort geprüft. Als online gelten aktive Firmenkonten mit einer Anwesenheitsmeldung innerhalb von 45 Sekunden und gültiger Sitzung. Das Hintergrund-Polling verlängert die normale Inaktivitätsfrist der Anmeldung nicht.

Die ausgewählten Personen erhalten ein Dialogfenster direkt im Tool. Die ausdrückliche Vorgabe des Betreibers ist umgesetzt: **Auch ein ausgewählter Mitarbeiter mit eingeschränkten eigenen Rechten kann alle Werkzeuge und Werkzeugdaten seiner Firma für den Support freigeben.** Das Dialogfenster erklärt diesen Umfang und verlangt eine zusätzliche, anfangs nicht ausgewählte Zustimmung. Die persönlichen Mitarbeiterrechte und das gebuchte Paket werden dabei nicht geändert. Der Support darf vorübergehend auch Werkzeuge ausserhalb des Mitarbeiterumfangs bzw. Pakets prüfen; der Betrieb selbst muss eine aktive Lizenz haben.

Eine Zustimmung genügt. Die erste Zustimmung oder Ablehnung entscheidet; eine Anfrage verfällt nach zehn Minuten. Nach Zustimmung öffnet der Entwickler die Firmenplattform ausdrücklich. Die Freigabe gehört genau zu dieser Entwicklersitzung. Andere Entwickler oder ein anderer Login desselben Entwicklers erhalten keinen Zugang daraus.

Ein dauerhafter Hinweis zeigt Firma, freigebende Person, Umfang und Ende des Zugriffs. Die freigebende Person sowie Firmenadministratoren können ihn widerrufen; der Entwickler kann ihn beenden. Ablauf, Abmeldung des Entwicklers, Firmenwechsel, Deaktivierung/Passwortzurücksetzung/Wechsel des freigebenden Kontos oder Sperrung des Betriebs beenden den Zugriff ebenfalls. Die normale Abmeldung der freigebenden Person beendet eine bereits bewilligte, zeitlich befristete Freigabe nicht.

Der Server prüft Firma, Benutzer, Freigabe und Schreibrecht bei jedem Werkzeugzugriff und erneut nach dem Einlesen von Schreibanfragen. Alte Tabs und bereits angelaufene Uploads können nach Widerruf nichts mehr speichern. Die Oberfläche sperrt alte Firmenansichten spätestens mit der nächsten Statusabfrage; bei Zeitablauf auch ohne Netzwerk. Bereits eingesehene oder exportierte Daten werden dadurch nicht rückwirkend gelöscht.

Anfrage, Entscheidung, Eintritt, Ende sowie erfolgreiche Lese-/Schreibzugriffe werden mit Beteiligten, Firmen-ID und Anfrage-ID protokolliert. Dokumentinhalte, Cookies und Passwörter werden nicht ins Supportprotokoll geschrieben. Betriebs-, Lizenz- und Benutzerverwaltung bleiben die getrennten Aufgaben des Entwicklers; diese Verwaltungsrechte sind keine Supportfreigabe.

## Prüfung

- Gesamte Testsuite vor dem abschliessenden Clienttest: **741/741 bestanden**.
- Anschliessend **41/41** gezielte Tests bestanden: Support, bestehende Plattformzugriffe und Session-Bootstrap inklusive neuem Test für getrennte Verwaltungs-/Werkzeug-Header. Insgesamt 742 vorhandene Tests.
- Serverprüfungen: keine implizite Freigabe durch alte Sitzungen oder Firmenauswahl; Online-Empfänger; nur nominierte Personen; alle Werkzeuge trotz eingeschränkter Mitarbeiterrechte; unveränderte Mitarbeiterrechte; getrennte Entwicklerlogins; CSRF/Origin; Nur-Lesen; Ablehnung; Ablauf; Widerruf; Firmenwechsel; Abmeldung; gesperrte Konten; widerrufener laufender Upload; Protokollierung ohne Dokumentinhalte.
- Lokaler Browser mit separaten Testidentitäten und In-Memory-Datenbank: Anfrage im Firmenportal, Live-Popup auf bereits geöffneter Schienenrechnerseite, ausdrückliche Zustimmung, Eintritt ins vollständige Firmendashboard und Öffnen des Beispiel-Regierapports. Mitarbeitenden-Navigation blieb eingeschränkt. Widerruf sperrte die bereits geöffnete Entwicklerseite. Zweite Anfrage wurde abgelehnt, und die Ablehnung erschien im Entwicklerportal.
- Dialog bei 390 Pixel Breite visuell und per Bedienung geprüft. Startfokus bleibt oben, damit Erklärung und Umfang zuerst sichtbar sind. Browserprüfung in Chromium; kein separater Test auf einem echten iPad/Safari in diesem Durchlauf.
- Keine produktiven Supportanfragen, Kontenänderungen oder Datenzugriffe im Rahmen dieser Prüfung.

## Bereitstellung

Vor dem Update eine Sicherung der bestehenden Datenbank erstellen. Nach dem Merge den Infomaniak-Checkout aktualisieren und die Node.js-Anwendung neu starten. Die neuen Supporttabellen werden ergänzend angelegt; vorhandene Konten und Werkzeugdaten bleiben erhalten. `admin:init` nicht erneut ausführen. Danach beide beteiligten Browser neu laden, damit sie das neue Freigabefenster und den Statusabruf verwenden.

Ein reiner GitHub-Pages-Betrieb ohne Node-Backend bietet diesen Freigabeablauf nicht. Die Oberfläche ist eine technische Zugriffskontrolle und keine Zusicherung einer bestimmten rechtlichen Zulässigkeit.
