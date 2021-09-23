import {messageQueueStore} from '../store/MessageQueueStore';
import Message from '../common/Message';
import ProxyConfig from '../common/ProxyConfig';

test("MessageQueueStore", () => {
  const store = messageQueueStore;
  const message = new Message();
  message.requestBody = '{xyz: "abc"}';
  message.url = '/';
  message.proxyConfig = new ProxyConfig();
  console.log(message);

  store.insertBatch([message]);
  expect(store.getMessages().length).toBe(1);

  store.clear();
  expect(store.getMessages().length).toBe(0);

  store.setLimit(1);
  expect(store.getLimit()).toBe(1);
  store.insertBatch([message, message]);
  expect(store.getMessages().length).toBe(1);

  // no message are queued when stopped
  store.clear();
  store.setStopped(true);
  expect(store.getStopped()).toBe(true);
  store.insertBatch([message, message]);
  expect(store.getMessages().length).toBe(0);
});
