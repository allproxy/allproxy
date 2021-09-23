import {filterStore} from '../store/FilterStore';
import MessageStore from '../store/MessageStore';
import Message from '../common/Message';

test("FilterStore", () => {
  const message = new Message();
  message.requestBody = 'Match1';
  message.url = '/';
  console.log(message);
  const messageStore = new MessageStore(message);

  filterStore.setFilterNoDebounce('match1');

  // case insensitive
  filterStore.setMatchCase(false);
  expect(filterStore.isFiltered(messageStore)).toBe(false);

  // match case
  filterStore.setMatchCase(true);
  expect(filterStore.isFiltered(messageStore)).toBe(true);

  // regex
  filterStore.setFilterNoDebounce('.*tch1');
  filterStore.setRegex(true);
  filterStore.setMatchCase(true);
  expect(filterStore.isFiltered(messageStore)).toBe(false);

  // logical expression
  filterStore.setFilterNoDebounce('mat && tch1');
  filterStore.setRegex(false);
  filterStore.setMatchCase(false);
  filterStore.setLogical(true);
  expect(filterStore.isFiltered(messageStore)).toBe(false);

  // invalid logical expression
  filterStore.setFilterNoDebounce('(A && B');
  expect(filterStore.isInvalidFilterSyntax()).toBe(true);

  filterStore.setFilterNoDebounce('!(A && !(B || !C))');
  expect(filterStore.isInvalidFilterSyntax()).toBe(false);
});
