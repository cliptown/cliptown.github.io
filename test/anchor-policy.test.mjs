import test from 'node:test';
import assert from 'node:assert/strict';
import { unsafeNewTabLinks } from '../scripts/anchor-policy.mjs';

test('accepts safe new-tab links in either attribute order', () => {
  assert.deepEqual(unsafeNewTabLinks('<a rel="noreferrer noopener" target="_blank">link</a>'), []);
  assert.deepEqual(unsafeNewTabLinks("<a target = '_BLANK' rel='noopener noreferrer'>link</a>"), []);
  assert.deepEqual(unsafeNewTabLinks('<a href="/help">same tab</a>'), []);
});

test('rejects missing, partial, unquoted and spaced attribute policies', () => {
  assert.equal(unsafeNewTabLinks('<a rel="noopener" target = "_blank">link</a>').length, 1);
  assert.equal(unsafeNewTabLinks("<a target='_blank' rel='noreferrer'>link</a>").length, 1);
  assert.equal(unsafeNewTabLinks('<a target=_blank href="/help">link</a>').length, 1);
  assert.equal(unsafeNewTabLinks('<a data-target="_blank" href="/help">link</a>').length, 0);
});
