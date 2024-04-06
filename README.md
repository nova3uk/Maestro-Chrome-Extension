MaestroDMX is an autonomous lighting designer-in-a-box that listens to music and makes decisions like a professional lighting designer. 
See https://www.maestrodmx.com/ for more information.

This Chrome Extension is currently only for the purpose of temporarily adding functionaity not yet available in the official software, by means of manipulation of the web interface. It is of course only available on versions of Chrome which can run Extensions, therefore desktop only not mobile.

Currently it supports 1 main function, adding the possibility to Strobe fixtures which depend on a Shutter, fixtures using normal RGB values will already work. In general this usually means moving head fixtures or similar with a color wheel. 

Additional features may be added in future if needed, but the extension should be seen as a temporary solution which should become redundant as the Maestro team release new updates.



Setup Instructions.

1. Manifest must be edited to modify content_scripts/matches so that it has the url/ip of your maestro so that it will run on the maestro web control panel. if it is wrong it will not run.
2. The plugin is looking for fixtures with both a Color Wheel and a Shutter. It is not going to find anything else.
3. If you have a device with both a shutter and a color wheel but it is not one you want to be controlled by the plugin, then modify its name to inclucde the word "IGNORE", for example: "Chinese Laser IGNORE"
4. The script needs to know what is the OPEN dmx value and what SHUTTER dmx value to switch. You can tell it by modifying the name of your fixture so that it ends with for example: "_250:150" it is important that there is only one instance of an underscore (_) in the name!!! In this example 250 is the normal open dmx value, and 150 is the Strobe active value. You can adjust the second number if you want it to be faster/slower strobing.
5. Installing the plugin. You need to download the whole folder and save it somewhere suitable on your computer, if you downloaded a zip file then it needs to be expanded first.
6. In Chrome, go to Extension, Manage Extensions. Then you need to select the option to "Load unpacked", usually in the top left of the page, then select the folder you extracted in point 5.

Et voila - the plugin should be installed, configured and active. If it is not working, then the reason will be one of either you have not correctly put the web address of your maestro in the manifest, or you have not correctly renamed the fixtures to have only one underscore, and the correct dmx values, or worse that you are trying to effect fixtures without a colorwheel and shutter.
