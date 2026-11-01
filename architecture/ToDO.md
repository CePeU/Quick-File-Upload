
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

# Change

Umgesetzt in Version 1.13.0 (2026-11-01): Punkte 1–5. Sprachabhängige Hilfe in help/en_help.json und help/de_help.json, aktualisierte Themen und geprüfte Regex-Beispiele, Hilfe zuletzt und klickbarer Dokumentationslink. Fehlende oder ungültige Hilfedateien blenden den Eintrag aus. Bei den Dateiendungsbeispielen wurde das @ als Alternativzeichen durch das korrekte | ersetzt.

1) Ändere die Beispielhaft angezeigte Regex Regel die in den Regeln derzeit angezeigt wird. Derzeit so /\.(png@webp)$/i sollte es so anzeigen "/\.(png@webp)$/i  oder .* für alle"

2) Die upload quick file upload - Hilfe soll eine JSON sein die geladen wird und angezeigt wird wie bisher mit aufklappen und text. Ziel ist es die Datei updaten zu können ohne es hardkodieren zu müssen. Lege dafür einen eigenen Ordner an. Analog zu den Übersetzungs JSON dateien soll es dort eine en_help.json und eine de_help.json geben. Eine nutzung von i18 translation strings ist nicht notwendig. Das json soll entsprechend der verwendeten Sprache ausgewählt werden und beinhaltet die korrekten Texte. Ist kein JSON vorhanden dann gibt es diesen Menüpunkt nicht.

3) Update die Quick File Upload - Hilfe so dass sie zur aktuelln Version passt. Gib dort beispiele für funktionierende Regex:
Alle Dateinamen: .*
Nur Dateiendung: /\.(png@webp)$/i
Teil des Dateinamens: /monster/i
vielleicht noch 2-3 weitere sinnvolle Beispiele

4) Setze die Quick File Upload Hilfe als letzten Button im settings menü.

5) Ändere den Tooltip text für Quick File Upload - Hilfe in "Beschreibung und Hilfen für Quick File Upload siehe auch https://cepeu.github.io/Quick-File-Upload/" dabei sollte der link clickbar sein und "Github Dokumentation" heißen.
