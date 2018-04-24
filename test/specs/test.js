const getSubscribedStreams = function() {
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
};

describe('Firefox and Chrome', function() {
  beforeEach(function() {
    chrome.url('http://licode:3001');
    firefox.url('http://licode:3001');
  });

  it('should open Basic Example page', function () {
    chrome.getTitle().should.be.equal('Licode Basic Example');
    firefox.getTitle().should.be.equal('Licode Basic Example');
  });

  it('should subscribe to each other', function () {
    browser.waitUntil(function() {
      const chromeRemoteStreams = chrome.execute(getSubscribedStreams);
      const firefoxRemoteStreams = firefox.execute(getSubscribedStreams);
      return chromeRemoteStreams.value > 0 && firefoxRemoteStreams.value > 0;
    });
  });
});
