import {breakpointStore} from '../store/BreakpointStore';
import MessageStore from '../store/MessageStore';
import Message from '../common/Message';

test("BreakpointStore", () => {
  const message = new Message();
  message.requestBody = 'breakpoint1';
  message.url = '/';
  console.log(message);

  breakpointStore.extend();
  expect(breakpointStore.getBreakpointList().length).toBe(1);
  const bp = breakpointStore.getBreakpointList()[0];
  bp.setFilterNoDebounce('Breakpoint1');

  // case insensitive
  bp.setMatchCase(false);
  breakpointStore.changed();
  expect(breakpointStore.findMatchingBreakpoint(message)).not.toBe(null);

  // match case
  bp.setMatchCase(true);
  breakpointStore.changed();
  expect(breakpointStore.findMatchingBreakpoint(message)).toBe(null);

  // regex
  bp.setFilterNoDebounce('.*reakpoint1');
  bp.setRegex(true);
  bp.setMatchCase(true);
  breakpointStore.changed();
  expect(breakpointStore.findMatchingBreakpoint(message)).not.toBe(null);

  // logical expression
  bp.setFilterNoDebounce('break && point');
  bp.setRegex(false);
  bp.setMatchCase(false);
  bp.setLogical(true);
  breakpointStore.changed();
  expect(breakpointStore.findMatchingBreakpoint(message)).not.toBe(null);

  // delete entry
  breakpointStore.deleteEntry(0);
  expect(breakpointStore.getBreakpointList().length).toBe(0);
  expect(breakpointStore.findMatchingBreakpoint(message)).toBe(null);
});
