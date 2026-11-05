// Run with: node scripts/handoff-input-check.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const filename = path.resolve(__dirname, '../src/components/experience/handoff.ts');
const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function harness() {
  let clock = 1000;
  let timerId = 0;
  const timers = new Map();
  const sandbox = {
    exports: {},
    performance: { now: () => clock },
    setTimeout: (callback, delay = 0) => {
      const id = ++timerId;
      timers.set(id, { callback, at: clock + delay });
      return id;
    },
    clearTimeout: id => timers.delete(id),
  };
  vm.runInNewContext(code, sandbox, { filename });
  const advance = milliseconds => {
    const end = clock + milliseconds;
    let count = 0;
    while (true) {
      const next = [...timers].filter(([, timer]) => timer.at <= end)
        .sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      assert(++count < 100, 'Input delivery created a timer loop');
      timers.delete(next[0]);
      clock = next[1].at;
      next[1].callback();
    }
    clock = end;
  };
  const event = properties => ({
    timeStamp: clock,
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; },
    ...properties,
  });
  return {
    api: sandbox.exports,
    advance,
    wheel: (deltaY = 100, properties = {}) => event({ deltaY, deltaMode: 0, ...properties }),
    key: (key = 'PageDown', properties = {}) => event({ key, ...properties }),
  };
}

// Only closest() is needed from the DOM; these targets include matching ancestors.
const target = token => ({
  closest: selector => selector.split(',').some(part => part.trim().startsWith(token)) ? {} : null,
});
const noopInput = { step: () => false, hurry: () => {} };
const results = [];
function check(name, run) {
  try {
    run();
    results.push({ name, passed: true });
  } catch (error) {
    results.push({ name, passed: false });
    console.error(`FAIL ${name}\n${error.stack}`);
  }
}

check('One 1.5-second wheel momentum burst requests one beat', () => {
  const { api, advance, wheel } = harness();
  let hurried = 0;
  let delivered = 0;
  api.registerHandoffInput('active', { hurry: () => hurried++, step: () => { delivered++; return true; } });
  assert.equal(api.wheelStep(wheel()), 1);
  api.claimHandoff('active');
  for (let index = 0; index < 150; index++) {
    advance(10);
    assert.equal(api.wheelStep(wheel()), 0);
  }
  api.completeHandoff('active');
  advance(500);
  assert.equal(hurried, 0);
  assert.equal(delivered, 0);
});

check('Fresh busy input hurries once per event and retains only latest direction/source', () => {
  const { api, advance, wheel, key } = harness();
  let hurried = 0;
  let nextHurried = 0;
  const delivered = [];
  api.registerHandoffInput('active', { hurry: () => hurried++, step: () => false });
  api.registerHandoffInput('next', {
    hurry: () => nextHurried++,
    step: (direction, keyboard) => { delivered.push([direction, keyboard]); api.claimHandoff('next'); return true; },
  });
  api.claimHandoff('active');
  const first = wheel();
  assert.equal(api.wheelStep(first), 0);
  assert(first.defaultPrevented);
  assert.equal(api.wheelStep(first), 0);
  assert.equal(hurried, 1, 'Another listener processed the same wheel twice');
  advance(60);
  assert.equal(api.wheelStep(wheel()), 0);
  advance(10);
  assert.equal(api.wheelStep(wheel(-100)), 0, 'A direction reversal was ignored as momentum');
  const last = key('PageUp');
  assert.equal(api.keyStep(last), 0);
  assert(last.defaultPrevented);
  assert.equal(api.keyStep(last), 0);
  assert.equal(hurried, 3, 'Momentum or another listener processed an input twice');
  api.completeHandoff('wrong-owner');
  advance(100);
  assert.deepEqual(delivered, []);
  api.completeHandoff('active');
  assert.deepEqual(delivered, [], 'Pending input dispatched inside completion');
  advance(59);
  assert.deepEqual(delivered, []);
  advance(1);
  assert.deepEqual(delivered, [[-1, true]]);
  assert.equal(nextHurried, 1);
  advance(500);
  assert.equal(delivered.length, 1, 'More than one pending beat was retained');
});

check('Tiny sign changes in a momentum tail do not request a reversal', () => {
  const { api, advance, wheel } = harness();
  let hurried = 0;
  let delivered = 0;
  api.registerHandoffInput('active', { hurry: () => hurried++, step: () => { delivered++; return true; } });
  api.wheelStep(wheel());
  api.claimHandoff('active');
  for (const delta of [-0.5, 0.4, -0.2, 0.1]) {
    advance(10);
    assert.equal(api.wheelStep(wheel(delta)), 0);
  }
  api.completeHandoff('active');
  advance(200);
  assert.equal(hurried, 0);
  assert.equal(delivered, 0);
});

for (const gap of [80, 140, 300]) {
  check(`A decaying wheel stream with ${gap}ms gaps stays one beat across completion`, () => {
    const { api, advance, wheel } = harness();
    let hurried = 0;
    let delivered = 0;
    api.registerHandoffInput('active', { hurry: () => hurried++, step: () => false });
    api.registerHandoffInput('next', { hurry: () => {}, step: () => { delivered++; return true; } });
    let requests = api.wheelStep(wheel()) === 1 ? 1 : 0;
    api.claimHandoff('active');
    let elapsed = 0;
    let completed = false;
    for (let index = 1; index * gap <= 2100; index++) {
      const at = index * gap;
      if (!completed && at >= 1000) {
        advance(1000 - elapsed);
        api.completeHandoff('active');
        completed = true;
        elapsed = 1000;
      }
      advance(at - elapsed);
      elapsed = at;
      if (api.wheelStep(wheel(100 * 0.7 ** index)) !== 0) requests++;
    }
    advance(700);
    assert.equal(requests, 1, 'A tail packet requested another section after landing');
    assert.equal(delivered, 0, 'A tail packet created pending section travel');
    assert.equal(hurried, 0, 'A decaying tail changed the animation pace');
  });
}

check('Equal wheel notches never queue; a fresh busy wheel request only hurries', () => {
  const { api, advance, wheel } = harness();
  const speeds = [];
  let delivered = 0;
  api.registerHandoffInput('active', { hurry: speed => speeds.push(speed), step: () => false });
  api.registerHandoffInput('next', { hurry: () => {}, step: () => { delivered++; return true; } });
  assert.equal(api.wheelStep(wheel()), 1);
  api.claimHandoff('active');
  for (let index = 0; index < 5; index++) {
    advance(80);
    assert.equal(api.wheelStep(wheel()), 0);
  }
  assert.deepEqual(speeds, [], 'Packets inside one wheel gesture accelerated the move');
  advance(240);
  const repeat = wheel();
  assert.equal(api.wheelStep(repeat), 0);
  assert(repeat.defaultPrevented);
  assert.deepEqual(speeds, [1.8]);
  api.completeHandoff('active');
  advance(500);
  assert.equal(delivered, 0, 'A repeated same-direction wheel request queued another section');
});

check('A same-direction wheel request during settling does not queue travel', () => {
  const { api, advance, wheel } = harness();
  let delivered = 0;
  api.registerHandoffInput('next', { hurry: () => {}, step: () => { delivered++; return true; } });
  assert.equal(api.wheelStep(wheel()), 1);
  api.claimHandoff('previous');
  advance(1000);
  api.completeHandoff('previous');
  advance(20);
  assert.equal(api.wheelStep(wheel()), 0);
  advance(500);
  assert.equal(delivered, 0);
});

check('A new wheel gesture after quiet requests exactly one new beat', () => {
  const { api, advance, wheel } = harness();
  assert.equal(api.wheelStep(wheel()), 1);
  api.claimHandoff('previous');
  advance(400);
  api.completeHandoff('previous');
  advance(100);
  assert.equal(api.wheelStep(wheel(50)), 0);
  advance(240);
  assert.equal(api.wheelStep(wheel()), 1, 'A fresh wheel gesture remained stuck behind the prior tail');
  api.claimHandoff('next');
  advance(10);
  assert.equal(api.wheelStep(wheel(70)), 0);
});

for (const gap of [10, 300]) {
  check(`Small opposite noise at ${gap}ms gaps cannot turn a normal tail into a reversal`, () => {
    const { api, advance, wheel } = harness();
    let hurried = 0;
    let delivered = 0;
    api.registerHandoffInput('active', { hurry: () => hurried++, step: () => { delivered++; return true; } });
    assert.equal(api.wheelStep(wheel()), 1);
    api.claimHandoff('active');
    for (const delta of [-0.3, 10]) {
      advance(gap);
      assert.equal(api.wheelStep(wheel(delta)), 0);
    }
    api.completeHandoff('active');
    advance(700);
    assert.equal(hurried, 0);
    assert.equal(delivered, 0);
    assert.equal(api.wheelStep(wheel(1)), 1, 'A gentle gesture remained blocked after the full idle interval');
  });
}

check('Equivalent pixel and line deltas are not mistaken for decaying input', () => {
  const { api, advance, wheel } = harness();
  const speeds = [];
  let delivered = 0;
  api.registerHandoffInput('active', { hurry: speed => speeds.push(speed), step: () => false });
  api.registerHandoffInput('next', { hurry: () => {}, step: () => { delivered++; return true; } });
  assert.equal(api.wheelStep(wheel(96)), 1);
  api.claimHandoff('active');
  advance(300);
  assert.equal(api.wheelStep(wheel(6, { deltaMode: 1 })), 0);
  assert.deepEqual(speeds, [1.8]);
  api.completeHandoff('active');
  advance(300);
  assert.equal(delivered, 0);
  assert.equal(api.wheelStep(wheel(96)), 1);
});

check('Same-direction wheel hurrying preserves an explicit keyboard request', () => {
  const { api, advance, wheel, key } = harness();
  const activeSpeeds = [];
  const nextSpeeds = [];
  const delivered = [];
  api.registerHandoffInput('active', { hurry: speed => activeSpeeds.push(speed), step: () => false });
  api.registerHandoffInput('next', {
    hurry: speed => nextSpeeds.push(speed),
    step: (direction, keyboard) => { delivered.push([direction, keyboard]); api.claimHandoff('next'); return true; },
  });
  assert.equal(api.wheelStep(wheel()), 1);
  api.claimHandoff('active');
  assert.equal(api.keyStep(key()), 0);
  advance(300);
  assert.equal(api.wheelStep(wheel()), 0);
  assert.deepEqual(activeSpeeds, [3, 1.8]);
  api.completeHandoff('active');
  advance(60);
  assert.deepEqual(delivered, [[1, true]]);
  assert.deepEqual(nextSpeeds, [3]);
});

check('A meaningful opposite wheel gesture retains one reverse request', () => {
  const { api, advance, wheel } = harness();
  const delivered = [];
  const speeds = [];
  api.registerHandoffInput('active', noopInput);
  api.registerHandoffInput('next', {
    hurry: speed => speeds.push(speed),
    step: (direction, keyboard) => { delivered.push([direction, keyboard]); api.claimHandoff('next'); return true; },
  });
  assert.equal(api.wheelStep(wheel()), 1);
  api.claimHandoff('active');
  advance(80);
  const reversal = wheel(-100);
  assert.equal(api.wheelStep(reversal), 0);
  assert(reversal.defaultPrevented);
  assert.equal(api.wheelStep(reversal), 0);
  api.completeHandoff('active');
  advance(60);
  assert.deepEqual(delivered, [[-1, false]]);
  assert.deepEqual(speeds, [1.8]);
});

check('Fresh input during settling is delivered once after a short delay', () => {
  const { api, advance, key } = harness();
  const delivered = [];
  api.registerHandoffInput('next', {
    hurry: () => {},
    step: (direction, keyboard) => { delivered.push([direction, keyboard]); api.claimHandoff('next'); return true; },
  });
  api.claimHandoff('previous');
  api.completeHandoff('previous');
  advance(20);
  const press = key('PageDown');
  assert.equal(api.keyStep(press), 0);
  assert(press.defaultPrevented);
  advance(59);
  assert.deepEqual(delivered, []);
  advance(1);
  assert.deepEqual(delivered, [[1, true]]);
});

for (const cancellation of ['release', 'reset', 'unregister']) {
  check(`${cancellation} cancels pending input without dispatch`, () => {
    const { api, advance, key } = harness();
    let delivered = 0;
    const unregister = api.registerHandoffInput('active', noopInput);
    api.registerHandoffInput('next', { hurry: () => {}, step: () => { delivered++; return true; } });
    api.claimHandoff('active');
    api.keyStep(key());
    if (cancellation === 'release') api.releaseHandoff('active');
    else {
      api.completeHandoff('active');
      if (cancellation === 'reset') api.resetHandoff();
      else unregister();
    }
    advance(1000);
    assert.equal(delivered, 0);
    assert.equal(api.handoffBusy('next'), false);
  });
}

check('Ctrl wheel/pinch, modified keys, editing, and native Space activation stay untouched', () => {
  const { api, advance, wheel, key } = harness();
  let hurried = 0;
  let delivered = 0;
  api.registerHandoffInput('active', { hurry: () => hurried++, step: () => { delivered++; return true; } });
  api.claimHandoff('active');
  for (const gesture of [wheel(100, { ctrlKey: true }), wheel(0)]) {
    assert.equal(api.wheelStep(gesture), 0);
    assert.equal(gesture.defaultPrevented, false);
    advance(60);
  }
  const nativeKeys = [
    ...['ctrlKey', 'metaKey', 'altKey'].map(modifier => key('PageDown', { [modifier]: true })),
    ...['input', 'textarea', 'select', '[contenteditable]'].map(token => key('ArrowDown', { target: target(token) })),
    ...['button', 'a', '[role="button"]'].flatMap(token =>
      [' ', 'Spacebar'].map(name => key(name, { target: target(token) }))),
  ];
  for (const press of nativeKeys) {
    assert.equal(api.isHandoffKey(press), false);
    assert.equal(api.keyStep(press), 0);
    assert.equal(press.defaultPrevented, false);
  }
  api.completeHandoff('active');
  advance(500);
  assert.equal(hurried, 0);
  assert.equal(delivered, 0);
});

check('Held keys do not queue; only an active owner suppresses native repeats centrally', () => {
  const { api, advance, key } = harness();
  let hurried = 0;
  let delivered = 0;
  api.registerHandoffInput('footer-home', noopInput);
  api.registerHandoffInput('cinematic', {
    hurry: () => hurried++,
    step: () => { delivered++; return true; },
  });
  for (const busy of [false, true]) {
    if (busy) api.claimHandoff('cinematic');
    const repeat = key('ArrowDown', { repeat: true });
    assert.equal(api.keyStep(repeat), 0);
    assert.equal(repeat.defaultPrevented, busy);
    api.completeHandoff('cinematic');
    advance(500);
  }
  assert.equal(hurried, 0);
  assert.equal(delivered, 0);
  const native = harness();
  native.api.registerHandoffInput('footer-home', noopInput);
  const repeat = native.key('ArrowDown', { repeat: true });
  assert.equal(native.api.keyStep(repeat), 0);
  assert.equal(repeat.defaultPrevented, false, 'Footer registration blocked native key scrolling');
});

check('Shift Space requests the preceding beat', () => {
  const { api, key } = harness();
  assert.equal(api.keyStep(key(' ', { shiftKey: true })), -1);
});

const failed = results.filter(result => !result.passed);
console.log(`${results.length - failed.length}/${results.length} handoff input checks passed.`);
if (failed.length) process.exitCode = 1;
