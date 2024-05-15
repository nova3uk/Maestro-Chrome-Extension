"use strict";
"use strict";
var maestro = maestro || {};
class InfoPage extends Globals {
    constructor(scriptSource) {
        super();
        this.init();
    }
    init = async () => {
        this.maestroUrl = await this.getLocalSetting('maestroUrl');
        this.activeStage = await this.getLocalSetting('activeStage');
        this.stageId = this.activeStage.id;

        this.bindBtns();
    };
    bindBtns = () => {
        var link = document.getElementById('controlPageLink')
        link.setAttribute("href", `${this.maestroUrl}/#/stages/${this.stageId}/control/`);
    };
}
maestro.InfoPage = new InfoPage(document.currentScript.src);