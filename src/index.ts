import * as WM from 'writers-mark';
import { StyleRule } from 'writers-mark/lib/style';
import { Content, Span, isSpan, isLink } from 'writers-mark/lib/text';

const DEFAULT_CLASS_PREFIX = 'wm__';

let nextUniqueNumber = 1;
const makeUniqueIndentifier = (prefix: string): string => {
  return prefix + (nextUniqueNumber++).toString();
};

/** Renders a piece of content (recursively) */
const renderContent = (content: Content[], target: Node, classMapping: Record<string, string>) => {
  interface Entry {
    tgt: Node;
    data: Content[];
  }
  const work: Entry[] = [{ tgt: target, data: content }];

  while (work.length > 0) {
    const { tgt, data } = work.pop()!;

    for (const v of data) {
      if (isSpan(v)) {
        const spanNode = document.createElement('span');
        v.styles.forEach((s) => spanNode.classList.add(classMapping['s_' + s]));
        tgt.appendChild(spanNode);
        work.push({ tgt: spanNode, data: v.contents });
      } else if (isLink(v)) {
        const aNode = document.createElement('a');
        aNode.setAttribute('href', v.url);
        tgt.appendChild(aNode);
        work.push({ tgt: aNode, data: v.contents });
      } else {
        tgt.appendChild(document.createTextNode(v as string));
      }
    }
  }
};

/** Creates the stylesheet for a block of Writer's Mark, and appends it to the document. Usefull for alternate renderers.
 *
 * @param text The text that will be rendered with this style.
 * @param doc The target document
 * @param classPrefix A string prefixed to all generated CSS classes.
 * @returns A callback that will cleanup the DOM's CSS stylesheet, and a mapping of internal classes to generated CSS class names.
 */
export const createStylesheet = (
  text: WM.Text,
  doc: HTMLDocument,
  classPrefix: string,
): [Record<string, string>, HTMLStyleElement] => {
  const stylesheet = doc.createElement('style');
  doc.head.appendChild(stylesheet); // This is necessary for the style element to have a sheet assigned to it.

  // Map of WM rules to css rules.
  const mapping: Record<string, string> = {};

  const applyRules = (key: string, rule: StyleRule) => {
    if (!mapping[key]) {
      mapping[key] = makeUniqueIndentifier(classPrefix);
    }

    const ruleId = stylesheet.sheet!.cssRules.length;
    stylesheet.sheet!.insertRule('.' + mapping[key] + '{}', ruleId);
    const cssRule = stylesheet.sheet!.cssRules[ruleId] as CSSStyleRule;
    Object.keys(rule.props).forEach((k) => cssRule.style.setProperty(k, rule.props[k]));
  };

  for (const style of text.styles) {
    if (style.cont) {
      applyRules('c_', style.cont);
    }

    Object.keys(style.para).forEach((k) => applyRules('p_' + k, style.para[k]));
    Object.keys(style.span).forEach((k) => applyRules('s_' + k, style.span[k]));
  }

  return [mapping, stylesheet];
};

export interface RenderOptions {
  /** Prefix applied to css class names */
  classPrefix?: string;
}

/** Renders a block of Writer's Mark.
 *
 * @param text The text to render
 * @param target Container node to add the rendered content to. The target must be in the DOM already.
 * @param classPrefix A string prefixed to all generated CSS classes.
 */
export const render = (text: WM.Text, target: HTMLElement, options: RenderOptions = {}): HTMLIFrameElement => {
  const doc = target.ownerDocument;

  // Create a sandboxed iframe to render the content in.
  const iFrame = doc.createElement('iframe');
  iFrame.setAttribute('frameBorder', '0');
  iFrame.setAttribute('sandbox', 'allow-same-origin');
  target.appendChild(iFrame);

  // Render into it.
  dangerousRender(text, iFrame!.contentDocument!.body, options);

  return iFrame;
};

export interface UnsafeRenderResults {
  /** The <style> element that was added to the target's document. */
  styleElement: HTMLStyleElement;
}

/** Renders a block of Writer's Mark directly to the target.
 *  WARNING: Unless you are rendering to a sandboxed IFrame or dealing with trusted, data, you shouldn't be using this.
 *
 *  N.B.: This function will append a <style> element to the target document's head
 *
 */
export const dangerousRender = (
  text: WM.Text,
  target: HTMLElement,
  options: RenderOptions = {},
): UnsafeRenderResults => {
  let { classPrefix } = { ...options };

  if (!classPrefix) classPrefix = DEFAULT_CLASS_PREFIX;

  const doc = target.ownerDocument;
  const [mapping, styleElement] = createStylesheet(text, doc, classPrefix);

  if (mapping.c_) {
    target.classList.add(mapping.c_);
  }

  for (const para of text.paragraphs) {
    const pElem = doc.createElement('p');
    if (mapping.p_default) {
      pElem.classList.add(mapping.p_default);
    }

    para.styles.forEach((s) => pElem.classList.add(mapping['p_' + s]));
    renderContent(para.contents, pElem, mapping);

    target.appendChild(pElem);
  }

  return { styleElement };
};
