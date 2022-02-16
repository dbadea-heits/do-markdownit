'use strict';

const safeObject = require('../util/safe_object');

/**
 * @typedef {Object} HeadingIdOptions
 * @property {function(string): string} [sluggify] Custom function to convert heading content to a slug Id.
 */

/**
 * Standard function to sluggify a given string.
 *
 * Converts the string to lowercase.
 * Replaces all non-alphanumeric characters with a hyphen.
 * Removes duplicate hyphens, and removes hyphens from the start/end.
 *
 * @param {string} string
 * @return {string}
 */
const sluggify = string => string.toLowerCase()
  .replace(/\W+/g, '-')
  .replace(/--+/g, '-')
  .replace(/(^-|-$)/g, '');

/**
 * Apply Ids to all rendered headings and generate an array of headings.
 *
 * Headings are available after a render via `md.headings`.
 * Each item in the array is an object with the following properties:
 *
 * - `slug`: The slug Id given to the heading (e.g. `my-heading`).
 * - `content`: The content of the heading (e.g. `My Heading`).
 *
 * @type {import('markdown-it').PluginWithOptions<HeadingIdOptions>}
 */
module.exports = (md, options) => {
  // Get the correct options
  options = safeObject(options);

  /**
   * Wrap the heading render function to inject slug Ids and track all headings.
   *
   * @param {import('markdown-it/lib/renderer').RenderRule} [original] Original render function. Defaults to `renderToken`.
   * @return {import('markdown-it/lib/renderer').RenderRule}
   */
  const render = original => (tokens, idx, opts, env, self) => {
    // Get the token
    const token = tokens[idx];

    // Get the content
    const content = tokens[idx + 1].content;

    // Generate an id if not already set
    if (!token.attrs) token.attrs = [];
    if (token.attrs.every(attr => attr[0] !== 'id')) {
      // Get the slug
      const slug = typeof options.sluggify === 'function' ? options.sluggify(content) : sluggify(content);

      // Add the slug as the id attribute
      token.attrs.push([ 'id', slug ]);

      // Expose the slug in md
      md.headings.push({ slug, content });
    }

    // Render as normal
    return typeof original === 'function'
      ? original(tokens, idx, opts, env, self)
      : self.renderToken(tokens, idx, opts, env);
  };

  md.renderer.rules.heading_open = render(md.renderer.rules.heading_open);

  /**
   * Wrap the core render functions to reset the tracked headings.
   *
   * @param {function(string, *?): string} original
   * @return {function(string, *?): string}
   */
  const reset = original => (src, env) => {
    md.headings = [];
    return original.apply(md, [ src, env ]);
  };

  md.render = reset(md.render);
  md.renderInline = reset(md.renderInline);
};
