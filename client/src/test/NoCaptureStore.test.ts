import Message from '../common/Message';
import {noCaptureStore} from '../store/NoCaptureStore';

test("NoCaptureStore", () => {
  const message = new Message();
  message.clientIp = 'client';

  noCaptureStore.extend();
  expect(noCaptureStore.getClientList().length).toBe(1);

  noCaptureStore.updateEntry(0, 'client');
  expect(noCaptureStore.getClientList()[0]).toBe('client');
  expect(noCaptureStore.contains(message)).toBe(true);

  noCaptureStore.deleteEntry(0);
  expect(noCaptureStore.getClientList().length).toBe(0);
  expect(noCaptureStore.contains(message)).toBe(false);
});
