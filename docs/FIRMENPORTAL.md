# Firmenportal: Test und Serverbetrieb

Diese Erweiterung ergänzt die vorhandenen Werkzeuge um eine echte Anmeldung und eine gemeinsame, nach Betrieben getrennte SQLite-Datenbank. Der Code bleibt in GitHub. Passwörter, Sitzungen, Logos, Projekte und die Datenbank gehören **nicht** ins Repository.

## Erster Test

Node.js 24 wird benötigt; es gibt keine zusätzlich zu installierenden npm-Pakete. Im Projektordner:

```sh
npm run admin:init
npm start
```

Das erste Kommando legt interaktiv dein persönliches Entwicklerkonto an. Es gibt kein voreingestelltes Passwort. Öffne danach `http://127.0.0.1:4173`. Die Startseite zeigt Werkzeugbeispiele. Oben über Login anmelden; danach öffnet sich das bekannte Werkzeug-Dashboard. Das Entwicklerkonto hat einen eigenen, getrennten Arbeitsbereich mit Vollzugriff. Unter «Lizenzen & Berechtigungen» einen Betrieb samt Paket, Laufzeit und Benutzerplätzen anlegen, dann «Betrieb öffnen → Benutzer anlegen» verwenden. Das zufällig erzeugte Startpasswort wird einmal angezeigt und muss beim ersten Login geändert werden. Nur der Plattformbetreiber legt Benutzer an oder setzt Startpasswörter zurück.

Alternativ in GitHub unter **Code → Codespaces → Create codespace** öffnen. Die beiliegende Devcontainer-Konfiguration stellt Node 24 und Port 4173 bereit. Der Server startet dort automatisch. Nur einmal `npm run admin:init` ausführen und dann den weitergeleiteten Port öffnen. Die gemeinsame Nutzung mit Mitarbeitern ist in [GITHUB-TESTPHASE.md](GITHUB-TESTPHASE.md) beschrieben. Die öffentliche HTTPS-Adresse wird aus den Codespaces-Umgebungsvariablen ermittelt. Den Port für den eigenen Test **privat** lassen. Ein Codespace ist eine Testumgebung, kein dauerhafter Kundenserver. Vor dem Löschen eine Datenbanksicherung herunterladen.

GitHub Pages kann weiterhin die bisherige lokale Einzelplatzversion anzeigen. Ein Merge aktiviert dort **kein** Login und keine Datenbank. `login.html` weist auf die fehlende Servereinrichtung hin. GitHub Pages unterstützt kein Node-Backend und ist nicht als Hosting für kommerzielles SaaS vorgesehen. Für den Kundenbetrieb wird die gesamte Anwendung über den Backend-Server ausgeliefert.

## Rollen, Pakete und Daten

| Rolle | Rechte |
| --- | --- |
| Entwickler | Alle Betriebe, Benutzer, Pakete, Laufzeiten und Änderungen sehen; Benutzer und Firmenadministratoren anlegen; eigener Arbeitsbereich mit allen Werkzeugen; bewusst in einen Kundenbetrieb wechseln |
| Firmenadministrator | Logo/Adresse und Werkzeugrechte der eigenen Mitarbeitenden verwalten; Administratorrollen bestimmt der Entwickler |
| Mitarbeiter | Werkzeuge gemäss Paket und persönlicher Freigabe verwenden |

Das Kontomenü unten links zeigt Name und Betrieb beziehungsweise «Entwickler». Firmenadministratoren öffnen dort Firmeneinstellungen und Mitarbeitende. Benutzer melden sich wahlweise mit einem vom Betreiber vergebenen Benutzernamen (3–64 Zeichen, Buchstaben/Ziffern/Punkt/Unterstrich/Bindestrich) oder einer E-Mail-Adresse an. Anmeldenamen werden ohne Beachtung der Gross-/Kleinschreibung eindeutig geprüft. Eine E-Mail ist bei Benutzername-Anmeldung nicht erforderlich. Aus einer E-Mail-Adresse allein werden niemals Entwicklerrechte abgeleitet. Aus Kompatibilitätsgründen speichert die bisherige SQLite-Spalte `users.email` den normalisierten Anmeldenamen; die API gibt `login`, `username` und gegebenenfalls `email` getrennt aus.

Pro Werkzeug sind **kein Zugriff**, **Lesen** oder **Lesen und bearbeiten** möglich. Lesen verhindert das Speichern und Löschen am Server; die bestehenden Zeichenoberflächen können weiterhin lokale Änderungen und Exporte erlauben. Lizenz und Rechte werden bei jedem Serverzugriff geprüft. Werkstattwerkzeuge sind einzeln freigebbar; die drei technischen Tabellen teilen eine Seite, deren Navigation nur freigegebene Tabellen anzeigt. Die Seite wird serverseitig nur bei mindestens einer Tabellenfreigabe ausgeliefert. Diese fachlichen Referenztabellen sind keine getrennten vertraulichen Datensätze. Ältere pauschale Werkstattrechte bleiben kompatibel. Abgelaufene/gesperrte Betriebe können ihre Projekte nicht öffnen; die Daten werden nicht gelöscht. Firmenadministratoren können weiterhin ihre Stammdaten und Benutzer sehen. Der Entwickler behält Zugriff für Betreuung und Verlängerung.

Als anpassbare Vorgaben bestehen Basis (Werkstatt/EW), Planung (zusätzlich Schema/Dispo) und Komplett (zusätzlich Offerten/Wärmeberechnung). Die Laufzeit gilt einschliesslich Enddatum in Schweizer Zeit. Benutzerplätze zählen aktive Firmenbenutzer. Preise, Bestellstrecke, Zahlungen und automatische Verlängerungen sind noch nicht angebunden; Pakete und Laufzeiten werden manuell verwaltet.

CAD-Projekte, Offerten, eigene Artikel und Wärmeprojekte/Vorlagen werden im Serverbetrieb je Betrieb gespeichert. Versionsprüfungen verhindern stilles Überschreiben gleichzeitiger Änderungen. Die Offertenliste wird aktuell als gemeinsamer Datensatz gespeichert: Bei gleichzeitiger Bearbeitung erscheint ein Konflikt statt eines Datenverlusts. Pro Betrieb gelten vorerst 500 MB, pro Anfrage 64 MB. Die Entwicklungsversion verwendet eine einzelne Node-Instanz mit SQLite.

Bestehende Browserprojekte werden nicht automatisch einem neuen Betrieb zugeordnet. Vorhandene Export-/Importfunktionen können zur bewussten Übernahme verwendet werden. Im Serverbetrieb gibt es keinen automatischen Rückfall auf den alten lokalen Projektspeicher. Browsercache und Offline-Serviceworker werden für diese Betriebsart deaktiviert.

Firmendaten gelten für alle Benutzer des Betriebs. Neue Betriebe starten ohne Logo und Absender. Schema-/Dispositionsrahmen und Offerten übernehmen die hinterlegten Daten; leere Felder bleiben leer. Importierte freie Texte und eigene Excel-/PDF-Vorlagen werden nicht pauschal umgeschrieben. Für kundenspezifische Wärmeberechnungsformulare die passende eigene Excel-Vorlage hinterlegen. Interne Importkennungen und ursprüngliche Quelldaten bleiben aus Kompatibilitätsgründen bestehen; sie sind kein sichtbarer Herstelleraufdruck.

## Später auf einen Server umziehen

Repository auschecken, Node 24 installieren, einen privaten beschreibbaren Datenordner anlegen und einen HTTPS-Reverse-Proxy vorschalten. Beispielwerte:

```sh
export NODE_ENV=production
export HOST=127.0.0.1
export PORT=4173
export APP_ORIGIN=https://portal.example.ch
export DATABASE_PATH=/srv/firmenportal-data/platform.sqlite
npm start
```

Die Umgebungsvariablen in der Prozessverwaltung des Servers hinterlegen; eine `.env` wird nicht automatisch eingelesen. Der spätere eigene Proxy muss den öffentlichen `Host` unverändert weitergeben, mindestens 64 MB Request-Grösse erlauben und HTTPS terminieren. Node bleibt auf Loopback. `APP_ORIGIN` enthält nur Schema und Host, ohne abschliessenden Schrägstrich. Nur in einem anhand der GitHub-Umgebung erkannten Codespace wird zusätzlich dessen Loopback-Tunnel akzeptiert: interner Host mit passendem Port, exakt passender `X-Forwarded-Host` und `X-Forwarded-Proto: https`. Fremde Hosts, Proxyketten und entfernte Clients werden abgewiesen. Mit einer Prozessverwaltung starten; keine SQLite-Datei über mehrere Serverinstanzen oder ein Netzwerk-Dateisystem teilen. Bei späterem horizontalem Ausbau kann die Datenzugriffsschicht auf PostgreSQL umgestellt werden.

Sicherungen nutzen die SQLite-Backup-API und funktionieren auch während des Betriebs:

```sh
npm run db:backup
# oder einen privaten Zielpfad ausserhalb des Repositories angeben:
npm run db:backup -- /srv/backup/portal-2026-11-19.sqlite
```

Die erzeugte Sicherung geschützt aufbewahren: Sie enthält Kundendaten und Passwort-Hashes. Zum Umzug den Zielserver stoppen, die Sicherung als `DATABASE_PATH` einsetzen (Rechte 0600), bestehende Sitzungen löschen und den Server starten. Keine unvollständige Kopie einer laufenden WAL-Datenbank verwenden. Wiederherstellung und regelmässige Sicherungen vor echtem Kundenbetrieb einrichten.

Passwörter werden mit scrypt gespeichert; Sitzungen verwenden HttpOnly-/SameSite-Cookies und bei HTTPS das Secure-Attribut. Schreibzugriffe prüfen Origin und CSRF, die Datenzugriffe den Betrieb und das aktuelle Benutzerkonto. Ein Startpasswortwechsel ist Pflicht. Kein öffentliches Registrieren und kein automatischer E-Mail-Versand. Zwei-Faktor-Anmeldung, E-Mail-Wiederherstellung und Zahlungsanbieter sind noch nicht Bestandteil dieser Testversion. Vor bezahltem Produktivbetrieb sind ein Sicherheitsreview und der konkrete Hosting-/Backupbetrieb erforderlich.

## Prüfungen und Quellen

`npm test` führt bestehende Werkzeugtests sowie neue Tests für Mandantentrennung, Lizenz-/Rollenprüfung, Sitzungen, Versionskonflikte, Firmenbranding und binäre Excel-Daten aus.

- [GitHub Pages: Limits und SaaS](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Codespaces: Umgebungsvariablen](https://docs.github.com/en/codespaces/developing-in-a-codespace/default-environment-variables-for-your-codespace)
- [Codespaces: Portfreigaben](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)
- [Node 24: SQLite-Backup](https://nodejs.org/docs/latest-v24.x/api/sqlite.html#sqlitebackupsourceDb-path-options)
