# Gemeinsame Testphase auf GitHub

Die Anwendung und die SQLite-Datenbank können zum Entwickeln und Testen in **einem gemeinsamen GitHub Codespace** laufen. Eure Mitarbeiter benötigen dafür keine Installation. GitHub Pages ist ein anderer Dienst: Dort laufen weder dieses Backend noch die Anmeldung oder Datenbank.

## Zugang festlegen

| Zugang | Wer erreicht die Anmeldeseite? | Wer kommt ins Tool? |
| --- | --- | --- |
| Codespaces-Port **Private** | Nur der Besitzer des Codespace mit seinem GitHub-Konto | Zusätzlich eigenes Tool-Konto nötig; für deinen ersten Test |
| **Private to Organization** | Mitglieder der GitHub-Organisation; GitHub Team oder Enterprise Cloud erforderlich | Zusätzlich eigenes Tool-Konto mit passender Lizenz/Berechtigung |
| Port **Public**, Tool-Login vorgeschaltet | Jeder mit dem Link kann die Loginseite aufrufen | Nur von dir angelegte Tool-Konten; keine Selbstregistrierung |

Ein privater Port lässt sich nicht einfach an einzelne Mitarbeiter weitergeben. Das aktuelle Repository gehört dem persönlichen Konto `Predrag-Pedi`; die Organisationsfreigabe steht dafür nicht zur Verfügung. Niemals dein GitHub-Passwort oder Zugriffstoken mit Mitarbeitenden teilen.

Wenn auch die Loginseite für Aussenstehende unerreichbar bleiben soll, zuerst eine passende GitHub-Firmenorganisation einrichten und die Testumgebung dort betreiben. Ein öffentlicher Port mit verpflichtendem Tool-Login schützt den Zugang zur Anwendung, erfüllt aber nicht diese strengere Anforderung. Keine der Einstellungen wird durch diesen Code automatisch öffentlich geschaltet.

## Einen gemeinsamen Testbetrieb starten

1. In GitHub den Branch mit dem Firmenportal wählen (solange der PR offen ist: `codex/company-accounts-and-licenses`). Unter **Code → Codespaces** einen Codespace anlegen. GitHub zeigt verfügbare Ressourcen und gegebenenfalls Kosten an.
2. Der Server startet mit der beiliegenden Konfiguration automatisch. Das gilt auch nach dem erneuten Start desselben Codespace. Beim Übernehmen der Konfiguration in einen bestehenden Codespace einmal **Rebuild Container** verwenden.
3. Einmalig im Codespaces-Terminal `npm run admin:init` ausführen und dein persönliches Entwicklerkonto mit Benutzername oder E-Mail anlegen. Das Passwort wird verdeckt eingegeben. Es gibt kein voreingestelltes Konto.
4. Unter **Ports** die Adresse von Port **4173** im Browser öffnen. Beim ersten Test die Sichtbarkeit **Private** lassen. Die öffentliche Browseradresse verwendet HTTPS; der interne Port bleibt HTTP, weil GitHub die Browserverbindung verschlüsselt entgegennimmt.
5. Auf der Startseite oben **Login** wählen. Nach der Anmeldung erscheint das Werkzeug-Dashboard mit deinem Namen und «Entwickler» unten links. Im zusätzlichen Werkzeug **Lizenzen & Berechtigungen** einen Betrieb samt Paket/Laufzeit anlegen und über **Betrieb öffnen → Benutzer anlegen** eure Mitarbeiter erstellen. Firmenadministratoren werden ausschliesslich durch dich bestimmt. Startpasswörter persönlich weitergeben. Jeder Mitarbeiter muss sein Startpasswort bei der ersten Anmeldung ändern.
6. Für den gemeinsamen Test die oben gewählte Portfreigabe bewusst einstellen. Allen Mitarbeitern dieselbe Portaladresse geben. **Nicht für jeden Mitarbeiter einen eigenen Codespace anlegen** – das würde getrennte Datenbanken erzeugen.

Der Codespace muss während des Tests laufen. Nach Inaktivität stoppt er automatisch (standardmässig nach 30 Minuten; konfigurierbar). Die maximale Laufzeit einer Sitzung beträgt 12 Stunden. Der Besitzer startet ihn dann erneut. Eine rund um die Uhr laufende Kundenplattform ist Codespaces nicht.

## Herkunftsprüfung im Codespaces-Tunnel

GitHub kann neben `Host` auch `Origin` auf `https://localhost:4173` umschreiben. Diese Anfrage wird nur im ausdrücklich erkannten Codespace akzeptiert: Loopback-Verbindung, richtiger interner Port, exakt passende öffentliche Adresse in `X-Forwarded-Host`, HTTPS, `Sec-Fetch-Site: same-origin` und eine `Referer`-Adresse derselben öffentlichen Anwendung. Ohne diese Merkmale gilt weiterhin die exakte konfigurierte Herkunftsadresse. Der CSRF-Token für angemeldete Änderungen bleibt zusätzlich erforderlich. Keine Freigabe für beliebige localhost-Adressen oder Codespaces-Subdomains.

## Bisherigen öffentlichen Zugang schliessen

Das aktuelle Repository ist öffentlich. Der neue Login schützt den neuen Backendbetrieb, nicht automatisch die bereits veröffentlichte GitHub-Pages-Einzelplatzversion oder den Quellcode.

Sobald der gemeinsame Testzugang funktioniert, in **Repository → Settings → Pages** die bisherige Pages-Veröffentlichung aufheben. Wenn auch Quellcode und mitgelieferte Dateien intern bleiben sollen, das Repository zusätzlich auf **Private** umstellen. Diese Kontoeinstellungen müssen tatsächlich in GitHub geändert werden; ein Pull Request allein erledigt das nicht. Die alte Pages-Version enthält lokal gespeicherte Browserprojekte: Vor dem Wechsel wichtige Projekte exportieren und danach bewusst in den richtigen Testbetrieb importieren.

## Daten behalten und später umziehen

- Anwendungscode wird weiterhin über Branches und Pull Requests entwickelt. Der gemeinsame Codespace verwendet einen bestimmten Branch; Änderungen dort mit Git übernehmen und den Server neu starten.
- Firmen, Benutzer, Passwort-Hashes und Projekte liegen in `runtime/platform.sqlite`, nicht im Git-Repository. `.gitignore` schliesst Datenbank, Logs und Sicherungen aus.
- Stoppen und Wiederstarten desselben Codespace behält die Daten. **Löschen** des Codespace oder automatische Löschung nach der Aufbewahrungsfrist entfernt diese Daten. Vorher mit `npm run db:backup` sichern und die Sicherung geschützt herunterladen. Keine unverschlüsselte Datenbank in einen öffentlichen Branch hochladen.
- Später die gesicherte Datenbank auf den eigenen Server übernehmen. Die Konten und Testbetriebe können erhalten bleiben. Produktivbetrieb und Sicherungen sind in [FIRMENPORTAL.md](FIRMENPORTAL.md) beschrieben.

## Prüfvorschlag

Zwei Testbetriebe anlegen und je einen Administrator sowie Mitarbeiter verwenden. Dann fehlende Modulrechte, Lesezugriff, Bearbeiten, Lizenzablauf, Firmenlogo/Adresse und gleichzeitig geänderte Projekte prüfen. Für verschiedene Benutzer getrennte Browserprofile nutzen. Ein Testkonto aus Betrieb A darf kein Projekt aus Betrieb B sehen. Der Entwickler kann bewusst zwischen Betrieben wechseln.

## Quellen

- [Codespaces: Portfreigaben und Organisationszugang](https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace)
- [Codespaces: Laufzeit und Inaktivität](https://docs.github.com/en/codespaces/setting-your-user-preferences/setting-your-timeout-period-for-github-codespaces)
- [Codespaces: Lebenszyklus und Daten](https://docs.github.com/en/codespaces/getting-started/understanding-the-codespace-lifecycle)
