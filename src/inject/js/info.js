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
        this.tabObserver();
    };
    bindBtns = () => {
        var link = document.getElementById('controlPageLink')
        link.setAttribute("href", `${this.maestroUrl}/#/stages/${this.stageId}/control/`);
    };
    tabObserver = () => {
        $('.nav-tabs a').click(function (e) {
            e.preventDefault();
            $(this).tab('show');
        });
        $("ul.nav-tabs > li > a").on("shown.bs.tab", async (e) => {
            var id = $(e.target).attr("href").substr(1);
            await this.saveLocalSetting('activeInfoTab', id);
            document.location.hash = `${id}`;
        });
        if (document.location.hash) {
            $('.nav-tabs a[href="' + document.location.hash + '"]').tab('show');
        } else {
            this.getLocalSetting('activeInfoTab').then(tab => {
                $('.nav-tabs a[href="#' + tab + '"]').tab('show');
            });
        }
    };
};
maestro.InfoPage = new InfoPage(document.currentScript.src);