'use strict';
const Stream = require('./stream').Stream;

class Client {
  constructor(browser, baseUrl = 'http://licode:3001') {
    this.browser = browser;
    this.baseUrl = baseUrl;
  }

  async connect(roomName = '', media = '', p2p = false, singlePC = false) {
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
    if (singlePC) {
      url += '&singlePC=1';
    }
    await this.browser.url(url);
    await this.browser.waitUntilRoomConnected();
  }

  async connectToAnotherRoom(roomName = '', media = '', p2p = false) {
    await this.browser.connectToAnotherRoom(roomName, media, p2p);
    await this.browser.waitUntilAnotherRoomsConnected();
  }

  async createStream(config) {
    const stream = new Stream(this, 0, config);
    return stream;
  }

  async createStreams(numberOfStreams, streamsPerBrowser, config) {
    const streams = [];
    let browserIndex = -1;
    const sessions = await this.browser.session();
    const sessionIds = Object.keys(sessions).map(browser => sessions[browser].sessionId);
    for (let i = 0; i < numberOfStreams; i++) {
      if ((i % streamsPerBrowser) === 0) {
        browserIndex++;
      }
      streams.push(new Stream(this, sessionIds[browserIndex], config));
    }
    return streams;
  }

  async initStreams(streams) {
    await this.browser.createStreams(streams);
    await this.browser.initializeStreams(streams);
  }

  async publish(stream, options = {}) {
    if (stream instanceof Array) {
      await this.browser.publishStreams(stream, options);
      await this.browser.waitUntilStreamsPublished(stream);
    } else {
      await this.browser.publishStream(stream, options);
      await this.browser.waitUntilStreamPublished(stream);
    }
  }

  async subscribe(stream, options = {}) {
    if (stream instanceof Array) {
      await this.browser.subscribeToStreams(stream, options);
      await this.browser.waitUntilStreamsSubscribed(stream);
    } else {
      await this.browser.subscribeToStream(stream, options);
      await this.browser.waitUntilStreamSubscribed(stream);
    }
  }

  async isSubscribed(stream) {
    let result;
    if (stream instanceof Array) {
      result = await this.browser.isSubscribedToStreams(stream);
    } else {
      result = await this.browser.isSubscribedToStream(stream);
    }
    return result;
  }

  async startBufferingStats() {
    await this.browser.startBufferingStats();
  }

  async stopBufferingStats() {
    await this.browser.stopBufferingStats();
  }

  async getBufferedStats() {
    return await this.browser.getBufferedStats();
  }

  async disconnect() {
    await this.browser.url('about:blank');
  }

  async closeBrowser() {
    await this.browser.end();
  }

  async loadClientLib() {
    await this.browser.loadClientLib();
  }

  async getNumberOfRemoteSubscriptions() {
    return await this.browser.getSubscribedStreams();
  }

  async screenshot(name) {
    await this.browser.saveScreenshot(`./${name}_screenshot.png`);
  }
}

exports.Client = Client;
