
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


# BUG
No open Bug

# Implemented in 1.10.0 (2026-11-01)
All four changes below are implemented. Settings: Window and appearance (clipboard button name/color and initial All groups state).

# Change
If I click the drop pad then sometimes I get the button there for the local file selection dialog. Also then CTRL+V for the clipboard insert does not work. 

1) Add a button for clipboard import below the drop pad but still in the drop pad area (so calculations made on size of that arrea also apply to that button). The button should be colored differently (the color should be selectable and be able to be set in the settings). The buttons name should also be customizable in the settings. The button should have a tooltip with a description of its function. Default name of the button should be "Clipboard import"
Ideally an active drop pad still allows for a CTRL+V import - but I am not sure if a button is needed for that.

2) Make the local file selection dialog button in the drop pad smaller. Ideally it only encompasses the "cloud" symbol. The drop pad text should be displayed below the cloud symbol as it is the case allready and not be part of the button. Draging and dropping onto the pad should still be possible. If the drag and drop operation requires a button to be placed in the drop pad area, then that button for file selection should be moved out of the drop pad area and placed in the section where the checkbox all groups are displayed and then the file selection dialog button should not be part of the drop pad area at all. Place the button in that caseat the top of the button list in that section.

3) Add a button to get the Foundry file selection dialog to the section encompassing the all Group selection checkbox. Place it below the button "Upload-Aktionen und Zwischenablage".

4) I did not find settings to set a defaul for the checkbox "Alle Gruppen" if there is one allready then tell me where to find it. If it is not yet implemented then implement it so the default state of the "Alle Gruppen" Checkbox can be set in the Foundry settings.
