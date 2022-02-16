'use strict';

/**
 * Add support for highlight markup across all Markdown, including inside code.
 *
 * The syntax for highlighting text is `<^>`. E.g. `<^>hello world<^>`.
 * This syntax is treated as regular inline syntax, similar to bold or italics.
 * However, when used within code the opening and closing tags must be on the same line.
 *
 * @example
 * <^>test<^>
 *
 * <mark>test</mark>
 *
 * @example
 * ```
 * hello
 * world
 * <^>test<^>
 * ```
 *
 * <pre><code>hello
 * world
 * <mark>test</mark>
 * </code></pre>
 *
 * @type {import('markdown-it').PluginSimple}
 */
module.exports = md => {
  /**
   * Parsing rule for highlight markup.
   *
   * @type {import('markdown-it/lib/parser_inline').RuleInline}
   */
  const highlightRule = (state, silent) => {
    // If silent, don't replace
    if (silent) return false;

    // Check we have space for opening and closing tags
    if (state.pos + 6 > state.posMax) return false;

    // Check we're on an opening marker
    if (state.src.slice(state.pos, state.pos + 3) !== '<^>') return false;

    // Look for closing marker
    const closeIdx = state.src.indexOf('<^>', state.pos + 3);
    if (closeIdx === -1 || closeIdx > state.posMax - 3) return false;

    // Add the start token
    state.push('mark_open', 'mark', 1);

    // Adjust position to be inside the markers
    const oldPosMax = state.posMax;
    state.pos = state.pos + 3;
    state.posMax = closeIdx;

    // Tokenize the inner
    state.md.inline.tokenize(state);

    // Move position to after the close marker
    state.pos = closeIdx + 3;
    state.posMax = oldPosMax;

    // Add the end token
    state.push('mark_close', 'mark', -1);

    // Done
    return true;
  };

  md.inline.ruler.before('emphasis', 'highlight', highlightRule);

  /**
   * Wrap the code render functions to detect highlight markup and replace it with the correct HTML.
   *
   * @param {import('markdown-it/lib/renderer').RenderRule} original
   * @return {import('markdown-it/lib/renderer').RenderRule}
   */
  const code = original => (tokens, idx, options, env, self) => {
    // Run the original renderer
    return original(tokens, idx, options, env, self)
      // Replacing any pairs of escaped markers
      .replace(/&lt;\^&gt;(.*?)&lt;\^&gt;/g, '<mark>$1</mark>');
  };

  md.renderer.rules.code_block = code(md.renderer.rules.code_block);
  md.renderer.rules.fence = code(md.renderer.rules.fence);
  md.renderer.rules.code_inline = code(md.renderer.rules.code_inline);
};
