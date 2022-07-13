import { Evaluator } from '../src/evaluator';

// prettier-ignore
test.each([
  [{a: 1}, {a: 1}],
  [{a: 1, b: 2, c: false}, {a: 1, b: 2, c: false}],
  [{a: 1, b: [20, -35, 40], c: {x: 30, y: 31, z: 32}, d: 4, flag: true}, {a: 1, b: [20, -35, 40], d: 4, flag: true, 'c.x': 30, 'c.y': 31, 'c.z': 32}],
  [
    {name: 'hoge', location:{x: 30.5, y: -67.62, z: 9.24}, color:{rgb:{r:18, g:52, b:86}, hsv:{h:210, s:79, v:34}}},
    {
      'location.x': 30.5, 'location.y': -67.62, 'location.z': 9.24,
      'color.rgb.b': 86, 'color.rgb.r': 18, 'color.rgb.g': 52,
      'color.hsv.h': 210, 'color.hsv.v': 34, 'color.hsv.s': 79,
      name: 'hoge',
    }
  ],
  [{a: 1, b: 2, c: {x: 30, y: 31, z: 32}, d: 4}, {' a ': 1, 'b ': 2, ' d': 4, 'c  . x': 30, '  c.y ': 31, ' c . z   ': 32}],
])('Evaluator %s', (data, path_values) => {
  const evaluator = new Evaluator(data);
  for(const [path, value] of Object.entries(path_values)) {
    expect(evaluator.eval(path)).toEqual(value)
  }
});
