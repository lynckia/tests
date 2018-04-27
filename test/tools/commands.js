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

async function waitUntilRoomConnected() {
  return this.waitUntil(async function() {
    let result = await this.execute(function() {
      if (!window.room) {
        return 0;
      }
      return window.room.state;
    });
    return result.value === 2;
  }, 30000, 'timeout connecting to room');
};

async function waitUntilStreamInitialized(stream) {
  this.waitUntil(async function() {
    const result = await this.execute(function(id) {
      return window.localStreams[id] !== undefined && window.localStreams[id].stream !== undefined;
    }, stream.id);
    return result.value;
  }, 30000, 'timeout waiting to stream initialization');
}

async function createStream(stream) {
  const result = await this.execute(function(id, config) {
    if (!window.room) {
      return false;
    }
    window.localStreams = window.localStreams || [];
    const room = window.room;
    const localStream = Erizo.Stream(config);
    window.localStreams[id] = localStream;
    return true;
  }, stream.id, stream.config);
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

async function createAndInitStream(stream) {
  const created = await this.createStream(stream);
  if (!created) {
    return false;
  }
  const initialized = await this.initializeStream(stream);
  return initialized;
}

async function publishStream(stream, options) {
  const result = await this.execute(function(id, options) {
    if (!window.room) {
      return false;
    }
    const localStream = window.localStreams[id];
    if (localStream.stream) {
      window.room.publish(localStream, options);
      return true;
    }
    return false;
  }, stream.id, options);
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
    if (result.value[0]) {
      stream.streamId = result.value[1];
    }
    return result.value[0];
  }, 30000, 'timeout waiting to stream being published');
}

async function subscribeToStream(stream, options) {
  const result = await this.execute(function(streamId, options) {
    if (!window.room) {
      return false;
    }
    const stream = window.room.remoteStreams.get(streamId);
    if (!stream) {
      return false;
    }
    window.room.subscribe(stream, options);
    return true;
  }, stream.streamId, options);
  return result.value;
}

async function waitUntilStreamSubscribed(stream) {
  this.waitUntil(async function() {
    const result = await this.isSubscribedToStream(stream);
    return result;
  }, 30000, 'timeout waiting to stream being subscribed');
}

async function isSubscribedToStream(stream) {
  const result = await this.execute(function(streamId) {
    if (!window.room) {
      return false;
    }
    const stream = window.room.remoteStreams.get(streamId);
    if (stream && stream.stream) {
      return true;
    }
    return false;
  }, stream.streamId);
  return result.value;
}

async function isPublishingSimulcast(stream) {
  const result = await this.execute(function(streamId) {
    if (!window.room) {
      return false;
    }
    const stream = window.room.localStreams.get(streamId);
    if (stream && stream.pc) {
      if (window.room.p2p) {
        return false;
      } else {
        return stream.pc.peerConnection.localDescription.sdp.indexOf('a=ssrc-group:SIM') !== -1 ||
               stream.pc.peerConnection.localDescription.sdp.indexOf('a=simulcast:') !== -1;
      }
    }
    return false;
  }, stream.streamId);
  return result.value;
}

async function containsCodec(stream, codec) {
  const result = await this.execute(function(streamId, codec) {
    if (!window.room) {
      return false;
    }
    const stream = window.room.localStreams.get(streamId);
    if (stream && stream.pc) {
      if (window.room.p2p) {
        let hasCodec = false;
        stream.pc.forEach(pc => {
          hasCodec = pc.peerConnection.remoteDescription.sdp.indexOf(codec) !== -1 ||
                     pc.peerConnection.remoteDescription.sdp.indexOf(codec.toLowerCase()) !== -1;
        });
        return hasCodec;
      } else {
        return stream.pc.peerConnection.remoteDescription.sdp.indexOf(codec) !== -1 ||
              stream.pc.peerConnection.remoteDescription.sdp.indexOf(codec.toLowerCase()) !== -1;
      }
    }
    return false;
  }, stream.streamId, codec);
  return result.value;
}

async function isBlackStream(stream) {
  const result = await this.execute(function(streamId) {
    if (!window.room) {
      return false;
    }
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
      for (const i = 0; i < 10; i++) {
        if (!_sampleIsBlack(image.data, _getRandomSample(image.width, image.height))) {
          return false;
        }
      }
      return true;
    }


    return false;
  }, stream.streamId);
  return result.value;
}

async function waitUntilStreamIsNotBlack(stream) {
  this.waitUntil(async function() {
    const result = await this.isBlackStream(stream);
    return !result;
  }, 30000, 'timeout waiting to stream not being black');
}

function initCommandsInBrowser(browser) {
  browser.addCommand('waitUntilRoomConnected', waitUntilRoomConnected);
  browser.addCommand('getSubscribedStreams', getSubscribedStreams);
  browser.addCommand('waitUntilStreamInitialized', waitUntilStreamInitialized);
  browser.addCommand('createStream', createStream);
  browser.addCommand('initializeStream', initializeStream);
  browser.addCommand('createAndInitStream', createAndInitStream);
  browser.addCommand('publishStream', publishStream);
  browser.addCommand('waitUntilStreamPublished', waitUntilStreamPublished);
  browser.addCommand('subscribeToStream', subscribeToStream);
  browser.addCommand('waitUntilStreamSubscribed', waitUntilStreamSubscribed);
  browser.addCommand('isSubscribedToStream', isSubscribedToStream);
  browser.addCommand('isPublishingSimulcast', isPublishingSimulcast);
  browser.addCommand('containsCodec', containsCodec);
  browser.addCommand('isBlackStream', isBlackStream);
  browser.addCommand('waitUntilStreamIsNotBlack', waitUntilStreamIsNotBlack);
}

function initCommands() {
  initCommandsInBrowser(chrome1);
  initCommandsInBrowser(chrome2);
  initCommandsInBrowser(firefox1);
  initCommandsInBrowser(firefox2);
}

exports.initCommands = initCommands;
