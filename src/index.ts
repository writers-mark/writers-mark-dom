import { AST, Block, SpanSection } from 'writers-mark/lib/ast';
import { Options as MarkedOptions, defaultParagraphRule } from 'writers-mark/lib/options';
import { Style, StyleRule } from 'writers-mark/lib/style';

const defaultClassPrefix = 'wm_ns__';

let nextUniqueNumber = 1;
const makeUniqueIndentifier = (prefix: string): string => {
  return prefix + (nextUniqueNumber++).toString();
};

export interface Options extends MarkedOptions {
  classPrefix?: string;
}

const ruleToString = (rule: StyleRule): string => {
  let result = '{';
  for (const k of Object.keys(rule.props)) {
    result += k + ': ' + rule.props[k] + ';';
  }
  result += '}';
  return result;
};

/**
 * Creates a HTMLStyleElement from a style. The function will return the style element, as well
 * as a mapping of rule keys to the generated CSS classes. The stylesheet is added as a children
 * of the <head> node of the document.
 *
 * @param style The style to compile
 * @param options Sert of options to apply
 *
 */
export const createStyleElement = (style: Style, options?: Options): [HTMLStyleElement, Record<string, string>] => {
  const classPrefix = options?.classPrefix || defaultClassPrefix;
  const stylesheet = document.createElement('style');
  document.head.appendChild(stylesheet);

  const classMapping: Record<string, string> = {};
  for (const ruleKey of Object.keys(style.paragraph)) {
    const className = makeUniqueIndentifier(classPrefix);
    classMapping['p_' + ruleKey] = className;

    const rule = style.paragraph[ruleKey];
    stylesheet.sheet!.insertRule('.' + className + ruleToString(rule), 0);
  }

  for (const ruleKey of Object.keys(style.span)) {
    const className = makeUniqueIndentifier(classPrefix);
    classMapping['s_' + ruleKey] = className;

    const rule = style.span[ruleKey];
    stylesheet.sheet!.insertRule('.' + className + ruleToString(rule), 0);
  }

  return [stylesheet, classMapping];
};

const renderSection = (section: string | SpanSection, classMapping: Record<string, string>): Node => {
  const asSection = section as SpanSection;
  if (asSection.contents && asSection.style) {
    const result = document.createElement('span');
    result.classList.add(classMapping['s_' + asSection.style]);

    for (const subSection of asSection.contents) {
      result.appendChild(renderSection(subSection, classMapping));
    }
    return result;
  } else {
    return document.createTextNode(section as string);
  }
};

/**
 * Renders an AST as a list of <p></p> elements.
 *
 * @param ast The ast to render
 * @param classMapping The class mapping to apply (as returned by createStyleElement)
 * @param options Set of options to apply.
 */
export const render = (ast: AST, classMapping: Record<string, string>, options?: Options): HTMLParagraphElement[] => {
  const result: HTMLParagraphElement[] = [];

  for (const p of ast.paragraphs) {
    const pElem = document.createElement('p');

    if (p.styles) {
      p.styles.forEach((s) => pElem.classList.add(classMapping['p_' + s]));
    }
    else {
      const name = options?.defaultPRule || defaultParagraphRule;
      pElem.classList.add(classMapping['p_' + name])
    }

    for (const section of p.contents) {
      pElem.appendChild(renderSection(section, classMapping));
    }

    result.push(pElem);
  }

  return result;
};
