import { Evaluator } from '../src/evaluator';
import { TemplateText } from '../src/tmpl-text';

test.each([
  ['', '', []],
  ['hogepiyo', 'hogepiyo', []],
  ['hoge{{fuga}}piyo', 'hogepiyo', [[4, 'fuga']]],
  ['hoge{{fuga}}piyor{{foobar}}', 'hogepiyor', [[4, 'fuga'], [9, 'foobar']]],
  ['hoge{{fuga}}piyor{{foobar}}.', 'hogepiyor.', [[4, 'fuga'], [9, 'foobar']]],
  ['{{fuga}}and{{foobar}}', 'and', [[0, 'fuga'], [3, 'foobar']]],
  ['{{fuga}}, {{foobar}}, and {{bluh.booboo}}', ', , and ', [[0, 'fuga'], [2, 'foobar'], [8, 'bluh.booboo']]],
  ['{{fuga}}{{foobar}}{{bluh.booboo}}', '', [[0, 'fuga'], [0, 'foobar'], [0, 'bluh.booboo']]],
  ['Heyhey, {{first.second+operate-sub}}bluhbluh.', 'Heyhey, bluhbluh.', [[8, 'first.second+operate-sub']]],
  ['There are {{m}}{{a}}{{ny}} para{{mete}}r{{s}}.', 'There are  parar.', [[10, 'm'], [10, 'a'], [10, 'ny'], [15, 'mete'], [16, 's']]],
])('Template %s', (tmpl_text, plain_text, pos_codes) => {
  const tmpl = new TemplateText(tmpl_text);
  expect(tmpl.plain_text).toEqual(plain_text);
  expect(tmpl.pos_codes).toEqual(pos_codes.map(([pos, code]) => ({pos: pos, code: code})));
});

const data = {name: 'hoge', baz:'foo1234', 'view-count': 123, p:{x: 30.5, y: -67.62, z: 9.2452}, color:{rgb:{r:18, g:152, b:8}, hsv:{h:210, s:79, v:34}}};

test.each([
  ['', ''],
  ['name is {{name}}', 'name is hoge'],
  ['name is {{name}}, {{view-count}} views.', 'name is hoge, 123 views.'],
  ['woohoo{{name}}{{view-count}}{{baz}}{{name}}', 'woohoohoge123foo1234hoge'],
  ['{{name}}{{name}}{{baz}}hey', 'hogehogefoo1234hey'],
  ['{{name}} -- located in ({{p.x}}, {{p.y}}, {{p.z}})', 'hoge -- located in (30.5, -67.62, 9.2452)'],
  ['{{baz}} color is R={{color.rgb.r}}, G={{color.rgb.g}}, B={{color.rgb.b}} {{baz}}', 'foo1234 color is R=18, G=152, B=8 foo1234'],
])('Template make_text %s', (tmpl_text, result) => {
  const tmpl = new TemplateText(tmpl_text);
  const evaluator = new Evaluator(data);
  expect(tmpl.make_text(evaluator)).toBe(result);
});
