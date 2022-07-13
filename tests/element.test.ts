import { make_fus_nodes, FusElement } from '../src/element';

test.each([
  [1, '<div></div>', 'div', {}, {}],
  [2, '<div class="hoge"></div>', 'div', {class: 'hoge'}, {}],
  [3, '<div id="myelm123" class="hoge"></div>', 'div', {id: 'myelm123', class: 'hoge'}, {}],
  [4, '<div id="eefw" class="{{boo}}"></div>', 'div', {id: 'eefw'}, {class: {pos: 0, code: 'boo'}}],
  [5, '<div id="{{data.id}}" class="hoge"></div>', 'div', {class: 'hoge'}, {id: {pos: 0, code: 'data.id'}}],
  [6, '<div id="{{data.id}}" class="{{myclass}}"></div>', 'div', {}, {id: {pos: 0, code: 'data.id'}, class: {pos: 0, code: 'myclass'}}],
  [7, '<div id="{{data.id}}" class="foo {{myclass}} bluh" data-bar="bazbaz"></div>', 'div', {'data-bar': 'bazbaz'}, {id: {pos: 0, code: 'data.id'}, class: {pos: 4, code: 'myclass'}}],
])('test case %d', (no, html, tag, attrs, tmpl_attrs) => {
  document.body.innerHTML = html;
  const fus_nodes = [...make_fus_nodes([...document.body.childNodes])]
  const fus_node = fus_nodes[0];
  if(!(fus_node instanceof FusElement)) throw new TypeError();
  expect(fus_node.base_elm.tagName.toLowerCase()).toEqual(tag);
  expect([...fus_node.base_elm.attributes].map((v) => [v.name, v.value])).toEqual(Object.entries(attrs));
  expect(Object.entries(fus_node.tmpl_attrs).map(([k, v]) => [k, v.pos_codes[0]])).toEqual(Object.entries(tmpl_attrs));
});

