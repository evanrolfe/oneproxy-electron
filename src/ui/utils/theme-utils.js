// @flow
type Theme = {
  plugin: Plugin,
  theme: PluginTheme,
};

type ThemeBlock = {
  background?: {
    default: string,
    success?: string,
    notice?: string,
    warning?: string,
    danger?: string,
    surprise?: string,
    info?: string,
  },
  foreground?: {
    default: string,
    success?: string,
    notice?: string,
    warning?: string,
    danger?: string,
    surprise?: string,
    info?: string,
  },
  highlight?: {
    default: string,
    xxs?: string,
    xs?: string,
    sm?: string,
    md?: string,
    lg?: string,
    xl?: string,
  },
};

type ThemeInner = {
  ...ThemeBlock,
  rawCss?: string,
  styles: ?{
    dialog?: ThemeBlock,
    dialogFooter?: ThemeBlock,
    dialogHeader?: ThemeBlock,
    dropdown?: ThemeBlock,
    editor?: ThemeBlock,
    link?: ThemeBlock,
    overlay?: ThemeBlock,
    pane?: ThemeBlock,
    paneHeader?: ThemeBlock,
    sidebar?: ThemeBlock,
    sidebarHeader?: ThemeBlock,
    sidebarList?: ThemeBlock,
    tooltip?: ThemeBlock,
    transparentOverlay?: ThemeBlock,
  },
};

export type PluginTheme = {
  name: string,
  displayName: string,
  theme: ThemeInner,
};

export async function generateThemeCSS(theme: PluginTheme): Promise<string> {
  const renderedTheme = theme.theme;
  const n = theme.name;

  let css = '';
  css += wrapStyles(n, '', getThemeBlockCSS(renderedTheme));

  if (renderedTheme.styles) {
    const styles = renderedTheme.styles;

    // Dropdown Menus
    css += wrapStyles(n, '.theme--dropdown__menu', getThemeBlockCSS(styles.dialog));
    css += wrapStyles(n, '.theme--dropdown__menu', getThemeBlockCSS(styles.dropdown));

    // Tooltips
    css += wrapStyles(n, '.theme--tooltip', getThemeBlockCSS(styles.dialog));
    css += wrapStyles(n, '.theme--tooltip', getThemeBlockCSS(styles.tooltip));

    // Overlay
    css += wrapStyles(
      n,
      '.theme--transparent-overlay',
      getThemeBlockCSS(styles.transparentOverlay),
    );

    // Dialogs
    css += wrapStyles(n, '.theme--dialog', getThemeBlockCSS(styles.dialog));
    css += wrapStyles(n, '.theme--dialog__header', getThemeBlockCSS(styles.dialogHeader));
    css += wrapStyles(n, '.theme--dialog__footer', getThemeBlockCSS(styles.dialogFooter));

    // Panes
    css += wrapStyles(n, '.theme--pane', getThemeBlockCSS(styles.pane));
    css += wrapStyles(n, '.theme--pane__header', getThemeBlockCSS(styles.paneHeader));

    // Sidebar Styles
    css += wrapStyles(n, '.theme--sidebar', getThemeBlockCSS(styles.sidebar));
    css += wrapStyles(n, '.theme--sidebar__list', getThemeBlockCSS(styles.sidebarList));
    css += wrapStyles(n, '.theme--sidebar__header', getThemeBlockCSS(styles.sidebarHeader));

    // Link
    css += wrapStyles(n, '.theme--link', getThemeBlockCSS(styles.link));

    // Code Editors
    css += wrapStyles(n, '.theme--editor', getThemeBlockCSS(styles.editor));

    // HACK: Dialog styles for CodeMirror dialogs too
    css += wrapStyles(n, '.CodeMirror-info', getThemeBlockCSS(styles.dialog));
  }

  return css;
}

function getThemeBlockCSS(block?: ThemeBlock): string {
  if (!block) {
    return '';
  }

  const indent = '\t';

  let css = '';

  const addVar = (variable?: string, value?: string) => {
    if (variable && value) {
      css += `${indent}--${variable}: ${value};\n`;
    }
  };

  const addComment = comment => {
    css += `${indent}/* ${comment} */\n`;
  };

  const addNewLine = () => {
    css += `\n`;
  };

  if (block.background) {
    const { background } = block;
    addComment('Background');
    addVar('color-bg', background.default);
    addVar('color-success', background.success);
    addVar('color-notice', background.notice);
    addVar('color-warning', background.warning);
    addVar('color-danger', background.danger);
    addVar('color-surprise', background.surprise);
    addVar('color-info', background.info);
    addNewLine();
  }

  if (block.foreground) {
    const { foreground } = block;
    addComment('Foreground');
    addVar('color-font', foreground.default);
    addVar('color-font-success', foreground.success);
    addVar('color-font-notice', foreground.notice);
    addVar('color-font-warning', foreground.warning);
    addVar('color-font-danger', foreground.danger);
    addVar('color-font-surprise', foreground.surprise);
    addVar('color-font-info', foreground.info);
    addNewLine();
  }

  if (block.highlight) {
    const { highlight } = block;
    addComment('Highlight');
    addVar('hl', highlight.default);
    addVar('hl-xxs', highlight.xxs);
    addVar('hl-xs', highlight.xs);
    addVar('hl-sm', highlight.sm);
    addVar('hl-md', highlight.md);
    addVar('hl-lg', highlight.lg);
    addVar('hl-xl', highlight.xl);
    addNewLine();
  }

  return css.replace(/\s+$/, '');
}

function wrapStyles(theme: string, selector: string, styles: string) {
  if (!styles) {
    return '';
  }

  return [
    `[theme="${theme}"] ${selector}, `,
    `[subtheme="${theme}"] ${selector ? selector + '--sub' : ''} {`,
    styles,
    '}',
    '',
    '',
  ].join('\n');
}

export async function setTheme(themeName: string) {
  if (!document) {
    return;
  }

  const head = document.head;
  const body = document.body;

  if (!head || !body) {
    return;
  }

  body.setAttribute('theme', themeName);
  const themes: Array<Theme> = await getThemes();

  for (const theme of themes) {
    let themeCSS = (await generateThemeCSS(theme.theme)) + '\n';
    const { name } = theme.theme;
    const { rawCss } = theme.theme.theme;

    let s = document.querySelector(`style[data-theme-name="${name}"]`);

    if (!s) {
      s = document.createElement('style');
      s.setAttribute('data-theme-name', name);
      head.appendChild(s);
    }

    if (typeof rawCss === 'string' && name === themeName) {
      themeCSS += '\n\n' + rawCss;
    }

    s.innerHTML = themeCSS;
  }
}

export async function setFont(settings: Object) {
  if (!document) {
    return;
  }

  const html = document.querySelector('html');

  if (!html) {
    return;
  }

  html.style.setProperty('--font-default', settings.fontInterface);
  html.style.setProperty('--font-monospace', settings.fontMonospace);
  html.style.setProperty('--font-ligatures', settings.fontVariantLigatures ? 'normal' : 'none');
  html.style.setProperty('font-size', `${settings.fontSize}px`);
}
