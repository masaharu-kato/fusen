import { FusElement } from '../src/element';

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
  const elm = new FusElement(<Element>document.body.childNodes[0]);
  expect(elm.base_elm.tagName.toLowerCase()).toBe(tag);
  expect([...elm.base_elm.attributes].map((v) => [v.name, v.value])).toEqual(Object.entries(attrs));
  expect(Object.entries(elm.tmpl_attrs).map(([k, v]) => [k, v.pos_codes[0]])).toEqual(Object.entries(tmpl_attrs));
});

test.each([
  [0, '', null],
  [11, '<div class="hoge"></div>', null],
  [12, '<div id="myelm123" class="hoge"></div><div id="bc546" class="booboo" title="click here"></div>', null],
  [13, '<div id="myelm123" class="hoge">Hogefuga</div><div id="bc546" class="booboo"><a href="example">Click me</a></div>', null],
  [14, '<div id="myelm123" class="hoge"><span>Hogefuga</span></div><div id="bc546" class="booboo">Piyopiyo: <a href="example">Click me</a></div>', null],
  [21, '<div id="myelm123" class="name-{{name1}}"></div><div id="bc546" class="name-{{hoge.name2}}" title="hey {{hoge.name2}}!"></div>',
    [ {tag:'div', attrs:{id: 'myelm123'}, tmpl_attrs:{class: {pos: 5, code:'name1'}}}, 
      {tag:'div', attrs:{id: 'bc546'}, tmpl_attrs:{class: {pos: 5, code: 'hoge.name2'}, title: {pos: 4, code: 'hoge.name2'}}}]],
  [22, '<div class="hoge" value="{{.hoge}}"></div><a class="foo" value="{{info.foo}}"></a><span class="class-{{barbaz}}" value="{{data.bar.baz}}"></span>',
    [ {tag:'div', attrs:{class: 'hoge'}, tmpl_attrs:{value: {pos: 0, code:'.hoge'}}}, 
      {tag:'a', attrs:{class: 'foo'}, tmpl_attrs:{value: {pos: 0, code:'info.foo'}}}, 
      {tag:'span', attrs:{}, tmpl_attrs:{class: {pos: 6, code:'barbaz'}, value: {pos: 0, code:'data.bar.baz'}}} ]],
  [23, '<div class="hoge" value="{{.hoge}}">hoge</div><div id="sep9876" class="separator"></div><a class="foo" value="{{info.foo}}">link</a><div class="separator"></div><span class="quote-beg"></span><span class="class-{{barbaz}}" value="{{data.bar.baz}}">value here</span><span class="quote-end"></span>',
    [ {tag:'div', attrs:{class: 'hoge'}, tmpl_attrs:{value: {pos: 0, code:'.hoge'}}},
      null,
      {tag:'a', attrs:{class: 'foo'}, tmpl_attrs:{value: {pos: 0, code:'info.foo'}}}, 
      null,
      null,
      {tag:'span', attrs:{}, tmpl_attrs:{class: {pos: 6, code:'barbaz'}, value: {pos: 0, code:'data.bar.baz'}}},
      null,
    ]],
])('Multiple element: case %d', (no: number, html: string, infos: any[] | null) => {
  document.body.innerHTML = html;
  const elm = new FusElement(document.body);
  if(elm.child === null || infos === null) {
    expect(elm.child).toBe(infos);
  }
  else {
    for(let i=0; i<elm.child.nodes.length; i++) {
      const celm = elm.child.nodes[i];
      const info = infos[i];
      if (info === null) {
        expect(celm instanceof Element).toBe(true);
      }
      else {
        if(!(celm instanceof FusElement)) throw new Error('Invalid type.');
        expect(celm.base_elm.tagName.toLowerCase()).toBe(info.tag);
        expect([...celm.base_elm.attributes].map((v) => [v.name, v.value])).toEqual(Object.entries(info.attrs));
        expect(Object.entries(celm.tmpl_attrs).map(([k, v]) => [k, v.pos_codes[0]])).toEqual(Object.entries(info.tmpl_attrs));
      }
    }
  }
});
