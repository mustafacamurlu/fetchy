// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Fetchy',
  tagline: 'Local by design. Reliable by nature.',
  favicon: 'img/favicon.ico',

  url: 'https://akineralkan94.github.io',
  baseUrl: '/fetchy/',

  organizationName: 'AkinerAlkan94',
  projectName: 'fetchy',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/AkinerAlkan94/fetchy/tree/main/docs/',
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/AkinerAlkan94/fetchy/tree/main/docs/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/fetchy-social-card.jpg',
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: 'Fetchy',
        logo: {
          alt: 'Fetchy Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docsSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {to: '/blog', label: 'Blog', position: 'left'},
          {
            href: 'https://github.com/AkinerAlkan94/fetchy/releases',
            label: 'Download',
            position: 'left',
          },
          {
            href: 'https://github.com/AkinerAlkan94/fetchy',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              {label: 'Getting Started', to: '/docs/getting-started/introduction'},
              {label: 'Features', to: '/docs/features/http-requests'},
              {label: 'Guides', to: '/docs/guides/first-request'},
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub Issues',
                href: 'https://github.com/AkinerAlkan94/fetchy/issues',
              },
              {
                label: 'GitHub Discussions',
                href: 'https://github.com/AkinerAlkan94/fetchy/discussions',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {label: 'Blog', to: '/blog'},
              {
                label: 'GitHub',
                href: 'https://github.com/AkinerAlkan94/fetchy',
              },
              {
                label: 'Download',
                href: 'https://github.com/AkinerAlkan94/fetchy/releases',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Fetchy. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['bash', 'json', 'yaml', 'python', 'java', 'csharp', 'go', 'rust', 'cpp'],
      },
      announcementBar: {
        id: 'privacy_first',
        content: '🔒 Fetchy is 100% local — your API data never leaves your machine. <a href="/fetchy/docs/getting-started/introduction">Learn more →</a>',
        backgroundColor: '#1a1a2e',
        textColor: '#7dd3fc',
        isCloseable: true,
      },
    }),
};

module.exports = config;
