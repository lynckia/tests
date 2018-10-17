const wdio = require('webdriverio');
const commands = require('./commands');
const Stream = require('./stream').Stream;
const Client = require('./client').Client;
const util = require('util')

class LargeRoomController {
  constructor(config) {
    this.numberOfPublishers = config.numberOfPublishers;
    this.numberOfSubscribers = config.numberOfSubscribers;
    this.publishersPerBrowser = config.publishersPerBrowser;
    this.subscribersPerBrowser = config.subscribersPerBrowser;
    this.chromeConfiguration = config.browsers;
    this.audioMuted = config.audioMuted;
    this.videoMuted = config.videoMuted;
    this.singlePC = config.singlePC;
    this.p2p = false;
    this.mediaConfiguration = 'VP8_AND_OPUS';
    this.roomId = 'roomId';
    this.url = config.url;
    this.streamConfiguration = {audio: true, video: true, data: false};
    this.publishConfiguration = {simulcast: {numSpatialLayers: 2}};
    // this.publishConfiguration.audioMuted = this.audioMuted;
    // this.publishConfiguration.videoMuted = this.videoMuted;
    this.browsersForPublishing = this.numberOfPublishers / this.publishersPerBrowser;
    this.browsersForSubscribing = this.numberOfSubscribers / this.subscribersPerBrowser;
    this.streams = [];
    this.totalBrowsers = this.browsersForPublishing + this.browsersForSubscribing;
    this.publisherConfiguration = {};
    for (let i = 0; i < this.browsersForPublishing; i++) {
      this.publisherConfiguration[`chrome${i}`] = {
        host: process.env.HUB_HOST || 'localhost',
        desiredCapabilities: {
            browserName: 'chrome',
            // applicationName: 'pubs',
            'goog:chromeOptions': {
                args: [
                    '--use-fake-device-for-media-stream',
                    '--use-fake-ui-for-media-stream',
                    '--unsafely-treat-insecure-origin-as-secure=' + this.url
                ]
            },
            'chromeOptions': {
                args: [
                    '--use-fake-device-for-media-stream',
                    '--use-fake-ui-for-media-stream',
                    'unsafely-treat-insecure-origin-as-secure="' + this.url + '"'
                ]
            }
        }};
    }
    this.subscriberConfiguration = {};
    for (let i = 0; i < this.browsersForSubscribing; i++) {
      this.subscriberConfiguration[`chrome${i}`] = {
        host: process.env.HUB_HOST || 'localhost',
        desiredCapabilities: {
            browserName: 'chrome',
            // applicationName: 'subs',
        }};
    }
  }

  async initialize() {
    let browser = wdio.multiremote(this.publisherConfiguration);
    commands.initCommands(browser);
    await browser.init();
    await browser.timeouts('script', 60000);
    this.publishers = new Client(browser, this.url);

    browser = wdio.multiremote(this.subscriberConfiguration);
    await commands.initCommands(browser);
    await browser.init();
    await browser.timeouts('script', 60000);
    this.subscribers = new Client(browser, this.url);
  }

  async connect() {
    await this.publishers.connect(this.roomId, this.mediaConfiguration, this.p2p, this.singlePC);
    await this.subscribers.connect(this.roomId, this.mediaConfiguration, this.p2p, this.singlePC);
    await this.publishers.loadClientLib();
    await this.subscribers.loadClientLib();
    for (let i = 1; i < this.subscribersPerBrowser; i++) {
      await this.subscribers.connectToAnotherRoom(this.roomId, this.mediaConfiguration, this.p2p);
    }
  }

  async publish() {
    const localStreams = await this.publishers.createStreams(this.numberOfPublishers, this.publishersPerBrowser, this.streamConfiguration);
    await this.publishers.initStreams(localStreams);
    await this.publishers.publish(localStreams, this.publishConfiguration);
    this.streams = localStreams;
  }

  async subscribe() {
    await this.subscribers.subscribe(this.streams, { videoMuted: this.videoMuted, audioMuted: this.audioMuted });
  }

  async startBufferingStats() {
    await this.publishers.startBufferingStats();
    await this.subscribers.startBufferingStats();
  }

  async getBufferedStats() {
    const stats = {};
    stats.publishers = await this.publishers.getBufferedStats();
    stats.subscribers = await this.subscribers.getBufferedStats();
    return stats;
  }

  async stopBufferingStats() {
    await this.publishers.stopBufferingStats();
    await this.subscribers.stopBufferingStats();
  }

  async screenshot(name) {
    this.publishers && await this.publishers.screenshot(`${name}_pub`);
    this.subscribers && await this.subscribers.screenshot(`${name}_sub`);
  }

  async close() {
    this.publishers && await this.publishers.closeBrowser()
    this.subscribers && await this.subscribers.closeBrowser();
  }
}

exports.LargeRoomController = LargeRoomController;
