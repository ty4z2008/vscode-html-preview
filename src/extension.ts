import * as vscode from 'vscode'
import { isHTML, isSupportFile } from './utils'
import { join as pathJoin } from "path"

export function activate(context: vscode.ExtensionContext) {
  let htmlShowPreview = vscode.commands.registerCommand('html.realtimePreview', () => {
    const activeTextEditor = vscode.window.activeTextEditor
    let ishtml = isHTML(activeTextEditor)
    if (!ishtml) return
    RealtimePreview.createOrShow(context, activeTextEditor)
  })
  context.subscriptions.push(htmlShowPreview)
  vscode.window.showInformationMessage('start preview')
}
function debounce(fn, wait) {
  let callback = fn
  let timer = null
  function debounced() {
    let context = this
    let args = arguments
    clearTimeout(timer)
    timer = setTimeout(function () {
      callback.apply(context, args)
    }, wait)
  }
  return debounced
}

class RealtimePreview {
  /**
   * current webview panel
   */
  public static currentPanel: RealtimePreview | undefined
  public static readonly viewType = 'realtimePreview'
  private readonly _panel: vscode.WebviewPanel
  private readonly _extensionPath: string
  private readonly _activeTextEditor: vscode.TextEditor
  private _fileUrl: string | vscode.Uri
  private readonly _context: vscode.ExtensionContext

  private _disposables: vscode.Disposable[] = []
  private constructor(context: vscode.ExtensionContext, panel: vscode.WebviewPanel, activeTextEditor: vscode.TextEditor) {
    this._panel = panel
    this._context = context
    this._extensionPath = context.extensionPath
    this._activeTextEditor = activeTextEditor
    this._update()
    this.bindEvent()
  }
  private _update() {
    const {
      webview,
    } = this._panel
    // set its HTML content
    webview.html = this.getWebviewContent(this._extensionPath, this._activeTextEditor)
  }
  private bindEvent() {
    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables)
    const rootPath = vscode.workspace.rootPath
    //watch file change in the workspace
    const watcher = vscode.workspace.createFileSystemWatcher(rootPath + '/**/*', true, false, true)
    watcher.onDidChange(debounce(e => { // 文件发生更新
      // vscode.window.showInformationMessage('file change')
      this._panel.webview.postMessage({ command: 'refresh' })
      this._update()
    }, 500))
    //when active editor close,it's dispose the preview panel 
    vscode.workspace.onDidCloseTextDocument(e => {
      const closeFileName = e.fileName
      const activeFileName = this._activeTextEditor.document.fileName
      if (activeFileName === closeFileName) {
        this._panel.dispose()
      }
    })
    this._panel.webview.onDidReceiveMessage(
      async message => {
        switch (message.command) {
          case 'setView':
            let fileUrl = message.text
            if (isSupportFile(fileUrl)) {
              this._fileUrl = this._panel.webview.asWebviewUri(fileUrl)
            } else {
              this._fileUrl = await vscode.env.asExternalUri(
                vscode.Uri.parse(fileUrl)
              )
            }
            this._update()
            return
          case 'message':
            vscode.window.showInformationMessage(message.text)
            return
        }
      },
      undefined,
      this._context.subscriptions
    )
  }

  public dispose() {
    RealtimePreview.currentPanel = undefined
    // Clean up our resources
    this._panel.dispose()
    while (this._disposables.length) {
      const x = this._disposables.pop()
      if (x) {
        x.dispose()
      }
    }
  }
  /**
   * createOrShow
   */
  public static createOrShow(context: vscode.ExtensionContext, activeTextEditor: vscode.TextEditor): void {
    const extensionPath = context.extensionPath
    const column = activeTextEditor ? activeTextEditor.viewColumn : undefined
    const currentPanel = RealtimePreview.currentPanel
    if (currentPanel) {
      currentPanel._panel.reveal(column)
      return
    }
    const panel = vscode.window.createWebviewPanel(
      'realtimePreview',
      'Realtime Preview',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        enableFindWidget: true,
        localResourceRoots: [
          vscode.Uri.file(pathJoin(extensionPath, 'public')),
          vscode.Uri.file(vscode.workspace.rootPath)]
      }
    )
    RealtimePreview.currentPanel = new RealtimePreview(context, panel, activeTextEditor)
  }
  public addRestStyles(extensionPath: string, html: string): string {
    let styleLocalpath = vscode.Uri.file(
      pathJoin(extensionPath, 'public', 'reset.css')
    )
    const {
      webview
    } = this._panel
    let resetCssPath = webview.asWebviewUri(styleLocalpath)
    let styles = `<link href="${resetCssPath}" rel="stylesheet" type="text/css"/>`
    html = html.replace(/<\/head>/i, `${styles}</head>`)
    return html
  }
  public getWebviewContent(extensionPath: string, activeTextEditor: vscode.TextEditor) {
    let filePath = activeTextEditor.document.fileName
    const {
      webview
    } = this._panel
    let fileLocalpath = vscode.Uri.file(filePath)
    let fileUri = this._fileUrl || webview.asWebviewUri(fileLocalpath)
    let plainText = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Preview</title>
          <style type="text/css">
            body {
              padding: 0;
              margin: 0;
              background:#fff;
            }

            #preview {
              border: none;
              height: 100vh;
              width: 100vw;
              background: #fff;
            }
            .url-container{
              padding:2px 5px;
              box-shadow: 1px 2px 2px #eee;
              border-bottom: 1px solid #eee;
              display:flex;
              align-items:center;
              height:56px;
            }
            .url-container .url-input{
              -webkit-appearance: none;
              -webkit-font-smoothing: antialiased;
              background-color: transparent;
              border: none;
              box-shadow: none;
              color: #333;
              font-family: 'Roboto','Noto',sans-serif;
              font-size: 16px;
              font-weight: 400;
              line-height: 24px;
              margin-left: 4px;
              max-width: 100%;
              outline: none;
              text-align: inherit;
              padding:0 5px;
              border:1px solid #d3d3d3;
              width: 100%;
              height: 40px;
             border-top-left-radius: 3px;
              border-bottom-left-radius: 3px;
              outline:none;
            }
            .url-container .view-btn{
              cursor: pointer;
              width: 65px;
              border: 1px solid #d3d3d3;
              background-color: #f8f8f8;
              border-top-right-radius: 3px;
              border-bottom-right-radius: 3px;
              margin: 0;
              height: 42px;
              border-left: 0;
              font-size:16px;
              outline:none;
            }
          </style>
      </head>
      <body>
          <div class="url-container">
            <input type="text" placeholder="" class="url-input" value="${fileUri}"/>
            <button class="view-btn" type="button">View</button>
          </div>
          <iframe src="${fileUri}" id="preview" width="100%" allowfullscreen></iframe>
          <script>
            (function() {
                const iframe = document.getElementById('preview');
                const inputEl = document.querySelector('.url-input')
                const viewBtnEl = document.querySelector('.view-btn')
                const vscode = acquireVsCodeApi();
                // Handle the message inside the webview
                window.addEventListener('message', event => {
                    const message = event.data; // The JSON data our extension sent
                    switch (message.command) {
                        case 'refresh':
                            iframe.src=iframe.src
                            break;
                    }
                });
                iframe.addEventListener('error',function(err){
                  console.log(err)
                  vscode.postMessage({
                      command: 'message',
                      text: JSON.stringify(err)
                  })
                },false)
                inputEl.addEventListener('keypress', function (e) {
                    if (e.key === 'Enter') {
                      setViewUrl(inputEl.value)
                    }
                })
                viewBtnEl.addEventListener('click',function(e){
                  setViewUrl(inputEl.value)
                })
                function setViewUrl(value){
                  vscode.postMessage({
                      command: 'setView',
                      text: value
                  })
                }
            }())
        </script>
      </body>
      </html>
    `
    plainText = this.addRestStyles(extensionPath, plainText)
    return plainText
  }
}
export function deactivate() { }
