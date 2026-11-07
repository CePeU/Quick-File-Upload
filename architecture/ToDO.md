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
- comment the code in a meaningfull way which explains what the code does and why. Place the code above single code lines else and use // instead of /\* \*/ for comments
- functions and methods can be explained with /\* \*/ comments with a description of what the function does, what parameters it takes and what the parameter types and are and what it returns
- if the parameters of a function or method are less than 10 concrete values list them also in the comment and explain what they do
- put settings in their own settings.js file if applicable and export them as a settings object into the code base with a settings object containing all settings with meaningfull settings names and their default values
- name own code properties with a capital letter but do not use camel case for them and if possible restrict them to one word only
- leave Foundry methods and functions and constants untouched by the naming convention rules
- passe die module.json versionsnummer an nachdem die changes oder bugs bearbeitet wurden nutze das schema "major.minor.patch". Erzeuge einen lokalen git commit mit aussagekräftiger commit Nachricht
- Die CHANGELOG.md Datei ist im Verzeichnis docs zu finden
- Führe ein History.md file im Verzeichnis in dem sich ToDO,md befindet in dem die BUG and CHANGE anforderungen dieser datei hineinkopiert werden so das sich ein changelog der anforderungen ergibt.

# BUG

1. Der Button Show to players funktioniert nicht. Drop to action erlaubt die auswahl von "Show image to players". Genau das sollte der button "Show to players" erlauben. (Vielleicht war die spezifikation nicht korrekt - es soll die ausgewählte Bilddatei den Spielern gezeigt werden und nicht im chat - bei diesem button)

2. Der JSON export funktioniert nicht. Ich erhalte die Fehlermeldung "Holen Sie sich eine App, um diesen "blob" - Link zu öffnen". Ziel dieser funktion ist ein JSON zu schreiben das die Setting informationen für dieses Modul hält damit man diese importieren kann auf einer anderen Foundry instanz.
   ![alt text](image.png)

# Change
