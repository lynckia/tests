const utils = require('./client_lib');

async function getSubscribedStreams() {
  const result = await this.execute(function() {
    var subscribedStreams = 0;
    if (!window.room) {
      return subscribedStreams;
    }
    window.room.remoteStreams.forEach(stream => {
      if (stream.stream) {
        subscribedStreams++;
      }
    });
    return subscribedStreams;
  });
  return result.value;
}

async function connectToAnotherRoom(roomName, mediaConfiguration, p2p) {
  const result = await this.execute(function(roomName, mediaConfiguration, p2p) {
    window.connectToRoom && window.connectToRoom(roomName, mediaConfiguration, p2p ? 'p2p' : 'erizo');
  }, roomName, mediaConfiguration, p2p);
  return result.value;
}

async function waitUntilAnotherRoomsConnected() {
  return this.waitUntil(async function() {
    let result = await this.execute(function() {
      window.rooms = window.rooms || [];
      let connected = true;
      window.rooms.forEach(room => {
        if (room.state !== 2) {
          connected = false;
        }
      });
      return connected ? 2 : -1;
    });
    return result.value === 2;
  }, 30000, 'timeout connecting to room');
};

async function waitUntilRoomConnected() {
  return this.waitUntil(async function() {
    let result = await this.execute(function() {
      window.room = window.room;
      if (!window.room && typeof room !== 'undefined') {
        window.room = room;
      }
      if (!window.room) {
        return -1;
      }
      return window.room.state;
    });
    return result.value === 2;
  }, 30000, 'timeout connecting to room');
};

async function waitUntilStreamInitialized(stream) {
  return this.waitUntil(async function() {
    const result = await this.execute(function(id) {
      return window.localStreams[id] !== undefined && window.localStreams[id].stream !== undefined;
    }, stream.id);
    return result.value;
  }, 30000, 'timeout waiting to stream initialization');
}

async function waitUntilStreamsInitialized(streams) {
  const session = await this.session();
  const myStreams = streams.filter(stream => stream.sessionId === session.sessionId);
  return this.waitUntil(async function() {
    const result = await this.execute(function(ids) {
      let allInitialized = true;
      ids.forEach(id => {
        if (window.localStreams[id] === undefined || window.localStreams[id].stream === undefined) {
          allInitialized = false;
        }
      });
      return allInitialized;
    }, myStreams.map(stream => stream.id));
    return result.value;
  }, 30000, 'timeout waiting to stream initialization');
}

async function createStream(stream) {
  const result = await this.execute(function(id, config) {
    if (!window.room) {
      return false;
    }
    window.localStreams = window.localStreams || {};
    const room = window.room;
    config.attributes = { externalId: id };
    const localStream = Erizo.Stream(config);
    window.localStreams[id] = localStream;
    return true;
  }, stream.id, stream.config);
  return result.value;
}

async function createStreams(streams) {
  const session = await this.session();
  const myStreams = streams.filter(stream => stream.sessionId === session.sessionId);
  const result = await this.execute(function(streamsInfo) {
    if (!window.room) {
      return false;
    }
    window.localStreams = window.localStreams || {};
    const room = window.room;
    streamsInfo.forEach(streamInfo => {
      streamInfo.config.attributes = { externalId: streamInfo.id };
      const localStream = Erizo.Stream(streamInfo.config);
      window.localStreams[streamInfo.id] = localStream;
    });
    return true;
  }, myStreams.map(stream => {
    return { id: stream.id, config: stream.config };
  }));
  return result.value;
}

async function initializeStream(stream) {
  const result = await this.execute(function(id, config) {
    if (!window.room) {
      return false;
    }
    const localStream = window.localStreams[id];
    localStream.addEventListener('access-accepted', function() {
      var div = document.createElement('div');
      div.setAttribute('style', 'width: 320px; height: 240px;float:left;');
      div.setAttribute('id', 'myVideo_' + id);

      document.getElementById('videoContainer').appendChild(div);
      localStream.show('myVideo_' + id);
    });
    localStream.init();
    return true;
  }, stream.id, stream.config);
  if (!result.value) {
    return false;
  }
  await this.waitUntilStreamInitialized(stream);
  return true;
}

async function initializeStreams(streams) {
  const session = await this.session();
  const myStreams = streams.filter(stream => stream.sessionId === session.sessionId);
  const result = await this.execute(function(streamsInfo) {
    if (!window.room) {
      return false;
    }
    streamsInfo.forEach(streamInfo => {
      const localStream = window.localStreams[streamInfo.id];
      localStream.addEventListener('access-accepted', function() {
        var div = document.createElement('div');
        div.setAttribute('style', 'width: 320px; height: 240px;float:left;');
        div.setAttribute('id', 'myVideo_' + streamInfo.id);

        document.getElementById('videoContainer').appendChild(div);
        localStream.show('myVideo_' + streamInfo.id);
      });
      localStream.init();
    });

    return true;
  }, myStreams.map(stream => {
    return { id: stream.id, config: stream.config };
  }));
  if (!result.value) {
    return false;
  }
  await this.waitUntilStreamsInitialized(streams);
  return true;
}

async function createAndInitStream(stream) {
  const created = await this.createStream(stream);
  if (!created) {
    return false;
  }
  const initialized = await this.initializeStream(stream);
  return initialized;
}

async function createAndInitStreams(streams) {
  const created = await this.createStreams(streams);
  if (!created) {
    return false;
  }
  const initialized = await this.initializeStreams(streams);
  return initialized;
}

async function publishStream(stream, options) {
  const result = await this.execute(function(id, options) {
    if (!window.room) {
      return false;
    }
    const localStream = window.localStreams[id];
    if (localStream.stream) {
      if (window.bufferingStats) {
        const stats = { publisher: true, externalId: localStream.getAttributes().externalId, action: 'publish' };
        stats.when = new Date().getTime();
        window.bufferedStats.push(stats);
      }
      window.room.publish(localStream, options);
      return true;
    }
    return false;
  }, stream.id, options);
  return result.value;
}

async function publishStreams(streams, options) {
  const session = await this.session();
  const myStreams = streams.filter(stream => stream.sessionId === session.sessionId);
  const result = await this.execute(function(ids, options) {
    if (!window.room) {
      return false;
    }
    let published = ids.length > 0;
    let offset = 0;
    ids.forEach(id => {
      offset++;
      const localStream = window.localStreams[id];
      if (localStream.stream) {
        if (window.bufferingStats) {
          const stats = { publisher: true, externalId: localStream.getAttributes().externalId, action: 'publish'};
          stats.when = new Date().getTime();
          window.bufferedStats.push(stats);
        }
        setTimeout(() => {
          window.room.publish(localStream, options);
        }, id * 100);
      } else {
        published = false;
      }
    });
    return published;
  }, myStreams.map(stream => stream.id), options);
  return result.value;
}

async function waitUntilStreamPublished(stream) {
  this.waitUntil(async function() {
    const result = await this.execute(function(id) {
      if (!window.room) {
        return [false, 0];
      }
      const localStream = window.localStreams[id];
      if (localStream.stream && localStream.getID() !== 'local') {
        const stream = window.room.remoteStreams.get(localStream.getID());
        if (stream) {
          return [true, localStream.getID()];
        }
      }
      return [false, 0];
    }, stream.id);
    let isOk = true;
    if (result.value[0]) {
      stream.streamIds.push(result.value[1]);
    } else {
      isOk = false;
    }
    return isOk;
  }, 30000, 'timeout waiting to stream being published');
}

async function waitUntilStreamsPublished(streams) {
  const session = await this.session();
  const myStreams = streams.filter(stream => stream.sessionId === session.sessionId);
  await this.waitUntil(async function() {
    const result = await this.execute(function(ids) {
      const streamData = [];
      if (!window.room) {
        return [false, streamData];
      }

      let published = ids.length > 0;
      ids.forEach(id => {
        const localStream = window.localStreams[id];
        if (localStream.stream && localStream.getID() !== 'local') {
          const stream = window.room.remoteStreams.get(localStream.getID());
          if (stream) {
            streamData.push({id, streamId: localStream.getID()});
          } else {
            published = false;
          }
        } else {
          published = false;
        }
      });

      return [published, streamData];
    }, myStreams.map(stream => stream.id));

    let isOk = true;
    if (result.value[0]) {
      const streamsData = result.value[1];
      myStreams.forEach(stream => {
        const data = streamsData.find(streamData => streamData.id === stream.id);
        if (data) {
          stream.streamIds.push(data.streamId);
        }
      });
    } else {
      isOk = false;
    }
    return isOk;
  }, 30000, 'timeout waiting to streams being published');
}

async function subscribeToStream(stream, options) {
  const result = await this.execute(function(streamIds, options) {
    if (!window.room) {
      return false;
    }
    let subscribed = streamIds.length > 0;
    streamIds.forEach(streamId => {
      const stream = window.room.remoteStreams.get(streamId);
      if (stream) {
        if (window.bufferingStats) {
          const stats = { publisher: false, externalId: stream.getAttributes().externalId, action: 'subscribe'};
          stats.when = new Date().getTime();
          window.bufferedStats.push(stats);
        }
        window.room.subscribe(stream, options);
      } else {
        subscribed = false;
      }
    });
    return subscribed;
  }, stream.streamIds, options);
  return result.value;
}

async function subscribeToStreams(streams, options) {
  const result = await this.execute(function(streamIds, options) {
    if (!window.room) {
      return false;
    }
    function subscribeIntoRoom(room, roomId) {
      let subscribed = streamIds.length > 0;
      streamIds.forEach(streamId => {
        const stream = room.remoteStreams.get(streamId);
        if (stream) {
          if (window.bufferingStats) {
            const stats = { publisher: false, externalId: stream.getAttributes().externalId, roomId: roomId, action: 'subscribe'};
            stats.when = new Date().getTime();
            window.bufferedStats.push(stats);
          }
          room.subscribe(stream, options);
          setTimeout(() => {
            if (options.audioMuted) {
              stream.muteAudio(true);
            }
            if (options.videoMuted) {
              stream.muteVideo(true);
            }
          }, 500);
        } else {
          subscribed = false;
        }
      });
    }
    let subscribed = true;
    if (!subscribeIntoRoom(window.room, 0)) {
      subscribed = false;
    }
    let roomId = 0;
    window.rooms && window.rooms.forEach(room => {
      roomId++;
      if(!subscribeIntoRoom(room, roomId)) {
        subscribed = false;
      }
    });
    return subscribed;
  }, [].concat(streams.map(stream => stream.streamIds)), options);
  return result.value;
}

async function waitUntilStreamSubscribed(stream) {
  this.waitUntil(async function() {
    const result = await this.isSubscribedToStream(stream);
    return result;
  }, 30000, 'timeout waiting to stream being subscribed');
}

async function waitUntilStreamsSubscribed(streams) {
  this.waitUntil(async function() {
    const result = await this.isSubscribedToStreams(streams);
    return result;
  }, 30000, 'timeout waiting to stream being subscribed');
}

async function isSubscribedToStream(stream) {
  const result = await this.execute(function(streamIds) {
    if (!window.room) {
      return false;
    }
    let isSubscribed = streamIds.length > 0;
    streamIds.forEach(streamId => {
      const stream = window.room.remoteStreams.get(streamId);
      if (!stream || !stream.stream) {
        isSubscribed = false;
      }
    });
    return isSubscribed;
  }, stream.streamIds);
  return result.value;
}

async function isSubscribedToStreams(streams) {
  const result = await this.execute(function(streamIds) {
    if (!window.room) {
      return false;
    }
    function roomIsSubscribed(room) {
      let isSubscribed = streamIds.length > 0;
      streamIds.forEach(streamId => {
        const stream = room.remoteStreams.get(streamId);
        if (!stream || !stream.stream) {
          isSubscribed = false;
        }
      });
      return isSubscribed;
    }
    let subscribed = true;
    if (!roomIsSubscribed(window.room)) {
      subscribed = false;
    }
    window.rooms && window.rooms.forEach(room => {
      if(!roomIsSubscribed(room)) {
        subscribed = false;
      }
    });
    return subscribed;
  }, [].concat(streams.map(stream => stream.streamIds)));
  return result.value;
}

async function isPublishingSimulcast(stream) {
  const result = await this.execute(function(streamIds) {
    if (!window.room) {
      return false;
    }
    let isSimulcast = true;
    streamIds.forEach(streamId => {
      const stream = window.room.localStreams.get(streamId);
      if (stream && stream.pc) {
        if (window.room.p2p) {
          isSimulcast = false;
        } else {
          if (stream.pc.peerConnection.localDescription.sdp.indexOf('a=ssrc-group:SIM') === -1 &&
              stream.pc.peerConnection.localDescription.sdp.indexOf('a=simulcast:') === -1) {
            isSimulcast = false;
          }
        }
      }
    });
    return isSimulcast;
  }, stream.streamIds);
  return result.value;
}

async function containsCodec(stream, codec) {
  const result = await this.execute(function(streamIds, codec) {
    if (!window.room) {
      return false;
    }
    let containsCodec = true;
    streamIds.forEach(streamId => {
      const stream = window.room.localStreams.get(streamId);
      if (stream && stream.pc) {
        let hasCodec = false;
        if (window.room.p2p) {
          stream.pc.forEach(pc => {
            hasCodec = pc.peerConnection.remoteDescription.sdp.indexOf(codec) !== -1 ||
                       pc.peerConnection.remoteDescription.sdp.indexOf(codec.toLowerCase()) !== -1;
          });
        } else {
          hasCodec = stream.pc.peerConnection.remoteDescription.sdp.indexOf(codec) !== -1 ||
                     stream.pc.peerConnection.remoteDescription.sdp.indexOf(codec.toLowerCase()) !== -1;
        }
        if (!hasCodec) {
          containsCodec = false;
        }
      }
    });
    return containsCodec;
  }, stream.streamIds, codec);
  return result.value;
}

async function isRenderingVideo(stream) {
  const result = await this.execute(function(streamIds) {
    if (!window.room) {
      return false;
    }
    const isRenderingVideo = true;
    streamIds.forEach(streamId => {
      const stream = window.room.remoteStreams.get(streamId);
      if (stream && stream.stream) {
        function getRandomInt(max) {
          return Math.floor(Math.random() * (max + 1));
        }
        function _sampleIsBlack(sampleData, pointer) {
          if (sampleData[pointer + 0] === 0 &&
              sampleData[pointer + 1] === 0 &&
              sampleData[pointer + 2] === 0) {
            return true;
          } else {
            return false;
          }
        }
        function _getRandomSample(width, height) {
          var randX = getRandomInt(width),
              randY = getRandomInt(height);
          return (randY * width + randX) * 4;
        }
        const image = stream.getVideoFrame();
        let allSamplesBlack = true;
        for (let i = 0; i < 10; i++) {
          if (!_sampleIsBlack(image.data, _getRandomSample(image.width, image.height))) {
            allSamplesBlack = false;
          }
        }
        if (allSamplesBlack) {
          isRenderingVideo = false;
        }
      } else {
        isRenderingVideo = false;
      }
    });
    return isRenderingVideo;
  }, stream.streamIds);
  return result.value;
}

async function isRenderingVideos(streams) {
  const result = await this.execute(function(streamIds) {
    if (!window.room) {
      return false;
    }
    const isRenderingStream = (streamId) => {
      const stream = window.room.localStreams.get(streamId);
      if (stream && stream.stream) {
        function getRandomInt(max) {
          return Math.floor(Math.random() * (max + 1));
        }
        function _sampleIsBlack(sampleData, pointer) {
          if (sampleData[pointer + 0] === 0 &&
              sampleData[pointer + 1] === 0 &&
              sampleData[pointer + 2] === 0) {
            return true;
          } else {
            return false;
          }
        }
        function _getRandomSample(width, height) {
          var randX = getRandomInt(width),
              randY = getRandomInt(height);
          return (randY * width + randX) * 4;
        }
        const image = stream.getVideoFrame();
        for (let i = 0; i < 10; i++) {
          if (!_sampleIsBlack(image.data, _getRandomSample(image.width, image.height))) {
            return true;
          }
        }
        return false;
      }
      return false;
    };
    let isRenderingStreams = true;
    streamIds.forEach(streamId => {
      if (!isRenderingStream(streamId)) {
        isRenderingStreams = false;
      }
    });
    return isRenderingStreams;
  }, [].concat(streams.map(stream => stream.streamId)));
  return result.value;
}

async function waitUntilStreamIsNotBlack(stream) {
  return this.waitUntil(async function() {
    const result = await this.isRenderingVideo(stream);
    return result;
  }, 30000, 'timeout waiting to stream not being black');
}

async function waitUntilStreamsAreNotBlack(streams) {
  return this.waitUntil(async function() {
    const result = await this.isRenderingVideos(streams);
    return result;
  }, 30000, 'timeout waiting to streams not being black');
}

async function loadClientLib() {
  await this.execute(utils.loadLibs);
}

async function startBufferingStats() {
  await this.execute(function() {
    window.bufferingStats = true;
    window.bufferedStats = [];
    window.statsInterval = setInterval(() => {
      var stats = {};
      const getStats = function(isMe, stream, roomId) {
        stream.pc && stream.pc.peerConnection && stream.pc.peerConnection.getStats(resp => {
          let stats = {};
          stats.action = 'none';
          if (stream.stream) {
            const tracks = stream.stream.getTracks().map(function(t) { return t.id; });
            try {
              stats = window.extractStats(resp, isMe, tracks);
              stats.action = 'stats';
            } catch(e) {
              stats = e.message;
            }
          }
          stats.streamId = stream.getID();
          stats.publisher = isMe;
          stats.externalId = stream.getAttributes().externalId;
          stats.roomId = roomId;
          window.bufferedStats.push(stats);
        });
      };

      window.room.localStreams.forEach(stream => getStats(true, stream, 0));
      window.room.remoteStreams.forEach(stream => getStats(false, stream, 0));
      let roomIndex = 0;
      window.rooms && window.rooms.forEach(room => {
        roomIndex++;
        room.localStreams.forEach(stream => getStats(true, stream, roomIndex));
        room.remoteStreams.forEach(stream => getStats(false, stream, roomIndex));
      });
    }, 100);
  });
}

async function stopBufferingStats() {
  await this.execute(function() {
    window.bufferingStats = false;
    clearInterval(window.statsInterval);
  });
}

async function getBufferedStats() {
  const result = await this.execute(function() {
    return window.bufferedStats;
  });
  return result.value;
}

function initCommands(browser) {
  browser.addCommand('waitUntilRoomConnected', waitUntilRoomConnected);
  browser.addCommand('getSubscribedStreams', getSubscribedStreams);
  browser.addCommand('waitUntilStreamInitialized', waitUntilStreamInitialized);
  browser.addCommand('waitUntilStreamsInitialized', waitUntilStreamsInitialized);
  browser.addCommand('createStream', createStream);
  browser.addCommand('createStreams', createStreams);
  browser.addCommand('initializeStream', initializeStream);
  browser.addCommand('initializeStreams', initializeStreams);
  browser.addCommand('createAndInitStream', createAndInitStream);
  browser.addCommand('createAndInitStreams', createAndInitStreams);
  browser.addCommand('publishStream', publishStream);
  browser.addCommand('publishStreams', publishStreams);
  browser.addCommand('waitUntilStreamPublished', waitUntilStreamPublished);
  browser.addCommand('waitUntilStreamsPublished', waitUntilStreamsPublished);
  browser.addCommand('subscribeToStream', subscribeToStream);
  browser.addCommand('subscribeToStreams', subscribeToStreams);
  browser.addCommand('waitUntilStreamSubscribed', waitUntilStreamSubscribed);
  browser.addCommand('waitUntilStreamsSubscribed', waitUntilStreamsSubscribed);
  browser.addCommand('isSubscribedToStream', isSubscribedToStream);
  browser.addCommand('isSubscribedToStreams', isSubscribedToStreams);
  browser.addCommand('isPublishingSimulcast', isPublishingSimulcast);
  browser.addCommand('containsCodec', containsCodec);
  browser.addCommand('isRenderingVideo', isRenderingVideo);
  browser.addCommand('isRenderingVideos', isRenderingVideos);
  browser.addCommand('waitUntilStreamIsNotBlack', waitUntilStreamIsNotBlack);
  browser.addCommand('waitUntilStreamsAreNotBlack', waitUntilStreamsAreNotBlack);
  browser.addCommand('startBufferingStats', startBufferingStats);
  browser.addCommand('stopBufferingStats', stopBufferingStats);
  browser.addCommand('getBufferedStats', getBufferedStats);
  browser.addCommand('loadClientLib', loadClientLib);
  browser.addCommand('connectToAnotherRoom', connectToAnotherRoom);
  browser.addCommand('waitUntilAnotherRoomsConnected', waitUntilAnotherRoomsConnected);
}

exports.initCommands = initCommands;
