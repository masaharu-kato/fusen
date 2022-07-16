import { FusElement, process_nodes } from '../src/element';

test.each([
  [1, '<div></div>', 'div', {}, {}],
  [2, '<div class="hoge"></div>', 'div', {class: 'hoge'}, {}],
  [3, '<div id="myelm123" class="hoge"></div>', 'div', {id: 'myelm123', class: 'hoge'}, {}],
  [4, '<div id="eefw" class="{{boo}}"></div>', 'div', {id: 'eefw'}, {class: {pos: 0, code: 'boo'}}],
  [5, '<div id="{{data.id}}" class="hoge"></div>', 'div', {class: 'hoge'}, {id: {pos: 0, code: 'data.id'}}],
  [6, '<div id="{{data.id}}" class="{{myclass}}"></div>', 'div', {}, {id: {pos: 0, code: 'data.id'}, class: {pos: 0, code: 'myclass'}}],
  [7, '<div id="{{data.id}}" class="foo {{myclass}} bluh" data-bar="bazbaz"></div>', 'div', {'data-bar': 'bazbaz'}, {id: {pos: 0, code: 'data.id'}, class: {pos: 4, code: 'myclass'}}],
])('Single element: case %d', (no, html, tag, attrs, tmpl_attrs) => {
  document.body.innerHTML = html;
  const fus_node = new FusElement(<Element>document.body.childNodes[0]);
  if(!(fus_node instanceof FusElement)) throw new TypeError();
  const base_elm = <Element>fus_node.base_node;
  expect(base_elm.tagName.toLowerCase()).toBe(tag);
  expect([...base_elm.attributes].map((v) => [v.name, v.value])).toEqual(Object.entries(attrs));
  expect(Object.entries(fus_node.tmpl_attrs).map(([k, v]) => [k, v.pos_codes[0]])).toEqual(Object.entries(tmpl_attrs));
});

test.each([
  [0, '', [{tag:'div', attrs:{}, tmpl_attrs:{}}]],
  [1, '<div class="hoge"></div>', [{tag:'div', attrs:{class: 'hoge'}, tmpl_attrs:{}}]],
  [2, '<div id="myelm123" class="hoge"></div><div id="bc546" class="booboo" title="click here"></div>',
    [ {tag:'div', attrs:{id: 'myelm123', class: 'hoge'}, tmpl_attrs:{}},
      {tag:'div', attrs:{id: 'bc546', class: 'booboo', title: 'click here'}, tmpl_attrs:{}} ]],
  [3, '<div id="myelm123" class="name-{{name1}}"></div><div id="bc546" class="name-{{hoge.name2}}" title="hey {{hoge.name2}}!"></div>',
    [ {tag:'div', attrs:{id: 'myelm123'}, tmpl_attrs:{class: {pos: 5, code:'name1'}}}, 
      {tag:'div', attrs:{id: 'bc546'}, tmpl_attrs:{class: {pos: 5, code: 'hoge.name2'}, title: {pos: 4, code: 'hoge.name2'}}}]],
  [4, '<div class="hoge" value="{{.hoge}}"></div><a class="foo" value="{{info.foo}}"></a><span class="class-{{barbaz}}" value="{{data.bar.baz}}"></span>',
    [ {tag:'div', attrs:{class: 'hoge'}, tmpl_attrs:{value: {pos: 0, code:'.hoge'}}}, 
      {tag:'a', attrs:{class: 'foo'}, tmpl_attrs:{value: {pos: 0, code:'info.foo'}}}, 
      {tag:'span', attrs:{}, tmpl_attrs:{class: {pos: 6, code:'barbaz'}, value: {pos: 0, code:'data.bar.baz'}}} ]],
  [5, '<div class="hoge" value="{{.hoge}}"></div><div id="sep9876" class="separator"></div><a class="foo" value="{{info.foo}}"></a><div class="separator"></div><span class="quote-beg"></span><span class="class-{{barbaz}}" value="{{data.bar.baz}}"></span><span class="quote-end"></span>',
    [ {tag:'div', attrs:{class: 'hoge'}, tmpl_attrs:{value: {pos: 0, code:'.hoge'}}},
      {tag:'div', attrs:{id: 'sep9876', class:'separator'}, tmpl_attrs: {}},
      {tag:'a', attrs:{class: 'foo'}, tmpl_attrs:{value: {pos: 0, code:'info.foo'}}}, 
      {tag:'div', attrs:{class:'separator'}, tmpl_attrs: {}},
      {tag:'span', attrs:{class:'quote-beg'}, tmpl_attrs: {}},
      {tag:'span', attrs:{}, tmpl_attrs:{class: {pos: 6, code:'barbaz'}, value: {pos: 0, code:'data.bar.baz'}}},
      {tag:'span', attrs:{class:'quote-end'}, tmpl_attrs: {}},
    ]],
])('Multiple element: case %d', (no: number, html: string, infos: any[]) => {
  document.body.innerHTML = html;
  const fus_nodes = process_nodes([...document.body.childNodes]);
  for(let i=0; i<fus_nodes.nodes.length; i++) {
    const fus_node = <FusElement>fus_nodes.nodes[i]
    const info = infos[i]
    const base_elm = <Element>fus_node.base_node;
    expect(base_elm.tagName.toLowerCase()).toBe(info.tag);
    expect([...base_elm.attributes].map((v) => [v.name, v.value])).toEqual(Object.entries(info.attrs));
    expect(Object.entries(fus_node.tmpl_attrs).map(([k, v]) => [k, v.pos_codes[0]])).toEqual(Object.entries(info.tmpl_attrs));
  }
});


const data = {name: 'hoge', baz:'foo1234', 'view-count': 123, p:{x: 30.5, y: -67.62, z: 9.2452}, color:{rgb:{r:18, g:152, b:8}, hsv:{h:210, s:79, v:34}}};

// test.each([
//   [1, '<div></div>', '<div></div>'],
//   [2, '<div>{{name}}</div>', '<div>hoge</div>'],
// ])('test case %d', (no, tmpl_html, result) => {
//   document.body.innerHTML = tmpl_html;
//   const fus_nodes = [...make_fus_nodes([...document.body.childNodes])]
//   const fus_node = fus_nodes[0];
//   if(!(fus_node instanceof FusElement)) throw new TypeError();
//   expect(fus_node.base_elm.tagName.toLowerCase()).toEqual(tag);
// });
