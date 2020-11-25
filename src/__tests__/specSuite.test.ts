import '@testing-library/jest-dom';
import '@testing-library/jest-dom/extend-expect';

import * as fs from 'fs';
import * as path from 'path';

import { render } from '..';
import { Context, Options, Style } from 'writers-mark';

interface ExtendedMatchers extends jest.Matchers<void> {
  toMatchClassList: (expected: HTMLElement, recivedClasses: CSSStyleSheet, expectedSheet: CSSStyleSheet) => object;
}

const stripBody = (node: Element) => {
  for (let i = node.childNodes.length - 1; i >= 0; --i) {
    const childNode = node.childNodes[i];
    if (childNode.nodeType === Node.TEXT_NODE && (childNode as CharacterData).data.trim() === '')
      node.removeChild(childNode);
    else if (childNode.nodeType === Node.ELEMENT_NODE) stripBody(childNode as Element);
  }
};

const buildExpectedBody = (raw: string): HTMLDivElement => {
  const target = document.createElement('div');
  target.innerHTML = raw;
  stripBody(target);
  return target;
};

const findRule = (rule: string, style: CSSStyleSheet): CSSRule | undefined => {
  for (const i in style.cssRules) {
    if ((style.cssRules[i] as CSSStyleRule).selectorText === '.' + rule) {
      return style.cssRules[i];
    }
  }
  return undefined;
};

const buildExpectedStyle = (raw: string): CSSStyleSheet => {
  const stylesheet = document.createElement('style');
  stylesheet.innerHTML = raw;
  document.head.appendChild(stylesheet);
  return document.styleSheets[0];
};

expect.extend({
  toMatchClassList(
    received: HTMLElement,
    expected: HTMLElement,
    recivedSheet: CSSStyleSheet,
    expectedSheet: CSSStyleSheet,
  ) {
    if (received.classList.length !== expected.classList.length) {
      return {
        message: () =>
          `expected ${expected.outerHTML} to have the same class count (${expected.classList.length}) as ${received.outerHTML} (${received.classList.length})`,
        pass: false,
      };
    }

    for (let i = 0; i < received.classList.length; ++i) {
      const resultClass = received.classList[i];
      const targetClass = expected.classList[i];

      const resultRule = findRule(resultClass, recivedSheet);
      const tgtRule = findRule(targetClass, expectedSheet);

      if (
        resultRule?.cssText.slice(resultRule!.cssText.indexOf('{')) !==
        tgtRule?.cssText.slice(tgtRule!.cssText.indexOf('{'))
      ) {
        return {
          message: () => `expected ${resultRule!.cssText} to have the same properties as ${tgtRule!.cssText}`,
          pass: false,
        };
      }
    }

    return { message: () => `expected ${expected.outerHTML} to not match ${received.outerHTML}`, pass: true };
  },
});

const validateResults = (
  result: HTMLElement,
  target: HTMLElement,
  resultSheet: CSSStyleSheet,
  targetSheet: CSSStyleSheet,
) => {
  ((expect(result) as unknown) as ExtendedMatchers).toMatchClassList(target, resultSheet, targetSheet);
  expect(result.childNodes.length).toBe(target.childNodes.length);
  for (let i = 0; i < result.childNodes.length; ++i) {
    const tgtChild = target.childNodes[i];
    const resultChild = result.childNodes[i];

    expect(resultChild.nodeType).toBe(tgtChild.nodeType);
    if (tgtChild.nodeType === Node.TEXT_NODE) {
      expect((resultChild as CharacterData).data).toBe((tgtChild as CharacterData).data);
    } else if (tgtChild.nodeType === Node.ELEMENT_NODE) {
      validateResults(resultChild as HTMLElement, tgtChild as HTMLElement, resultSheet, targetSheet);
    }
  }
};

const runSuite = (filePath: string, ctx: Context, styles: Style[]) => {
  const sourceKey = '[source]';
  const styleKey = '[style]';
  const bodyKey = '[body]';

  afterEach(() => {
    while (document.head.children.length !== 0) {
      document.head.removeChild(document.head.children[0]);
    }
    document.body.innerHTML = '';
  });

  test(filePath, async () => {
    // Break up the test case
    const raw = await fs.promises.readFile(filePath, { encoding: 'utf8' });

    const sourceLoc = raw.indexOf(sourceKey);
    const styleLoc = raw.indexOf(styleKey);
    const bodyLoc = raw.indexOf(bodyKey);

    const source = raw.slice(sourceLoc + sourceKey.length + 1, styleLoc - 1);
    const style = raw.slice(styleLoc + styleKey.length + 1, bodyLoc - 1);
    const body = raw.slice(bodyLoc + bodyKey.length + 1);

    // Prepare the expected output
    const targetSheet = buildExpectedStyle(style);
    const targetBody = buildExpectedBody(body);

    const resultBody = document.createElement('div');

    render(ctx.compileText(source, styles), resultBody, '_');
    stripBody(resultBody);

    const resultSheet = document.styleSheets[1];

    validateResults(resultBody, targetBody, resultSheet, targetSheet);
  });
};

const findSuites = (dir: string) => {
  let opts: Options | undefined;
  const optionsFile = path.join(dir, '__options.json');
  if (fs.existsSync(optionsFile)) {
    opts = JSON.parse(fs.readFileSync(optionsFile, { encoding: 'utf8' })) as Options;
  }

  const ctx = new Context(opts);
  const styles: Style[] = [];

  fs.readdirSync(dir).forEach((file) => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      findSuites(filePath);
    } else if (stats.isFile()) {
      if (filePath.endsWith('.style')) {
        styles.push(ctx.compileStyle(fs.readFileSync(filePath, { encoding: 'utf8' })));
      } else if (filePath.endsWith('.wmt')) {
        runSuite(filePath, ctx, styles);
      }
    }
  });
};

findSuites('writers-mark/test_suite');
