const loadLibs = () => {
  const localAudioStat = "audioInputLevel",
        remoteAudioStat = "audioOutputLevel",
        localVideoStat = "googFrameRateInput",
        remoteVideoStat = "googFrameRateDecoded";

  window.createToken = function(roomData, callback) {
    var req = new XMLHttpRequest();
    var url = serverUrl + 'createToken/';

    req.onreadystatechange = function () {
      if (req.readyState === 4) {
        callback(req.responseText);
      }
    };

    req.open('POST', url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify(roomData));
  };

  window.connectToRoom = function(roomName, roomType, mediaConfiguration) {
    window.rooms = window.rooms || [];
    var roomData  = {username: 'user',
                 role: 'presenter',
                 room: roomName,
                 type: roomType,
                 mediaConfiguration: mediaConfiguration};
    window.createToken(roomData, function(response) {
      console.log("Connecting to another room!!", roomName);
      var token = response;
      console.log(token);
      const room = Erizo.Room({token: token});
      window.rooms.push(room);

      room.addEventListener('room-connected', function (roomEvent) {
      });

      room.addEventListener('stream-subscribed', function(streamEvent) {
        var stream = streamEvent.stream;
        var div = document.createElement('div');
        div.setAttribute('style', 'width: 320px; height: 240px;float:left;');
        div.setAttribute('id', 'test' + stream.getID());

        document.getElementById('videoContainer').appendChild(div);
        stream.show('test' + stream.getID());
      });

      room.addEventListener('stream-added', function (streamEvent) {
        var streams = [];
        document.getElementById('recordButton').disabled = false;
      });

      room.addEventListener('stream-removed', function (streamEvent) {
        // Remove stream from DOM
        var stream = streamEvent.stream;
        if (stream.elementID !== undefined) {
          var element = document.getElementById(stream.elementID);
          document.getElementById('videoContainer').removeChild(element);
        }
      });

      room.addEventListener('stream-failed', function (){
          console.log('Stream Failed, act accordingly');
      });
      room.connect({singlePC: false});
    });

  };

  window.extractStats = function(rtcStatsResponse, isMe, tracks) {
    var _extractStats = function(type) {
      var stats = {}, rtcStatsReport, checkStat, checkType;
      if (type === "audio") {
        checkType = "ssrc";
        checkStat = isMe ? localAudioStat : remoteAudioStat;
      } else if (type === "video") {
        checkType = "ssrc";
        checkStat = isMe ? localVideoStat : remoteVideoStat;
      } else if (type === "connection") {
        checkType = "googCandidatePair";
        checkStat = "googActiveConnection";
      } else if (type === 'bwe'){
        checkType = 'VideoBwe';
        checkStat = isMe? 'googAvailableSendBandwidth': 'googAvailableReceiveBandwidth';
      }
      if (rtcStatsResponse && rtcStatsResponse.result) {
        rtcStatsReport = rtcStatsResponse.result().filter(function(t) {
          var res = t.type.indexOf(checkType) === 0 && t.stat(checkStat);
          if (checkType === "ssrc" && tracks && tracks.length > 0) {
            res = res && tracks.indexOf(t.stat("googTrackId")) !== -1;
          }
          return res;
        })[0];
        if (rtcStatsReport) {
          rtcStatsReport.names().forEach(function(n) {
            stats[type + ":" + n] = rtcStatsReport.stat(n);
          });
        }
      } else {
        // OpenTok special case
        rtcStatsReport = rtcStatsResponse.filter(function(t) {
          return t.type === checkType && t[checkStat];
        })[0];
        if (rtcStatsReport) {
          Object.keys(rtcStatsReport).forEach(function(n) {
            stats[type + ":" + n] = rtcStatsReport[n];
          });
        }
      }
      stats.when = new Date().getTime();
      return stats;
    };
    return Object.assign({}, _extractStats("audio"), _extractStats("video"), _extractStats('bwe'), _extractStats("connection"));
  };

  window.computeRates = function(s1, s2) {
    var conv = 8*1000/1000;

    if (!s1 || !s2) {
      return;
    }

    var _getRate = function(statName, conversionRate, outputName) {
      var rate;
      conversionRate = conversionRate || 1;
      if (s1) {
        rate = (s2[statName] - s1[statName])/(s2.when-s1.when) * conversionRate;
        if (Number.isNaN(rate) && s2.when-s1.when > 0) {
          rate = 0;
        }
        s2[outputName] = rate.toFixed(3);
        s2.secondsElapsed = (s2.when - s1.when)/1000;
      }
    };

    var _getPct = function(statNum, statOther, outputName) {
      var den, num, pct;
      if (s1) {
        num = s2[statNum] - s1[statNum];
        den = s2[statOther] - s1[statOther] + num;

        if (den) {
          pct = (num*100/den).toFixed(3);
        } else {
          pct = "NA";
        }
        s2[outputName] = pct;
      }
    };

    var _getSince = function(statName, outputName) {
      if (s1) {
        var lastSince = s1[outputName] || 0,
            deltaSeconds = (s2.when - s1.when)/1000;
        if (parseFloat(s2[statName]) === 0) {
          s2[outputName] = parseInt(lastSince + deltaSeconds, 10);
        } else {
          s2[outputName] = 0;
        }
      }
    };

    if (s1.hasOwnProperty("audio:" + localAudioStat)) {
      _getRate("audio:bytesSent", conv, "audio:kbps");
      _getRate("video:bytesSent", conv, "video:kbps");

      _getPct("audio:packetsLost", "audio:packetsSent", "audio:pktLossPct");
      _getPct("video:packetsLost", "video:packetsSent", "video:pktLossPct");

      _getSince("audio:kbps", "audio:kbps:since");
      _getSince("video:kbps", "video:kbps:since");
      _getSince("audio:audioInputLevel", "audioLevel:since");

    } else {
      _getRate("audio:bytesReceived", conv, "audio:kbps");
      _getRate("video:bytesReceived", conv, "video:kbps");

      _getPct("audio:packetsLost", "audio:packetsReceived", "audio:pktLossPct");
      _getPct("video:packetsLost", "video:packetsReceived", "video:pktLossPct");

      _getSince("audio:kbps", "audio:kbps:since");
      _getSince("video:kbps", "video:kbps:since");
      _getSince("audio:audioOutputLevel", "audioLevel:since");
    }
  };
};

exports.loadLibs = loadLibs;
