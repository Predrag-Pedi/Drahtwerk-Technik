# Firmenportal – Prüfung vom 19.11.2026

## Automatische Prüfungen

- Gesamter vorhandener Werkzeug- und Plattformtestlauf: 641 Tests bestanden.
- Anschliessend ergänzter Parallelitätstest und erneuter Plattformtestlauf: 16 Tests bestanden. Die Suite umfasst damit 642 Tests.
- Reale HTTP-Anfragen gegen Node/SQLite: Login mit falschem/richtigem Passwort, Startpasswortwechsel, Sitzungswiderruf/-ablauf, Origin/CSRF, Rollen, Betriebstrennung in allen vier Speicherbereichen, Benutzerplätze, Modulrechte, Lizenzablauf und Versionskonflikte.
- Langsam übertragene Anfragen: Eine Firmendatenänderung überschreibt keine zwischenzeitlich geänderte Lizenz. Ein bereits begonnener Projektupload wird bei zwischenzeitlich gesperrter Lizenz abgewiesen.
- HTML und vektorbasierte Standardrahmen: feste Firmen-/Lieferantenaufdrucke und Logo entfernt; leere Profile bleiben leer; eigene Angaben werden escaped eingesetzt.
- Binäre Excel-Daten: JSON-Transport und Rückwandlung geprüft.
- SQLite-Backup während laufender Anwendung erstellt und separat geöffnet: `integrity_check = ok`, Projektdatensätze erhalten.

## Browserprüfung

Die Oberfläche wurde mit einer isolierten, bereits angemeldeten Test-Sitzung und rein erfundenen Firmendaten geprüft. Die Testeinrichtung gehört nicht zum ausgelieferten Code. Login und Passwortwechsel wurden über die echte HTTP-Schnittstelle getestet; im Browser wurde kein persönliches Konto des Auftraggebers angelegt.

- Entwickler-Dashboard: Betrieb mit Komplett-Paket, Laufzeit und zehn Benutzerplätzen angelegt; Übersicht aktualisiert.
- Firmendaten anfangs leer; Firmenname, Adresse und Kontakt gespeichert, Firmenname im Werkzeugkopf übernommen.
- CAD-Projekt erstellt; gespeichertes Projekt sichtbar; Firmenadresse korrekt auf dem Deckblatt, kein fester Lieferantenaufdruck.
- Offerte erstellt und geändert; nach Neuladen aus dem Betriebsspeicher wieder vorhanden.
- Mitarbeiter mit ausschliesslich CAD-Leserechten: keine Firmenverwaltung, keine Offerten-/Wärme-/Werkstattlinks, CAD-Projekte sichtbar, Anlegen und Löschen deaktiviert, Lesehinweis sichtbar.

## Noch nicht bereitgestellt

Zum Zeitpunkt der ersten Prüfung waren kein Kundenserver, kein Betreiberkonto, kein Codespace und keine Zahlungsabwicklung eingerichtet. Der nachfolgende Stand ist unten ergänzt. Die Codespaces-Konfiguration und die Anleitung stehen in `docs/FIRMENPORTAL.md`. Der Betrieb auf GitHub Pages bleibt die lokale Einzelplatzversion. Der kommerzielle Serverbetrieb benötigt eigenes HTTPS-Hosting, Sicherungen und ein Sicherheitsreview. Keine Kundendaten, Zugangsdaten, Datenbanken oder Browserbilder sind Teil dieses Pull Requests.

## Ergänzung: gemeinsame GitHub-Testphase

Automatischer Codespaces-Start und Wiederstart ergänzt. Die Portfreigabe wird nicht automatisch geändert; es werden keine Konten angelegt. Eigene Konten bleiben über den vorhandenen Login verpflichtend. Die Anleitung unterscheidet Besitzerzugriff, Organisationszugriff und öffentliche Loginseite mit geschützter Anwendung. Erneuter Plattformlauf: 19 Tests bestanden, einschliesslich HTTPS-/Origin-Konfiguration und inaktivem Codespaces-Hook ausserhalb Codespaces. Die gesamte Suite umfasst nun 645 Tests. Zu diesem Zwischenstand waren ein tatsächlicher Codespace und eine Mitarbeiterfreigabe noch nicht eingerichtet.


## Ergänzung: Startseite, Login und bestehendes Dashboard

- Vollständiger Testlauf nach diesen Änderungen: **652 Tests bestanden**; davon 26 Plattformtests.
- Neue öffentliche Startseite in Blau mit vier auswählbaren, als Beispiele gekennzeichneten Werkzeugansichten, ohne Video. Loginseite mit zweigeteilter Gestaltung, Benutzername/E-Mail und Passwortanzeige.
- Nach Login das bestehende Werkzeug-Dashboard; Name/Entwickler bzw. Name/Betrieb unten links. Entwicklerverwaltung als zusätzliches Werkzeug. Betrieb öffnen führt direkt zu dessen Mitarbeitenden; neue Benutzer bleiben bei diesem Betrieb.
- Browser mit isolierter, nicht ausgelieferter QA-Sitzung: alle vier Beispielreiter, Start-/Loginansicht, bestehendes Entwickler-Dashboard, Kontomenü, Firmenverwaltung, Benutzerformular im gewählten Betrieb und Firmenadmin-Rechteformular geprüft. Kein echtes Benutzerkonto oder Passwort wurde dabei angelegt.
- Neue HTTP-Tests: anonyme Startseite, geschützte Dashboard-/Verwaltungsseiten, Benutzername ohne E-Mail, eindeutige Anmeldenamen, Entwickler-Arbeitsbereich getrennt von Kunden, keine Rechtevergabe anhand der E-Mail, einzelne Werkstattrechte, Sperre direkter URLs, fehlende Administrationsrechte, widerrufene Mitarbeitersitzungen.
- Codespace tatsächlich angelegt; Port 4173 blieb privat. Dessen Tunnel wurde beobachtet: interner Host `localhost:4173`, öffentliche Adresse in `X-Forwarded-Host`, HTTPS in `X-Forwarded-Proto`, Loopback-Absender. Gezielt dafür ergänzte Validierung mit negativen Tests für gefälschte Hosts, entfernte Clients und Proxyketten. Origin-/CSRF-Schutz sowie Secure-Cookie über diesen Weg getestet.
- Persönliches Entwicklerkonto und gemeinsamer Mitarbeiterzugang sind noch offen. Neue Passwörter legt der Besitzer selbst fest; keine Zugangsdaten werden ins Repository geschrieben. Der vorhandene GitHub-Pages-Zugang wurde nicht verändert.
