const { createMachine, assign, interpret } = XStateFSM

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
      entry: 'play',
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
  static targets = [ 'video', 'segment', 'invitation', 'controls', 'status', 'progress', 'statusShot', 'statusTake' ]

  initialize () {  
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

  connect () {
    this.videoTarget.addEventListener('ended', () => this.service.send('SEGMENT_ENDED'))
  }

  //
  //
  // Controller methods
  //
  getSegments (el) {
    let segments = []
    for (let segment of el) {
      const { href } = segment
      const { takeId, takeNumber, sceneNumber, shotNumber, impromptu, posterframe } = segment.dataset
      segments.push({
        id: takeId,
        takeNumber,
        src: href,
        posterframe,
        sceneNumber,
        shotNumber,
        impromptu: impromptu == '' ? true : false
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
    this.progressTarget.innerText = `${curr + 1} / ${context.segments.length}`

    this.statusShotTarget.innerText = `Shot ${take.impromptu ? 'i' : ''}${take.shotNumber}`
    this.statusTakeTarget.innerText = `Take ${take.takeNumber}`
  }

  //
  //
  // Controller events
  //
  startPlayback (event) {
    this.service.send('CLICK')
  }
}
