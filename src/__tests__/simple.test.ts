import { JSDOM } from 'jsdom';

import { render, createStyleElement } from '../index';
import { compileStyle, compileAst } from 'writers-mark';

import test from 'ava';

/* tslint:disable:no-string-literal */

const testStyle = compileStyle('p a {color: red;} s * {color:blue;} s _ {color:red;}');

declare global {
  namespace NodeJS {
    interface Global {
      document: Document;
    }
  }
}

// Reset the DOM between tests
test.beforeEach((t) => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  global.document = dom.window.document;
});

test.serial('stylesheet generation', (t) => {
  const ast = compileAst('', testStyle);
  const [stylesheet, styleMap] = createStyleElement(ast);
  t.is(stylesheet.sheet?.cssRules.length, 4);
});

test.serial('stylesheet generation with custom prefix', (t) => {
  const ast = compileAst('', testStyle);
  const [stylesheet, styleMap] = createStyleElement(ast, {
    classPrefix: 'yo_',
  });
  t.is(stylesheet.sheet?.cssRules.length, 4);
  t.true(styleMap['p_a'].startsWith('yo_'));
});

test.serial('blank rendering', (t) => {
  const ast = compileAst('', testStyle);
  const [stylesheet, styleMap] = createStyleElement(ast);

  const paragraphs = render(ast, styleMap);

  t.is(paragraphs.length, 0);
});

test.serial('single paragraph', (t) => {
  const ast = compileAst('hello!', testStyle);
  const [stylesheet, styleMap] = createStyleElement(ast);

  const paragraphs = render(ast, styleMap);

  t.is(paragraphs.length, 1);
});

test.serial('styled paragraph', (t) => {
  const ast = compileAst('a\nhello!', testStyle);
  const [stylesheet, styleMap] = createStyleElement(ast);

  const paragraphs = render(ast, styleMap);

  t.is(paragraphs[0].className, styleMap['p_a']);
});

test.serial('multiple paragraphs', (t) => {
  const ast = compileAst('hello!\n\nWorld!', testStyle);
  const [stylesheet, styleMap] = createStyleElement(ast);

  const paragraphs = render(ast, styleMap);

  t.is(paragraphs.length, 2);
});

test.serial('Simple span', (t) => {
  const ast = compileAst('hello *World*!', testStyle);
  const [stylesheet, styleMap] = createStyleElement(ast);

  const paragraphs = render(ast, styleMap);

  t.is(paragraphs.length, 1);
  t.is(paragraphs[0].childNodes.length, 3);
  t.is(paragraphs[0].childNodes[0].nodeType, document.TEXT_NODE);
  t.is(paragraphs[0].childNodes[1].nodeType, document.ELEMENT_NODE);
  t.is(paragraphs[0].childNodes[2].nodeType, document.TEXT_NODE);
});

test.serial('Nested span', (t) => {
  const ast = compileAst('hello *Wo_r_ld*!', testStyle);
  const [stylesheet, styleMap] = createStyleElement(ast);

  const paragraphs = render(ast, styleMap);

  t.is(paragraphs.length, 1);
  t.is(paragraphs[0].childNodes.length, 3);
  t.is(paragraphs[0].childNodes[0].nodeType, document.TEXT_NODE);
  t.is(paragraphs[0].childNodes[1].nodeType, document.ELEMENT_NODE);
  t.is(paragraphs[0].childNodes[2].nodeType, document.TEXT_NODE);

  const outer = paragraphs[0].children[0];
  t.is(outer.childNodes.length, 3);
  t.is(outer.childNodes[0].nodeType, document.TEXT_NODE);
  t.is(outer.childNodes[1].nodeType, document.ELEMENT_NODE);
  t.is(outer.childNodes[2].nodeType, document.TEXT_NODE);
});

test.serial('Custom default p rule', (t) => {
  const ast = compileAst('hello *Wo_r_ld*!', testStyle);
  const [stylesheet, styleMap] = createStyleElement(ast);

  const paragraphs = render(ast, styleMap, { defaultPRule: 'a' });

  t.is(paragraphs.length, 1);
  t.is(paragraphs[0].childNodes.length, 3);
  t.is(paragraphs[0].childNodes[0].nodeType, document.TEXT_NODE);
  t.is(paragraphs[0].childNodes[1].nodeType, document.ELEMENT_NODE);
  t.is(paragraphs[0].childNodes[2].nodeType, document.TEXT_NODE);

  const outer = paragraphs[0].children[0];
  t.is(outer.childNodes.length, 3);
  t.is(outer.childNodes[0].nodeType, document.TEXT_NODE);
  t.is(outer.childNodes[1].nodeType, document.ELEMENT_NODE);
  t.is(outer.childNodes[2].nodeType, document.TEXT_NODE);
});
