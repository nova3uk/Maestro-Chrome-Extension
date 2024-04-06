Setup Instructions.

1. Manifest must be edited to modify content_scripts/matches so that it has the url/ip of your maestro so that it will run on the maestro web control panel. if it is wrong it will not run.
2. The plugin is looking for fixtures with both a Color Wheel and a Shutter. It is not going to find anything else.
3. If you have a device with both a shutter and a color wheel but it is not one you want to be controlled by the plugin, then modify its name to inclucde the word "IGNORE", for example: "Chinese Laser IGNORE"
4. The script needs to know what is the OPEN dmx value and what SHUTTER dmx value to switch. You can tell it by modifying the name of your fixture so that it ends with for example: "_250:150" it is important that there is only one instance of an underscore (_) in the name!!! In this example 250 is the normal open dmx value, and 150 is the Strobe active value. You can adjust the second number if you want it to be faster/slower strobing.
5. Installing the plugin. You need to download the whole folder and save it somewhere suitable on your computer, if you downloaded a zip file then it needs to be expanded first.
6. In Chrome, go to Extension, Manage Extensions. Then you need to select the option to "Load unpacked", usually in the top left of the page, then select the folder you extracted in point 5.

Et voila - the plugin should be installed, configured and active. If it is not working, then the reason will be one of either you have not correctly put the web address of your maestro in the manifest, or you have not correctly renamed the fixtures to have only one underscore, and the correct dmx values, or worse that you are trying to effect fixtures without a colorwheel and shutter.
