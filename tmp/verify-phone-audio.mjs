const webSocketUrl = process.argv[2]
const socket = new WebSocket(webSocketUrl)
let nextId = 0
let audioRequestId = null

const send = (method, params = {}) => {
  socket.send(JSON.stringify({id: ++nextId, method, params}))
}

socket.addEventListener('open', () => {
  send('Network.enable')
  setTimeout(() => send('Runtime.evaluate', {
    expression: `document.querySelector('[aria-label="Прослушать произношение слова August"]')?.click()`,
  }), 500)
})

socket.addEventListener('message', ({data}) => {
  const message = JSON.parse(data)
  const params = message.params ?? {}
  const url = params.request?.url ?? params.response?.url ?? ''

  if (url.includes('/dictionary/words/') && url.includes('/audio')) {
    audioRequestId = params.requestId
  }

  if (audioRequestId && params.requestId === audioRequestId) {
    if (message.method === 'Network.responseReceivedExtraInfo') {
      console.log(JSON.stringify({
        status: params.statusCode,
        contentType: params.headers?.['Content-Type'],
        contentLength: params.headers?.['Content-Length'],
      }))
    }

    if (message.method === 'Network.loadingFailed') {
      console.log(JSON.stringify({failed: params.errorText}))
      socket.close()
    }

    if (message.method === 'Network.loadingFinished') {
      console.log(JSON.stringify({loaded: true, bytes: params.encodedDataLength}))
      setTimeout(() => socket.close(), 2000)
    }
  }
})

setTimeout(() => socket.close(), 35_000)
