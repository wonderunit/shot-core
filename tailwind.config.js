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
          '600': '#7B60DC',
          '900': '#4B349F'
        },

        // button colors
        orange: { 500: '#EC8C28' },
        'white-o': 'rgba(255, 255, 255, 0.38)',
        'yellow-o': 'rgba(255, 245, 0, 0.38)' // yellow-300
      }
    }
  },
  variants: {
    visibility: ['group-hover']
  },
  plugins: [],
  corePlugins: {
    fontFamily: false
  }
}
