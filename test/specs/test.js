describe('something', function() {
  it('should do something with two browser', function () {
    chrome.url('https://www.google.com/flights');
    console.log(chrome.getTitle());

    firefox.url('https://www.google.com');

    console.log(browser.getTitle());
  });
});
