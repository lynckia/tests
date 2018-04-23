describe('something', function() {
  it('should do something with two browser', function () {
    chrome.url('http://licode:3001');
    // firefox.url('http://licode:3001');
    console.log(browser.getTitle());
  });
});
