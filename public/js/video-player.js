const { createMachine, assign, interpret } = XStateFSM

function sum (a, b) {
  return a + b
}

const machineConfig = {
  id: 'player',
  initial: 'inactive',
  context: {
    segments: [],
    curr: 0
  },
  states: {
    inactive: {
      entry: ['deactivate', 'setSrc'],
      on: { CLICK: 'activating' }
    },
    activating: {
      entry: 'activate',
      on: { ACTIVE: 'playing' }
    },
    playing: {
      entry: ['startTimer', 'play'],
      exit: ['stopTimer'],
      on: {
        SEGMENT_ENDED: [
          {
            cond: context => context.curr < context.segments.length - 1,
            actions: ['nextSegment', 'setSrc']
          },
          {
            target: 'inactive',
            actions: ['reset']
          }
        ]
      }
    }
  }
}

export default class VideoPlayer extends Stimulus.Controller {
  static targets = [ 'video', 'segment', 'invitation', 'controls', 'status', 'progress', 'current', 'statusShot', 'statusTake' ]

  static UPDATE_INTERVAL_MS = 1000 / 20 // update the progress bar at 20 fps

  initialize () {
    this.intervalId = null
    this.service = interpret(
      createMachine({
        ...machineConfig,
        context: {
          segments: this.getSegments(this.segmentTargets),
          curr: 0
        }
      }, {
        actions: {
          deactivate: this.deactivate.bind(this),
          activate: this.activate.bind(this),
          play: this.play.bind(this),
          setSrc: this.setSrc.bind(this),
          startTimer: this.startTimer.bind(this),
          stopTimer: this.stopTimer.bind(this),

          //
          //
          // context assignment actions
          //
          reset: assign({ curr: 0 }),
          nextSegment: assign({ curr: context => context.curr + 1 })
        }
      })
    ).start()

    // for debugging:
      // this.service.subscribe(state => console.log(state.value))
  }

  //
  //
  // Controller methods
  //
  getSegments (el) {
    let segments = []
    for (let segment of el) {
      const { href } = segment
      const { takeId, takeNumber, sceneNumber, shotNumber, impromptu, posterframe, duration } = segment.dataset
      segments.push({
        id: takeId,
        takeNumber,
        src: href,
        posterframe,
        sceneNumber,
        shotNumber,
        impromptu: impromptu == '' ? true : false,
        duration: parseFloat(duration)
      })
    }
    return segments
  }

  //
  //
  // State Machine actions
  //
  deactivate (context) {
    this.invitationTarget.style.display = 'flex'
    this.controlsTarget.style.opacity = 0.3
    this.videoTarget.pause()
    this.statusTarget.innerText = 'Paused'
  }
  activate (context) {
    this.invitationTarget.style.display = 'none'
    this.controlsTarget.style.opacity = 1

    this.service.send('ACTIVE')
  }
  play (context, event) {
    this.videoTarget.play()
    this.statusTarget.innerText = 'Playing'
  }
  setSrc (context) {
    let { curr } = context
    let take = context.segments[curr]
    let { src } = take

    this.videoTarget.src = src
    this.currentTarget.innerText = `${curr + 1} / ${context.segments.length}`

    this.statusShotTarget.innerText = `Shot ${take.impromptu ? 'i' : ''}${take.shotNumber}`
    this.statusTakeTarget.innerText = `Take ${take.takeNumber}`
  }
  startTimer () {
    this.intervalId = setInterval(
      () => this.timeUpdate({ target: this.videoTarget }),
      VideoPlayer.UPDATE_INTERVAL_MS
    )
  }
  stopTimer () {
    clearTimeout(this.intervalId)
  }

  //
  //
  // Controller events
  //
  startPlayback (event) {
    this.service.send('CLICK')
  }
  ended (event) {
    this.service.send('SEGMENT_ENDED')
  }
  timeUpdate (event) {
    let video = event.target

    if (video.readyState) {
      let { segments, curr } = this.service.state.context
      let total = segments.map(s => s.duration).reduce(sum)
      let passed = 0
      for (let i = 0; i < curr; i++) {
        passed += segments[i].duration
      }
      let elapsed = passed + video.currentTime
      let pct = (elapsed / total) * 100
      this.progressTarget.style.width = `${pct}%`
    }
  }
}
