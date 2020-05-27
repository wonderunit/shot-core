module.exports = {
  purge: [
    'server/views/*.ejs'
  ],
  theme: {
    extend: {
      fontSize: {
        'xxs': '9px',
        '7xl': '4.5rem',
        '8xl': '9rem'
      },
      colors: {
        purple: {
          '100': '#F9F7FF',
          '400': '#AB94FF',
          '600': '#7B60DC'
        }
      }
    },
  },
  variants: {},
  plugins: [],
  corePlugins: {
    fontFamily: false
  }
}
