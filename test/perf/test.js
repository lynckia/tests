const wdio = require('webdriverio');
const fs = require('fs');
const LargeRoomController = require('../tools/large_room_controller').LargeRoomController;

const processStats = function(stats) {
  const pubsStats = stats.publishers;
  const subsStats = stats.subscribers;


  function safeParseInt(valueString) {
    return valueString && parseInt(valueString);
  }

  function toBitrate(bitrate) {
    return parseInt(bitrate);
  }

  class StreamStats {
    constructor(browserId, id, roomId, createdAt) {
      this.browserId = browserId;
      this.id = id;
      this.roomId = roomId;
      this.createdAt = createdAt;
      this.startDelay = Number.POSITIVE_INFINITY;
      this.maxBitrate = 0;
      this.duration = 0;
      this.frameRateZero = 0;
      this.lastBytes = 0;
      this.firstBytesReceivedAt = 0;
      this.lastWhen = createdAt;
    }

    calculateStartDelay(when) {
      this.startDelay = Math.min(this.startDelay, this.calculateDuration(when));
    }

    calculateMaxBitrateAndDuration(bytes, when) {
      const bitrate = 8 * 1000 * (bytes - this.lastBytes) / (when - this.lastWhen);
      this.maxBitrate = Math.max(this.maxBitrate, bitrate);
      if (bitrate > 0) {
        this.firstBytesReceivedAt = this.firstBytesReceivedAt || when;
        this.duration = Math.max(this.duration, this.calculateDuration(when));
      }
      this.lastBytes = bytes;
      this.lastWhen = when;
      this.lastBitrate = bitrate;
      this.avgBitrate = 8 * 1000 *  bytes / (when - this.firstBytesReceivedAt);
    }

    calculateDuration(when) {
      return when - this.createdAt;
    }

    log() {
      console.log(this.browserId, this.id, this.roomId, this.startDelay, toBitrate(this.lastBitrate), toBitrate(this.avgBitrate), this.duration, this.frameRateZero);
    }
  }

  const publishStreams = new Map();
  const subscribeStreams = new Map();

  const pubBrowsers = Object.keys(stats.publishers);
  let browserId = 0;
  pubBrowsers.forEach(browserName => {
    browserId++;
    stats.publishers[browserName].forEach(stat => {
      if (stat.action === 'publish') {
        const stream = new StreamStats(browserId, stat.externalId, 0, stat.when);
        publishStreams.set(browserId + '_' + stat.externalId + '_' + 0, stream);
      } else if (stat.action === 'stats') {
        const stream = publishStreams.get(browserId + '_' + stat.externalId + '_' + 0);
        if (stream) {
          if (safeParseInt(stat['video:bytesSent']) > 0) {
            stream.calculateStartDelay(stat.when);
            stream.calculateMaxBitrateAndDuration(safeParseInt(stat['video:bytesSent']), stat.when);
          }
        }
      }
    });
  });

  const subBrowsers = Object.keys(stats.subscribers);
  subBrowsers.forEach(browserName => {
    browserId++;
    stats.subscribers[browserName].forEach(stat => {
      if (stat.action === 'subscribe') {
        const stream = new StreamStats(browserId, stat.externalId, stat.roomId, stat.when);
        subscribeStreams.set(browserId + '_' + stat.externalId + '_' + stat.roomId, stream);
      } else if (stat.action === 'stats') {
        const stream = subscribeStreams.get(browserId + '_' + stat.externalId + '_' + stat.roomId);
        if (stream) {
          if (safeParseInt(stat['audio:audioOutputLevel']) > 0) {
            stream.calculateStartDelay(stat.when);
            stream.calculateMaxBitrateAndDuration(safeParseInt(stat['video:bytesReceived']), stat.when);
          } else {
            stream.frameRateZero++;
          }
        }
      }
    });
  });
  // publishStreams.forEach(streamStats => streamStats.log());
  // subscribeStreams.forEach(streamStats => streamStats.log());

  let totalBitrate = 0;
  let maxDelay = 0;
  let numberOfPublishers = 0;
  publishStreams.forEach(streamStats => {
    if (streamStats.duration > 0) numberOfPublishers++;
    totalBitrate += streamStats.avgBitrate
    maxDelay = Math.max(maxDelay, streamStats.startDelay);
  });
  console.log("Number of successful publishers:", numberOfPublishers);
  console.log("Max publishing delay:", parseFloat(maxDelay / 1000,2), "seconds");
  console.log("Total Avg. Publishing Bitrate:", parseFloat(totalBitrate / (1000 * publishStreams.size)), "kbps");

  totalBitrate = 0;
  maxDelay = 0;
  let numberOfSubscribers = 0;
  subscribeStreams.forEach(streamStats => {
    if (streamStats.duration > 0) numberOfSubscribers++;
    totalBitrate += streamStats.avgBitrate
    maxDelay = Math.max(maxDelay, streamStats.startDelay);
  });
  console.log("Number of successful subscriptions:", numberOfSubscribers);
  console.log("Max subscription delay:", parseFloat(maxDelay / 1000,2), "seconds");
  console.log("Total Avg. Subscription Bitrate:", parseFloat(totalBitrate / (1000 * subscribeStreams.size)), "kbps");
};

const test = async function test(configuration) {
  const testName = `${configuration.numberOfPublishers}_pub_${configuration.numberOfSubscribers}_subs`;
  const room = new LargeRoomController(configuration);
  try {
    await room.initialize();
    await room.connect();
    console.log('Connected');
    if (configuration.enableStats) {
      await room.startBufferingStats();
      console.log('Start buffering stats');
    }
    await room.publish();
    console.log('Published');
    await room.subscribe();
    console.log('Subscribed');

    setTimeout(async () => {
      if (configuration.enableStats) {
        console.log('Stop buffering stats');
        await room.stopBufferingStats();
        console.log('Get buffered stats');
        const bufferedStats = await room.getBufferedStats();
        const data = JSON.stringify(bufferedStats,4,4);
        fs.writeFileSync(`${testName}.json`, data);
        processStats(bufferedStats);
      }
      await room.close();
    }, configuration.duration);
  } catch (error) {
    room && room.screenshot(testName);
    console.error('Error running test', error);
    room && await room.close();
  }
};

exports.test = test;
exports.processStats = processStats;
