const { app, BrowserWindow } = require('electron')

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    kiosk: true
  })

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()
})
