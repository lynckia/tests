'use strict';
const Stream = require('./stream').Stream;

class Client {
  constructor(browser, baseUrl = 'http://licode:3001') {
    this.browser = browser;
    this.baseUrl = baseUrl;
  }

  connect(roomName = '', media = '', p2p = false) {
    let url = this.baseUrl + '?onlySubscribe=1&onlyPublish=1';

    if (roomName) {
      url += '&room=' + roomName;
    }
    if (media) {
      url += '&mediaConfiguration=' + media;
    }
    if (p2p) {
      url += '&type=p2p';
    }
    this.browser.url(url);
    this.browser.waitUntilRoomConnected();
  }

  createStream(config) {
    const stream = new Stream(this, config);
    return stream;
  }

  subscribe(stream, options = {}) {
    this.browser.subscribeStream(stream, options);
    this.browser.waitUntilStreamSubscribed(stream);
  }

  isSubscribed(stream) {
    return this.browser.isSubscribedToStream(stream);
  }

  disconnect() {
    this.browser.url('about:blank');
  }

  getNumberOfRemoteSubscriptions() {
    return this.browser.getSubscribedStreams();
  }
}

exports.Client = Client;
