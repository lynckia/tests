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

    it('should open Basic Example page', function () {
      client1.connect(roomName, mediaConfiguration, p2p);
      client2.connect(roomName, mediaConfiguration, p2p);
      browser1.getTitle().should.be.equal('Licode Basic Example');
      browser2.getTitle().should.be.equal('Licode Basic Example');
    });

    it('should subscribe to each other', async function () {
      await client1.connect(roomName, mediaConfiguration, p2p);
      await client2.connect(roomName, mediaConfiguration, p2p);
      const stream1 = await client1.createStream({audio: true, video: true, data: false});
      const stream2 = await client2.createStream({audio: true, video: true, data: false});
      await stream1.initialize();
      await stream2.initialize();
      await stream1.publish(publishOptions);
      await stream2.publish(publishOptions);
      await stream1.subscribeFrom(client2);
      await stream2.subscribeFrom(client1);

      (await stream1.isPublishingSimulcast()).should.be.equal(simulcast);
      (await stream2.isPublishingSimulcast()).should.be.equal(simulcast);
      (await stream1.isPublishingCodec(videoCodec)).should.be.true;
      (await stream1.isPublishingCodec(audioCodec)).should.be.true;
      (await stream2.isPublishingCodec(videoCodec)).should.be.true;
      (await stream2.isPublishingCodec(audioCodec)).should.be.true;
      (await client1.getNumberOfRemoteSubscriptions()).should.be.equal(1);
      (await client2.getNumberOfRemoteSubscriptions()).should.be.equal(1);
    });

    it('should subscribe to each other with audio only', async function () {
      await client1.connect(roomName, mediaConfiguration, p2p);
      await client2.connect(roomName, mediaConfiguration, p2p);
      const stream1 = await client1.createStream({audio: true, video: false, data: false});
      const stream2 = await client2.createStream({audio: true, video: false, data: false});
      await stream1.initialize();
      await stream2.initialize();
      await stream1.publish(publishOptions);
      await stream2.publish(publishOptions);
      await stream1.subscribeFrom(client2);
      await stream2.subscribeFrom(client1);

      (await stream1.isPublishingCodec(audioCodec)).should.be.true;
      (await stream2.isPublishingCodec(audioCodec)).should.be.true;
      (await client1.getNumberOfRemoteSubscriptions()).should.be.equal(1);
      (await client2.getNumberOfRemoteSubscriptions()).should.be.equal(1);
    });

    it('should subscribe to each other with video only', async function () {
      await client1.connect(roomName, mediaConfiguration, p2p);
      await client2.connect(roomName, mediaConfiguration, p2p);
      const stream1 = await client1.createStream({audio: false, video: true, data: false});
      const stream2 = await client2.createStream({audio: false, video: true, data: false});
      await stream1.initialize();
      await stream2.initialize();
      await stream1.publish(publishOptions);
      await stream2.publish(publishOptions);
      await stream1.subscribeFrom(client2);
      await stream2.subscribeFrom(client1);

      (await stream1.isPublishingSimulcast()).should.be.equal(simulcast);
      (await stream2.isPublishingSimulcast()).should.be.equal(simulcast);
      (await stream1.isPublishingCodec(videoCodec)).should.be.true;
      (await stream2.isPublishingCodec(videoCodec)).should.be.true;
      (await client1.getNumberOfRemoteSubscriptions()).should.be.equal(1);
      (await client2.getNumberOfRemoteSubscriptions()).should.be.equal(1);
    });

    if (!p2p) {
      it('should subscribe to each other using slideshow', async function () {
        await client1.connect(roomName, mediaConfiguration, p2p);
        await client2.connect(roomName, mediaConfiguration, p2p);
        const stream1 = await client1.createStream({audio: true, video: true, data: false});
        const stream2 = await client2.createStream({audio: true, video: true, data: false});
        await stream1.initialize();
        await stream2.initialize();
        await stream1.publish(publishOptions);
        await stream2.publish(publishOptions);
        await stream1.subscribeFrom(client2, {slideShowMode: true});
        await stream2.subscribeFrom(client1, {slideShowMode: true});

        (await stream1.isPublishingSimulcast()).should.be.equal(simulcast);
        (await stream2.isPublishingSimulcast()).should.be.equal(simulcast);
        (await stream1.isPublishingCodec(videoCodec)).should.be.true;
        (await stream1.isPublishingCodec(audioCodec)).should.be.true;
        (await stream2.isPublishingCodec(videoCodec)).should.be.true;
        (await stream2.isPublishingCodec(audioCodec)).should.be.true;
        (await client1.getNumberOfRemoteSubscriptions()).should.be.equal(1);
        (await client2.getNumberOfRemoteSubscriptions()).should.be.equal(1);
      });
    }
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

new TwoBrowserTest().setBrowsers(['chrome', 'firefox'])
                    .setMedias(['VP8_AND_OPUS', 'VP9_AND_OPUS'])
                    .setTypes(['erizo'])
                    .setSimulcast([false])
                    .create();


// PATCH: we don't test H264 in Firefox because it downloads and isntalls the OpenH264 plugin on demand
// resulting on flaky tests because it sometimes does not install on time and it sometimes crashes FF
new TwoBrowserTest().setBrowsers(['chrome'])
                    .setMedias(['H264_AND_OPUS'])
                    .setTypes(['erizo'])
                    .setSimulcast([false])
                    .create();

new TwoBrowserTest().setBrowsers(['chrome', 'firefox'])
                    .setMedias(['VP8_AND_OPUS'])
                    .setTypes(['p2p'])
                    .setSimulcast([false])
                    .create();


new TwoBrowserTest().setBrowsers(['chrome', 'firefox'])
                    .setMedias(['VP8_AND_OPUS'])
                    .setTypes(['erizo'])
                    .setSimulcast([true])
                    .create();
