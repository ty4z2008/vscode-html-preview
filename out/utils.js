"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
exports.isHTML = function (viewPanel) {
    let result = viewPanel.document.languageId.toLowerCase() === "html";
    if (!result) {
        vscode_1.window.showInformationMessage("The current editor doesn't show a HTML document.");
    }
    return result;
};
exports.isSupportUrl = function (url) {
    if (!url)
        return false;
    const expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi;
    const regex = new RegExp(expression);
    return regex.test(url);
};
exports.isSupportFile = function (url) {
    if (!url)
        return false;
    const expression = /^(file|\/)/;
    const regex = new RegExp(expression);
    return regex.test(url);
};
//# sourceMappingURL=utils.js.map