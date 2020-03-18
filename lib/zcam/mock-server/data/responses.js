module.exports = {
  info: require('./info.json'),

  ctrl_get_lens_zoom_pos: {
    code: 0,
    desc: 'string',
    key: 'lens_zoom_pos',
    type: 2,
    ro: 1,
    value: 0,
    min: 0,
    max: 0,
    step: 1
  },
  ctrl_get_lens_focus_pos: {
    code: 0,
    desc: 'string',
    key: 'lens_focus_pos',
    type: 2,
    ro: 0,
    value: 0,
    min: -32767,
    max: 32767,
    step: 1
  },
  ctrl_get_iris: {
    code: 0,
    desc: 'string',
    key: 'iris',
    type: 1,
    ro: 0,
    value: '1.4',
    opts: [
      '1.4', '1.6', '1.8', '2',
      '2.2', '2.5', '2.8', '3.2',
      '3.5', '4',   '4.5', '5',
      '5.6', '6.3', '7.1', '8',
      '9',   '10',  '11',  '13',
      '14',  '16',  '18',  '20',
      '22'
    ],
    all: []
  },
  ctrl_get_iso: {
    code: 0,
    desc: 'string',
    key: 'iso',
    type: 1,
    ro: 0,
    value: '5000',
    opts: [
      '400',    '500',    '640',
      '800',    '1000',   '1250',
      '1600',   '2000',   '2500',
      '3200',   '4000',   '5000',
      '6400',   '8000',   '10000',
      '12800',  '16000',  '20000',
      '25600',  '32000',  '40000',
      '51200',  '64000',  '80000',
      '102400', '128000'
    ],
    all: []
  },
  ctrl_get_battery: {
    code: 0,
    desc: 'string',
    key: 'battery',
    type: 2,
    ro: 1,
    value: 100,
    min: 0,
    max: 100,
    step: 1
  },
  ctrl_get_hdmi_fmt: {
    code: 0,
    desc: 'string',
    key: 'hdmi_fmt',
    type: 1,
    ro: 1,
    value: 'Auto',
    opts: [ 'Auto' ],
    all: []
  },
  ctrl_card_query_free: { code: 0, desc: '', msg: '394514' },
  ctrl_card_query_total: { code: 0, desc: '', msg: '488383' }
}
