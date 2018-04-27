'use strict';

const Client = require('../tools/client').Client;

let roomId = 0;

function createSuite(browser1, browser2, mediaConfiguration, p2p, simulcast) {
  const browser1Label = browser1.options.desiredCapabilities.browserName;
  const browser2Label = browser2.options.desiredCapabilities.browserName;
  const roomName = roomId++;
  let videoCodec = 'VP8';
  let audioCodec = 'OPUS';
  switch (mediaConfiguration) {
    case 'VP8_AND_OPUS':
      videoCodec = 'VP8';
      audioCodec = 'OPUS';
      break;
    case 'VP9_AND_OPUS':
      videoCodec = 'VP9';
      audioCodec = 'OPUS';
      break;
    case 'H264_AND_OPUS':
      videoCodec = 'H264';
      audioCodec = 'OPUS';
      break;
  }
  const name = 'Two clients - browsers[' + browser1Label + ', ' + browser2Label + '] - media ' + mediaConfiguration + ' - p2p ' + p2p + ' - simulcast ' + simulcast + ' -';
  describe(name, function() {
    this.retries(4);

    let client1 = new Client(browser1);
    let client2 = new Client(browser2);
    const publishOptions = simulcast ? {simulcast: {numSpatialLayers: 2}} : {};

    beforeEach(function() {
      client1.connect(roomName, mediaConfiguration, p2p);
      client2.connect(roomName, mediaConfiguration, p2p);
    });

    afterEach(function() {
    });

    it('should open Basic Example page', function () {
      browser1.getTitle().should.be.equal('Licode Basic Example');
      browser2.getTitle().should.be.equal('Licode Basic Example');
    });

    it('should subscribe to each other', function () {
      const stream1 = client1.createStream({audio: true, video: true, data: false});
      const stream2 = client2.createStream({audio: true, video: true, data: false});
      stream1.initialize();
      stream2.initialize();
      stream1.publish(publishOptions);
      stream2.publish(publishOptions);
      stream1.subscribeFrom(client2);
      stream2.subscribeFrom(client1);

      stream1.isPublishingSimulcast().should.be.equal(simulcast);
      stream2.isPublishingSimulcast().should.be.equal(simulcast);
      stream1.isPublishingCodec(videoCodec).should.be.true;
      stream1.isPublishingCodec(audioCodec).should.be.true;
      stream2.isPublishingCodec(videoCodec).should.be.true;
      stream2.isPublishingCodec(audioCodec).should.be.true;
      client1.getNumberOfRemoteSubscriptions().should.be.equal(1);
      client2.getNumberOfRemoteSubscriptions().should.be.equal(1);
    });
  });
}

class TwoBrowserTest {
  constructor() {
    this.browsers = {chrome: true, firefox: true};
    this.medias = ['VP8_AND_OPUS'];
    this.types = ['erizo'];
    this.simulcast = [false];
  }
  setBrowsers(browserList) {
    this.browsers.chrome = browserList.indexOf('chrome') !== -1;
    this.browsers.firefox = browserList.indexOf('firefox') !== -1;
    return this;
  }
  setMedias(mediaList) {
    this.medias = mediaList;
    return this;
  }
  setTypes(typeList) {
    this.types = typeList;
    return this;
  }
  setSimulcast(simulcastList) {
    this.simulcast = simulcastList;
    return this;
  }

  create() {
    let browserTests = [];

    let bothBrowsers = true;
    if (this.browsers.chrome) {
      browserTests.push([chrome1, chrome2, 'VP8_AND_OPUS', false, false]);
    } else {
      bothBrowsers = false;
    }
    if (this.browsers.firefox) {
      browserTests.push([firefox1, firefox2, 'VP8_AND_OPUS', false, false]);
    } else {
      bothBrowsers = false;
    }
    if (bothBrowsers) {
      browserTests.push([chrome1, firefox1, 'VP8_AND_OPUS', false, false]);
      browserTests.push([firefox1, chrome1, 'VP8_AND_OPUS', false, false]);
    }

    let mediaTests = [];
    for (const media of this.medias) {
      for (const test of browserTests) {
        test[2] = media;
        mediaTests.push(test.slice());
      }
    }

    let typeTests = [];
    for (const type of this.types) {
      for (const test of mediaTests) {
        test[3] = type === 'erizo' ? false : true;
        typeTests.push(test.slice());
      }
    }

    let simulcastTests = [];
    for (const simulcast of this.simulcast) {
      for (const test of mediaTests) {
        test[4] = simulcast;
        simulcastTests.push(test.slice());
      }
    }

    for (const test of simulcastTests) {
      createSuite(...test);
    }
  }
}

const tests = new TwoBrowserTest();

new TwoBrowserTest().setBrowsers(['chrome', 'firefox'])
                    .setMedias(['VP8_AND_OPUS', 'VP9_AND_OPUS', 'H264_AND_OPUS'])
                    .setTypes(['erizo', 'p2p'])
                    .setSimulcast([false])
                    .create();


new TwoBrowserTest().setBrowsers(['chrome', 'firefox'])
                    .setMedias(['VP8_AND_OPUS'])
                    .setTypes(['erizo'])
                    .setSimulcast([true])
                    .create();
