import { FusElement } from '../src/element';
import { Evaluator } from '../src/evaluator';

const data = {name: 'hoge', baz:'foo1234', 'view-count': 123, p:{x: 30.5, y: -67.62, z: 9.2452}, color:{rgb:{r:18, g:152, b:8}, hsv:{h:210, s:79, v:34}}};

test.each([
  [1, '<div></div>', '<div></div>'],
  [2, '<div>{{name}}</div>', '<div>hoge</div>'],
  [3, '<div class="type-{{baz}}">{{name}}</div>', '<div class="type-foo1234">hoge</div>'],
  [4, '<div class="type-{{baz}}-name-{{name}}"></div>', '<div class="type-foo1234-name-hoge"></div>'],
  [5, '<a class="type-{{baz}}-name-{{name}}">bluhbluh</a>', '<a class="type-foo1234-name-hoge">bluhbluh</a>'],
  [6, '<h1 class="fixed-class-name" title="Here is my name">My name is {{name}}.</h1>', '<h1 class="fixed-class-name" title="Here is my name">My name is hoge.</h1>'],
  [7, '<link rel="stylesheet" href="style-{{name}}.css">', '<link rel="stylesheet" href="style-hoge.css">'],
  [11, '<span id="elm-{{baz}}" class="mytype"> {{view-count}} views.</span>', '<span class="mytype" id="elm-foo1234"> 123 views.</span>'],
  [12, '<div class="location" data-name="{{name}}" data-pos="{{p.x}} {{p.y}} {{p.z}}" style="color:rgba({{color.rgb.r}}, {{color.rgb.g}}, {{color.rgb.b}}, 1.0)" title="My location">Located at ({{p.x}}, {{p.y}}, {{p.z}}).</div>',
      '<div class="location" title="My location" data-name="hoge" data-pos="30.5 -67.62 9.2452" style="color:rgba(18, 152, 8, 1.0)">Located at (30.5, -67.62, 9.2452).</div>'],
])('single test case %d', (no, tmpl_html, result) => {
  document.body.innerHTML = tmpl_html;
  const fus_node = new FusElement(<Element>document.body.childNodes[0])
  const evl = new Evaluator(data);
  const out = fus_node.make_node(evl);
  expect((<Element>out).outerHTML).toBe(result);
});

test.each([
  [0, '', ''],
  [1, '<div></div>',
      '<div></div>'],
  [2, '<div class="type-{{baz}}">{{name}}</div>',
      '<div class="type-foo1234">hoge</div>'],
  [20, '<div>Name: {{name}}</div>',
       '<div>Name: hoge</div>'],
  [3, '<div class="type-{{baz}}">Name: <span class="name-value">{{name}}</span></div>',
      '<div class="type-foo1234">Name: <span class="name-value">hoge</span></div>'],
  [4, '<div id="information" class="infomation"><div class="info-name">Name: {{name}}</div><div class="info-view" data-value="{{view-count}}">{{view-count}} views.</div></div>',
      '<div id="information" class="infomation"><div class="info-name">Name: hoge</div><div class="info-view" data-value="123">123 views.</div></div>'],
  [5, '<dl id="info"><dt class="name">Name</dt><dd>{{name}}</dd><dt class="view" data-view-count="{{view-count}}">View</dt><dd>{{view-count}} views.</dd><dt class="pos">Position</dt><dd data-x="{{p.x}}" data-y="{{p.y}}" data-z="{{p.z}}">({{p.x}}, {{p.y}}, {{p.z}})</dd></dl>',
      '<dl id="info"><dt class="name">Name</dt><dd>hoge</dd><dt class="view" data-view-count="123">View</dt><dd>123 views.</dd><dt class="pos">Position</dt><dd data-x="30.5" data-y="-67.62" data-z="9.2452">(30.5, -67.62, 9.2452)</dd></dl>'],
  [6, '<dt class="name">Name</dt><dd>{{name}}</dd><dt class="view" data-view-count="{{view-count}}">View</dt><dd>{{view-count}} views.</dd><dt class="pos">Position</dt><dd data-x="{{p.x}}" data-y="{{p.y}}" data-z="{{p.z}}">({{p.x}}, {{p.y}}, {{p.z}})</dd>',
      '<dt class="name">Name</dt><dd>hoge</dd><dt class="view" data-view-count="123">View</dt><dd>123 views.</dd><dt class="pos">Position</dt><dd data-x="30.5" data-y="-67.62" data-z="9.2452">(30.5, -67.62, 9.2452)</dd>'],
  [11, '<div class="type-{{baz}}">Name: <span class="name-value">{{name}}</span></div><div class="location" data-pos="{{p.x}} {{p.y}} {{p.z}}" style="color:rgba({{color.rgb.r}}, {{color.rgb.g}}, {{color.rgb.b}}, 1.0)" title="My location">Located at ({{p.x}}, {{p.y}}, {{p.z}}).</div>',
      '<div class="type-foo1234">Name: <span class="name-value">hoge</span></div><div class="location" title="My location" data-pos="30.5 -67.62 9.2452" style="color:rgba(18, 152, 8, 1.0)">Located at (30.5, -67.62, 9.2452).</div>'],
])('multiple test case %d', (no, tmpl_html, result) => {
  document.body.innerHTML = tmpl_html;
  const fus_node = new FusElement(document.body)
  const evl = new Evaluator(data);
  const out = fus_node.make_node(evl);
  expect((<Element>out).innerHTML).toBe(result);
});
