import { TextEditor, window } from 'vscode'


export const isHTML = function (viewPanel: TextEditor) {
  let result = viewPanel.document.languageId.toLowerCase() === "html"
  if (!result) {
    window.showInformationMessage("The current editor doesn't show a HTML document.")
  }
  return result
}

export const isSupportUrl = function (url: string): boolean {
  if (!url) return false
  const expression = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi
  const regex = new RegExp(expression)
  return regex.test(url)
}

export const isSupportFile = function (url: string): boolean {
  if (!url) return false
  const expression = /^(file|\/)/
  const regex = new RegExp(expression)
  return regex.test(url)
}
