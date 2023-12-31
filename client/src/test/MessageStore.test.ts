import MessageStore from '../store/MessageStore';
import Message from '../common/Message';
import ProxyConfig from '../common/ProxyConfig';

test("MessageStore", () => {
  const message = new Message();
  message.clientIp = 'clientIp';
  message.serverHost = 'serverHost';
  message.url = '/url';
  message.requestBody = 'requestBody';
  message.proxyConfig = new ProxyConfig();
  console.log(message);

  const messageStore = new MessageStore(message);
  expect(messageStore.getMessage()).toBe(message);

  expect(messageStore.getRequestBody()).toBe('requestBody');
  expect(messageStore.getUrl()).toBe('/url');

});
