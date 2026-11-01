
# General Information
I need a module for Foundry VTT v14. It should use the Application v2 framework.
The goal is a module that allows to start an app/window which offers a download pad/area where local files can be dragged and dropped uppon.
The application will recognize this and then those files will be uploaded to the server and saved in specific directory on the server.

If you have questions or need answers to determine the correct course of the implementation then ask.

If you need more context you can look into History.md which will hold all historical changes and bugs and the original specs,

## Coding style
- use only one to two ternary operators max 3 unless not otherwise possible. Try to write them rather in if statements if possible
- write conditions in if statements rather like if(xxx === 0) instead of if(xxx). The same applies for ! or for null
- use meaningfull variables, methods and function names of at least 2 up to 3 words in camel case for own code (not necessary for pure counting variables like for loop i or j etc variables)
- name own code functions in camel case starting with a capital letter
- defined constants of own code are all in capital letters but start with a prefix containing the start letters of the module name. Ignore special characters between words of the module name and treat them as spaces which are irrelevant for this special requirement
- own code is code not belonging to foundry functions, methods, constants or variables
- generate code with the Foundry native i18n translations function game.i18n.localize()
- repeat any code with an i18n translation with the englisch translation text instead of the i18n placeholder as a seperate comment line after the code line containing the i18n placeholder
- use only foundry v14 API functions
- comment the code in a meaningfull way which explains what the code does and why. Place the code above single code lines else and use // instead of /* */ for comments
- functions and methods can be explained with /* */ comments with a description of what the function does, what parameters it takes and what the parameter types and are and what it returns
- if the parameters of a function or method are less than 10 concrete values list them also in the comment and explain what they do
- put settings in their own settings.js file if applicable and export them as a settings object into the code base with a settings object containing all settings with meaningfull settings names and their default values
- name own code properties with a capital letter but do not use camel case for them and if possible restrict them to one word only
- leave Foundry methods and functions and constants untouched by the naming convention rules 
- passe die module.json versionsnummer an nachdem die changes oder bugs bearbeitet wurden nutze das schema "major.minor.patch". Erzeuge einen lokalen git commit mit aussagekräftiger commit Nachricht
- Die CHANGELOG.md Datei ist im Verzeichnis docs zu finden


# BUG
No open Bug

# Change

Umgesetzt in Version 1.11.0 (2026-11-01): Punkte 1 bis 7. Clipboard-Standards können normale Datei-Regeln überspringen; explizite Clipboard-Regeln behalten Vorrang. Die Aktion verarbeitet die gewählte Datei vor dem Upload. Dokumentation: docs/clipboard-import.md.

1) Füge den Regeln eine weitere Option hinzu um festzulegen ob ein Clipboard import stattgefunden hat. Diese Regel greift dann nur wenn es sich um einen Clipboard import handelt.

2) Handelt es sich bei dem Clipboard import um ein Bild kann man hier auch festlegen ob es als PNG, WebP oder JPG gespeichert werden soll oder den in den settings gespeicherten Standardeintrag nutzen. (Das Modul soll das format erkennen und gegebenenfalls auch in das entsprechende korrekt format überführen)

3) Erweitere die Settings mit einem neuen Eintrag "Clipboard Import" der es erlaubt festzulegen in welchem Format der Clipboard import default mäßig stattfindet wenn es sich um ein Bild handelt. Das Bild sollte als PNG, Webp oder jpg gespeichert werden können.

4) Füge den Settings einen Eintrag hinzu der es erlaubt den Standard Clipboard speicherpfad festzulegen bzw. fallback falls der Pfad nicht in den Regeln definiert ist.

5) Füge den Clipboard settings einen Eintrag hinzu der es erlaubt festzulegen das alle Clipboard imports nach den Regeln die in den Settings abgelegt sind behandelt werden. Eine spezifische Clipboard Regel in einer der Regeln hat jedoch vorrang vor der Standard clipboard Regel.

6) Füge den Clipboard settings einen Eintrag hinzu der es erlaubt festzulegen mit welchen Standardnamen ein clipboard import erfolgt und wie eine Namenserweiterung erzeugt wird. Mir schwebt für die Namenserweiterung ein separates Modal Fenster vor in dem mehrere Einträge vorhanden sind die per drag and drop sortiert werden können und in die Einträge aus einem Nebenfenster/Nebenfeld hineingezogen werden. Andere wählbare Einträge aus einem anderen Fenster des Modal sind Jahr, Tag, Monat, Stunde, Minute, Sekunde, Trennzeichen (z.B.Punkt, unterstrich, dash, Leerzeichen), Vergangene Sekunden (Zeitstempel), Zufallszahl, hash (sha256), beim Import aktiver Gruppenname. Die Einträge aus dem Fenster sind erweiterbar und löschbar. So kann ein Trennzeicheneintrag hinzugefügrt werden und definiert werden welches Zeichen zu nutzen ist. Für das Jahr, den Tag, den Monat, die Stunde, Minute und die Sekunde können die üblichen definitionen verwendet werden (zb. YYYY oder YY, MM, MMM, DD, HH, mm, ss) oder zB. YYYY-MM-DD etc. Für Zufallszahlen kann die Anzahl der Stellen definiert werden. Per plus button können neue Einträge erzeugt werden und per trash button gelöscht. Ein doppelklick öffnet die Definitionsmaske für Zeichenart, Anzahl stellen etc.
Die per drag and drop herübergezogenen Namenserweiterungen können per trash button entfernt werden.


Beispiel wie ein Name gebildet wird:
Standardname: clipboard-image
Erweiterung 1 Eintrag: Trennzeichen (_)
Erweiterung 2 Eintrag: Jahr (YYYY)
Erweiterung 3 Eintrag: Trennzeichen (_)
Erweiterung 4 Eintrag: Monat (MM)
Erweiterung 5 Eintrag: Trennzeichen (_)
Erweiterung 6 Eintrag: Zufallszahl (4))

Ergebnis wäre z.B: clipboard-image_2024_10_1234.png

Ergibt sich kein Name so wird "clipboard_" gewählt und sekunden seit 1970 verwendet.

Erzeuge den Code in diesem Fall als eigenständigen Datei die per Import eingebunden wird und eine funktion zur verfügung stellt die den Namen liefert und an die man einen Settingseintrag übergibt in dem die für diese funktionalität notwendigen Einträge abgelegt werden.

Ziel wäre es diesen Code wie eine library weiterverwenden zu können. Mit dem funktionsaufruf übergibt man dem Code wo er seine settings speichern kann und von wo er seine settings liest.
Die Funktion liefert als ergebnis den fertigen namen.


7) Füge eine weitere vordefinierte Aktion hinzu "Clipboard Import". Die Ausgewählte Gruppe verhält sich dann als hätte sie einen Clipboard import mit der Standardauswahl für die Bild Dateiendung.